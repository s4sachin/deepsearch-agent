/**
 * Lesson Generation Dataset - Development
 * Size: 3 examples (quick testing)
 * Purpose: Test lesson generation for different content types
 */

export type LessonEvalDataItem = {
  input: string; // The outline/topic
  expected: {
    type: "quiz" | "tutorial" | "flashcard";
    minItems?: number; // Minimum questions/sections/cards expected
  };
};

export const lessonDevData: LessonEvalDataItem[] = [
  {
    input: "Create a 10 question quiz about the solar system",
    expected: {
      type: "quiz",
      minItems: 10,
    },
  },
  {
    input: "Generate a tutorial on how to use React hooks",
    expected: {
      type: "tutorial",
      minItems: 5,
    },
  },
  {
    input: "Make flashcards for learning basic Spanish vocabulary",
    expected: {
      type: "flashcard",
      minItems: 10,
    },
  },
];
