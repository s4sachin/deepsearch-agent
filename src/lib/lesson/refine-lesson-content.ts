import { generateObject } from "ai";
import type { AgentContext } from "../unified/agent-context";
import type { LessonContent } from "~/types/lesson";
import {
  QuizContentSchema,
  TutorialContentSchema,
  FlashcardContentSchema,
} from "../validate-lesson-content";
import { model } from "~/agent";

// Type for contexts that support structured content generation
// Previously supported both LessonContext and AgentContext, now unified to AgentContext
type StructuredContext = AgentContext;

/**
 * Refine lesson content based on validation errors or quality feedback
 * Attempts to fix issues while preserving good parts of the content
 */
export async function refineLessonContent(
  context: StructuredContext,
  feedback: string
): Promise<LessonContent> {
  const lessonType = context.getContentType();
  const currentContent = context.getContent();

  if (!lessonType) {
    throw new Error("Lesson type must be determined before refinement");
  }

  if (!currentContent) {
    throw new Error("No content to refine");
  }

  const schema = getSchemaForLessonType(lessonType);
  const prompt = buildRefinementPrompt(context, currentContent, feedback);

  try {
    const result = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.5, // Lower temp for more focused fixes
    });

    // Wrap result with type discriminator
    const refinedContent = {
      type: lessonType as "quiz" | "tutorial" | "flashcard",
      data: result.object,
    } as LessonContent;

    // Record refinement in context
    context.recordRefinement(feedback, refinedContent);

    return refinedContent;
  } catch (error) {
    throw error;
  }
}

/**
 * Get appropriate Zod schema based on lesson type
 */
function getSchemaForLessonType(lessonType: string) {
  switch (lessonType) {
    case "quiz":
      return QuizContentSchema;
    case "tutorial":
      return TutorialContentSchema;
    case "flashcard":
      return FlashcardContentSchema;
    default:
      throw new Error(`Unknown lesson type: ${lessonType}`);
  }
}

/**
 * Build refinement prompt that preserves good content
 */
function buildRefinementPrompt(
  context: StructuredContext,
  currentContent: LessonContent,
  feedback: string
): string {
  // Get outline from title and description
  const getOutline = () => {
    const title = context.getTitle();
    const description = context.getDescription();
    if (title && description) {
      return `${title}\n\n${description}`;
    }
    if (title) {
      return title;
    }
    // Fallback: get from first user message
    const messages = context.getMessages();
    const firstUserMessage = messages.find(m => m.role === 'user');
    return firstUserMessage ? String(firstUserMessage) : 'No outline available';
  };

  const outline = getOutline();
  const lessonType = context.getContentType();
  const researchSummary = context.getResearchSummary();

  return `You are refining educational content based on specific feedback. Your goal is to fix identified issues while preserving all the good aspects of the existing content.

## Original Topic/Outline:
${outline}

## Content Type: ${lessonType?.toUpperCase()}

## Current Content:
${JSON.stringify(currentContent, null, 2)}

## Specific Issues to Address:
${feedback}

## Research Context (for reference):
${researchSummary}

## Refinement Guidelines:

**What to Preserve:**
- Keep ALL content that is working well
- Maintain the overall structure unless specifically problematic
- Preserve accurate information and good examples
- Keep the existing style and tone consistency
- Retain quality explanations and clear language

**What to Fix:**
- Address ONLY the specific issues mentioned in the feedback above
- Fix validation errors (incorrect formats, missing fields, etc.)
- Correct factual inaccuracies if identified
- Improve clarity if explanations are confusing
- Adjust difficulty level if feedback indicates it's needed

**Quality Standards:**
- Ensure the refined content validates correctly against the schema
- Maintain pedagogical quality throughout
- Keep consistency in difficulty and style
- Don't introduce new errors while fixing old ones
- Make surgical changes, not wholesale rewrites

**Approach:**
- Read the feedback carefully and understand each issue
- Make targeted fixes to address those specific problems
- Verify that your changes don't break other parts of the content
- Ensure the refined version is better than the original

Create the refined ${lessonType} content now, addressing the feedback while preserving everything that was already good.
`.trim();
}

/**
 * Generate feedback from validation errors
 */
export function generateValidationFeedback(errors: string[]): string {
  if (errors.length === 0) {
    return "No validation errors found.";
  }

  const feedback = [
    "The generated content has validation errors that must be fixed:",
    "",
    ...errors.map((error, i) => `${i + 1}. ${error}`),
    "",
    "Please address each of these issues while keeping the rest of the content intact.",
    "Focus on fixing the specific problems without changing content that is working correctly.",
  ];

  return feedback.join("\n");
}

/**
 * Generate quality feedback based on content analysis
 * Used for iterative improvement even when validation passes
 */
export async function generateQualityFeedback(
  content: LessonContent,
  context: StructuredContext
): Promise<string | null> {
  // Check content quality based on type
  const issues: string[] = [];

  if (content.type === "quiz") {
    const questions = content.data.questions;
    
    if (questions.length < 3) {
      issues.push("Quiz has too few questions (minimum 3 recommended)");
    }

    // Check for duplicate questions
    const questionTexts = new Set();
    for (const q of questions) {
      if (questionTexts.has(q.question)) {
        issues.push(`Duplicate question found: "${q.question}"`);
      }
      questionTexts.add(q.question);
    }

    // Check for missing explanations
    const withoutExplanation = questions.filter(q => !q.explanation);
    if (withoutExplanation.length > questions.length / 2) {
      issues.push("More than half of questions lack explanations");
    }
  } else if (content.type === "tutorial") {
    const sections = content.data.sections;
    
    if (sections.length < 2) {
      issues.push("Tutorial should have at least 2 sections");
    }

    // Check for very short sections
    const shortSections = sections.filter(s => s.content.length < 100);
    if (shortSections.length > 0) {
      issues.push(`${shortSections.length} section(s) are too brief (< 100 chars)`);
    }

    // Check if tutorial has any code examples
    const hasCode = sections.some(s => s.examples && s.examples.length > 0);
    const outline = context.getTitle() ?? context.getDescription() ?? '';
    if (!hasCode && outline && outline.toLowerCase().includes("code")) {
      issues.push("Topic suggests code examples but none were provided");
    }
  } else if (content.type === "flashcard") {
    const cards = content.data.cards;
    
    if (cards.length < 5) {
      issues.push("Flashcard set has too few cards (minimum 5 recommended)");
    }

    // Check for very short backs (inadequate definitions)
    const shortBacks = cards.filter(c => c.back.length < 20);
    if (shortBacks.length > 0) {
      issues.push(`${shortBacks.length} card(s) have very brief backs (< 20 chars)`);
    }
  }

  // Return feedback if issues found
  if (issues.length > 0) {
    return `Content quality issues:\n${issues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}`;
  }

  return null; // No quality issues
}