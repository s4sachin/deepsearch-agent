# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deep-Search-Agent is an AI-powered conversational search platform built with Next.js 15 that combines web search capabilities (via Serper API) with LLM processing (Azure AI) to provide intelligent, research-backed answers. The application features Discord OAuth authentication, PostgreSQL persistence, and Redis caching.

## Development Commands

### Setup and Dependencies
```bash
bun install                    # Install dependencies (use bun, not npm)
```

### Database Setup
The project uses Supabase (cloud PostgreSQL) and Redis.

**Supabase**: Already configured and running at https://uhspzspuudhizkpfwjbp.supabase.co
- No local PostgreSQL needed
- Update `DATABASE_URL` in `.env` with your Supabase connection string

**Redis**: Use Docker Desktop and run:
```bash
./start-redis.sh                # Start Redis container
```

### Database Management
```bash
bun db:generate                # Generate Drizzle migrations from schema
bun db:migrate                 # Run migrations
bun db:push                    # Push schema changes directly (dev only)
bun db:studio                  # Open Drizzle Studio GUI
```

### Development
```bash
bun dev                        # Start dev server with Turbopack
bun build                      # Production build
bun start                      # Start production server
bun preview                    # Build and start production server
```

### Code Quality
```bash
bun check                      # Run linting + type checking
bun lint                       # Run ESLint
bun lint:fix                   # Auto-fix ESLint issues
bun typecheck                  # Run TypeScript type checking
bun format:check               # Check Prettier formatting
bun format:write               # Auto-format with Prettier
```

### Testing
```bash
vitest                          # Run tests (Vitest configured with dotenv)
```

Note: The project uses evalite and autoevals for AI evaluation (see `package.json`), though eval files are not yet implemented.

## Architecture Overview

### Next.js 15 App Router Structure

The application uses Next.js 15 App Router with:
- **Server Components (RSC)**: Pages and layouts ([page.tsx](src/app/page.tsx), [layout.tsx](src/app/layout.tsx))
- **Client Components**: Interactive UI ([chat.tsx](src/app/chat.tsx))
- **Route Handlers**: API endpoints in [src/app/api/](src/app/api/)

### Authentication Flow

NextAuth 5.0.0-beta.25 with Discord OAuth provider:

1. Configuration: [src/server/auth/config.ts](src/server/auth/config.ts)
   - Discord provider setup
   - DrizzleAdapter for database session persistence
   - Custom session callback injects user ID

2. Handlers: [src/server/auth/index.ts](src/server/auth/index.ts)
   - Exports: `auth`, `handlers`, `signIn`, `signOut`
   - React cache wrapper for performance

3. API Route: [src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/[...nextauth]/route.ts)
   - Handles all OAuth flow endpoints

### Database Layer (Drizzle ORM)

**Schema**: [src/server/db/schema.ts](src/server/db/schema.ts)
- Auth tables: `users`, `accounts`, `sessions`, `verificationTokens`
- Rate limiting table: `requests` (tracks API usage per user)
- All tables prefixed with `ai-app-template_` (see [drizzle.config.ts](drizzle.config.ts))
- Includes relations for type-safe joins

**Connection**: [src/server/db/index.ts](src/server/db/index.ts)
- PostgreSQL client with connection pooling
- HMR-optimized caching in development

### Caching Strategy (Redis)

**Client**: [src/server/redis/redis.ts](src/server/redis/redis.ts)
- ioredis client with connection pooling
- Used for Serper API result caching (6-hour TTL)
- HMR-optimized caching in development

### AI Agent System

**LLM Setup**: [src/agent.ts](src/agent.ts)
- Azure AI SDK integration
- Environment-configured: resource name, API key, deployment name
- Exports `model` instance ready for use

**Web Search**: [src/serper.ts](src/serper.ts)
- Serper API client for Google search results
- Returns: organic results, knowledge graphs, related searches, people-also-ask
- Wrapped with Redis caching for cost optimization
- Type-safe interfaces for all search result types

**Chat API & Tool System**: [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
- Streaming chat endpoint using Vercel AI SDK's `streamText()`
- 10-step agent loop with `stopWhen(stepCountIs(10))`
- Single tool: `searchWeb` (Serper API with Redis caching)
- Returns up to 10 search results (title, link, snippet)
- System prompt encourages multi-source research with citations

**Agent Flow**:
1. User sends message → POST /api/chat
2. LLM decides whether to call `searchWeb` tool
3. If needed: Search via Serper API (cached 6 hours)
4. LLM synthesizes results with citations
5. Stream response to frontend via Server-Sent Events

**Planned Additions**:
- Crawl (extract page content)
- Long conversation summarization

### Environment Variables

**Validation**: [src/env.js](src/env.js)
- Uses T3 env-nextjs with Zod schemas
- Server-side validation for all required env vars
- Fails fast on missing/invalid configuration

**Required Variables** (see [.env.example](.env.example)):
- `AZURE_RESOURCE_NAME`, `AZURE_API_KEY`, `AZURE_DEPLOYMENT_NAME` - Azure AI configuration
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SERPER_API_KEY` - Web search API key
- `AUTH_SECRET` - NextAuth session encryption (generate with `openssl rand -base64 32`)
- `NODE_ENV` - Environment mode

## Important Patterns and Conventions

### Path Aliases

TypeScript path alias `~/` resolves to `src/` (configured in [tsconfig.json](tsconfig.json)):
```typescript
import { env } from "~/env";
import { db } from "~/server/db";
```

### Type Safety

- **Strict TypeScript**: All code uses strict mode with `noUncheckedIndexedAccess`
- **Runtime Validation**: Zod schemas for environment variables and API responses
- **ORM Types**: Drizzle provides full type inference for database queries

### Database Schema Modifications

When modifying database schema:
1. Edit [src/server/db/schema.ts](src/server/db/schema.ts)
2. Run `bun db:generate` to create migration
3. Run `bun db:migrate` to apply migration
4. Drizzle maintains type safety across the stack

### React Server Components (RSC)

- Server components by default (no "use client" directive)
- Use client components only for interactivity (forms, state, event handlers)
- Fetch data directly in server components using `async` functions
- Use `auth()` from [src/server/auth/index.ts](src/server/auth/index.ts) to get session in RSC

### Tool Definition Pattern

When adding new tools to the chat API:
```typescript
tools: {
  toolName: tool({
    description: "Clear description for LLM",
    inputSchema: z.object({ param: z.string() }),
    execute: async ({ param }, { abortSignal }) => {
      // Tool implementation
      return results;
    },
  }),
}
```

### Message Streaming Pattern

- Use `streamText()` from AI SDK for streaming responses
- Client uses `useChat` hook from `@ai-sdk/react`
- Messages converted via `convertToModelMessages()`
- Response: `.toUIMessageStreamResponse()` returns Server-Sent Events stream

### Code Formatting

- Prettier configured with Tailwind plugin ([prettier.config.js](prettier.config.js))
- Auto-formats on save (recommended VSCode setting)
- Tailwind classes automatically ordered

## Current Development Status

**Implemented**:
- Authentication (Discord OAuth)
- Database schema (Auth + requests tables)
- Web search integration (Serper API with Redis caching)
- Rate limiting (50 requests/day per user, admin bypass)
- Chat API with streaming responses
- Tool calling system (`searchWeb` tool)
- Tool invocation UI display
- Message streaming with status indicators
- LLM configuration (Azure)
- 10-step agent loop

**In Progress** (see [README.md](README.md)):
- Chat history persistence
- Content crawling/scraping
- Conversation summarization for long contexts
- Chat editing and rerun functionality
- Follow-up question generation

## Key File Locations

- **LLM**: [src/agent.ts](src/agent.ts)
- **Search**: [src/serper.ts](src/serper.ts)
- **Chat API**: [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
- **Chat UI**: [src/app/chat.tsx](src/app/chat.tsx)
- **Message Components**: [src/components/chat-message.tsx](src/components/chat-message.tsx)
- **Auth Config**: [src/server/auth/config.ts](src/server/auth/config.ts)
- **Auth UI**: [src/components/auth-button.tsx](src/components/auth-button.tsx), [src/components/sign-in-modal.tsx](src/components/sign-in-modal.tsx)
- **Database Schema**: [src/server/db/schema.ts](src/server/db/schema.ts)
- **Database Client**: [src/server/db/index.ts](src/server/db/index.ts)
- **Redis Client**: [src/server/redis/redis.ts](src/server/redis/redis.ts)
- **Environment**: [src/env.js](src/env.js)
- **Drizzle Config**: [drizzle.config.ts](drizzle.config.ts)
