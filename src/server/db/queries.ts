import { db } from ".";
import { chats, messages } from "./schema";
import { eq, desc, and } from "drizzle-orm";

// Type for messages that matches the structure we're storing
export type StoredMessage = {
  id: string;
  role: string;
  parts?: unknown[];
};

/**
 * Upsert a chat with all its messages.
 * If the chat exists and doesn't belong to the user, throws an error.
 * If the chat exists, deletes all existing messages and replaces with new ones.
 * If the chat doesn't exist, creates a new chat with the provided ID.
 */
export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: StoredMessage[];
}) => {
  const { userId, chatId, title, messages: newMessages } = opts;

  // Check if chat exists and belongs to user
  const existingChat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  });

  // Also check if a chat with this ID exists but belongs to a different user
  const chatWithSameId = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });

  // If chat exists but doesn't belong to user, throw error
  if (chatWithSameId && !existingChat) {
    throw new Error("Unauthorized: Chat does not belong to user");
  }

  // Use a transaction to ensure atomicity
  await db.transaction(async (tx) => {
    if (existingChat) {
      // Update existing chat's updatedAt timestamp and title
      await tx
        .update(chats)
        .set({
          title,
          updatedAt: new Date(),
        })
        .where(eq(chats.id, chatId));

      // Delete all existing messages (cascade should handle this, but being explicit)
      await tx.delete(messages).where(eq(messages.chatId, chatId));
    } else {
      // Create new chat
      await tx.insert(chats).values({
        id: chatId,
        userId,
        title,
      });
    }

    // Insert all new messages
    if (newMessages.length > 0) {
      await tx.insert(messages).values(
        newMessages.map((msg, index) => ({
          chatId,
          role: msg.role,
          parts: msg.parts ?? [],
          order: index,
        })),
      );
    }
  });

  return chatId;
};

/**
 * Get a chat by ID with all its messages, ordered by message order.
 * Returns null if chat doesn't exist.
 */
export const getChat = async (opts: {userId: string, chatId: string}) => {
  const { userId, chatId } = opts;
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.order)],
      },
    },
  });

  return chat ?? null;
};

/**
 * Get all chats for a user, ordered by most recently updated first.
 * Does not include messages.
 */
export const getChats = async (userId: string) => {
  const userChats = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: [desc(chats.updatedAt)],
  });

  return userChats;
};
