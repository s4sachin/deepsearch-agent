# Database Schema Documentation

## DeepSearch AI Chat Application

**Version:** 1.0.0
**Last Updated:** October 2025
**Database:** PostgreSQL
**ORM:** Drizzle ORM

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current Schema](#2-current-schema)
3. [Planned Schema](#3-planned-schema)
4. [Relationships](#4-relationships)
5. [Indexes](#5-indexes)
6. [Migrations](#6-migrations)
7. [Data Access Patterns](#7-data-access-patterns)

---

## 1. Overview

### 1.1 Database Design Principles

- **Normalization:** Third normal form (3NF) for data integrity
- **Type Safety:** Drizzle ORM provides compile-time type checking
- **Constraints:** Foreign keys, unique constraints, and check constraints
- **Indexing:** Strategic indexes for query performance
- **Audit Trail:** Created/updated timestamps on all tables

### 1.2 Naming Conventions

- **Tables:** Plural, lowercase with underscores (`users`, `chat_messages`)
- **Columns:** camelCase in TypeScript, snake_case in SQL
- **Primary Keys:** `id` (UUID or serial)
- **Foreign Keys:** `{table}_id` (e.g., `user_id`, `chat_id`)
- **Timestamps:** `created_at`, `updated_at`

### 1.3 Schema Prefix

All tables use the prefix `ai-app-template_` to support multi-project schemas:

```typescript
export const createTable = pgTableCreator((name) => `ai-app-template_${name}`);
```

**Actual table names in PostgreSQL:**
- `ai-app-template_user`
- `ai-app-template_account`
- `ai-app-template_session`
- etc.

---

## 2. Current Schema

### 2.1 Users Table

**Purpose:** Store user account information

**Table Name:** `ai-app-template_user`

**Schema:**
```typescript
export const users = createTable("user", {
  id: varchar("id", { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  emailVerified: timestamp("email_verified", {
    mode: "date",
    withTimezone: true,
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar("image", { length: 255 }),
  isAdmin: boolean("is_admin").notNull().default(false),
});
```

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | VARCHAR(255) | No | UUID | Primary key |
| `name` | VARCHAR(255) | Yes | NULL | User's display name |
| `email` | VARCHAR(255) | No | - | User's email (unique) |
| `email_verified` | TIMESTAMP | Yes | CURRENT_TIMESTAMP | Email verification timestamp |
| `image` | VARCHAR(255) | Yes | NULL | Profile image URL |
| `is_admin` | BOOLEAN | No | false | Admin flag |

**Constraints:**
- Primary Key: `id`
- Unique: `email` (implicit via NextAuth)

**TypeScript Types:**
```typescript
type User = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  isAdmin: boolean;
};
```

---

### 2.2 Accounts Table

**Purpose:** Store OAuth account connections (Discord, etc.)

**Table Name:** `ai-app-template_account`

**Schema:**
```typescript
export const accounts = createTable(
  "account",
  {
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_user_id_idx").on(account.userId),
  }),
);
```

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `user_id` | VARCHAR(255) | No | Foreign key to users |
| `type` | VARCHAR(255) | No | Account type (oauth, email, etc.) |
| `provider` | VARCHAR(255) | No | OAuth provider (discord, google) |
| `provider_account_id` | VARCHAR(255) | No | Provider's user ID |
| `refresh_token` | TEXT | Yes | OAuth refresh token |
| `access_token` | TEXT | Yes | OAuth access token |
| `expires_at` | INTEGER | Yes | Token expiration (Unix timestamp) |
| `token_type` | VARCHAR(255) | Yes | Token type (Bearer, etc.) |
| `scope` | VARCHAR(255) | Yes | OAuth scopes granted |
| `id_token` | TEXT | Yes | OpenID Connect ID token |
| `session_state` | VARCHAR(255) | Yes | OAuth session state |

**Constraints:**
- Primary Key: `(provider, provider_account_id)`
- Foreign Key: `user_id` → `users.id`
- Index: `account_user_id_idx` on `user_id`

**TypeScript Types:**
```typescript
type Account = {
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
};
```

---

### 2.3 Sessions Table

**Purpose:** Store active user sessions

**Table Name:** `ai-app-template_session`

**Schema:**
```typescript
export const sessions = createTable(
  "session",
  {
    sessionToken: varchar("session_token", { length: 255 })
      .notNull()
      .primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp("expires", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_user_id_idx").on(session.userId),
  }),
);
```

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `session_token` | VARCHAR(255) | No | Primary key, session identifier |
| `user_id` | VARCHAR(255) | No | Foreign key to users |
| `expires` | TIMESTAMP | No | Session expiration time |

**Constraints:**
- Primary Key: `session_token`
- Foreign Key: `user_id` → `users.id`
- Index: `session_user_id_idx` on `user_id`

**TypeScript Types:**
```typescript
type Session = {
  sessionToken: string;
  userId: string;
  expires: Date;
};
```

---

### 2.4 Verification Tokens Table

**Purpose:** Email verification and password reset tokens

**Table Name:** `ai-app-template_verification_token`

**Schema:**
```typescript
export const verificationTokens = createTable(
  "verification_token",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);
```

**Columns:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `identifier` | VARCHAR(255) | No | User identifier (email) |
| `token` | VARCHAR(255) | No | Verification token |
| `expires` | TIMESTAMP | No | Token expiration |

**Constraints:**
- Primary Key: `(identifier, token)`

**TypeScript Types:**
```typescript
type VerificationToken = {
  identifier: string;
  token: string;
  expires: Date;
};
```

---

## 3. Planned Schema

### 3.1 Chats Table

**Purpose:** Store chat conversations

**Table Name:** `ai-app-template_chat`

**Schema (Planned):**
```typescript
export const chats = createTable(
  "chat",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => `chat_${crypto.randomUUID()}`),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (chat) => ({
    userIdIdx: index("chat_user_id_idx").on(chat.userId),
    createdAtIdx: index("chat_created_at_idx").on(chat.createdAt),
    updatedAtIdx: index("chat_updated_at_idx").on(chat.updatedAt),
  }),
);
```

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | VARCHAR(255) | No | chat_UUID | Primary key |
| `user_id` | VARCHAR(255) | No | - | Foreign key to users |
| `title` | VARCHAR(500) | No | - | Chat title |
| `created_at` | TIMESTAMP | No | NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | No | NOW() | Last update timestamp |

**Constraints:**
- Primary Key: `id`
- Foreign Key: `user_id` → `users.id` (CASCADE DELETE)
- Indexes: `user_id`, `created_at`, `updated_at`

---

### 3.2 Messages Table

**Purpose:** Store individual chat messages

**Table Name:** `ai-app-template_message`

**Schema (Planned):**
```typescript
export const messages = createTable(
  "message",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => `msg_${crypto.randomUUID()}`),
    chatId: varchar("chat_id", { length: 255 })
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 })
      .notNull()
      .$type<"user" | "assistant" | "system">(),
    content: text("content").notNull(),
    sources: json("sources").$type<Source[]>(),
    metadata: json("metadata").$type<MessageMetadata>(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (message) => ({
    chatIdIdx: index("message_chat_id_idx").on(message.chatId),
    createdAtIdx: index("message_created_at_idx").on(message.createdAt),
    chatIdCreatedAtIdx: index("message_chat_id_created_at_idx").on(
      message.chatId,
      message.createdAt,
    ),
  }),
);

// Supporting types
interface Source {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
}

interface MessageMetadata {
  searchQuery?: string;
  crawledUrls?: string[];
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  processingTime?: number; // milliseconds
}
```

**Columns:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | VARCHAR(255) | No | msg_UUID | Primary key |
| `chat_id` | VARCHAR(255) | No | - | Foreign key to chats |
| `role` | VARCHAR(50) | No | - | Message role (user/assistant/system) |
| `content` | TEXT | No | - | Message content (markdown) |
| `sources` | JSON | Yes | NULL | Array of source citations |
| `metadata` | JSON | Yes | NULL | Processing metadata |
| `created_at` | TIMESTAMP | No | NOW() | Creation timestamp |

**Constraints:**
- Primary Key: `id`
- Foreign Key: `chat_id` → `chats.id` (CASCADE DELETE)
- Indexes: `chat_id`, `created_at`, composite `(chat_id, created_at)`

---

### 3.3 Search Cache Table (Optional)

**Purpose:** Long-term search result caching (supplement to Redis)

**Table Name:** `ai-app-template_search_cache`

**Schema (Planned):**
```typescript
export const searchCache = createTable(
  "search_cache",
  {
    id: serial("id").primaryKey(),
    query: varchar("query", { length: 500 }).notNull(),
    results: json("results").notNull().$type<SerperTool.SearchResult>(),
    createdAt: timestamp("created_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    expiresAt: timestamp("expires_at", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (cache) => ({
    queryIdx: index("search_cache_query_idx").on(cache.query),
    expiresAtIdx: index("search_cache_expires_at_idx").on(cache.expiresAt),
  }),
);
```

**Note:** This table is optional. Redis is the primary cache. This would be for:
- Long-term storage (beyond Redis memory limits)
- Analytics on search patterns
- Fallback if Redis is down

---

### 3.4 User Settings Table (Optional)

**Purpose:** User preferences and settings

**Table Name:** `ai-app-template_user_settings`

**Schema (Planned):**
```typescript
export const userSettings = createTable(
  "user_settings",
  {
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    theme: varchar("theme", { length: 20 }).default("dark"),
    language: varchar("language", { length: 10 }).default("en"),
    defaultModel: varchar("default_model", { length: 50 }),
    enableSearchByDefault: boolean("enable_search_by_default")
      .notNull()
      .default(true),
    maxSearchResults: integer("max_search_results").default(10),
    updatedAt: timestamp("updated_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
);
```

---

## 4. Relationships

### 4.1 Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
│─────────────────│
│ id (PK)         │
│ name            │
│ email           │
│ email_verified  │
│ image           │
│ is_admin        │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────┴────────────────────────────┐
    │                                 │
    │                                 │
┌───▼──────────┐         ┌───────────▼─────┐
│   accounts   │         │    sessions     │
│──────────────│         │─────────────────│
│ user_id (FK) │         │ session_token   │
│ provider (PK)│         │ user_id (FK)    │
│ provider_id  │         │ expires         │
│ ...tokens    │         └─────────────────┘
└──────────────┘
         │
         │ 1:N
         │
    ┌────▼────────┐
    │    chats    │
    │─────────────│
    │ id (PK)     │
    │ user_id (FK)│
    │ title       │
    │ created_at  │
    │ updated_at  │
    └────┬────────┘
         │
         │ 1:N
         │
    ┌────▼─────────┐
    │   messages   │
    │──────────────│
    │ id (PK)      │
    │ chat_id (FK) │
    │ role         │
    │ content      │
    │ sources      │
    │ metadata     │
    │ created_at   │
    └──────────────┘
```

### 4.2 Relationship Definitions

**Drizzle Relations:**

```typescript
// User relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  chats: many(chats),
}));

// Account relations
export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  }),
}));

// Session relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  }),
}));

// Chat relations (planned)
export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id]
  }),
  messages: many(messages),
}));

// Message relations (planned)
export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id]
  }),
}));
```

---

## 5. Indexes

### 5.1 Current Indexes

| Table | Index Name | Columns | Purpose |
|-------|------------|---------|---------|
| `account` | `account_user_id_idx` | `user_id` | Fast user account lookups |
| `session` | `session_user_id_idx` | `user_id` | Fast user session lookups |

### 5.2 Planned Indexes

| Table | Index Name | Columns | Purpose |
|-------|------------|---------|---------|
| `chat` | `chat_user_id_idx` | `user_id` | List user's chats |
| `chat` | `chat_created_at_idx` | `created_at` | Sort by creation |
| `chat` | `chat_updated_at_idx` | `updated_at` | Sort by last activity |
| `message` | `message_chat_id_idx` | `chat_id` | Get messages for a chat |
| `message` | `message_created_at_idx` | `created_at` | Sort messages |
| `message` | `message_chat_id_created_at_idx` | `chat_id, created_at` | Efficient pagination |
| `search_cache` | `search_cache_query_idx` | `query` | Cache lookups |
| `search_cache` | `search_cache_expires_at_idx` | `expires_at` | Cleanup expired entries |

### 5.3 Index Strategy

**Simple Indexes:**
- Foreign keys (for JOIN performance)
- Frequently queried columns

**Composite Indexes:**
- Used for queries with multiple WHERE conditions
- Column order: equality → range → sort

**Full-Text Search (Future):**
```sql
-- For searching message content
CREATE INDEX message_content_fts_idx
ON ai-app-template_message
USING gin(to_tsvector('english', content));
```

---

## 6. Migrations

### 6.1 Migration Strategy

**Tool:** Drizzle Kit

**Process:**
1. Update schema in `src/server/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Review generated SQL in `drizzle/` directory
4. Apply migration: `npm run db:migrate`

### 6.2 Migration Commands

```bash
# Generate migration from schema changes
npm run db:generate

# Apply pending migrations
npm run db:migrate

# Push schema directly (dev only, no migrations)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### 6.3 Migration Files

**Location:** `/drizzle/`

**Format:**
```
drizzle/
├── 0000_initial_schema.sql
├── 0001_add_chats_table.sql
├── 0002_add_messages_table.sql
└── meta/
    └── _journal.json
```

**Example Migration:**
```sql
-- 0001_add_chats_table.sql
CREATE TABLE IF NOT EXISTS "ai-app-template_chat" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "title" varchar(500) NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "ai-app-template_chat"
  ADD CONSTRAINT "chat_user_id_users_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "ai-app-template_user"("id")
  ON DELETE cascade
  ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "chat_user_id_idx"
  ON "ai-app-template_chat" ("user_id");
```

### 6.4 Rollback Strategy

Drizzle doesn't have built-in rollbacks. Manual rollback process:

1. Create a new migration that reverses changes
2. Or restore from database backup

**Best Practice:** Test migrations in staging first.

---

## 7. Data Access Patterns

### 7.1 Common Queries

#### Get User by Email
```typescript
import { db } from "~/server/db";
import { users } from "~/server/db/schema";
import { eq } from "drizzle-orm";

const user = await db.query.users.findFirst({
  where: eq(users.email, "user@example.com"),
});
```

#### Get User with Accounts
```typescript
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    accounts: true,
  },
});
```

#### List User's Chats (Planned)
```typescript
import { chats } from "~/server/db/schema";
import { desc } from "drizzle-orm";

const userChats = await db.query.chats.findMany({
  where: eq(chats.userId, userId),
  orderBy: [desc(chats.updatedAt)],
  limit: 50,
});
```

#### Get Chat with Messages (Planned)
```typescript
const chat = await db.query.chats.findFirst({
  where: eq(chats.id, chatId),
  with: {
    messages: {
      orderBy: [asc(messages.createdAt)],
      limit: 100,
    },
  },
});
```

#### Paginated Messages (Planned)
```typescript
import { and, lt } from "drizzle-orm";

const messages = await db.query.messages.findMany({
  where: and(
    eq(messages.chatId, chatId),
    lt(messages.createdAt, cursorDate), // Cursor-based pagination
  ),
  orderBy: [desc(messages.createdAt)],
  limit: 50,
});
```

### 7.2 Transactions

**Example: Create Chat with Initial Message**
```typescript
await db.transaction(async (tx) => {
  const [chat] = await tx.insert(chats).values({
    userId,
    title: "New Chat",
  }).returning();

  await tx.insert(messages).values({
    chatId: chat.id,
    role: "system",
    content: "Hello! How can I help you today?",
  });
});
```

### 7.3 Batch Operations

**Insert Multiple Messages:**
```typescript
await db.insert(messages).values([
  { chatId, role: "user", content: "Question 1" },
  { chatId, role: "assistant", content: "Answer 1" },
  { chatId, role: "user", content: "Question 2" },
]);
```

### 7.4 Performance Tips

1. **Select Only Needed Columns:**
```typescript
// Good
const users = await db.select({
  id: users.id,
  name: users.name,
}).from(users);

// Avoid (selects all columns)
const users = await db.select().from(users);
```

2. **Use Prepared Statements:**
```typescript
const getUserById = db.query.users.findFirst({
  where: eq(users.id, sql.placeholder('userId')),
}).prepare();

// Reuse for multiple calls
const user1 = await getUserById.execute({ userId: '123' });
const user2 = await getUserById.execute({ userId: '456' });
```

3. **Batch Queries with Promise.all:**
```typescript
const [user, chats, settings] = await Promise.all([
  db.query.users.findFirst({ where: eq(users.id, userId) }),
  db.query.chats.findMany({ where: eq(chats.userId, userId) }),
  db.query.userSettings.findFirst({ where: eq(userSettings.userId, userId) }),
]);
```

---

## 8. Data Integrity

### 8.1 Constraints

**Foreign Key Constraints:**
- `ON DELETE CASCADE`: When user is deleted, delete all their chats, messages, etc.
- `ON UPDATE NO ACTION`: Primary keys shouldn't change

**Check Constraints (Future):**
```typescript
// Ensure message role is valid
check('role_check', sql`role IN ('user', 'assistant', 'system')`)

// Ensure token counts are positive
check('tokens_check', sql`(metadata->>'tokens')::int >= 0`)
```

### 8.2 Data Validation

**Application Layer (Zod):**
```typescript
import { z } from 'zod';

const MessageSchema = z.object({
  chatId: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(100000),
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().url(),
    snippet: z.string(),
  })).optional(),
});
```

### 8.3 Soft Deletes (Future Consideration)

Instead of hard deletes, use soft deletes:

```typescript
// Add to schema
deletedAt: timestamp("deleted_at", {
  mode: "date",
  withTimezone: true,
}),

// Queries
const activeChats = await db.query.chats.findMany({
  where: and(
    eq(chats.userId, userId),
    isNull(chats.deletedAt),
  ),
});
```

---

## Appendix

### A. Full Schema SQL (Current)

```sql
-- Users table
CREATE TABLE "ai-app-template_user" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "name" varchar(255),
  "email" varchar(255) NOT NULL,
  "email_verified" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  "image" varchar(255),
  "is_admin" boolean DEFAULT false NOT NULL
);

-- Accounts table
CREATE TABLE "ai-app-template_account" (
  "user_id" varchar(255) NOT NULL,
  "type" varchar(255) NOT NULL,
  "provider" varchar(255) NOT NULL,
  "provider_account_id" varchar(255) NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" varchar(255),
  "scope" varchar(255),
  "id_token" text,
  "session_state" varchar(255),
  PRIMARY KEY ("provider", "provider_account_id"),
  CONSTRAINT "account_user_id_users_id_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "ai-app-template_user"("id")
    ON DELETE no action
    ON UPDATE no action
);

CREATE INDEX "account_user_id_idx" ON "ai-app-template_account" ("user_id");

-- Sessions table
CREATE TABLE "ai-app-template_session" (
  "session_token" varchar(255) PRIMARY KEY NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "expires" timestamp with time zone NOT NULL,
  CONSTRAINT "session_user_id_users_id_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "ai-app-template_user"("id")
    ON DELETE no action
    ON UPDATE no action
);

CREATE INDEX "session_user_id_idx" ON "ai-app-template_session" ("user_id");

-- Verification tokens table
CREATE TABLE "ai-app-template_verification_token" (
  "identifier" varchar(255) NOT NULL,
  "token" varchar(255) NOT NULL,
  "expires" timestamp with time zone NOT NULL,
  PRIMARY KEY ("identifier", "token")
);
```

### B. Drizzle Configuration

**File:** `drizzle.config.ts`

```typescript
import { type Config } from "drizzle-kit";
import { env } from "~/env";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  tablesFilter: ["ai-app-template_*"],
} satisfies Config;
```

---

**Document Control:**
- **Author:** Engineering Team
- **Last Updated:** October 2025
- **Review Cycle:** On schema changes
