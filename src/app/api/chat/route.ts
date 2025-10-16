import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { model } from "~/agent";
import { auth } from "~/server/auth";
import { searchSerper } from "~/serper";

export const maxDuration = 60;

export async function POST(request: Request) {
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await request.json();

  const result = streamText({
    model,
    messages: convertToModelMessages(messages),
    system: `You are a helpful research assistant with access to web search capabilities.
            Your primary goal is to provide accurate, well-researched answers by searching the web for current information.

            Guidelines:
            - ALWAYS use the searchWeb tool to find relevant, up-to-date information before answering questions
            - Search multiple times if needed to gather comprehensive information
            - Cite your sources using inline markdown links in your responses
            - Format citations like this: [source title](URL)
            - Synthesize information from multiple sources when possible
            - Be thorough and provide detailed, well-researched answers
            - If you cannot find relevant information, clearly state that
            - Remember to use the searchWeb tool whenever you need current information

            Remember: Your strength is in finding and synthesizing current information from the web.`,
    stopWhen: stepCountIs(10),
    tools: {
      searchWeb: tool({
        description: "Search the web for current information on any topic",
        inputSchema: z.object({
          query: z.string().describe("The query to search the web for"),
        }),
        execute: async ({ query }, { abortSignal }) => {
          const results = await searchSerper(
            { q: query, num: 10 },
            abortSignal,
          );

          return results.organic.map((result) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet,
          }));
        },
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
