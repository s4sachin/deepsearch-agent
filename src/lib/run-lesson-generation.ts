import { generateObject, generateText } from "ai";
import { model } from "~/agent";
import { LessonContext } from "./lesson-context";
import {
  validateLessonCompletely,
  type ValidationResult,
} from "./validate-lesson-content";
import {
  getLessonTypePrompt,
  getTitleDescriptionPrompt,
  getContentGenerationPrompt,
} from "./content-generation-prompts";
import type { LessonType, LessonContent } from "~/types/lesson";
import { z } from "zod";

const MAX_GENERATION_RETRIES = 3;

/**
 * Actions that the lesson generation loop can take
 */
type LessonGenerationAction =
  | { type: "determine_type" }
  | { type: "generate_content" }
  | { type: "validate" }
  | { type: "complete" };

/**
 * Determine the lesson type from the outline
 */
const determineLessonType = async (
  ctx: LessonContext,
  options?: { langfuseTraceId?: string }
): Promise<{
  lessonType: LessonType;
  title: string;
  description: string;
}> => {
  const prompt = getLessonTypePrompt(ctx.getOutline());

  const { object } = await generateObject({
    model,
    schema: z.object({
      lessonType: z.enum([
        "quiz",
        "tutorial",
        "flashcard",
        "visualization",
        "diagram",
      ]),
      title: z.string(),
      description: z.string(),
    }),
    prompt,
    experimental_telemetry: options?.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "determine-lesson-type",
          metadata: {
            langfuseTraceId: options.langfuseTraceId,
          },
        }
      : undefined,
  });

  return object;
};

/**
 * Generate lesson content using LLM
 */
const generateLessonContent = async (
  ctx: LessonContext,
  options?: { langfuseTraceId?: string }
): Promise<{ content: string; rawResponse: string }> => {
  const lessonType = ctx.getLessonType();
  if (!lessonType) {
    throw new Error("Lesson type must be determined before generating content");
  }

  const prompt = getContentGenerationPrompt({
    lessonType,
    outline: ctx.getOutline(),
    researchNotes: ctx.getResearchNotesFormatted(),
    previousErrors: ctx.getPreviousErrors(),
  });

  const { text } = await generateText({
    model,
    prompt,
    experimental_telemetry: options?.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "generate-lesson-content",
          metadata: {
            langfuseTraceId: options.langfuseTraceId,
            lessonType,
            attemptNumber: ctx.getAttemptCount() + 1,
          },
        }
      : undefined,
  });

  // Try to extract JSON from the response
  // LLMs sometimes wrap JSON in markdown code blocks despite instructions
  let content = text.trim();

  // Remove markdown code blocks if present
  const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    content = jsonBlockMatch[1]!.trim();
  }

  return { content, rawResponse: text };
};

/**
 * Parse and validate generated content
 */
const parseAndValidate = (
  contentString: string
): ValidationResult & { qualityWarnings?: string[] } => {
  // First, try to parse as JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentString);
  } catch (error) {
    return {
      isValid: false,
      errors: [
        `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  // Then validate structure and quality
  return validateLessonCompletely(parsed);
};

/**
 * Get the next action to take in the generation loop
 */
const getNextAction = (ctx: LessonContext): LessonGenerationAction => {
  // Step 1: Determine lesson type if not yet done
  if (!ctx.getLessonType()) {
    return { type: "determine_type" };
  }

  // Step 2: If we have content, we're done
  if (ctx.hasContent()) {
    return { type: "complete" };
  }

  // Step 3: If we've exceeded max retries, force complete (will fail)
  if (ctx.getAttemptCount() >= MAX_GENERATION_RETRIES) {
    return { type: "complete" };
  }

  // Step 4: Generate or validate content
  if (ctx.getAttemptCount() === 0 || ctx.getPreviousErrors().length > 0) {
    return { type: "generate_content" };
  }

  return { type: "validate" };
};

/**
 * Main lesson generation loop
 * Returns the generated lesson content or throws an error
 */
export const runLessonGeneration = async (
  outline: string,
  options?: {
    langfuseTraceId?: string;
    onProgress?: (update: {
      step: string;
      message: string;
      data?: Record<string, unknown>;
    }) => void;
  }
): Promise<{
  lessonType: LessonType;
  title: string;
  description: string;
  content: LessonContent;
  researchNotes: string[];
}> => {
  const ctx = new LessonContext(outline);
  const { onProgress } = options ?? {};

  onProgress?.({
    step: "initializing",
    message: "Starting lesson generation...",
  });

  // Main generation loop
  while (!ctx.shouldStop()) {
    const action = getNextAction(ctx);

    if (action.type === "determine_type") {
      onProgress?.({
        step: "determining_type",
        message: "Analyzing lesson outline to determine type...",
      });

      const { lessonType, title, description } = await determineLessonType(
        ctx,
        options
      );

      ctx.setLessonType(lessonType);
      ctx.setTitle(title);
      ctx.setDescription(description);

      onProgress?.({
        step: "type_determined",
        message: `Lesson type determined: ${lessonType}`,
        data: { lessonType, title, description },
      });
    } else if (action.type === "generate_content") {
      const attemptNum = ctx.getAttemptCount() + 1;
      onProgress?.({
        step: "generating_content",
        message: `Generating ${ctx.getLessonType()} content (attempt ${attemptNum}/${MAX_GENERATION_RETRIES})...`,
        data: { attemptNumber: attemptNum },
      });

      const { content: contentString, rawResponse } =
        await generateLessonContent(ctx, options);

      onProgress?.({
        step: "validating",
        message: "Validating generated content...",
      });

      // Parse and validate
      const validation = parseAndValidate(contentString);

      if (validation.isValid && validation.data) {
        // Success!
        ctx.setContent(validation.data);
        ctx.recordGenerationAttempt({ content: validation.data });

        // Log quality warnings but don't fail
        if (validation.qualityWarnings && validation.qualityWarnings.length > 0) {
          onProgress?.({
            step: "quality_warnings",
            message: `Content generated with ${validation.qualityWarnings.length} quality warnings`,
            data: { warnings: validation.qualityWarnings },
          });
        } else {
          onProgress?.({
            step: "content_generated",
            message: "Content generated successfully!",
          });
        }
      } else {
        // Validation failed - record attempt with errors
        ctx.recordGenerationAttempt({ errors: validation.errors });

        onProgress?.({
          step: "validation_failed",
          message: `Validation failed (attempt ${attemptNum}/${MAX_GENERATION_RETRIES})`,
          data: { errors: validation.errors },
        });

        // If this was the last attempt, we'll fail
        if (attemptNum >= MAX_GENERATION_RETRIES) {
          throw new Error(
            `Failed to generate valid content after ${MAX_GENERATION_RETRIES} attempts. Errors: ${validation.errors.join(", ")}`
          );
        }
      }
    } else if (action.type === "complete") {
      if (!ctx.hasContent()) {
        throw new Error(
          "Cannot complete: no valid content generated. " +
            (ctx.getPreviousErrors().length > 0
              ? `Errors: ${ctx.getPreviousErrors().join(", ")}`
              : "Unknown error")
        );
      }

      onProgress?.({
        step: "complete",
        message: "Lesson generation complete!",
      });

      break;
    }

    ctx.incrementStep();
  }

  // Ensure we have all required data
  const lessonType = ctx.getLessonType();
  const title = ctx.getTitle();
  const description = ctx.getDescription();
  const content = ctx.getContent();

  if (!lessonType || !title || !content) {
    throw new Error(
      "Lesson generation incomplete: missing required data. " +
        `Type: ${lessonType}, Title: ${title}, Content: ${content ? "present" : "missing"}`
    );
  }

  return {
    lessonType,
    title,
    description: description ?? "",
    content,
    researchNotes: ctx.getResearchNotes().map((n) => n.summary),
  };
};
