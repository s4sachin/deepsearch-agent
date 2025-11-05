import type { UIMessage } from "ai";
import type { Action } from "./lib/get-next-action";

type Source = {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
};

export type OurMessage = UIMessage<
  never,
  {
    "new-action": {
      action: string;
      result?: string;
    };
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
