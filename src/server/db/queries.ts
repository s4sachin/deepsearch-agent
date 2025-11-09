import { db } from ".";
import { chats, messages, lessons } from "./schema";
import { eq, desc, and } from "drizzle-orm";
import type { UIMessage } from "ai";
import type { LessonContent, LessonStatus } from "~/types/lesson";

/**
 * Upsert a chat with all its messages.
 * If the chat exists and doesn't belong to the user, throws an error.
 * If the chat exists, deletes all existing messages and replaces with new ones.
 * If the chat doesn't exist, creates a new chat with the provided ID.
 */
export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title?: string;
  messages: UIMessage[];
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
      // Update existing chat's updatedAt timestamp and optionally title
      const updateData: { updatedAt: Date; title?: string } = {
        updatedAt: new Date(),
      };
      if (title !== undefined) {
        updateData.title = title;
      }
      await tx.update(chats).set(updateData).where(eq(chats.id, chatId));

      // Delete all existing messages (cascade should handle this, but being explicit)
      await tx.delete(messages).where(eq(messages.chatId, chatId));
    } else {
      // Create new chat with default title if not provided
      const finalTitle = title ?? "New Chat";
      await tx.insert(chats).values({
        id: chatId,
        userId,
        title: finalTitle,
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

// ========== LESSON QUERIES ==========

/**
 * Create a new lesson in the database with status "generating"
 */
export const createLesson = async (opts: {
  userId: string;
  outline: string;
  title: string;
}) => {
  const { userId, outline, title } = opts;

  const [lesson] = await db
    .insert(lessons)
    .values({
      userId,
      outline,
      title,
      status: "generating",
    })
    .returning();

  return lesson!;
};

/**
 * Update a lesson's status and optionally set content, error message, or other fields
 */
export const updateLessonStatus = async (opts: {
  lessonId: string;
  status: LessonStatus;
  content?: LessonContent;
  description?: string;
  lessonType?: string;
  researchNotes?: string[];
  errorMessage?: string;
}) => {
  const { lessonId, status, content, description, lessonType, researchNotes, errorMessage } = opts;

  const updateData: {
    status: LessonStatus;
    updatedAt: Date;
    content?: LessonContent;
    description?: string;
    lessonType?: string;
    researchNotes?: string[];
    errorMessage?: string;
  } = {
    status,
    updatedAt: new Date(),
  };

  if (content !== undefined) updateData.content = content;
  if (description !== undefined) updateData.description = description;
  if (lessonType !== undefined) updateData.lessonType = lessonType;
  if (researchNotes !== undefined) updateData.researchNotes = researchNotes;
  if (errorMessage !== undefined) updateData.errorMessage = errorMessage;

  const [lesson] = await db
    .update(lessons)
    .set(updateData)
    .where(eq(lessons.id, lessonId))
    .returning();

  return lesson!;
};

/**
 * Get a lesson by ID with authorization check
 * Returns null if lesson doesn't exist or doesn't belong to user
 */
export const getLesson = async (opts: { lessonId: string; userId: string }) => {
  const { lessonId, userId } = opts;

  const lesson = await db.query.lessons.findFirst({
    where: and(eq(lessons.id, lessonId), eq(lessons.userId, userId)),
  });

  return lesson ?? null;
};

/**
 * Get all lessons for a user, ordered by most recently created first
 */
export const getUserLessons = async (userId: string) => {
  const userLessons = await db.query.lessons.findMany({
    where: eq(lessons.userId, userId),
    orderBy: [desc(lessons.createdAt)],
  });

  return userLessons;
};
