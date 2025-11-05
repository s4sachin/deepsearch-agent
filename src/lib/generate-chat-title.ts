import { generateText } from "ai";
import type { UIMessage } from "ai";
import { model } from "~/agent";

export const generateChatTitle = async (
  messages: UIMessage[],
  options?: {
    langfuseTraceId?: string;
  },
): Promise<string> => {
  // Extract text content from messages
  const messageTexts = messages
    .map((message) => {
      const role = message.role;
      // Extract text from parts
      const textParts = message.parts
        ?.filter((part) => part.type === "text")
        .map((part) => ("text" in part ? part.text : ""))
        .join("\n");
      return `${role}: ${textParts || ""}`;
    })
    .join("\n\n");

  const { text } = await generateText({
    model,
    system: `You are a chat title generator. You will be given a chat history, and you will need to generate a title for the chat.

Guidelines:
- The title should be a single sentence that captures the essence of the conversation
- The title should be no more than 50 characters
- The title should be in the same language as the chat history
- Do not use quotes around the title
- Be concise and descriptive`,
    prompt: `Here is the chat history:

${messageTexts}

Generate a concise title for this conversation.`,
    experimental_telemetry: options?.langfuseTraceId
      ? {
          isEnabled: true,
          functionId: "generate-chat-title",
          metadata: {
            langfuseTraceId: options.langfuseTraceId,
          },
        }
      : undefined,
  });

  return text.trim().slice(0, 50);
};
