import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { createLesson, updateLessonStatus } from "~/server/db/queries";
import { generateLesson } from "~/deep-search";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import type { LessonContent } from "~/types/lesson";
import { generateLessonTitle } from "~/lib/generate-chat-title";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

/**
 * Helper function to handle generation errors
 */
async function handleGenerationError(
  lessonId: string,
  error: unknown,
  outline: string,
  langfuseTrace: any
) {
  // Try to generate a title even for failed lessons
  let title: string;
  try {
    title = await generateLessonTitle(outline, {
      langfuseTraceId: langfuseTrace.id,
    });
  } catch {
    // Fallback if title generation also fails
    title = `Error: ${outline.slice(0, 50)}...`;
  }
  
  await updateLessonStatus({
    lessonId,
    status: 'failed',
    title,
    description: error instanceof Error ? error.message : 'Unknown error',
    lessonType: 'tutorial',
    content: {
      type: 'tutorial',
      data: {
        sections: [],
        difficulty: 'beginner',
      },
    },
    researchNotes: [],
  });
  
  langfuseTrace.update({
    output: {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    },
  });
  
  await langfuse.shutdownAsync();
}

/**
 * POST /api/lessons
 * Create and generate a new lesson
 */
export async function POST(req: Request) {
  try {
    // TEMPORARY: Authentication disabled - using anonymous user
    // const session = await auth();
    const session = {
      user: { id: "anonymous-user", name: "Anonymous", image: null },
    };

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse request body
    const body = await req.json();
    const { outline } = body;

    if (!outline || typeof outline !== "string") {
      return NextResponse.json(
        { error: "Outline is required and must be a string" },
        { status: 400 }
      );
    }

    if (outline.trim().length < 10) {
      return NextResponse.json(
        { error: "Outline must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Create Langfuse trace
    const langfuseTrace = langfuse.trace({
      name: "lesson-generation",
      userId,
      metadata: {
        outline,
      },
    });

    try {
      // Step 1: Create lesson record with "generating" status
      const lesson = await createLesson({
        userId,
        outline: outline.trim(),
        title: "Generating...", // Temporary title
      });

      // Step 2: Generate lesson content (await completion)
      
      // Use centralized generateLesson function
      const context = await generateLesson({
        outline: outline.trim(),
        langfuseTraceId: langfuseTrace.id,
        langfuseTrace: langfuseTrace,
        onProgress: (step: string, details?: string) => {
          langfuseTrace.event({
            name: step,
            metadata: {
              details,
              currentStep: context.getStep(),
              contentType: context.getContentType(),
            },
          });
        },
        onFinish: async (content: LessonContent) => {
          try {
            // Generate a proper title using AI
            const title = await generateLessonTitle(outline.trim(), {
              langfuseTraceId: langfuseTrace.id,
            });
            
            const description = context.getDescription();
            const lessonType = context.getContentType();
            
            const researchNotes: string[] = [];
            const searchHistory = context.getSearchHistory();
            if (searchHistory.length > 0) {
              researchNotes.push(`Searched ${searchHistory.length} queries`);
              searchHistory.forEach((q: any) => {
                researchNotes.push(`- "${q.query}": ${q.results.length} results`);
              });
            }
            
            const scrapedContent = context.getScrapedContent();
            if (scrapedContent.length > 0) {
              researchNotes.push(`\nScraped ${scrapedContent.length} pages`);
              scrapedContent.forEach((page: { url: string }) => {
                researchNotes.push(`- ${page.url}`);
              });
            }
            
            await updateLessonStatus({
              lessonId: lesson.id,
              status: 'generated',
              title,
              description: description ?? '',
              lessonType,
              content,
              researchNotes,
            });
            
            langfuseTrace.update({
              output: {
                status: 'success',
                lessonId: lesson.id,
                title,
                contentType: lessonType,
                stepsCompleted: context.getStep(),
              },
            });
            
            await langfuseTrace.score({
              name: 'lesson-generated',
              value: 1,
            });
            await langfuse.shutdownAsync();
          } catch (error) {
            await handleGenerationError(lesson.id, error, outline, langfuseTrace);
          }
        },
        onError: async (error: Error) => {
          await handleGenerationError(lesson.id, error, outline, langfuseTrace);
        },
      });
      
      // Return immediately
      return NextResponse.json({
        success: true,
        lesson: {
          id: lesson.id,
          status: 'generating',
          outline: outline.trim(),
        },
        langfuseTraceUrl: `https://cloud.langfuse.com/trace/${langfuseTrace.id}`,
        message: 'Lesson generation started. Check back in a moment.',
      });
    } catch (creationError) {
      // Log error to Langfuse
      langfuseTrace.update({
        output: {
          error:
            creationError instanceof Error
              ? creationError.message
              : String(creationError),
        },
      });      return NextResponse.json(
        {
          success: false,
          error: "Failed to create lesson",
          message:
            creationError instanceof Error
              ? creationError.message
              : String(creationError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
