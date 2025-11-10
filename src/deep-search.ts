import {
  streamText,
  type UIMessage,
  type StreamTextResult,
  type UIMessageStreamWriter,
} from "ai";
import { runUnifiedLoop } from "~/lib/unified/run-unified-loop";
import { AgentContext } from "~/lib/unified/agent-context";
import type { OurMessage } from "~/types";

export const streamFromDeepSearch = async (opts: {
  messages: UIMessage[];
  langfuseTraceId?: string;
  writeMessagePart?: UIMessageStreamWriter<OurMessage>["write"];
}): Promise<StreamTextResult<{}, string>> => {
  // Create context in chat mode
  const context = new AgentContext({
    messages: opts.messages,
    outputMode: 'chat',
  });
  
  const result = await runUnifiedLoop(context, {
    langfuseTraceId: opts.langfuseTraceId,
    writeMessagePart: opts.writeMessagePart,
  });

  // In chat mode, runUnifiedLoop always returns StreamTextResult
  // The type system doesn't know this, so we need to assert
  if ('toUIMessageStream' in result) {
    return result as StreamTextResult<{}, string>;
  }
  
  throw new Error('Unexpected result type from chat mode');
};

export async function askDeepSearch(messages: UIMessage[]) {
  const result = await streamFromDeepSearch({
    messages,
    langfuseTraceId: undefined,
  });

  // Consume the stream - without this,
  // the stream will never finish
  await result.consumeStream();

  return await result.text;
}
