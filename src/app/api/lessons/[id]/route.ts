import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getLesson } from "~/server/db/queries";

/**
 * GET /api/lessons/[id]
 * Fetch a specific lesson by ID
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id: lessonId } = await params;

    if (!lessonId) {
      return NextResponse.json(
        { error: "Lesson ID is required" },
        { status: 400 }
      );
    }

    // Fetch lesson with authorization check
    const lesson = await getLesson({ lessonId, userId });

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ lesson }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/lessons/[id]:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch lesson",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
