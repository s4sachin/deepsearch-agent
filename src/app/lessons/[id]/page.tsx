import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { auth } from "~/server/auth";
import { getLesson } from "~/server/db/queries";
import { LessonRenderer } from "~/components/lesson-renderer";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // TEMPORARY: Authentication disabled - using anonymous user
  // const session = await auth();
  const session = {
    user: { id: "anonymous-user", name: "Anonymous", image: null },
  };

  if (!session?.user?.id) {
    return notFound();
  }

  const { id } = await params;
  const lesson = await getLesson({ lessonId: id, userId: session.user.id });

  if (!lesson) {
    return notFound();
  }

  // If lesson is still generating or failed, show status
  if (lesson.status !== "generated" || !lesson.content) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Link
            href="/lessons"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to lessons
          </Link>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-200 mb-4">
              {lesson.title}
            </h1>
            {lesson.status === "generating" && (
              <div className="text-gray-400">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-blue-500 mb-4" />
                <p className="text-lg">Generating lesson...</p>
                <p className="text-sm mt-2">
                  This usually takes 10-30 seconds
                </p>
              </div>
            )}
            {lesson.status === "failed" && (
              <div className="text-red-400">
                <p className="text-lg mb-2">❌ Generation failed</p>
                {lesson.errorMessage && (
                  <p className="text-sm text-gray-500">{lesson.errorMessage}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href="/lessons"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to lessons
        </Link>

        {/* Lesson header */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-100 mb-3">
            {lesson.title}
          </h1>

          {lesson.description && (
            <p className="text-gray-400 mb-4">{lesson.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {lesson.lessonType && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <span className="capitalize">{lesson.lessonType}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(lesson.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Lesson content */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <LessonRenderer content={lesson.content} />
        </div>
      </div>
    </div>
  );
}
