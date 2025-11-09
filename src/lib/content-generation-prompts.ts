import type { LessonType } from "~/types/lesson";

/**
 * Get the current date and time for context
 */
const getCurrentDateTime = (): string => {
  const now = new Date();
  return now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
};

/**
 * Generate quiz content prompt
 */
export const getQuizGenerationPrompt = (opts: {
  outline: string;
  researchNotes?: string;
  previousErrors?: string[];
}): string => {
  const { outline, researchNotes, previousErrors } = opts;
  
  const errorFeedback = previousErrors && previousErrors.length > 0
    ? `\n\nPREVIOUS ERRORS TO FIX:\n${previousErrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}\n\nPlease fix these issues in your next attempt.`
    : "";

  const research = researchNotes
    ? `\n\nRESEARCH NOTES:\n${researchNotes}\n\nUse this research to create accurate, educational questions.`
    : "";

  return `You are an expert educator creating quiz content.

CURRENT DATE/TIME: ${getCurrentDateTime()}

Generate a JSON object for this quiz: "${outline}"
${research}${errorFeedback}

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. Follow this EXACT structure:
{
  "type": "quiz",
  "data": {
    "questions": [
      {
        "id": "q1",
        "question": "What is...?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 0,
        "explanation": "The answer is A because..."
      }
    ]
  }
}

3. Include 5-10 questions (adjust based on topic complexity)
4. Each question MUST have:
   - Unique id (q1, q2, q3, etc.)
   - Clear, educational question text (20+ characters)
   - Exactly 4 distinct options
   - correctAnswer as index 0-3
   - Explanation (1-2 sentences explaining why the answer is correct)

5. Quality guidelines:
   - No duplicate questions
   - Options should be plausible (avoid obviously wrong answers)
   - Progressive difficulty (easier questions first)
   - Educational and accurate content
   - Clear, concise language

6. The correct answer should not be predictable by pattern
7. Avoid questions that are too easy or too hard
8. Focus on testing understanding, not just memorization

Return ONLY the JSON object, nothing else.`;
};

/**
 * Generate tutorial content prompt
 */
export const getTutorialGenerationPrompt = (opts: {
  outline: string;
  researchNotes?: string;
  previousErrors?: string[];
}): string => {
  const { outline, researchNotes, previousErrors } = opts;
  
  const errorFeedback = previousErrors && previousErrors.length > 0
    ? `\n\nPREVIOUS ERRORS TO FIX:\n${previousErrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}\n\nPlease fix these issues in your next attempt.`
    : "";

  const research = researchNotes
    ? `\n\nRESEARCH NOTES:\n${researchNotes}\n\nUse this research to create accurate, comprehensive tutorial content.`
    : "";

  return `You are an expert educator creating tutorial content.

CURRENT DATE/TIME: ${getCurrentDateTime()}

Generate a JSON object for this tutorial: "${outline}"
${research}${errorFeedback}

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations outside the JSON
2. Follow this EXACT structure:
{
  "type": "tutorial",
  "data": {
    "sections": [
      {
        "id": "intro",
        "title": "Introduction",
        "content": "# Introduction\\n\\nMarkdown content here...",
        "order": 0,
        "examples": [
          {
            "language": "python",
            "code": "print('Hello World')",
            "explanation": "This prints Hello World to the console"
          }
        ]
      }
    ]
  }
}

3. Include 3-7 sections (adjust based on topic complexity)
4. Each section MUST have:
   - Unique id (intro, basics, advanced, etc.)
   - Clear title
   - Content in markdown format (100+ characters)
   - Sequential order (0, 1, 2, ...)
   - Optional examples array for code demonstrations

5. Content structure:
   - Start with introduction/overview
   - Progress logically through concepts
   - End with summary or advanced topics
   - Use markdown formatting (headers, lists, bold, etc.)

6. Code examples (if applicable):
   - Include for technical topics
   - Keep code simple and focused
   - Add clear explanations
   - Use appropriate language specification

7. Quality guidelines:
   - Educational and accurate
   - Clear, accessible language
   - Practical, actionable content
   - Good pacing (not too dense)
   - Examples that reinforce concepts

Return ONLY the JSON object, nothing else.`;
};

/**
 * Generate flashcard content prompt
 */
export const getFlashcardGenerationPrompt = (opts: {
  outline: string;
  researchNotes?: string;
  previousErrors?: string[];
}): string => {
  const { outline, researchNotes, previousErrors } = opts;
  
  const errorFeedback = previousErrors && previousErrors.length > 0
    ? `\n\nPREVIOUS ERRORS TO FIX:\n${previousErrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}\n\nPlease fix these issues in your next attempt.`
    : "";

  const research = researchNotes
    ? `\n\nRESEARCH NOTES:\n${researchNotes}\n\nUse this research to create accurate flashcard content.`
    : "";

  return `You are an expert educator creating flashcard content.

CURRENT DATE/TIME: ${getCurrentDateTime()}

Generate a JSON object for these flashcards: "${outline}"
${research}${errorFeedback}

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no code blocks, no explanations
2. Follow this EXACT structure:
{
  "type": "flashcard",
  "data": {
    "cards": [
      {
        "id": "card1",
        "front": "What is photosynthesis?",
        "back": "The process by which plants convert light energy into chemical energy",
        "category": "Biology Basics"
      }
    ],
    "totalCards": 10
  }
}

3. Include 10-20 flashcards (adjust based on topic complexity)
4. Each flashcard MUST have:
   - Unique id (card1, card2, card3, etc.)
   - Front: question or term (5+ characters)
   - Back: answer or definition (10+ characters)
   - Optional category for grouping

5. Quality guidelines:
   - Front and back should be clearly related
   - Answers should be concise but complete
   - No duplicate cards
   - Focus on key concepts and facts
   - Use clear, simple language
   - Front should prompt recall, back should reinforce

6. Organization:
   - Group related cards by category
   - Progress from fundamental to advanced concepts
   - Ensure good coverage of the topic

7. Best practices:
   - Keep both sides brief (1-2 sentences max)
   - Avoid ambiguous questions
   - Front should test one concept at a time
   - Back should be memorable

8. Set totalCards to match the actual number of cards

Return ONLY the JSON object, nothing else.`;
};

/**
 * Determine lesson type from outline
 */
export const getLessonTypePrompt = (outline: string): string => {
  return `You are an AI assistant that determines the type of educational content to generate.

CURRENT DATE/TIME: ${getCurrentDateTime()}

Analyze this lesson outline and determine the most appropriate content type:
"${outline}"

Choose from:
- "quiz" - Multiple choice questions with answers (keywords: quiz, test, questions, assessment, exam, pop quiz)
- "tutorial" - Step-by-step educational content (keywords: tutorial, guide, how to, learn, explanation, one-pager)
- "flashcard" - Question/answer pairs for memorization (keywords: flashcard, memorize, vocabulary, terms, definitions, study cards)
- "visualization" - Data visualization or charts (keywords: chart, graph, visualization, plot, diagram showing data)
- "diagram" - Concept diagrams or flowcharts (keywords: diagram, flowchart, relationship, network, mind map)

Return ONLY valid JSON in this format:
{
  "lessonType": "quiz",
  "title": "A concise title for this lesson (5-10 words)",
  "description": "A brief description of what this lesson covers (1-2 sentences)"
}

Be specific and choose the type that best matches the user's intent.`;
};

/**
 * Generate title and description for a lesson
 */
export const getTitleDescriptionPrompt = (opts: {
  outline: string;
  lessonType: LessonType;
  researchNotes?: string;
}): string => {
  const { outline, lessonType, researchNotes } = opts;
  
  const research = researchNotes
    ? `\n\nRESEARCH NOTES:\n${researchNotes}`
    : "";

  return `You are an AI assistant that creates compelling titles and descriptions for educational content.

CURRENT DATE/TIME: ${getCurrentDateTime()}

Create a title and description for this ${lessonType}:
"${outline}"
${research}

Requirements:
- Title: 5-10 words, clear and engaging
- Description: 1-2 sentences, informative and motivating

Return ONLY valid JSON in this format:
{
  "title": "Your title here",
  "description": "Your description here"
}`;
};

/**
 * Get the appropriate generation prompt based on lesson type
 */
export const getContentGenerationPrompt = (opts: {
  lessonType: LessonType;
  outline: string;
  researchNotes?: string;
  previousErrors?: string[];
}): string => {
  const { lessonType, outline, researchNotes, previousErrors } = opts;

  switch (lessonType) {
    case "quiz":
      return getQuizGenerationPrompt({ outline, researchNotes, previousErrors });
    case "tutorial":
      return getTutorialGenerationPrompt({ outline, researchNotes, previousErrors });
    case "flashcard":
      return getFlashcardGenerationPrompt({ outline, researchNotes, previousErrors });
    case "visualization":
    case "diagram":
      // Future: implement these
      throw new Error(`Content generation for ${lessonType} not yet implemented`);
    default:
      throw new Error(`Unknown lesson type: ${lessonType}`);
  }
};
