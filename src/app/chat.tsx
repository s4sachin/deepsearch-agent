"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { is } from "drizzle-orm";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { StickToBottom } from "use-stick-to-bottom";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { isNewChatCreated } from "~/lib/chat-utils";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string ;
  isNewChat: boolean;
  initialMessages?: Array<{
    id: string;
    role: string;
    parts: unknown[];
    order: number;
  }>;
}

export const ChatPage = ({
  userName,
  isAuthenticated,
  chatId,
  isNewChat,
  initialMessages,
}: ChatProps) => {
  const [input, setInput] = useState("");
  const [showSignInModal, setShowSignInModal] = useState(false);
  const router = useRouter();
  const hasRedirectedRef = useRef(false);

  const { messages, sendMessage, status } = useChat({
    id: chatId, // This is the key - it resets the hook when chatId changes
    messages: initialMessages?.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: msg.parts as UIMessage["parts"],
      // content is automatically derived from parts in AI SDK v5
    })),
    onError: (error) => {
      // If we get a 401 error, show the sign-in modal
      if (error.message.includes("401")) {
        setShowSignInModal(true);
      }
    },
  });

  // Listen for NEW_CHAT_CREATED event in message parts and redirect
  // Reset redirect flag when the chatId changes (navigated to a different chat)
  useEffect(() => {
    hasRedirectedRef.current = false;
  }, [chatId]);

  useEffect(() => {
    // Only redirect after streaming is complete
    if (hasRedirectedRef.current || status === "streaming") return;
    
    // Check the last message for data-new-chat parts
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const newChatDataPart = lastMessage?.parts?.find(
        (part: any) => part.type === "data-new-chat",
      );

      if (newChatDataPart && "data" in newChatDataPart) {
        const data = newChatDataPart.data;
        if (isNewChatCreated(data) && data.chatId !== chatId) {
          // Only redirect if we're not already on this chat ID
          hasRedirectedRef.current = true;
          router.push(`?id=${data.chatId}`);
        }
      }
    }
  }, [messages, router, chatId, status]);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <StickToBottom
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-auto [&>div]:p-4 [&>div]:scrollbar-thin [&>div]:scrollbar-track-gray-800 [&>div]:scrollbar-thumb-gray-600 hover:[&>div]:scrollbar-thumb-gray-500"
          resize="smooth"
          initial="smooth"
        >
          <StickToBottom.Content
            className="flex flex-col"
            role="log"
            aria-label="Chat messages"
          >
            {messages.map((message) => {
              return (
                <ChatMessage
                  key={message.id}
                  parts={message.parts ?? []}
                  role={message.role}
                  userName={userName}
                />
              );
            })}
            {status === "streaming" && (
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="size-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </StickToBottom.Content>
        </StickToBottom>

        <div className="border-t border-gray-700">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isAuthenticated) {
                setShowSignInModal(true);
                return;
              }
              if (input.trim()) {
                sendMessage(
                  { text: input },
                  {
                    body: {
                      chatId,
                      isNewChat,
                    },
                  },
                );
                setInput("");
              }
            }}
            className="mx-auto max-w-[65ch] p-4"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Say something..."
                autoFocus
                aria-label="Chat input"
                disabled={status === "streaming"}
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "streaming"}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};
