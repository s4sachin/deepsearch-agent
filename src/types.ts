import type { UIMessage } from "ai";
import type { UnifiedAction } from "./lib/unified/unified-actions";

// For backward compatibility
type Action = UnifiedAction;

type Source = {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
};

export type OurMessage = UIMessage<
  never,
  {
    "new-action": Action;
    sources: Source[];
    usage: {
      totalTokens: number;
    };
    "new-chat-created": {
      chatId: string;
    };
  }
>;

export type OurMessageAnnotation = {
  type: "NEW_ACTION";
  action: Action;
};
