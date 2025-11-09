# Deep-Search-Agent

An AI-powered conversational search platform that combines web search capabilities with LLM processing to provide intelligent, research-backed answers with citations.

## Overview

Deep-Search-Agent is built with Next.js 15 and leverages:
- **Google Gemini 2.0 Flash** for LLM processing
- **Serper API** for web search
- **Discord OAuth** for authentication
- **Supabase PostgreSQL** for data persistence
- **Redis** for caching search results

The application uses an agentic approach where the LLM autonomously decides when to search the web, synthesizes information from multiple sources, and provides well-cited answers.

## Key Features

### 🔍 Intelligent Web Search
- Multi-step research with up to 10 search iterations
- Automatic action selection (search, scrape, answer)
- Content crawling and extraction from search results
- Redis caching (6-hour TTL) to optimize API costs
- Inline citations with source links

### 🛡️ Safety & Guardrails
- Content safety classifier for harmful request detection
- Question clarification system for ambiguous queries
- Multi-turn attack detection in conversation history
- Transparent refusal reasons when requests are blocked

### 🔐 Authentication & Security
- Discord OAuth integration via NextAuth 5
- Session persistence in Supabase PostgreSQL
- Rate limiting: 50 requests/day per user (admin bypass available)
- User-scoped data access controls
- Currently disabled for development (anonymous mode)

### 💬 Chat Persistence
- Full conversation history storage with auto-generated titles
- Message ordering preservation
- User-specific chat isolation
- Efficient chat list queries
- Langfuse observability integration

### 🎨 Modern UI
- Real-time message streaming
- Action status indicators (search, scrape, answer)
- Responsive design with Tailwind CSS
- Loading states and error handling

## Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router, React Server Components)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Caching**: Redis (ioredis)
- **Auth**: NextAuth 5 (Discord OAuth)
- **AI**: Vercel AI SDK + Google Gemini 2.0 Flash
- **Search**: Serper API (Google Search)
- **Crawling**: Cheerio + Turndown (HTML to Markdown)
- **Observability**: Langfuse
- **Styling**: Tailwind CSS
- **Validation**: Zod schemas
- **Package Manager**: Bun

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # OAuth handlers
│   │   └── chat/                   # Streaming chat endpoint
│   ├── chat.tsx                    # Client-side chat UI
│   ├── page.tsx                    # Home page (RSC)
│   └── layout.tsx                  # Root layout
├── components/
│   ├── chat-message.tsx            # Message display with parts
│   ├── auth-button.tsx             # Sign in/out button
│   └── sign-in-modal.tsx           # Authentication modal
├── server/
│   ├── auth/                       # NextAuth configuration
│   ├── db/
│   │   ├── schema.ts               # Database schema (Drizzle)
│   │   ├── queries.ts              # Chat query helpers
│   │   └── index.ts                # DB client
│   └── redis/
│       └── redis.ts                # Redis client
├── lib/
│   ├── run-agent-loop.ts           # Main agent orchestration
│   ├── check-is-safe.ts            # Safety classifier
│   ├── check-if-question-needs-clarification.ts  # Clarification system
│   ├── system-context.ts           # Context management
│   ├── get-next-action.ts          # Action selection
│   └── answer-question.ts          # Answer generation
├── agent.ts                        # Google Gemini model setup
├── deep-search.ts                  # Deep search interface
├── serper.ts                       # Web search API client
├── crawl.ts                        # Content crawling
└── env.js                          # Environment validation
```

### Database Schema

**Authentication Tables** (NextAuth):
- `users` - User profiles with admin flag
- `accounts` - OAuth provider data
- `sessions` - Active sessions
- `verificationTokens` - Email verification

**Application Tables**:
- `requests` - Rate limiting tracking
- `chats` - Chat metadata (id, userId, title, timestamps)
- `messages` - Individual messages (role, parts JSON, order)

All tables prefixed with `ai-app-template_` for multi-project support.

### AI Agent Flow

1. **User Input** → Client sends message to `/api/chat`
2. **Authentication** → Verify user session (currently disabled for development)
3. **Safety Check** → Content moderation via safety classifier
4. **Clarification Check** → Detect ambiguous queries requiring clarification
5. **Agent Loop** → Up to 10 iterations with action selection:
   - **Search**: Query Serper API (cached in Redis)
   - **Scrape**: Extract full content from URLs
   - **Answer**: Generate final response with citations
6. **Synthesis** → LLM combines sources with citations
7. **Streaming** → Server-Sent Events stream to client with action indicators
8. **Persistence** → Conversations saved to Supabase with auto-generated titles
9. **Observability** → All traces logged to Langfuse

### Key Components

#### Chat API ([src/app/api/chat/route.ts](src/app/api/chat/route.ts))
- Streaming endpoint using `streamFromDeepSearch()`
- Anonymous mode for development (authentication disabled)
- Chat creation and persistence with auto-generated titles
- Langfuse tracing for observability

#### Agent Loop ([src/lib/run-agent-loop.ts](src/lib/run-agent-loop.ts))
- Safety check with `checkIsSafe()` - refuses unsafe requests
- Clarification check with `checkIfQuestionNeedsClarification()`
- Action selection via `getNextAction()` (search/scrape/answer)
- Context management with `SystemContext` class
- Maximum 10 iterations before forced answer generation

#### Database Queries ([src/server/db/queries.ts](src/server/db/queries.ts))
- `upsertChat()` - Create/update chat with authorization
- `getChat()` - Fetch chat with user validation
- `getChats()` - List user's chats

#### Web Search ([src/serper.ts](src/serper.ts))
- Google search via Serper API
- Returns: organic results, knowledge graph, related searches
- Redis caching layer (6-hour TTL)
- Type-safe result interfaces

## Setup

### Prerequisites

- Node.js 22+ with Bun
- Docker Desktop (for Redis only - PostgreSQL is on Supabase)
- Supabase account and project (already configured)
- Google Gemini API key
- Serper API key
- Discord OAuth application (optional - auth currently disabled)
- Langfuse account for observability (optional)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd deep-search-agent
   bun install
   ```

2. **Start infrastructure services**
   ```bash
   ./start-redis.sh     # Redis on port 6379
   # PostgreSQL is hosted on Supabase - no local setup needed
   ```

3. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in:
   ```bash
   # Google Gemini AI
   GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

   # Database - Supabase PostgreSQL (get from Supabase dashboard)
   # Use direct connection for migrations:
   DATABASE_URL=postgresql://postgres:[PASSWORD]@uhspzspuudhizkpfwjbp.supabase.com:5432/postgres
   # Or transaction pooler for production:
   # DATABASE_URL=postgresql://postgres:[PASSWORD]@uhspzspuudhizkpfwjbp.pooler.supabase.com:6543/postgres?pgbouncer=true

   # Redis
   REDIS_URL=redis://localhost:6379

   # Serper API
   SERPER_API_KEY=your-serper-key

   # Auth (currently disabled for development)
   AUTH_SECRET=your-secret  # Generate: openssl rand -base64 32
   AUTH_DISCORD_ID=your-discord-client-id
   AUTH_DISCORD_SECRET=your-discord-client-secret

   # Observability (optional)
   LANGFUSE_SECRET_KEY=your-langfuse-secret
   LANGFUSE_PUBLIC_KEY=your-langfuse-public
   LANGFUSE_BASEURL=https://cloud.langfuse.com

   # Configuration
   SEARCH_RESULTS_COUNT=10
   NODE_ENV=development

   # Legacy (not actively used, but required by env validation)
   AZURE_RESOURCE_NAME=placeholder
   AZURE_API_KEY=placeholder
   AZURE_DEPLOYMENT_NAME=placeholder
   ```

4. **Database is already set up**

   The Supabase database schema is already deployed and ready to use. No additional setup needed!

5. **Start development server**
   ```bash
   bun dev
   ```

   Access at [http://localhost:3000](http://localhost:3000)

### Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Add OAuth2 redirect URI: `http://localhost:3000/api/auth/callback/discord`
4. Copy Client ID and Client Secret to `.env`

## Development

### Available Commands

**Development**:
```bash
bun dev           # Start dev server (Turbopack)
bun build         # Production build
bun start         # Start production server
bun preview       # Build + start production
```

**Database**:
```bash
bun db:generate   # Generate migrations
bun db:migrate    # Run migrations
bun db:push       # Push schema (dev only)
bun db:studio     # Open Drizzle Studio GUI
```

**Code Quality**:
```bash
bun check         # Lint + typecheck
bun lint          # ESLint
bun lint:fix      # Auto-fix ESLint
bun typecheck     # TypeScript check
bun format:check  # Prettier check
bun format:write  # Auto-format
```

**Testing**:
```bash
vitest             # Run tests
```

### Database Schema Changes

1. Edit [src/server/db/schema.ts](src/server/db/schema.ts)
2. Run `bun db:generate` to create migration
3. Run `bun db:migrate` to apply
4. Types automatically updated via Drizzle

### Adding New AI Tools

```typescript
// In src/app/api/chat/route.ts
tools: {
  myTool: tool({
    description: "Clear description for the LLM",
    inputSchema: z.object({
      param: z.string().describe("Parameter description"),
    }),
    execute: async ({ param }, { abortSignal }) => {
      // Tool implementation
      return results;
    },
  }),
}
```

## Configuration

### Rate Limiting

Default: 50 requests/day per user (currently disabled for development)

Admin users bypass rate limits. Set `isAdmin = true` in the `users` table.

### Safety & Clarification

Safety classifier runs before every request to detect harmful content. Configure detection rules in [src/lib/check-is-safe.ts](src/lib/check-is-safe.ts).

Clarification system asks for more information on ambiguous queries. Configure thresholds in [src/lib/check-if-question-needs-clarification.ts](src/lib/check-if-question-needs-clarification.ts).

### Agent Loop

Max 10 iterations (configurable in [src/lib/system-context.ts](src/lib/system-context.ts))

Actions per iteration: search, scrape, or answer

### Cache TTL

Redis cache for Serper API: 6 hours (configurable in [src/serper.ts](src/serper.ts))

### Observability

Langfuse integration enabled by default. All LLM calls, searches, and scrapes are traced with metadata.

## Important Patterns

### Path Aliases
```typescript
import { env } from "~/env";           // src/env.js
import { db } from "~/server/db";      // src/server/db/index.ts
```

### Type Safety
- Strict TypeScript with `noUncheckedIndexedAccess`
- Zod validation for env vars and API responses
- Drizzle ORM provides full type inference

### React Server Components
- Server components by default (no "use client")
- Client components only for interactivity
- Use `auth()` to access session in RSC

## Roadmap

### Recently Completed
- [x] Content crawling/scraping from search results
- [x] Safety guardrails with content moderation
- [x] Question clarification system
- [x] Chat history persistence with auto-generated titles
- [x] Observability with Langfuse

### In Progress
- [ ] Chat history UI (sidebar with chat list)
- [ ] Edit/rerun chat functionality
- [ ] Follow-up question suggestions
- [ ] Long conversation summarization

### Planned
- [ ] Re-enable authentication and rate limiting
- [ ] Anonymous requests (IP-based rate limiting)
- [ ] Chunking system for crawled content
- [ ] AI evaluations (evalite framework with existing setup)
- [ ] Multi-model support (already exports multiple models)

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues or questions, please open a GitHub issue.
