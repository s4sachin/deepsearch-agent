import {
  streamText,
  type UIMessage,
  type StreamTextResult,
  type UIMessageStreamWriter,
} from "ai";
import { runUnifiedLoop, type UnifiedLoopOptions } from "~/lib/unified/run-unified-loop";
import { AgentContext } from "~/lib/unified/agent-context";
import type { OurMessage } from "~/types";
import type { LessonContent } from "~/types/lesson";

// ============================================================================
// CHAT MODE
// ============================================================================

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

// ============================================================================
// LESSON MODE
// ============================================================================

export const generateLesson = async (opts: {
  outline: string;
  langfuseTraceId?: string;
  langfuseTrace?: any;
  onProgress?: (step: string, details?: string) => void;
  onFinish?: (result: LessonContent) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
}): Promise<AgentContext> => {
  // Create context in structured mode with initial message
  const context = new AgentContext({
    messages: [{
      id: crypto.randomUUID(),
      role: 'user',
      parts: [{ type: 'text', text: opts.outline }],
    }],
    outputMode: 'structured',
  });
  
  // Start generation (fire and forget with callbacks)
  runUnifiedLoop(context, {
    langfuseTraceId: opts.langfuseTraceId,
    langfuseTrace: opts.langfuseTrace,
    onProgress: opts.onProgress,
    onFinish: async (result) => {
      if (opts.onFinish) {
        await opts.onFinish(result as LessonContent);
      }
    },
    onError: opts.onError,
  }).catch(err => {
    // Error already handled by onError callback
    console.error('Lesson generation error:', err);
  });
  
  // Return context immediately for status tracking
  return context;
};
