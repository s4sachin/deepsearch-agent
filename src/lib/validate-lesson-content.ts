import { z } from "zod";
import type { LessonContent } from "~/types/lesson";

// ========== ZOD SCHEMAS ==========

/**
 * Quiz Question Schema
 */
const QuizQuestionSchema = z.object({
  id: z.string().min(1, "Question ID is required"),
  question: z.string().min(10, "Question must be at least 10 characters"),
  options: z.tuple([
    z.string().min(1),
    z.string().min(1),
    z.string().min(1),
    z.string().min(1),
  ]).describe("Exactly 4 options required"),
  correctAnswer: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]).describe("Correct answer index (0-3)"),
  explanation: z.string().optional(),
  points: z.number().positive().optional(),
});

/**
 * Quiz Content Schema
 */
const QuizContentSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1, "At least one question required"),
  totalPoints: z.number().positive().optional(),
  timeLimit: z.number().positive().optional(),
  passingScore: z.number().min(0).max(100).optional(),
});

/**
 * Tutorial Section Schema
 */
const TutorialSectionSchema = z.object({
  id: z.string().min(1, "Section ID is required"),
  title: z.string().min(1, "Section title is required"),
  content: z.string().min(10, "Section content must be at least 10 characters"),
  examples: z.array(z.object({
    language: z.string().optional(),
    code: z.string().min(1, "Code example cannot be empty"),
    explanation: z.string().optional(),
  })).optional(),
  order: z.number().int().min(0),
});

/**
 * Tutorial Content Schema
 */
const TutorialContentSchema = z.object({
  sections: z.array(TutorialSectionSchema).min(1, "At least one section required"),
  estimatedReadTime: z.number().positive().optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  prerequisites: z.array(z.string()).optional(),
});

/**
 * Flashcard Schema
 */
const FlashcardSchema = z.object({
  id: z.string().min(1, "Flashcard ID is required"),
  front: z.string().min(1, "Front of flashcard cannot be empty"),
  back: z.string().min(1, "Back of flashcard cannot be empty"),
  category: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

/**
 * Flashcard Content Schema
 */
const FlashcardContentSchema = z.object({
  cards: z.array(FlashcardSchema).min(1, "At least one flashcard required"),
  totalCards: z.number().int().positive(),
  categories: z.array(z.string()).optional(),
});

/**
 * Visualization Content Schema (future)
 */
const VisualizationContentSchema = z.object({
  type: z.enum(["chart", "graph", "timeline"]),
  data: z.record(z.unknown()),
  config: z.record(z.unknown()).optional(),
});

/**
 * Diagram Content Schema (future)
 */
const DiagramContentSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.string().optional(),
    data: z.record(z.unknown()).optional(),
  })).min(1, "At least one node required"),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
  })),
  layout: z.enum(["horizontal", "vertical", "radial"]).optional(),
});

/**
 * Complete Lesson Content Schema (discriminated union)
 */
const LessonContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("quiz"),
    data: QuizContentSchema,
  }),
  z.object({
    type: z.literal("tutorial"),
    data: TutorialContentSchema,
  }),
  z.object({
    type: z.literal("flashcard"),
    data: FlashcardContentSchema,
  }),
  z.object({
    type: z.literal("visualization"),
    data: VisualizationContentSchema,
  }),
  z.object({
    type: z.literal("diagram"),
    data: DiagramContentSchema,
  }),
]);

// ========== VALIDATION FUNCTIONS ==========

/**
 * Validation result type
 */
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  data?: LessonContent;
};

/**
 * Validate lesson content against Zod schema
 * This is the primary validation layer
 */
export const validateLessonContent = (content: unknown): ValidationResult => {
  try {
    const parsed = LessonContentSchema.parse(content);
    return { isValid: true, errors: [], data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        ),
      };
    }
    return {
      isValid: false,
      errors: ["Unknown validation error: " + String(error)],
    };
  }
};

/**
 * Content quality validation result
 */
export type QualityValidationResult = {
  isValid: boolean;
  warnings: string[];
};

/**
 * Validate quiz content quality
 */
const validateQuizQuality = (
  content: Extract<LessonContent, { type: "quiz" }>
): QualityValidationResult => {
  const warnings: string[] = [];
  const { questions } = content.data;

  // Check for duplicate questions
  const questionTexts = new Set<string>();
  questions.forEach((q) => {
    const normalized = q.question.toLowerCase().trim();
    if (questionTexts.has(normalized)) {
      warnings.push(`Duplicate question detected: "${q.question.substring(0, 50)}..."`);
    }
    questionTexts.add(normalized);
  });

  // Check for too-short questions
  questions.forEach((q) => {
    if (q.question.length < 20) {
      warnings.push(`Question "${q.id}" is too short (${q.question.length} chars)`);
    }
  });

  // Check for duplicate options within a question
  questions.forEach((q) => {
    const optionSet = new Set(q.options.map((o) => o.toLowerCase().trim()));
    if (optionSet.size < 4) {
      warnings.push(`Question "${q.id}" has duplicate options`);
    }
  });

  // Check if correct answer is not obviously distinct
  questions.forEach((q) => {
    const correct = q.options[q.correctAnswer].toLowerCase();
    const otherOptions = q.options
      .filter((_, i) => i !== q.correctAnswer)
      .map((o) => o.toLowerCase());

    // Simple check: if correct answer is too similar to another option
    otherOptions.forEach((other) => {
      if (correct === other) {
        warnings.push(`Question "${q.id}" has identical correct and incorrect options`);
      }
    });
  });

  // Check for missing explanations (optional but recommended)
  const missingExplanations = questions.filter((q) => !q.explanation);
  if (missingExplanations.length > questions.length * 0.5) {
    warnings.push(`More than half of questions (${missingExplanations.length}/${questions.length}) are missing explanations`);
  }

  return { isValid: warnings.length === 0, warnings };
};

/**
 * Validate tutorial content quality
 */
const validateTutorialQuality = (
  content: Extract<LessonContent, { type: "tutorial" }>
): QualityValidationResult => {
  const warnings: string[] = [];
  const { sections } = content.data;

  // Check for duplicate section titles
  const sectionTitles = new Set<string>();
  sections.forEach((s) => {
    const normalized = s.title.toLowerCase().trim();
    if (sectionTitles.has(normalized)) {
      warnings.push(`Duplicate section title: "${s.title}"`);
    }
    sectionTitles.add(normalized);
  });

  // Check for too-short sections
  sections.forEach((s) => {
    if (s.content.length < 50) {
      warnings.push(`Section "${s.title}" is too short (${s.content.length} chars)`);
    }
  });

  // Check section ordering
  const orders = sections.map((s) => s.order);
  const sortedOrders = [...orders].sort((a, b) => a - b);
  if (JSON.stringify(orders) !== JSON.stringify(sortedOrders)) {
    warnings.push("Section ordering is not sequential");
  }

  // Check for missing code examples in technical tutorials
  const hasCodingKeywords = sections.some((s) =>
    /\b(code|function|class|method|variable|syntax|programming|algorithm)\b/i.test(
      s.title + " " + s.content
    )
  );
  const hasExamples = sections.some((s) => s.examples && s.examples.length > 0);
  if (hasCodingKeywords && !hasExamples) {
    warnings.push("Tutorial appears technical but has no code examples");
  }

  return { isValid: warnings.length === 0, warnings };
};

/**
 * Validate flashcard content quality
 */
const validateFlashcardQuality = (
  content: Extract<LessonContent, { type: "flashcard" }>
): QualityValidationResult => {
  const warnings: string[] = [];
  const { cards, totalCards } = content.data;

  // Check if totalCards matches actual count
  if (totalCards !== cards.length) {
    warnings.push(`totalCards (${totalCards}) doesn't match actual card count (${cards.length})`);
  }

  // Check for duplicate fronts
  const frontTexts = new Set<string>();
  cards.forEach((c) => {
    const normalized = c.front.toLowerCase().trim();
    if (frontTexts.has(normalized)) {
      warnings.push(`Duplicate flashcard front: "${c.front.substring(0, 50)}..."`);
    }
    frontTexts.add(normalized);
  });

  // Check for too-short cards
  cards.forEach((c) => {
    if (c.front.length < 5) {
      warnings.push(`Flashcard "${c.id}" front is too short`);
    }
    if (c.back.length < 5) {
      warnings.push(`Flashcard "${c.id}" back is too short`);
    }
  });

  // Check for front === back (which is pointless)
  cards.forEach((c) => {
    if (c.front.toLowerCase().trim() === c.back.toLowerCase().trim()) {
      warnings.push(`Flashcard "${c.id}" has identical front and back`);
    }
  });

  return { isValid: warnings.length === 0, warnings };
};

/**
 * Validate lesson content quality (secondary validation layer)
 * This checks for educational quality issues beyond structure
 */
export const validateContentQuality = (
  content: LessonContent
): QualityValidationResult => {
  switch (content.type) {
    case "quiz":
      return validateQuizQuality(content);
    case "tutorial":
      return validateTutorialQuality(content);
    case "flashcard":
      return validateFlashcardQuality(content);
    case "visualization":
    case "diagram":
      // Future: add quality checks for these types
      return { isValid: true, warnings: [] };
    default:
      return { isValid: true, warnings: [] };
  }
};

/**
 * Complete validation: structure + quality
 */
export const validateLessonCompletely = (
  content: unknown
): ValidationResult & { qualityWarnings?: string[] } => {
  // First, validate structure
  const structureValidation = validateLessonContent(content);
  if (!structureValidation.isValid || !structureValidation.data) {
    return structureValidation;
  }

  // Then, validate quality
  const qualityValidation = validateContentQuality(structureValidation.data);

  return {
    isValid: structureValidation.isValid && qualityValidation.isValid,
    errors: structureValidation.errors,
    data: structureValidation.data,
    qualityWarnings: qualityValidation.warnings,
  };
};
