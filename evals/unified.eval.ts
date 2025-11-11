import { evalite } from "evalite";
import { askDeepSearch, askGenerateLesson } from "~/deep-search";
import type { UIMessage } from "ai";
import type { LessonContent } from "~/types/lesson";
import { checkFactuality } from "./scorers/factuality";
import { checkAnswerRelevancy } from "./scorers/answer-relevancy";
import { devData } from "./datasets/dev";
import { ciData } from "./datasets/ci";
import { env } from "~/env";

// ============================================================================
// CHAT EVALUATION
// ============================================================================

const chatData = [...devData];
if (env.EVAL_DATASET === "ci" || env.EVAL_DATASET === "regression") {
  chatData.push(...ciData);
}

evalite("Chat Mode - Deep Search", {
  data: async () => chatData,
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description: "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
        const containsLinks = markdownLinkRegex.test(output);
        return containsLinks ? 1 : 0;
      },
    },
    {
      name: "Factuality",
      description:
        "Uses an LLM judge to evaluate factual accuracy against ground truth.",
      scorer: async ({ input, expected, output }) => {
        const userMessage = input.find((msg) => msg.role === "user");
        const textPart = userMessage?.parts.find(
          (part: any) => part.type === "text"
        ) as { text: string } | undefined;
        const questionText = textPart?.text || "Unknown question";

        return checkFactuality({
          question: questionText,
          groundTruth: expected!,
          submission: output,
        });
      },
    },
    {
      name: "Answer Relevancy",
      description:
        "Uses an LLM judge to evaluate how relevant the answer is to the question.",
      scorer: async ({ input, output }) => {
        const userMessage = input.find((msg) => msg.role === "user");
        const textPart = userMessage?.parts.find(
          (part: any) => part.type === "text"
        ) as { text: string } | undefined;
        const questionText = textPart?.text || "Unknown question";

        return checkAnswerRelevancy({
          question: questionText,
          answer: output,
        });
      },
    },
  ],
});

// ============================================================================
// LESSON EVALUATION
// ============================================================================

type LessonEvalDataItem = {
  input: string;
  expected: {
    type: "quiz" | "tutorial" | "flashcard";
    minItems?: number;
  };
};

const lessonData: LessonEvalDataItem[] = [
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

evalite("Lesson Mode - Content Generation", {
  data: async () => lessonData,
  task: async (input: string) => {
    const result = await askGenerateLesson(input);
    return JSON.stringify(result, null, 2);
  },
  scorers: [
    {
      name: "Valid Structure",
      description: "Checks if the output is valid JSON with required fields.",
      scorer: ({ output }) => {
        try {
          const content = JSON.parse(output) as LessonContent;
          
          if (!content.type || !content.data) {
            return 0;
          }
          
          if (content.type === "quiz") {
            const quiz = content.data as any;
            if (!quiz.questions || !Array.isArray(quiz.questions)) return 0;
            if (quiz.questions.length < 5) return 0.5;
            return 1;
          }
          
          if (content.type === "tutorial") {
            const tutorial = content.data as any;
            if (!tutorial.sections || !Array.isArray(tutorial.sections)) return 0;
            if (tutorial.sections.length < 3) return 0.5;
            return 1;
          }
          
          if (content.type === "flashcard") {
            const flashcard = content.data as any;
            if (!flashcard.cards || !Array.isArray(flashcard.cards)) return 0;
            if (flashcard.cards.length < 5) return 0.5;
            return 1;
          }
          
          return 0.7;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      name: "Content Type Match",
      description: "Checks if the generated content type matches expected type.",
      scorer: ({ output, expected }) => {
        try {
          const content = JSON.parse(output) as LessonContent;
          
          if (!expected) return 0;
          
          const expectedData = typeof expected === 'string' 
            ? JSON.parse(expected) 
            : expected as { type: string };
          
          return content.type === expectedData.type ? 1 : 0;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      name: "Content Quality",
      description: "Evaluates quality and completeness of generated content.",
      scorer: ({ output }) => {
        try {
          const content = JSON.parse(output) as LessonContent;
          let score = 0;
          
          if (content.type === "quiz") {
            const quiz = content.data as any;
            const questions = quiz.questions || [];
            
            const validQuestions = questions.filter((q: any) => 
              q.question && 
              q.options && 
              Array.isArray(q.options) && 
              q.options.length === 4 &&
              typeof q.correctAnswer === 'number' &&
              q.correctAnswer >= 0 && 
              q.correctAnswer < 4
            );
            
            score = validQuestions.length / Math.max(questions.length, 1);
            
            const withExplanations = validQuestions.filter((q: any) => q.explanation);
            if (withExplanations.length > validQuestions.length * 0.5) {
              score = Math.min(1, score + 0.1);
            }
          }
          
          if (content.type === "tutorial") {
            const tutorial = content.data as any;
            const sections = tutorial.sections || [];
            
            const validSections = sections.filter((s: any) => 
              s.title && 
              s.content && 
              s.content.length > 50
            );
            
            score = validSections.length / Math.max(sections.length, 1);
            
            const withExamples = sections.filter((s: any) => 
              s.examples && Array.isArray(s.examples) && s.examples.length > 0
            );
            if (withExamples.length > 0) {
              score = Math.min(1, score + 0.1);
            }
          }
          
          if (content.type === "flashcard") {
            const flashcard = content.data as any;
            const cards = flashcard.cards || [];
            
            const validCards = cards.filter((c: any) => 
              c.front && 
              c.back && 
              c.front.length > 5 && 
              c.back.length > 10
            );
            
            score = validCards.length / Math.max(cards.length, 1);
          }
          
          return score;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      name: "Minimum Items",
      description: "Checks if generated content meets minimum item count.",
      scorer: ({ output, expected }) => {
        try {
          const content = JSON.parse(output) as LessonContent;
          
          if (!expected) return 1;
          
          const expectedData = typeof expected === 'string' 
            ? JSON.parse(expected) 
            : expected as { minItems?: number };
          
          if (!expectedData.minItems) return 1;
          
          let itemCount = 0;
          
          if (content.type === "quiz") {
            const quiz = content.data as any;
            itemCount = quiz.questions?.length || 0;
          } else if (content.type === "tutorial") {
            const tutorial = content.data as any;
            itemCount = tutorial.sections?.length || 0;
          } else if (content.type === "flashcard") {
            const flashcard = content.data as any;
            itemCount = flashcard.cards?.length || 0;
          }
          
          if (itemCount >= expectedData.minItems) return 1;
          if (itemCount >= expectedData.minItems * 0.8) return 0.8;
          if (itemCount >= expectedData.minItems * 0.6) return 0.6;
          return 0;
        } catch (error) {
          return 0;
        }
      },
    },
  ],
});
