import type { StreamTextResult, TelemetrySettings } from "ai";
import { streamText } from "ai";
import { env } from "~/env";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/crawl";
import { SystemContext } from "./system-context";
import { getNextAction } from "./get-next-action";
import { answerQuestion } from "./answer-question";

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
  userQuestion: string,
  options?: {
    signal?: AbortSignal;
    onFinish?: Parameters<typeof streamText>[0]["onFinish"];
    telemetry?: TelemetrySettings;
  },
): Promise<StreamTextResult<{}, string>> => {
  // A persistent container for the state of our system
  const ctx = new SystemContext();

  // A loop that continues until we have an answer
  // or we've taken 10 actions
  while (!ctx.shouldStop()) {
    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(userQuestion, ctx);

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
      return answerQuestion(userQuestion, ctx, {
        onFinish: options?.onFinish,
        telemetry: options?.telemetry,
      });
    }

    // We increment the step counter
    ctx.incrementStep();
  }

  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  return answerQuestion(userQuestion, ctx, {
    isFinal: true,
    onFinish: options?.onFinish,
    telemetry: options?.telemetry,
  });
};
