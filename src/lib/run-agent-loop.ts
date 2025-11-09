import type { StreamTextResult } from "ai";
import { streamText } from "ai";
import { env } from "~/env";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/crawl";
import { SystemContext } from "./system-context";
import { getNextAction } from "./get-next-action";
import { answerQuestion } from "./answer-question";
import { checkIsSafe } from "./check-is-safe";
import { checkIfQuestionNeedsClarification } from "./check-if-question-needs-clarification";
import { model } from "~/agent";

/**
 * Search the web for information
 */
const searchWeb = async (query: string, signal?: AbortSignal) => {
  const results = await searchSerper(
    { q: query, num: env.SEARCH_RESULTS_COUNT },
    signal,
  );

  return results.organic.map((result) => ({
    title: result.title,
    url: result.link,
    snippet: result.snippet,
    date: result.date ?? "", // Include publication date if available
  }));
};

/**
 * Scrape URLs to get full content
 */
const scrapeUrls = async (urls: string[]) => {
  const crawlResult = await bulkCrawlWebsites({ urls });

  if (!crawlResult.success) {
    // Return partial results with errors
    return {
      success: false,
      error: crawlResult.error,
      results: crawlResult.results.map((r) => ({
        url: r.url,
        success: r.result.success,
        content: r.result.success ? r.result.data : undefined,
        error: !r.result.success ? r.result.error : undefined,
      })),
    };
  }

  return {
    success: true,
    results: crawlResult.results.map((r) => ({
      url: r.url,
      success: true,
      content: r.result.data,
    })),
  };
};

/**
 * Run the agent loop to answer a question
 */
export const runAgentLoop = async (
  messages: import("ai").UIMessage[],
  options?: {
    signal?: AbortSignal;
    langfuseTraceId?: string;
    writeMessagePart?: import("ai").UIMessageStreamWriter<any>["write"];
  },
): Promise<StreamTextResult<{}, string>> => {
  // A persistent container for the state of our system
  const ctx = new SystemContext(messages);

  // Check if the request is safe to process
  const safetyCheck = await checkIsSafe(ctx, {
    langfuseTraceId: options?.langfuseTraceId,
  });

  if (safetyCheck.classification === "refuse") {
    // Return a stream with the refusal message
    return streamText({
      model,
      prompt: `The user's request has been classified as unsafe. Politely explain that you cannot help with this request.${safetyCheck.reason ? ` Reason: ${safetyCheck.reason}` : ""}`,
    });
  }

  // Check if the question needs clarification
  // const clarificationResult = await checkIfQuestionNeedsClarification(ctx, {
  //   langfuseTraceId: options?.langfuseTraceId,
  // });

  // if (clarificationResult.needsClarification) {
//     // Return a stream with the clarification request
//     return streamText({
//       model,
//       system: `You are a clarification agent.
// Your job is to ask the user for clarification on their question.`,
//       prompt: `Here is the message history:

//   ${ctx.getMessageHistory()}


// Please reply to the user with a clarification request.`,
//       experimental_telemetry: options?.langfuseTraceId
//         ? {
//             isEnabled: true,
//             functionId: "clarification-request",
//             metadata: {
//               langfuseTraceId: options.langfuseTraceId,
//             },
//           }
//         : undefined,
//     });
//   }

  // A loop that continues until we have an answer
  // or we've taken 10 actions
  while (!ctx.shouldStop()) {
    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(ctx, {
      langfuseTraceId: options?.langfuseTraceId,
    });

    // Send the action as a data part for UI display (will be filtered out when persisting)
    if (options?.writeMessagePart) {
      options.writeMessagePart({
        type: "data-new-action",
        data: nextAction,
      });
    }

    // We execute the action and update the state of our system
    if (nextAction.type === "search") {
      if (!nextAction.query) {
        throw new Error("Search action requires a query");
      }

      const results = await searchWeb(nextAction.query, options?.signal);
      ctx.reportQueries([
        {
          query: nextAction.query,
          results,
        },
      ]);
    } else if (nextAction.type === "scrape") {
      if (!nextAction.urls || nextAction.urls.length === 0) {
        throw new Error("Scrape action requires URLs");
      }

      const scrapeResult = await scrapeUrls(nextAction.urls);

      // Report successful scrapes
      const successfulScrapes = scrapeResult.results
        .filter((r) => r.success && r.content)
        .map((r) => ({
          url: r.url,
          result: r.content!,
        }));

      if (successfulScrapes.length > 0) {
        ctx.reportScrapes(successfulScrapes);
      }

      // If all scrapes failed, we might want to handle that
      if (successfulScrapes.length === 0) {
        console.error("All scrapes failed:", scrapeResult.error);
      }
    } else if (nextAction.type === "answer") {
      return answerQuestion(ctx, {
        langfuseTraceId: options?.langfuseTraceId,
      });
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(ctx, {
    isFinal: true,
    langfuseTraceId: options?.langfuseTraceId,
  });
};
