"use client";

import type { LessonContent } from "~/types/lesson";
import { QuizRenderer } from "./renderers/quiz-renderer";
import { TutorialRenderer } from "./renderers/tutorial-renderer";
import { FlashcardRenderer } from "./renderers/flashcard-renderer";

export const LessonRenderer = ({ content }: { content: LessonContent }) => {
  switch (content.type) {
    case "quiz":
      return <QuizRenderer content={content.data} />;
    case "tutorial":
      return <TutorialRenderer content={content.data} />;
    case "flashcard":
      return <FlashcardRenderer content={content.data} />;
    case "visualization":
    case "diagram":
      return (
        <div className="text-center py-8 text-gray-400">
          <p className="text-lg mb-2">🚧 Coming Soon</p>
          <p>
            {content.type.charAt(0).toUpperCase() + content.type.slice(1)}{" "}
            lessons are not yet implemented
          </p>
        </div>
      );
    default:
      return (
        <div className="text-center py-8 text-red-400">
          <p>Unsupported lesson type</p>
        </div>
      );
  }
};
