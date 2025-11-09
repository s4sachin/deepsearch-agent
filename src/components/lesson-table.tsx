"use client";

import Link from "next/link";
import type { DB } from "~/server/db/schema";
import { CheckCircle2, Clock, XCircle, BookOpen, FileQuestion, Brain } from "lucide-react";

type Lesson = DB.Lesson;

interface LessonTableProps {
  lessons: Lesson[];
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "generated":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "generating":
      return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
    case "failed":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "generated":
      return "Generated";
    case "generating":
      return "Generating...";
    case "failed":
      return "Failed";
    default:
      return status;
  }
};

const getLessonTypeIcon = (type: string | null) => {
  switch (type) {
    case "quiz":
      return <FileQuestion className="h-4 w-4" />;
    case "tutorial":
      return <BookOpen className="h-4 w-4" />;
    case "flashcard":
      return <Brain className="h-4 w-4" />;
    default:
      return <BookOpen className="h-4 w-4" />;
  }
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const LessonTable = ({ lessons }: LessonTableProps) => {
  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-400 mb-2">
          No lessons yet
        </h3>
        <p className="text-sm text-gray-500">
          Create your first lesson using the form above!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Lesson
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {lessons.map((lesson) => (
            <tr
              key={lesson.id}
              className="hover:bg-gray-800/50 transition-colors"
            >
              <td className="px-4 py-4">
                {lesson.status === "generated" ? (
                  <Link
                    href={`/lessons/${lesson.id}`}
                    className="block group"
                  >
                    <div className="font-medium text-gray-200 group-hover:text-blue-400 transition-colors">
                      {lesson.title}
                    </div>
                    {lesson.description && (
                      <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {lesson.description}
                      </div>
                    )}
                  </Link>
                ) : (
                  <div>
                    <div className="font-medium text-gray-200">
                      {lesson.title}
                    </div>
                    {lesson.status === "failed" && lesson.errorMessage && (
                      <div className="text-sm text-red-400 mt-1 line-clamp-2">
                        {lesson.errorMessage}
                      </div>
                    )}
                    {lesson.status === "generating" && (
                      <div className="text-sm text-gray-500 mt-1">
                        Generating content...
                      </div>
                    )}
                  </div>
                )}
              </td>
              <td className="px-4 py-4">
                {lesson.lessonType ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    {getLessonTypeIcon(lesson.lessonType)}
                    <span className="text-sm capitalize">
                      {lesson.lessonType}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-600">—</span>
                )}
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(lesson.status)}
                  <span className="text-sm text-gray-300">
                    {getStatusText(lesson.status)}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-gray-500">
                  {formatDate(lesson.createdAt)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
