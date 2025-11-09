import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { createLesson, updateLessonStatus } from "~/server/db/queries";
import { runLessonGeneration } from "~/lib/run-lesson-generation";
import { Langfuse } from "langfuse";
import { env } from "~/env";

const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

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

      // Step 2: Run lesson generation
      const result = await runLessonGeneration(outline, {
        langfuseTraceId: langfuseTrace.id,
        onProgress: (update) => {
          // Log progress to Langfuse
          langfuseTrace.event({
            name: update.step,
            metadata: {
              message: update.message,
              ...update.data,
            },
          });
        },
      });

      // Step 3: Update lesson with generated content
      await updateLessonStatus({
        lessonId: lesson.id,
        status: "generated",
        content: result.content,
        description: result.description,
        lessonType: result.lessonType,
        researchNotes: result.researchNotes,
      });

      // Update lesson title if generated title is better
      if (result.title && result.title !== "Generating...") {
        await updateLessonStatus({
          lessonId: lesson.id,
          status: "generated",
        });
      }

      // Finalize Langfuse trace
      langfuseTrace.update({
        output: {
          lessonId: lesson.id,
          lessonType: result.lessonType,
          title: result.title,
        },
      });

      return NextResponse.json(
        {
          success: true,
          lesson: {
            id: lesson.id,
            title: result.title,
            description: result.description,
            lessonType: result.lessonType,
            status: "generated",
          },
        },
        { status: 201 }
      );
    } catch (generationError) {
      // Log error to Langfuse
      langfuseTrace.update({
        output: {
          error: generationError instanceof Error
            ? generationError.message
            : String(generationError),
        },
      });

      // If lesson was created, mark it as failed
      // Note: We don't have the lesson ID here if creation failed
      // This is a best-effort error handling

      throw generationError;
    }
  } catch (error) {
    console.error("Error in POST /api/lessons:", error);

    return NextResponse.json(
      {
        error: "Failed to generate lesson",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
