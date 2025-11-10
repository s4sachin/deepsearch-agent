/**
 * Unified Agent Loop
 * Single execution loop that handles both chat and structured content generation
 */

import type { StreamTextResult } from "ai";
import { streamText, smoothStream } from "ai";
import { model } from "~/agent";
import type { AgentContext } from "./agent-context";
import type { LessonContent } from "~/types/lesson";
import { getNextAction } from "./unified-actions";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/crawl";
import { env } from "~/env";
import { markdownJoinerTransform } from "../markdown-joiner-transform";
import { validateLessonContent } from "../validate-lesson-content";

// Import structured content handlers from lesson module
import { generateLessonWithResearch, generateLessonWithoutResearch } from "../lesson/generate-lesson-with-research";
import { refineLessonContent, generateValidationFeedback } from "../lesson/refine-lesson-content";
import { 
  handleLessonError,
  shouldRetryAfterError,
  getErrorRecoveryStrategy,
  logLessonError,
  simplifyLessonRequirements,
} from "../lesson/handle-lesson-errors";

// ============================================================================
// UNIFIED LOOP OPTIONS
// ============================================================================

// Langfuse trace interface (minimal typing for what we need)
interface LangfuseTrace {
  id: string;
  event: (event: {
    name: string;
    level?: "DEBUG" | "DEFAULT" | "WARNING" | "ERROR";
    metadata?: Record<string, any>;
  }) => void;
}

export interface UnifiedLoopOptions {
  signal?: AbortSignal;
  langfuseTraceId?: string;
  langfuseTrace?: LangfuseTrace; // Add trace object for event logging
  onProgress?: (step: string, details?: string) => void;
  onFinish?: (result: StreamTextResult<{}, string> | LessonContent) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  writeMessagePart?: any; // For chat streaming
}

// ============================================================================
// MAIN UNIFIED LOOP
// ============================================================================

export async function runUnifiedLoop(
  context: AgentContext,
  options: UnifiedLoopOptions = {}
): Promise<StreamTextResult<{}, string> | LessonContent> {
  const { signal, langfuseTraceId, langfuseTrace, onProgress, onFinish, onError, writeMessagePart } = options;

  try {
    // Main agent loop
    while (!context.shouldStop()) {
    context.incrementStep();

    try {
      // Check for abort
      if (signal?.aborted) {
        throw new Error("Operation aborted by user");
      }

      // Get next action from LLM
      const action = await getNextAction(context, { langfuseTraceId });

      // HARD ENFORCEMENT: Prevent excessive scraping in structured mode
      if (context.isStructured() && action.type === "scrape") {
        const scrapeCount = context.getScrapedContent().length;
        const hasContent = context.hasContent();
        
        // If we've already scraped 3+ pages and haven't generated yet, force generate
        if (scrapeCount >= 3 && !hasContent) {
          action.type = "generate_structured";
          action.title = "Generating content with existing research";
          action.reasoning = `Sufficient research gathered (${scrapeCount} pages). Proceeding to generation.`;
        }
        // If we already have content, prevent scraping entirely
        else if (hasContent) {
          action.type = "complete";
          action.title = "Completing lesson generation";
          action.reasoning = "Content already generated. Finalizing.";
        }
      }
      
      // HARD ENFORCEMENT: For chat mode, if agent keeps searching/scraping after 6 steps, force answer
      if (context.isChat() && (action.type === "search" || action.type === "scrape")) {
        const currentStep = context.getStep();
        if (currentStep >= 6) {
          action.type = "answer";
          action.title = "Answering with available information";
          action.reasoning = `Sufficient research completed. Providing answer based on gathered information.`;
        }
      }

      // Report progress
      onProgress?.(action.type, action.reasoning);

      // Send action to UI (chat mode only)
      if (context.isChat() && writeMessagePart) {
        writeMessagePart({
          type: "data-new-action",
          data: action,
        });
      }

      // Execute action based on type
      switch (action.type) {
        case "search":
          await handleSearch(context, action.query, signal);
          break;

        case "scrape":
          await handleScrape(context, action.urls);
          break;

        case "answer":
          // Chat mode: return streaming answer
          if (context.isChat()) {
            const result = await handleAnswer(context, langfuseTraceId);
            await onFinish?.(result);
            return result;
          }
          throw new Error("'answer' action only valid in chat mode");

        case "determine_type":
          // Structured mode: determine content type
          if (context.isStructured()) {
            await handleDetermineType(context, action);
          } else {
            throw new Error("'determine_type' action only valid in structured mode");
          }
          break;

        case "generate_structured":
          // Structured mode: generate content
          if (context.isStructured()) {
            await handleGenerateStructured(context, langfuseTrace);
          } else {
            throw new Error("'generate_structured' action only valid in structured mode");
          }
          break;

        case "refine_structured":
          // Structured mode: refine content
          if (context.isStructured()) {
            await handleRefineStructured(context, action.feedback, langfuseTrace);
          } else {
            throw new Error("'refine_structured' action only valid in structured mode");
          }
          break;

        case "complete":
          // Structured mode: return final content
          if (context.isStructured()) {
            const result = handleComplete(context);
            await onFinish?.(result);
            return result;
          }
          throw new Error("'complete' action only valid in structured mode");
      }
    } catch (error) {
      // Error handling
      if (context.isStructured()) {
        // Structured mode: use sophisticated error recovery
        const errorInfo = handleLessonError(error, context);
        logLessonError(errorInfo, context);

        // Log error to Langfuse
        langfuseTrace?.event({
          name: "generation_error",
          level: "ERROR",
          metadata: {
            errorType: errorInfo.type,
            message: errorInfo.message,
            recoverable: errorInfo.recoverable,
            suggestedAction: errorInfo.suggestedAction,
            step: context.getStep(),
            retryCount: context.getRetryCount(),
            contentType: context.getContentType(),
            hasResearch: context.getScrapedContent().length > 0,
          },
        });

        if (shouldRetryAfterError(errorInfo, context)) {
          context.incrementRetry();
          const strategy = getErrorRecoveryStrategy(errorInfo, context);
          onProgress?.(`Error recovery: ${strategy.action}`, strategy.reason);

          // Log recovery strategy to Langfuse
          langfuseTrace?.event({
            name: "error_recovery",
            level: "WARNING",
            metadata: {
              strategy: strategy.action,
              reason: strategy.reason,
              retryCount: context.getRetryCount(),
              step: context.getStep(),
            },
          });

          // Apply recovery strategy
          if (strategy.action === "simplify") {
            onProgress?.("Simplifying requirements", "Reducing complexity");
          } else if (strategy.action === "skip_research") {
            onProgress?.("Skipping research", "Will generate from topic only");
            continue;
          } else if (strategy.action === "fallback") {
            const content = context.getContent();
            if (content) {
              await onFinish?.(content);
              return content;
            }
          }

          continue; // Retry
        } else {
          // Non-recoverable
          throw new Error(`Generation failed: ${errorInfo.message}`);
        }
      } else {
        // Chat mode: simple error handling
        
        // Log chat error to Langfuse
        langfuseTrace?.event({
          name: "chat_error",
          level: "ERROR",
          metadata: {
            error: error instanceof Error ? error.message : String(error),
            step: context.getStep(),
          },
        });
        
        throw error;
      }
    }
  }

  // Max steps reached - return best available result
  if (context.isChat()) {
    // Log max steps event
    langfuseTrace?.event({
      name: "max_steps_reached",
      level: "WARNING",
      metadata: {
        mode: "chat",
        steps: context.getStep(),
        maxSteps: context.getStep(), // Already at max
      },
    });
    
    // Force answer
    const result = await handleAnswer(context, langfuseTraceId, true);
    await onFinish?.(result);
    return result;
  } else {
    // Return generated content if available
    const content = context.getContent();
    
    // Log max steps event
    langfuseTrace?.event({
      name: "max_steps_reached",
      level: content ? "WARNING" : "ERROR",
      metadata: {
        mode: "structured",
        steps: context.getStep(),
        maxSteps: context.getStep(),
        hasContent: !!content,
        contentType: context.getContentType(),
      },
    });
    
    if (content) {
      onProgress?.("Max steps reached", "Returning generated content");
      await onFinish?.(content);
      return content;
    }
    const error = new Error("Max steps reached without generating content");
    await onError?.(error);
    throw error;
  }
  } catch (error) {
    // Call onError callback
    const err = error instanceof Error ? error : new Error(String(error));
    await onError?.(err);
    throw err;
  }
}

// ============================================================================
// COMMON ACTION HANDLERS
// ============================================================================

async function handleSearch(
  context: AgentContext,
  query: string | undefined,
  signal?: AbortSignal
): Promise<void> {
  if (!query) {
    throw new Error("Search action requires a query");
  }

  const results = await searchSerper(
    { q: query, num: env.SEARCH_RESULTS_COUNT },
    signal
  );

  const searchResults = results.organic.map((result) => ({
    title: result.title,
    url: result.link,
    snippet: result.snippet,
    date: result.date,
  }));

  context.addSearchResults(query, searchResults);
}

async function handleScrape(
  context: AgentContext,
  urls: string[] | undefined
): Promise<void> {
  if (!urls || urls.length === 0) {
    throw new Error("Scrape action requires URLs");
  }

  // HARD LIMIT 1: Maximum 4 URLs per scrape action
  const MAX_URLS_PER_SCRAPE = 4;
  const limitedUrls = urls.slice(0, MAX_URLS_PER_SCRAPE);

  // HARD LIMIT 2: Total scrape limit per session (max 8 pages)
  const MAX_TOTAL_SCRAPES = 8;
  const currentScrapedCount = context.getScrapedContent().length;
  const remainingSlots = MAX_TOTAL_SCRAPES - currentScrapedCount;
  
  if (remainingSlots <= 0) {
    return;
  }
  
  const urlsToScrape = limitedUrls.slice(0, remainingSlots);

  const scrapeResult = await bulkCrawlWebsites({ urls: urlsToScrape });

  // HARD LIMIT 3: Truncate each page to 10,000 chars (~2,500 tokens)
  const MAX_CONTENT_LENGTH = 10000;
  
  const scrapedContent = scrapeResult.results
    .filter((r) => r.result.success)
    .map((r) => {
      const fullContent = r.result.success ? r.result.data : "";
      const wasTruncated = fullContent.length > MAX_CONTENT_LENGTH;
      const content = wasTruncated
        ? fullContent.slice(0, MAX_CONTENT_LENGTH) + 
          "\n\n[... Content truncated to prevent token overflow ...]"
        : fullContent;
      
      return {
        url: r.url,
        content,
        timestamp: new Date(),
      };
    });

  if (scrapedContent.length > 0) {
    context.addScrapedContent(scrapedContent);
  }

  if (scrapedContent.length === 0) {
    // All scrapes failed
  }
}

// ============================================================================
// CHAT MODE HANDLERS
// ============================================================================

function handleAnswer(
  context: AgentContext,
  langfuseTraceId?: string,
  isFinal = false
): StreamTextResult<{}, string> {
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

  const finalWarning = isFinal
    ? `
IMPORTANT: This is your final attempt to answer the question. You may not have all the information you ideally wanted, but you MUST provide the best answer possible with the information available. Do not apologize for missing information - just provide the most helpful answer you can based on what you've gathered.
`
    : "";

  return streamText({
    model,
    experimental_transform: [
      markdownJoinerTransform(),
      smoothStream({
        delayInMs: 20,
        chunking: "word",
      }),
    ],
    experimental_telemetry: langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "unified-answer",
          metadata: { langfuseTraceId },
        }
      : undefined,
    prompt: `
You are a helpful and knowledgeable teacher who happens to be really good at explaining things. Think of yourself as that person everyone turns to when they need something explained clearly, not because you're showing off your expertise, but because you genuinely care about helping people understand.

CURRENT DATE AND TIME: ${currentDateTime}

CONVERSATION HISTORY:
${messageHistory}

## Your Core Identity

You're the kind of person who can take complex topics and break them down without talking down to anyone. You've got depth of knowledge, but you wear it lightly. When someone asks you a question, you respond the way you'd talk to a curious friend over coffee => engaged, thoughtful, and genuinely interested in helping them get it.

## How You Communicate

**Address the reader directly.** Always use "you" when referring to the person asking the question. This isn't just a stylistic choice => it creates connection and makes your explanations feel personal and relevant. Instead of saying "one might consider" or "people often find," say "you might want to think about" or "you'll probably notice."

**Use analogies liberally.** Complex concepts become much clearer when you can relate them to something familiar. If you're explaining how neural networks learn, compare it to how you get better at recognizing faces in a crowd. If you're discussing economic principles, relate them to managing a household budget. The goal is to build bridges between what someone already knows and what they're trying to understand.

**Sound genuinely human.** This means using natural speech patterns, occasional contractions, and the kind of language you'd actually use in conversation. You can start sentences with "And" or "But" when it feels natural. You can use phrases like "Here's the thing" or "What's interesting is" or "You know what I mean?" These aren't verbal tics => they're the natural rhythm of how people actually talk.

## Your Approach to Answering

**Start with what matters most.** Lead with the information that directly addresses what someone is asking, then build out from there. If someone asks "How do I fix my sleep schedule?" don't start with the history of circadian rhythms => start with practical steps they can take tonight.

**Anticipate follow-up questions.** Think about what someone might wonder next and address those concerns proactively. If you're explaining a process, mention common pitfalls. If you're giving advice, acknowledge potential obstacles they might face.

**Use examples that feel real and relatable.** Instead of abstract scenarios, use examples that people can actually picture themselves in. If you're explaining time management, don't talk about "optimizing productivity metrics" => talk about how you might handle a day when you've got three deadlines, a doctor's appointment, and your kid's soccer game.

**Build understanding progressively.** Start with the basic concept, make sure that's clear, then add layers of detail. Think of it like teaching someone to drive => you don't start with parallel parking on a busy street. You begin with the fundamentals and build up.

**Connect concepts to broader contexts.** Help people understand not just what something is, but why it matters and how it fits into the bigger picture. If you're explaining a scientific principle, mention where they might encounter it in daily life. If you're discussing a historical event, connect it to patterns they can recognize in current events.

**Check for understanding.** For complex topics, acknowledge potential confusion points: "This can be tricky at first..." or "You might be wondering..." This shows empathy and helps students feel comfortable with the learning process.

**Use visual structure.** Break complex answers into clearly labeled sections. Use **bold** for key concepts, numbered lists for sequential steps, and bullet points for options or examples. White space and formatting help students process information.

**Provide practical examples.** For every concept, include at least one concrete, real-world example. If explaining an algorithm, show actual code. If discussing history, share specific stories. Examples make abstract ideas tangible.

**Build progressively.** Start with fundamentals, confirm understanding, then layer in complexity. Use phrases like "Now that we understand X, let's see how Y builds on it..." to signal progression.

## What to Avoid

**Overly formal introductions.** Don't start with "I shall endeavor to elucidate" or "This inquiry pertains to." Just dive in with something like "This is actually a really interesting question because..." or "The key thing to understand here is..."

**Unnecessary qualifiers and hedging.** While accuracy is important, don't pepper every statement with "arguably," "potentially," "it could be said that," or "some might suggest." Be confident in your knowledge while remaining open to nuance.

**Academic jargon when plain language will do.** If there's a simpler way to say something that doesn't lose meaning, use it. "Use" instead of "utilize," "help" instead of "facilitate," "show" instead of "demonstrate."

**Condescending explanations.** Never make someone feel stupid for not knowing something. Phrases like "Obviously," "As everyone knows," or "It's simple" can make people feel bad about asking in the first place.

**Generic, unhelpful responses.** Avoid giving advice that could apply to anyone and everyone. Make your responses specific and actionable. Instead of "Consider various options," say "Here are three specific approaches you might try, and here's how to decide which one makes sense for your situation."

## Citing Sources Naturally

Weave sources into your conversational flow rather than disrupting it with academic citations. Mention sources naturally: "Recent research from MIT found that..." or "According to a 2024 study..." Then place the markdown link right after that phrase. Group citations at the end of paragraphs rather than after every sentence. The goal is to maintain conversational tone while still giving credit.

## Handling Multiple or Conflicting Sources

When sources disagree, acknowledge it directly and help students understand why: "Interestingly, experts disagree on this..." Explain different perspectives fairly, and if one view is more current or credible, note that. When sources are insufficient, be honest: "The research I found covers X but not Y..." Then give your best informed response based on what IS available. Never make up information to fill gaps.

## Structuring Your Answer for Maximum Learning

**For simple questions** (definitions, quick facts):
- Lead with the direct answer (1-2 sentences)
- Follow with context that explains why it matters
- Include a concrete example
- Keep it conversational and flowing

**For complex questions** (how-to, analysis, multi-part):
- Start with a brief overview that previews what you'll cover
- Break into clear sections using markdown headers (##)
- Use numbered lists for sequential steps (how-to guides)
- Use bullet points for categories, options, or features
- Include examples in each major section
- End with a "Key Takeaways" summary that reinforces main points

**For technical topics**:
- Always include working code examples with comments
- Explain both WHAT it does and WHY it works that way
- Show input/output examples
- Mention common mistakes to avoid

## When Information is Limited or Uncertain

If you can't fully answer, be straightforward: "I found information about X, but the sources don't cover Y in detail." Explain what you DO know confidently, then suggest how they might find more: "For the Y part, you might want to look into..." This builds trust - students respect honesty about limits more than vague or invented answers.

RESEARCH GUIDELINES:
- Base your answer on the full scraped content below, NOT just search snippets
- Synthesize information from multiple sources
- If information is time-sensitive, prioritize sources with recent dates
- Be thorough and provide detailed explanations
- Write in natural, flowing prose - NOT markdown syntax

FORMATTING REQUIREMENTS (CRITICAL - DO NOT USE MARKDOWN SYNTAX):
- NEVER use markdown headers (##, ###, ####). Instead use CAPITALIZED SECTION TITLES on their own line
- NEVER use asterisk-based bold or italic syntax. Instead emphasize through word choice or quotation marks
- For lists, write them naturally with numbers or use simple dashes at line starts
- DO NOT use markdown link syntax. Instead write: According to Source Name (url), ...
- For code, present it clearly indented but WITHOUT backtick code fences
- Use blank lines to separate sections naturally
- Write in clear paragraphs with natural emphasis through word choice, not markup

RESEARCH CONTEXT:
${searchHistory ? `\n# Search Results\n${searchHistory}\n` : ""}
${scrapeHistory ? `\n# Scraped Content\n${scrapeHistory}\n` : ""}
${finalWarning}

Now provide your comprehensive answer to the user's question.
    `.trim(),
  });
}

// ============================================================================
// STRUCTURED MODE HANDLERS
// ============================================================================

async function handleDetermineType(
  context: AgentContext,
  action: any
): Promise<void> {
  // Extract type from action or analyze outline
  const outline = context.getUserQuery();
  
  // Simple heuristic: check for keywords
  const outlineLower = outline.toLowerCase();
  let type: "quiz" | "tutorial" | "flashcard" = "tutorial"; // default

  if (outlineLower.includes("quiz") || outlineLower.includes("question") || outlineLower.includes("test")) {
    type = "quiz";
  } else if (outlineLower.includes("flashcard") || outlineLower.includes("memorize") || outlineLower.includes("vocabulary")) {
    type = "flashcard";
  } else if (outlineLower.includes("tutorial") || outlineLower.includes("guide") || outlineLower.includes("how to")) {
    type = "tutorial";
  }

  // Use action's contentType if provided
  if (action.contentType) {
    type = action.contentType;
  }

  context.setContentType(type);
}

async function handleGenerateStructured(
  context: AgentContext,
  langfuseTrace?: LangfuseTrace
): Promise<void> {
  const hasResearch =
    context.getSearchHistory().length > 0 ||
    context.getScrapedContent().length > 0;

  const attemptNumber = context.getRetryCount() + 1;
  
  // Log generation start
  langfuseTrace?.event({
    name: "generate_structured_start",
    metadata: {
      contentType: context.getContentType(),
      attemptNumber,
      hasResearch,
      searchCount: context.getSearchHistory().length,
      scrapedPages: context.getScrapedContent().length,
    },
  });

  let content: LessonContent;

  try {
    if (hasResearch) {
      content = await generateLessonWithResearch(context);
    } else {
      content = await generateLessonWithoutResearch(context);
    }

    // Validate
    const validation = validateLessonContent(content);

    if (validation.isValid) {
      context.setContent(content);
      context.recordGenerationAttempt({ content });
      
      // Log successful generation
      langfuseTrace?.event({
        name: "generate_structured_success",
        metadata: {
          contentType: context.getContentType(),
          attemptNumber,
          hasResearch,
          itemCount: 
            content.type === "quiz" ? content.data.questions?.length :
            content.type === "tutorial" ? content.data.sections?.length :
            content.type === "flashcard" ? content.data.cards?.length :
            0,
          validationPassed: true,
        },
      });
    } else {
      // Record failed attempt
      context.recordGenerationAttempt({ errors: validation.errors });
      
      // Log validation failure
      langfuseTrace?.event({
        name: "generate_structured_validation_failed",
        level: "WARNING",
        metadata: {
          contentType: context.getContentType(),
          attemptNumber,
          validationErrors: validation.errors,
          errorCount: validation.errors?.length ?? 0,
        },
      });
      
      const feedback = generateValidationFeedback(validation.errors ?? []);
      throw new Error(`Validation failed: ${feedback}`);
    }
  } catch (error) {
    // Log generation error (not validation error)
    if (!(error instanceof Error && error.message.startsWith("Validation failed"))) {
      langfuseTrace?.event({
        name: "generate_structured_error",
        level: "ERROR",
        metadata: {
          contentType: context.getContentType(),
          attemptNumber,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    throw error;
  }
}

async function handleRefineStructured(
  context: AgentContext,
  feedback: string | undefined,
  langfuseTrace?: LangfuseTrace
): Promise<void> {
  if (!feedback) {
    feedback = "Improve overall quality and fix validation errors";
  }

  const refinementNumber = context.getRefinementHistory().length + 1;
  
  // Log refinement start
  langfuseTrace?.event({
    name: "refine_structured_start",
    metadata: {
      contentType: context.getContentType(),
      refinementNumber,
      feedback,
    },
  });

  try {
    const refinedContent = await refineLessonContent(context, feedback);

    // Validate
    const validation = validateLessonContent(refinedContent);

    if (validation.isValid) {
      context.setContent(refinedContent);
      
      // Log successful refinement
      langfuseTrace?.event({
        name: "refine_structured_success",
        metadata: {
          contentType: context.getContentType(),
          refinementNumber,
          itemCount:
            refinedContent.type === "quiz" ? refinedContent.data.questions?.length :
            refinedContent.type === "tutorial" ? refinedContent.data.sections?.length :
            refinedContent.type === "flashcard" ? refinedContent.data.cards?.length :
            0,
          validationPassed: true,
        },
      });
    } else {
      // Log validation failure
      langfuseTrace?.event({
        name: "refine_structured_validation_failed",
        level: "WARNING",
        metadata: {
          contentType: context.getContentType(),
          refinementNumber,
          validationErrors: validation.errors,
          errorCount: validation.errors?.length ?? 0,
        },
      });
      
      const validationFeedback = generateValidationFeedback(validation.errors ?? []);
      throw new Error(`Refinement validation failed: ${validationFeedback}`);
    }
  } catch (error) {
    // Log refinement error (not validation error)
    if (!(error instanceof Error && error.message.startsWith("Refinement validation failed"))) {
      langfuseTrace?.event({
        name: "refine_structured_error",
        level: "ERROR",
        metadata: {
          contentType: context.getContentType(),
          refinementNumber,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
    throw error;
  }
}

function handleComplete(context: AgentContext): LessonContent {
  const content = context.getContent();

  if (!content) {
    throw new Error("Cannot complete: no content generated");
  }

  return content;
}
