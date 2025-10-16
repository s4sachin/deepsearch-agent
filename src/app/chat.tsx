"use client";

import { useChat } from "@ai-sdk/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
}

export const ChatPage = ({ userName, isAuthenticated }: ChatProps) => {
  const [input, setInput] = useState("");
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { messages, sendMessage, status } = useChat({
    onError: (error) => {
      // If we get a 401 error, show the sign-in modal
      if (error.message.includes("401")) {
        setShowSignInModal(true);
      }
    },
  });

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500"
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
        </div>

        <div className="border-t border-gray-700">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isAuthenticated) {
                setShowSignInModal(true);
                return;
              }
              if (input.trim()) {
                sendMessage({ text: input });
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
