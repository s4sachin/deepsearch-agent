import { BookOpen } from "lucide-react";
import { auth } from "~/server/auth/index.ts";
import { getUserLessons } from "~/server/db/queries";
import { LessonForm } from "~/components/lesson-form";
import { LessonTable } from "~/components/lesson-table";

export default async function HomePage() {
  // TEMPORARY: Authentication disabled - using anonymous user
  // const session = await auth();
  const session = {
    user: { id: "anonymous-user", name: "Anonymous", image: null },
  };

  if (!session?.user?.id) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-300 mb-4">
            Please sign in
          </h1>
          <p className="text-gray-500">
            You need to be signed in to create lessons
          </p>
        </div>
      </div>
    );
  }

  // Fetch lessons for the user
  const lessons = await getUserLessons(session.user.id);

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-100">
              Lesson Generator
            </h1>
          </div>
          <p className="text-gray-400">
            Create interactive educational content with AI
          </p>
        </div>

        {/* Lesson Creation Form */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">
            Create a New Lesson
          </h2>
          <LessonForm />
        </div>

        {/* Lessons List */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">
            Your Lessons
          </h2>
          <LessonTable lessons={lessons} />
        </div>
      </div>
    </div>
  );
}
