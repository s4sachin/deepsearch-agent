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
 * Generate lesson content enriched with research
 * Uses scraped content and search results in the generation prompt
 */
export async function generateLessonWithResearch(
  context: StructuredContext
): Promise<LessonContent> {
  const lessonType = context.getContentType();
  
  if (!lessonType) {
    throw new Error("Lesson type must be determined before generation");
  }

  const schema = getSchemaForLessonType(lessonType);
  const prompt = buildEnrichedGenerationPrompt(context);

  try {
    const result = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.7,
    });

    // Wrap result with type discriminator
    return {
      type: lessonType as "quiz" | "tutorial" | "flashcard",
      data: result.object,
    } as LessonContent;
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
 * Build generation prompt that includes research context
 */
function buildEnrichedGenerationPrompt(context: StructuredContext): string {
  // Get outline from title and description (set during type determination)
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

  const getLessonType = () => {
    return context.getContentType();
  };

  const getPreviousErrors = () => {
    // AgentContext stores errors in generation attempts
    const attempts = context.getGenerationAttempts();
    const latestAttempt = attempts[attempts.length - 1];
    return latestAttempt?.errors ?? [];
  };

  const outline = getOutline();
  const lessonType = getLessonType();
  const researchSummary = context.getResearchSummary();
  const previousErrors = getPreviousErrors();

  const typeInstructions = getTypeSpecificInstructions(lessonType!);

  let prompt = `You are an expert educational content creator with deep knowledge of pedagogy and instructional design. Your goal is to create high-quality, engaging, and accurate educational content that helps learners understand and retain information effectively.

## Topic/Outline:
${outline}

## Content Type: ${lessonType?.toUpperCase()}

${typeInstructions}

## Research Context:
Below is comprehensive research gathered from authoritative sources. Use this information to create accurate, well-sourced educational material.

${researchSummary}

## Generation Guidelines:

**Use Research Effectively:**
- Base your content on factual information from the scraped pages above
- Reference specific examples, code snippets, or facts from the sources
- Synthesize information from multiple sources when available
- Prioritize recent information when dealing with time-sensitive topics
- Ensure all facts, statistics, and examples are grounded in the research

**Quality Standards:**
- Make content clear, accurate, and pedagogically sound
- Progress from foundational concepts to more complex ideas
- Include practical examples that illustrate key points
- Write explanations that are accessible yet thorough
- Ensure consistency in difficulty level and style throughout

**Formatting:**
- Use proper grammar and punctuation
- Keep language clear and professional yet engaging
- Structure content logically for easy learning progression
`;

  // Add error feedback if this is a retry
  if (previousErrors.length > 0) {
    prompt += `

## Previous Generation Errors:
The following issues occurred in previous attempts. Please address them:

${previousErrors.map((error, i) => `${i + 1}. ${error}`).join("\n")}

Fix these specific issues while maintaining the quality of the rest of the content.
`;
  }

  return prompt.trim();
}

/**
 * Get type-specific generation instructions
 */
function getTypeSpecificInstructions(lessonType: string): string {
  switch (lessonType) {
    case "quiz":
      return `
### Quiz Creation Requirements:

**Structure:**
- Generate 5-10 multiple choice questions
- Each question must have exactly 4 answer options
- Include one clearly correct answer and three plausible distractors
- Provide detailed explanations for why the correct answer is right

**Question Quality:**
- Base questions on factual information from the research provided
- Vary difficulty levels (mix easy, medium, and challenging questions)
- Test understanding, not just memorization
- Make questions clear and unambiguous
- Ensure distractors are plausible but definitively incorrect

**Explanations:**
- Explain WHY the correct answer is right
- Reference the source material when applicable
- Help learners understand the concept, not just the answer
- Keep explanations concise but thorough (2-4 sentences)

**Content Guidelines:**
- Use precise language in questions and answers
- Avoid trick questions or ambiguous wording
- Include relevant context in the question when needed
- Ensure all facts and figures are from the research sources
`.trim();

    case "tutorial":
      return `
### Tutorial Creation Requirements:

**Structure:**
- Create 3-5 well-organized sections with descriptive titles
- Each section should build logically on the previous one
- Progress from basic concepts to more advanced topics
- Include clear transitions between sections

**Content Quality:**
- Provide step-by-step explanations that are easy to follow
- Include practical, working code examples from the research
- Explain both WHAT the code does and WHY it works that way
- Add helpful tips, best practices, or common pitfalls to avoid
- Use concrete examples that learners can relate to

**Code Examples:**
- Include real, runnable code snippets
- Add comments to explain complex or important parts
- Show expected input/output when relevant
- Use code from the research sources whenever possible
- Ensure examples are complete enough to be educational

**Teaching Approach:**
- Start with fundamentals before introducing complexity
- Use analogies or comparisons to aid understanding
- Anticipate questions learners might have
- Provide context for why techniques or approaches are used
`.trim();

    case "flashcard":
      return `
### Flashcard Creation Requirements:

**Structure:**
- Create 8-15 flashcards covering key concepts
- Each flashcard has a "front" (term/question) and "back" (definition/answer)
- Progress from foundational to advanced concepts
- Cover the most important ideas from the topic

**Front (Term/Question):**
- Keep it concise and clear (usually 1-10 words)
- Can be a term to define, a question to answer, or a concept to explain
- Make it specific enough to have one clear answer

**Back (Definition/Answer):**
- Provide a clear, accurate definition or answer
- Include helpful context or examples (2-4 sentences)
- Reference the research sources when applicable
- Explain relationships to related concepts when relevant

**Content Guidelines:**
- Base all information on the research provided
- Use precise, accurate terminology
- Include enough detail to aid understanding and retention
- Ensure definitions are complete but not overly verbose
- Connect concepts to practical applications when possible
`.trim();

    default:
      return "";
  }
}

/**
 * Generate lesson content WITHOUT research (fallback)
 * Used when research fails or isn't needed
 */
export async function generateLessonWithoutResearch(
  context: StructuredContext
): Promise<LessonContent> {
  const lessonType = context.getContentType();
  
  if (!lessonType) {
    throw new Error("Lesson type must be determined before generation");
  }

  const schema = getSchemaForLessonType(lessonType);
  const prompt = buildBasicGenerationPrompt(context);

  try {
    const result = await generateObject({
      model,
      schema,
      prompt,
      temperature: 0.7,
    });

    // Wrap result with type discriminator
    return {
      type: lessonType as "quiz" | "tutorial" | "flashcard",
      data: result.object,
    } as LessonContent;
  } catch (error) {
    throw error;
  }
}

/**
 * Build basic generation prompt without research
 */
function buildBasicGenerationPrompt(context: StructuredContext): string {
  // Get outline from title and description (set during type determination)
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

  const getLessonType = () => {
    return context.getContentType();
  };

  const getPreviousErrors = () => {
    // AgentContext stores errors in generation attempts
    const attempts = context.getGenerationAttempts();
    const latestAttempt = attempts[attempts.length - 1];
    return latestAttempt?.errors ?? [];
  };

  const outline = getOutline();
  const lessonType = getLessonType();
  const previousErrors = getPreviousErrors();
  
  const typeInstructions = getTypeSpecificInstructions(lessonType!);

  let prompt = `You are an expert educational content creator with deep knowledge across many subjects. Create high-quality ${lessonType} content based on your training knowledge.

## Topic/Outline:
${outline}

## Content Type: ${lessonType?.toUpperCase()}

${typeInstructions}

## Generation Guidelines:

**Quality Standards:**
- Create accurate, pedagogically sound content
- Use clear, accessible language appropriate for learners
- Progress logically from basic to more advanced concepts
- Include practical examples to illustrate key points
- Ensure all information is factually correct

**Teaching Approach:**
- Make content engaging and easy to understand
- Anticipate common questions or confusion points
- Provide sufficient detail without overwhelming learners
- Connect concepts to real-world applications when relevant
- Maintain consistency in style and difficulty throughout
`;

  if (previousErrors.length > 0) {
    prompt += `

## Previous Generation Errors:
Fix these specific issues from previous attempts:

${previousErrors.map((error, i) => `${i + 1}. ${error}`).join("\n")}

Address these errors while maintaining content quality.
`;
  }

  return prompt.trim();
}
