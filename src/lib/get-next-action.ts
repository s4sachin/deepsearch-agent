import { generateObject } from "ai";
import { z } from "zod";
import { model } from "~/agent";
import { SystemContext } from "./system-context";

export const actionSchema = z.object({
  title: z
    .string()
    .describe(
      "The title of the action, to be displayed in the UI. Be extremely concise. Examples: 'Searching Rohit Sharma statistics', 'Gathering Black Hole data', 'Analyzing tournament data'",
    ),
  reasoning: z
    .string()
    .describe(
      "The reason you chose this step. Explain your thinking process in 1-2 sentences. Why is this action necessary to answer the user's question?",
    ),
  type: z.enum(["search", "scrape", "answer"]).describe(
    `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL to get full content.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
  query: z
    .string()
    .describe("The query to search for. Required if type is 'search'.")
    .optional(),
  urls: z
    .array(z.string())
    .describe("The URLs to scrape. Required if type is 'scrape'.")
    .optional(),
});

export type Action = z.infer<typeof actionSchema>;

export interface SearchAction {
  type: "search";
  query: string;
}

export interface ScrapeAction {
  type: "scrape";
  urls: string[];
}

export interface AnswerAction {
  type: "answer";
}

export const getNextAction = async (
  userQuestion: string,
  context: SystemContext,
  options?: {
    langfuseTraceId?: string;
  },
): Promise<Action> => {
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

  const queryHistory = context.getQueryHistory();
  const scrapeHistory = context.getScrapeHistory();

  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `You are a research assistant helping to answer a user's question through a systematic process of web search and content scraping. Your goal is to decide the next best action to take in order to gather the necessary information to answer the user's question accurately and thoroughly.`,
    experimental_telemetry: options?.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "get-next-action",
          metadata: {
            langfuseTraceId: options.langfuseTraceId,
          },
        }
      : undefined,
    prompt: `Here is the context you have to work with:
CURRENT DATE AND TIME: ${currentDateTime}

USER'S QUESTION:
${userQuestion}

YOUR TASK:
Decide on the next action to take in order to thoroughly answer the user's question. You can:
1. 'search': Search the web to find relevant pages (use this to discover sources)
2. 'scrape': Scrape specific URLs to get full content (use this to read detailed information)
3. 'answer': Provide the final answer when you have enough information

RESEARCH WORKFLOW:
- Start by searching for relevant sources
- Follow up by scraping the most relevant URLs (2-5 pages) to get complete information
- Only answer once you have scraped and reviewed enough detailed content
- Do NOT answer based solely on search snippets - always scrape pages first

GUIDELINES:
- If you haven't searched yet, start with a search
- If you have search results but haven't scraped pages, scrape the most relevant URLs
- If you have scraped content but it's incomplete, search for more sources or scrape additional URLs
- Only choose 'answer' when you have comprehensive information from scraped pages
- When searching, use time-specific terms for current events (e.g., "2025", "latest", "recent")
- When scraping, choose URLs that are most likely to have detailed, authoritative information

Based on the above context and guidelines, what should be the next action?

CONTEXT FROM PREVIOUS ACTIONS:
${queryHistory ? `\n# Previous Searches\n${queryHistory}\n` : ""}
${scrapeHistory ? `\n# Previously Scraped Content\n${scrapeHistory}\n` : ""}
`,
  });

  return result.object;
};
