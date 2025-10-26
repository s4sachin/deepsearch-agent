import { db } from "~/server/db";
import { streams, chats, messages } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function createStream(chatId: string): Promise<string> {
  const streamId = crypto.randomUUID();
  await db.insert(streams).values({
    id: streamId,
    chatId,
    createdAt: new Date(),
  });
  return streamId;
}

export async function getStreamsByChatId({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  const results = await db
    .select({ stream: streams })
    .from(streams)
    .innerJoin(chats, eq(chats.id, streams.chatId))
    .where(and(eq(streams.chatId, chatId), eq(chats.userId, userId)))
    .orderBy(desc(streams.createdAt));

  return results.map((r) => r.stream);
}

export async function getChat({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.order)],
      },
    },
  });

  return chat;
}
