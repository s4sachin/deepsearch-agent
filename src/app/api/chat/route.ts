import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { model } from "~/agent";
import { auth } from "~/server/auth";

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
  });

  return result.toUIMessageStreamResponse();
}
