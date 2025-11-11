import { evalite } from "evalite";
import { askGenerateLesson } from "~/deep-search";
import type { LessonContent } from "~/types/lesson";
import { lessonDevData } from "./datasets/lesson-dev";

evalite("Lesson Generation Eval", {
  data: async () => lessonDevData,
  task: async (input: string) => {
    const result = await askGenerateLesson(input);
    
    // Convert LessonContent to JSON string for evaluation
    return JSON.stringify(result, null, 2);
  },
  scorers: [
    {
      name: "Valid Structure",
      description: "Checks if the output is valid JSON with required fields.",
      scorer: ({ output }) => {
        try {
          const content = JSON.parse(output) as LessonContent;
          
          // Check basic structure
          if (!content.type || !content.data) {
            return 0;
          }
          
          // Type-specific validation
          if (content.type === "quiz") {
            const quiz = content.data as any;
            if (!quiz.questions || !Array.isArray(quiz.questions)) {
              return 0;
            }
            if (quiz.questions.length < 5) {
              return 0.5; // Has questions but too few
            }
            return 1;
          }
          
          if (content.type === "tutorial") {
            const tutorial = content.data as any;
            if (!tutorial.sections || !Array.isArray(tutorial.sections)) {
              return 0;
            }
            if (tutorial.sections.length < 3) {
              return 0.5; // Has sections but too few
            }
            return 1;
          }
          
          if (content.type === "flashcard") {
            const flashcard = content.data as any;
            if (!flashcard.cards || !Array.isArray(flashcard.cards)) {
              return 0;
            }
            if (flashcard.cards.length < 5) {
              return 0.5; // Has cards but too few
            }
            return 1;
          }
          
          // Unknown type but has structure
          return 0.7;
        } catch (error) {
          return 0;
        }
      },
    },
    {
      name: "Content Type Match",
      description: "Checks if the generated content type matches the expected type.",
      scorer: ({ output, expected }) => {
        try {
          const content = JSON.parse(output) as LessonContent;
          
          if (!expected) return 0;
          
          // Parse expected data
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
      description: "Evaluates the quality and completeness of generated content.",
      scorer: ({ output }) => {
        try {
          const content = JSON.parse(output) as LessonContent;
          let score = 0;
          
          if (content.type === "quiz") {
            const quiz = content.data as any;
            const questions = quiz.questions || [];
            
            // Check each question has all required fields
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
            
            // Bonus points for explanations
            const withExplanations = validQuestions.filter((q: any) => q.explanation);
            if (withExplanations.length > validQuestions.length * 0.5) {
              score = Math.min(1, score + 0.1);
            }
          }
          
          if (content.type === "tutorial") {
            const tutorial = content.data as any;
            const sections = tutorial.sections || [];
            
            // Check each section has title and content
            const validSections = sections.filter((s: any) => 
              s.title && 
              s.content && 
              s.content.length > 50
            );
            
            score = validSections.length / Math.max(sections.length, 1);
            
            // Bonus for code examples
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
            
            // Check each card has front and back
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
  ],
});
