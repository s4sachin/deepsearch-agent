# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deep-Search-Agent is an AI-powered conversational search platform built with Next.js 15 that combines web search capabilities (via Serper API) with LLM processing (Google Gemini 2.0 Flash) to provide intelligent, research-backed answers. The application features Discord OAuth authentication, Supabase PostgreSQL persistence, and Redis caching, with built-in safety guardrails and question clarification.

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
- Supabase PostgreSQL client with connection pooling
- HMR-optimized caching in development
- Hosted at https://uhspzspuudhizkpfwjbp.supabase.co

### Caching Strategy (Redis)

**Client**: [src/server/redis/redis.ts](src/server/redis/redis.ts)
- ioredis client with connection pooling
- Used for Serper API result caching (6-hour TTL)
- HMR-optimized caching in development

### AI Agent System

**LLM Setup**: [src/agent.ts](src/agent.ts)
- Google Gemini 2.0 Flash integration via AI SDK
- Multiple model exports for different purposes:
  - `model` - Main conversational model (gemini-2.0-flash-001)
  - `guardrailModel` - Safety classification (gemini-2.0-flash-001)
  - `factualityModel` - Factuality assessment (gemini-2.0-flash-001)
  - `relevancyModel` - Relevancy evaluation (gemini-2.0-flash-001)

**Web Search**: [src/serper.ts](src/serper.ts)
- Serper API client for Google search results
- Returns: organic results, knowledge graphs, related searches, people-also-ask
- Wrapped with Redis caching for cost optimization
- Type-safe interfaces for all search result types

**Deep Search System**: [src/deep-search.ts](src/deep-search.ts) & [src/lib/run-agent-loop.ts](src/lib/run-agent-loop.ts)
- Streaming interface using `streamFromDeepSearch()`
- Agent loop with actions: `search`, `scrape`, `answer`
- Tools: `searchWeb` (Serper API), `scrapeUrls` (content extraction)
- Automatic action selection via `getNextAction()`
- Context management with `SystemContext` class

**Agent Flow**:
1. User sends message → POST /api/chat
2. Safety check (content moderation)
3. Clarification check (ambiguity detection)
4. Agent loop (max 10 steps):
   - LLM selects next action (search/scrape/answer)
   - Execute action and update context
   - Repeat until answer ready or max steps reached
5. Generate final answer with citations
6. Stream response to frontend via Server-Sent Events
7. Save conversation to database with auto-generated title

### Agent Safety & Guardrails

The system implements two critical safety mechanisms that run before the main agent loop:

**Content Safety Classifier**: [src/lib/check-is-safe.ts](src/lib/check-is-safe.ts)
- Uses `guardrailModel` (Gemini 2.0 Flash) for content moderation
- Analyzes full conversation history in XML format
- Classifications: `allow` or `refuse`
- Detects: illegal activities, harmful content, privacy violations, dangerous information, exploitation
- Considers conversation context for multi-turn attack detection
- Blocks edge cases: legitimate research without proper safeguards
- Returns refusal reason for transparency

**Question Clarification System**: [src/lib/check-if-question-needs-clarification.ts](src/lib/check-if-question-needs-clarification.ts)
- Uses `model` (Gemini 2.0 Flash) for ambiguity detection
- Identifies when questions need clarification before search
- Detects:
  - Ambiguous premises or scope
  - Unknown or ambiguous references
  - Missing critical context
  - Contradictory information
  - Multiple possible interpretations
- Returns clarification prompt to user when needed
- Conservative approach: only requests clarification when it significantly improves results

**Integration**: [src/lib/run-agent-loop.ts](src/lib/run-agent-loop.ts)
1. Safety check runs first - refuses unsafe requests immediately
2. Clarification check runs second - asks for clarification if needed
3. Only proceeds to agent loop if both checks pass
4. Each check uses `SystemContext` for conversation history analysis

### Environment Variables

**Validation**: [src/env.js](src/env.js)
- Uses T3 env-nextjs with Zod schemas
- Server-side validation for all required env vars
- Fails fast on missing/invalid configuration

**Required Variables** (see [.env.example](.env.example)):
- `GOOGLE_GENERATIVE_AI_API_KEY` - Google Gemini API key (used via @ai-sdk/google)
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SERPER_API_KEY` - Web search API key
- `AUTH_SECRET` - NextAuth session encryption (generate with `openssl rand -base64 32`)
- `AUTH_DISCORD_ID`, `AUTH_DISCORD_SECRET` - Discord OAuth credentials
- `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASEURL` - Observability (Langfuse)
- `SEARCH_RESULTS_COUNT` - Number of search results per query (default: 10)
- `NODE_ENV` - Environment mode

**Note**: Azure OpenAI variables are still in env.js for backwards compatibility but not actively used. The system now uses Google Gemini 2.0 Flash exclusively.

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
- Authentication (Discord OAuth, currently disabled for development)
- Database schema (Auth + requests + chats + messages tables)
- Web search integration (Serper API with Redis caching)
- Content crawling/scraping (bulkCrawlWebsites)
- Rate limiting (50 requests/day per user, admin bypass - currently disabled)
- Chat API with streaming responses
- Agent loop system with action selection (search, scrape, answer)
- Safety guardrails (content moderation)
- Question clarification system (ambiguity detection)
- Chat history persistence with auto-generated titles
- Message streaming with status indicators
- LLM configuration (Google Gemini 2.0 Flash)
- 10-step agent loop with context management
- Observability (Langfuse integration)

**In Progress** (see [README.md](README.md)):
- Chat history UI (sidebar with chat list)
- Chat editing and rerun functionality
- Follow-up question generation
- Long conversation summarization

## Key File Locations

### Core AI System
- **LLM Models**: [src/agent.ts](src/agent.ts)
- **Deep Search**: [src/deep-search.ts](src/deep-search.ts)
- **Agent Loop**: [src/lib/run-agent-loop.ts](src/lib/run-agent-loop.ts)
- **System Context**: [src/lib/system-context.ts](src/lib/system-context.ts)
- **Action Selection**: [src/lib/get-next-action.ts](src/lib/get-next-action.ts)
- **Answer Generation**: [src/lib/answer-question.ts](src/lib/answer-question.ts)

### Safety & Guardrails
- **Safety Classifier**: [src/lib/check-is-safe.ts](src/lib/check-is-safe.ts)
- **Clarification System**: [src/lib/check-if-question-needs-clarification.ts](src/lib/check-if-question-needs-clarification.ts)

### Search & Crawl
- **Web Search**: [src/serper.ts](src/serper.ts)
- **Content Crawling**: [src/crawl.ts](src/crawl.ts)

### API & UI
- **Chat API**: [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
- **Chat UI**: [src/app/chat.tsx](src/app/chat.tsx)
- **Message Components**: [src/components/chat-message.tsx](src/components/chat-message.tsx)

### Auth
- **Auth Config**: [src/server/auth/config.ts](src/server/auth/config.ts)
- **Auth UI**: [src/components/auth-button.tsx](src/components/auth-button.tsx), [src/components/sign-in-modal.tsx](src/components/sign-in-modal.tsx)

### Database
- **Database Schema**: [src/server/db/schema.ts](src/server/db/schema.ts)
- **Database Client**: [src/server/db/index.ts](src/server/db/index.ts)
- **Database Queries**: [src/server/db/queries.ts](src/server/db/queries.ts)
- **Drizzle Config**: [drizzle.config.ts](drizzle.config.ts)

### Infrastructure
- **Redis Client**: [src/server/redis/redis.ts](src/server/redis/redis.ts)
- **Environment**: [src/env.js](src/env.js)
