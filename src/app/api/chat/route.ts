import {
  convertToModelMessages,
  type UIMessage,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { and, eq, gte, sql } from "drizzle-orm";
import { Langfuse } from "langfuse";
import { env } from "~/env";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
  requests,
  users,
  chats,
  messages as messagesTable,
} from "~/server/db/schema";
import { streamFromDeepSearch } from "~/deep-search";

export const maxDuration = 60;

// Initialize Langfuse client
const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});
  
// Rate limit configuration
const RATE_LIMIT_PER_DAY = 50;

export async function POST(request: Request) {
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Create Langfuse trace for this request
  const trace = langfuse.trace({
    name: "chat",
    userId: userId,
  });

  // Get user details including admin status
  const getUserSpan = trace.span({
    name: "get-user",
    input: { userId },
  });

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  getUserSpan.end({
    output: { user: user ? { id: user.id, isAdmin: user.isAdmin } : null },
  });

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  // Check rate limit (skip for admins)
  if (!user.isAdmin) {
    // Calculate start of today (midnight UTC)
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    // Count requests made today
    const checkRateLimitSpan = trace.span({
      name: "check-rate-limit",
      input: { userId, startOfToday: startOfToday.toISOString() },
    });

    const requestsToday = await db
      .select({ count: sql<number>`count(*)` })
      .from(requests)
      .where(
        and(eq(requests.userId, userId), gte(requests.createdAt, startOfToday)),
      );

    const requestCount = Number(requestsToday[0]?.count ?? 0);

    checkRateLimitSpan.end({
      output: { requestCount, limit: RATE_LIMIT_PER_DAY },
    });

    if (requestCount >= RATE_LIMIT_PER_DAY) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `You have exceeded the daily limit of ${RATE_LIMIT_PER_DAY} requests. Please try again tomorrow.`,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // Record the request
  const recordRequestSpan = trace.span({
    name: "record-request",
    input: { userId },
  });

  await db.insert(requests).values({
    userId,
  });

  recordRequestSpan.end({
    output: { success: true },
  });

  const { messages, chatId, isNewChat }: { messages: UIMessage[]; chatId?: string; isNewChat?: boolean } =
    await request.json();

  // Create or get chat ID
  // If this is a new chat, create it before streaming starts
  // This ensures the chat exists even if the stream fails or is cancelled
  let currentChatId = chatId;

  if (isNewChat ) {
    // Extract the first user message to use as title
    const firstUserMessage = messages.find((msg) => msg.role === "user");

    // Get title from the first text part of the message
    let title = "New Chat";
    if (firstUserMessage?.parts) {
      const textPart = firstUserMessage.parts.find((part: any) => part.type === "text");
      if (textPart && "text" in textPart) {
        title = textPart.text.slice(0, 100).trim() || "New Chat";
      }
    }

    // Create new chat
    const createChatSpan = trace.span({
      name: "create-chat",
      input: { userId, title },
    });

    const [newChat] = await db
      .insert(chats)
      .values({
        userId,
        title,
      })
      .returning();

    currentChatId = newChat!.id;

    createChatSpan.end({
      output: { chatId: currentChatId },
    });

    // Update trace with sessionId now that we have the chatId
    trace.update({
      sessionId: currentChatId,
    });

    // Save the initial user message(s) to the database
    const messagesToInsert = messages.map((msg, index) => ({
      chatId: currentChatId!,
      role: msg.role,
      parts: msg.parts as unknown[],
      order: index,
    }));

    const insertInitialMessagesSpan = trace.span({
      name: "insert-initial-messages",
      input: { chatId: currentChatId, messageCount: messagesToInsert.length },
    });

    await db.insert(messagesTable).values(messagesToInsert);

    insertInitialMessagesSpan.end({
      output: { success: true, messageCount: messagesToInsert.length },
    });
  } else {
    // Update trace with sessionId for existing chat
    trace.update({
      sessionId: currentChatId!,
    });
  }

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: async ({ writer }) => {
      // If this is a new chat, send the chat ID to the frontend
      if (isNewChat) {
        writer.write({
          type: "data-new-chat",
          id: currentChatId!,
          data: {
            type: "NEW_CHAT_CREATED",
            chatId: currentChatId,
          },
        });
      }

      const result = await streamFromDeepSearch({
        messages: convertToModelMessages(messages),
        onFinish: async ({ response }: any) => {
          console.log("[onFinish] Starting - response.messages count:", response.messages?.length);
          
          // Delete all existing messages for this chat
          const deleteMessagesSpan = trace.span({
            name: "delete-existing-messages",
            input: { chatId: currentChatId },
          });

          await db
            .delete(messagesTable)
            .where(eq(messagesTable.chatId, currentChatId!));

          deleteMessagesSpan.end({
            output: { success: true },
          });

          // Get all messages including the response
          const allMessages = response.messages;

          // Save all messages (original + new response) to database
          // We only need to save the 'parts' property - 'content' is derived from parts
          const messagesToInsert = allMessages.map((msg: any, index: number) => ({
            chatId: currentChatId!,
            role: msg.role,
            parts: (msg as any).parts as unknown[],
            order: index,
          }));

          const insertMessagesSpan = trace.span({
            name: "insert-updated-messages",
            input: { chatId: currentChatId, messageCount: messagesToInsert.length },
          });

          await db.insert(messagesTable).values(messagesToInsert);
          
          console.log("[onFinish] Saved", messagesToInsert.length, "messages to database");

          insertMessagesSpan.end({
            output: { success: true, messageCount: messagesToInsert.length },
          });

          // Update the chat's updatedAt timestamp
          const updateChatTimestampSpan = trace.span({
            name: "update-chat-timestamp",
            input: { chatId: currentChatId },
          });

          await db
            .update(chats)
            .set({
              updatedAt: new Date(),
            })
            .where(eq(chats.id, currentChatId!));

          updateChatTimestampSpan.end({
            output: { success: true },
          });

          // Flush Langfuse traces
          await langfuse.flushAsync();
        },
        telemetry: {
          isEnabled: true,
          functionId: "agent",
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
