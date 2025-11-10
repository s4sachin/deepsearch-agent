/**
 * Unified Action Schema
 * Merges actions from chat flow (search, scrape, answer)
 * and structured flow (determine_type, generate_structured, refine_structured, complete)
 */

import { generateObject } from "ai";
import { z } from "zod";
import { model } from "~/agent";
import type { AgentContext } from "./agent-context";
import type { LessonType } from "~/types/lesson";

// ============================================================================
// UNIFIED ACTION SCHEMA
// ============================================================================

export const unifiedActionSchema = z.object({
  title: z
    .string()
    .describe(
      "Concise action title for UI display. Examples: 'Searching for Python tutorials', 'Determining content type', 'Generating quiz'"
    ),
  
  reasoning: z
    .string()
    .describe(
      "1-2 sentences explaining why this action is necessary"
    ),
  
  type: z
    .enum([
      // Common research actions (both modes)
      "search",
      "scrape",
      
      // Chat-specific actions
      "answer",
      
      // Structured content-specific actions
      "determine_type",
      "generate_structured",
      "refine_structured",
      "complete",
    ])
    .describe(`
      Action types:
      - 'search': Search web for information (both modes)
      - 'scrape': Scrape URLs for full content (both modes)
      - 'answer': Provide conversational answer (chat only)
      - 'determine_type': Determine lesson type from outline (structured only)
      - 'generate_structured': Generate structured content (structured only)
      - 'refine_structured': Improve generated content (structured only)
      - 'complete': Return final structured content (structured only)
    `),
  
  // For search action
  query: z
    .string()
    .describe("Search query. Required for 'search' action")
    .optional(),
  
  // For scrape action
  urls: z
    .array(z.string())
    .describe("URLs to scrape. Required for 'scrape' action")
    .optional(),
  
  // For structured content actions
  contentType: z
    .enum(["quiz", "tutorial", "flashcard"])
    .describe("Determined content type. Used with 'determine_type'")
    .optional(),
  
  feedback: z
    .string()
    .describe("Feedback for refinement. Used with 'refine_structured'")
    .optional(),
});

export type UnifiedAction = z.infer<typeof unifiedActionSchema>;

// ============================================================================
// GET NEXT ACTION (UNIFIED)
// ============================================================================

export async function getNextAction(
  context: AgentContext,
  options?: {
    langfuseTraceId?: string;
  }
): Promise<UnifiedAction> {
  // Get current date and time
  const now = new Date();
  const currentDateTime = now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });

  const messageHistory = context.getMessageHistory();
  const searchHistory = context.getSearchHistoryFormatted();
  const scrapeHistory = context.getScrapedContentFormatted();
  const mode = context.getOutputMode();

  // Build mode-specific guidance
  const modeGuidance = mode === "chat" 
    ? buildChatModeGuidance()
    : buildStructuredModeGuidance(context);

  const result = await generateObject({
    model,
    schema: unifiedActionSchema,
    system: `You are a research assistant helping to ${mode === "chat" ? "answer a user's question" : "create structured educational content"} through a systematic process of web search and content scraping. Your goal is to decide the next best action to take in order to ${mode === "chat" ? "gather the necessary information to answer the user's question accurately and thoroughly" : "research and generate high-quality educational content"}.`,
    experimental_telemetry: options?.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "get-next-unified-action",
          metadata: {
            langfuseTraceId: options.langfuseTraceId,
            mode,
          },
        }
      : undefined,
    prompt: `Here is the context you have to work with:

CURRENT DATE AND TIME: ${currentDateTime}

CONVERSATION${mode === "structured" ? "/OUTLINE" : ""} HISTORY:
${messageHistory}

${modeGuidance}

CONTEXT FROM PREVIOUS ACTIONS:
${searchHistory ? `\n# Previous Searches\n${searchHistory}\n` : ""}
${scrapeHistory ? `\n# Previously Scraped Content\n${scrapeHistory}\n` : ""}

Based on the above context and guidelines, what should be the next action?
    `.trim(),
  });

  return result.object;
}

// ============================================================================
// MODE-SPECIFIC GUIDANCE
// ============================================================================

function buildChatModeGuidance(): string {
  return `
YOUR TASK:
Decide on the next action to take in order to thoroughly answer the user's question. You can:
1. 'search': Search the web to find relevant pages (use this to discover sources)
2. 'scrape': Scrape specific URLs to get full content (use this to read detailed information)
3. 'answer': Provide the final answer when you have enough information

RESEARCH WORKFLOW:
- Start by searching for relevant sources
- Follow up by scraping ONLY 3-4 high-quality, authoritative URLs to get complete information
- Only answer once you have scraped and reviewed enough detailed content
- Do NOT answer based solely on search snippets - always scrape pages first

SCRAPING RULES (CRITICAL):
- MAXIMUM 2-3 URLs per scrape action
- Choose the BEST quality sources (official docs, educational sites, authoritative sources)
- Prioritize comprehensive sources over quantity
- Avoid scraping similar/duplicate content from multiple sources

GUIDELINES:
- If you haven't searched yet, start with a search
- If you have search results but haven't scraped pages, scrape 2-3 of the MOST relevant URLs
- If you have scraped content but it's incomplete, search for more sources or scrape 2-3 additional URLs
- Only choose 'answer' when you have comprehensive information from scraped pages
- When searching, use time-specific terms for current events (e.g., "2025", "latest", "recent")
- When scraping, choose URLs that are most likely to have detailed, authoritative information
- Base your answer on the full scraped content, NOT just search snippets
- Synthesize information from multiple sources for a thorough answer
  `.trim();
}

function buildStructuredModeGuidance(context: AgentContext): string {
  const contentType = context.getContentType();
  const hasContent = context.hasContent();
  const hasResearch = 
    context.getSearchHistory().length > 0 || 
    context.getScrapedContent().length > 0;
  const hasSearched = context.getSearchHistory().length > 0;
  const hasScraped = context.getScrapedContent().length > 0;
  const previousErrors = context.getPreviousErrors();

  let guidance = `
YOUR TASK:
Generate structured educational content (quiz, tutorial, or flashcard) based on the user's outline.

AVAILABLE ACTIONS:
1. 'search': Search the web for educational resources and factual information
2. 'scrape': Scrape URLs to get detailed content (use this after searching)
3. 'determine_type': Analyze the outline to determine if this should be a quiz, tutorial, or flashcard
4. 'generate_structured': Create the structured content based on research
5. 'refine_structured': Improve content based on validation errors or quality feedback
6. 'complete': Return the final validated content
  `.trim();

  // Provide step-by-step guidance based on current state
  if (!contentType) {
    guidance += `

CURRENT STEP: Determine Content Type
- You have not yet determined the content type
- Use 'determine_type' action to analyze the outline and decide if this should be:
  * quiz: Multiple choice questions with answers and explanations
  * tutorial: Step-by-step guide with code examples and explanations
  * flashcard: Set of term/definition pairs for memorization
- Look for keywords like "quiz", "tutorial", "flashcard", "questions", "guide", "memorize"
    `.trim();
  } else if (!hasSearched) {
    guidance += `

CURRENT STEP: Research Phase - Search
- Content type determined: ${contentType}
- You need to gather research before generation
- IMPORTANT: Almost all topics benefit from research to ensure accuracy
- Use 'search' action to find 3-5 authoritative sources
- Search for:
  ${contentType === "quiz" 
    ? "* Factual information, statistics, recent data\n  * Questions and answers from reliable sources\n  * Current information (use date-specific terms)"
    : contentType === "tutorial"
    ? "* Technical documentation and how-to guides\n  * Code examples and best practices\n  * Step-by-step explanations from experts"
    : "* Clear definitions and explanations\n  * Key terms and their meanings\n  * Educational resources with concept relationships"
  }
    `.trim();
  } else if (hasSearched && !hasScraped) {
    guidance += `

CURRENT STEP: Research Phase - Scrape Content
- Content type: ${contentType}
- Search completed: Found ${context.getSearchHistory().map(q => q.results.length).reduce((a, b) => a + b, 0)} URLs
- CRITICAL: You MUST scrape pages before generating content
- Search snippets alone are insufficient for quality content

SCRAPING RULES (CRITICAL):
- Scrape ONLY 2-3 high-quality URLs (NOT 10-15!)
- MAXIMUM 3-4 URLs to prevent token overflow
- Choose the BEST authoritative sources (official docs, .edu sites, expert tutorials)
- Prioritize comprehensive, detailed sources over quantity
- Avoid scraping similar/duplicate content

After scraping 3-4 pages, you'll have sufficient context for generation.
    `.trim();
  } else if (!hasContent) {
    // Check if we have enough research
    const scrapeCount = context.getScrapedContent().length;
    const hasEnoughResearch = scrapeCount >= 3;
    
    guidance += `

CURRENT STEP: Generation Phase  
- Content type: ${contentType}
- Research gathered: ${context.getSearchHistory().length} searches, ${scrapeCount} pages scraped
- ${hasEnoughResearch ? 'You have sufficient research context to generate content' : 'IMPORTANT: Research may be limited, but proceed with available data'}
- Use 'generate_structured' to create the ${contentType} based on:
  * The user's outline/requirements
  * The full scraped content (NOT just search snippets)
  * ${contentType === "quiz" ? "Real facts and statistics from research" : contentType === "tutorial" ? "Code examples and step-by-step instructions from research" : "Key terms and definitions from research"}
- Ensure you synthesize information from multiple scraped sources
- Make content accurate, detailed, and grounded in the research
- DO NOT scrape more pages - generate with what you have
    `.trim();
  } else if (previousErrors.length > 0) {
    guidance += `

CURRENT STEP: Refinement Phase
- Content generated but has validation errors
- Previous errors: ${previousErrors.slice(0, 2).join("; ")}${previousErrors.length > 2 ? `... (${previousErrors.length - 2} more)` : ""}
- Use 'refine_structured' to fix these specific issues:
  * Keep all the good parts of the content
  * Only fix the problematic areas mentioned in errors
  * Maintain consistency and quality
  * Ensure the refined content validates correctly
    `.trim();
  } else {
    guidance += `

CURRENT STEP: Completion
- Content successfully generated and validated
- ${contentType} is ready with all requirements met
- Use 'complete' to return the final content
    `.trim();
  }

  guidance += `

RESEARCH WORKFLOW (CRITICAL):
1. Search for relevant sources if needed
2. Scrape 3-4 authoritative URLs in ONE scrape action
3. Then generate content using the full scraped text
4. Do NOT generate from search snippets alone
5. Do NOT scrape multiple times - scrape once with 3-4 URLs

RESEARCH BEST PRACTICES:
- For ${contentType === "quiz" ? "quizzes" : contentType === "tutorial" ? "tutorials" : "flashcards"}:
  ${contentType === "quiz" 
    ? "* Search for factual information, statistics, and recent data\n  * Scrape authoritative sources like educational sites, news articles\n  * Base questions on verified facts from scraped content"
    : contentType === "tutorial"
    ? "* Search for technical documentation, code repositories, how-to guides\n  * Scrape pages with working code examples and explanations\n  * Use real code snippets from scraped content"
    : "* Search for definitions, explanations, and concept relationships\n  * Scrape educational resources with clear explanations\n  * Extract key terms and their meanings from research"
  }
  `.trim();

  return guidance;
}
