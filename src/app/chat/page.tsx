import { PlusIcon, Home } from "lucide-react";
import Link from "next/link";
import { auth } from "~/server/auth/index.ts";
import { ChatPage } from "../chat.tsx";
import { getChats, getChat } from "~/server/db/queries";
import type { OurMessage } from "~/types";

export default async function ChatRoute({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  // TEMPORARY: Authentication disabled - using anonymous user
  // const session = await auth();
  const session = {
    user: { id: "anonymous-user", name: "Anonymous", image: null },
  };
  const userName = session?.user?.name ?? "Guest";
  const isAuthenticated = true; // Always authenticated with anonymous user
  const { id: chatId } = await searchParams;

  // Fetch chats for anonymous user
  const chats = await getChats(session.user.id);

  // Fetch active chat if chatId is present
  const activeChat = chatId
    ? await getChat({ userId: session.user.id, chatId })
    : null;

  // Map the messages to the correct format for useChat
  const initialMessages =
    activeChat?.messages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: msg.parts as OurMessage["parts"],
    })) ?? [];

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-900">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">Your Chats</h2>
            <Link
              href="/chat"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="New Chat"
            >
              <PlusIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
        <div className="-mt-1 flex-1 space-y-2 overflow-y-auto px-4 pt-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
          {chats.length > 0 ? (
            chats.map((chat) => (
              <div key={chat.id} className="flex items-center gap-2">
                <Link
                  href={`/chat?id=${chat.id}`}
                  className={`flex-1 rounded-lg p-3 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    chat.id === chatId
                      ? "bg-gray-700"
                      : "hover:bg-gray-750 bg-gray-800"
                  }`}
                >
                  {chat.title}
                </Link>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              No chats yet. Start a new conversation!
            </p>
          )}
        </div>
      </div>

      <ChatPage
        key={chatId || "new"}
        userName={userName}
        isAuthenticated={isAuthenticated}
        chatId={chatId}
        initialMessages={initialMessages}
      />
    </div>
  );
}
