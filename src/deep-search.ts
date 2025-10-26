import {
  type StreamTextResult,
  type TelemetrySettings,
  convertToModelMessages,
  type UIMessage,
  streamText,
} from "ai";
import { runAgentLoop } from "~/lib/run-agent-loop";

export const streamFromDeepSearch = async (opts: {
  messages: NonNullable<Parameters<typeof streamText>[0]["messages"]>;
  onFinish: Parameters<typeof streamText>[0]["onFinish"];
  telemetry: TelemetrySettings;
}): Promise<StreamTextResult<{}, string>> => {
  // Extract the user's question from the last message
  const lastMessage = opts.messages[opts.messages.length - 1];
  const userQuestion =
    lastMessage?.role === "user"
      ? typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content)
      : "Please answer my question";

  // Run the agent loop and return the result with callbacks
  return await runAgentLoop(userQuestion, {
    onFinish: opts.onFinish,
    telemetry: opts.telemetry,
  });
};

export async function askDeepSearch(messages: UIMessage[]) {
  const result = await streamFromDeepSearch({
    messages: convertToModelMessages(messages),
    onFinish: () => {},
    telemetry: {
      isEnabled: false,
    },
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
