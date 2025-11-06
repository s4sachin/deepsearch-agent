# Deep-Search-Agent

An AI-powered conversational search platform that combines web search capabilities with LLM processing to provide intelligent, research-backed answers with citations.

## Overview

Deep-Search-Agent is built with Next.js 15 and leverages:
- **Azure AI** for LLM processing
- **Serper API** for web search
- **Discord OAuth** for authentication
- **PostgreSQL** for data persistence
- **Redis** for caching search results

The application uses an agentic approach where the LLM autonomously decides when to search the web, synthesizes information from multiple sources, and provides well-cited answers.

## Key Features

### 🔍 Intelligent Web Search
- Multi-step research with up to 10 search iterations
- Automatic web search tool invocation by the LLM
- Redis caching (6-hour TTL) to optimize API costs
- Inline citations with source links

### 🔐 Authentication & Security
- Discord OAuth integration via NextAuth 5
- Session persistence in PostgreSQL
- Rate limiting: 50 requests/day per user (admin bypass available)
- User-scoped data access controls

### 💬 Chat Persistence
- Full conversation history storage
- Message ordering preservation
- User-specific chat isolation
- Efficient chat list queries

### 🎨 Modern UI
- Real-time message streaming
- Tool invocation status indicators
- Responsive design with Tailwind CSS
- Loading states and error handling

## Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router, React Server Components)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis (ioredis)
- **Auth**: NextAuth 5 (Discord OAuth)
- **AI**: Vercel AI SDK + Azure OpenAI
- **Search**: Serper API (Google Search)
- **Styling**: Tailwind CSS
- **Validation**: Zod schemas

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
├── agent.ts                        # Azure AI model setup
├── serper.ts                       # Web search API client
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
2. **Authentication** → Verify user session, check rate limits
3. **Agent Loop** → LLM with `searchWeb` tool (max 10 steps)
   - LLM decides autonomously when to search
   - Searches executed via Serper API (cached in Redis)
   - Results returned: title, link, snippet
4. **Synthesis** → LLM combines sources with citations
5. **Streaming** → Server-Sent Events stream to client
6. **Persistence** → Conversations saved to PostgreSQL

### Key Components

#### Chat API ([src/app/api/chat/route.ts](src/app/api/chat/route.ts))
- Streaming endpoint using `streamText()` from Vercel AI SDK
- Rate limiting with database tracking
- Tool: `searchWeb` (Serper API wrapper)
- System prompt optimized for research and citations

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

- Node.js 22+ with bun
- Docker Desktop (for Redis only - PostgreSQL is on Supabase)
- Supabase account and project
- Azure OpenAI API access
- Serper API key
- Discord OAuth application

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
   # Azure AI
   AZURE_RESOURCE_NAME=your-resource-name
   AZURE_API_KEY=your-api-key
   AZURE_DEPLOYMENT_NAME=your-deployment-name

   # Database - Supabase PostgreSQL (get from Supabase dashboard)
   # Use direct connection for migrations:
   DATABASE_URL=postgresql://postgres:[PASSWORD]@uhspzspuudhizkpfwjbp.supabase.com:5432/postgres
   # Or transaction pooler for production:
   # DATABASE_URL=postgresql://postgres:[PASSWORD]@uhspzspuudhizkpfwjbp.pooler.supabase.com:6543/postgres?pgbouncer=true

   # Redis
   REDIS_URL=redis://localhost:6379

   # Serper API
   SERPER_API_KEY=your-serper-key

   # Auth
   AUTH_SECRET=your-secret  # Generate: openssl rand -base64 32
   AUTH_DISCORD_ID=your-discord-client-id
   AUTH_DISCORD_SECRET=your-discord-client-secret

   # Environment
   NODE_ENV=development
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

Default: 50 requests/day per user (configurable in [src/app/api/chat/route.ts](src/app/api/chat/route.ts))

Admin users bypass rate limits. Set `isAdmin = true` in the `users` table.

### Agent Loop

Max 10 search iterations (configurable via `stepCountIs(10)`)

### Cache TTL

Redis cache for Serper API: 6 hours (configurable in [src/serper.ts](src/serper.ts))

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

### In Progress
- [ ] Chat history UI (sidebar with chat list)
- [ ] Content crawling/scraping from search results
- [ ] Long conversation summarization
- [ ] Edit/rerun chat functionality
- [ ] Follow-up question suggestions

### Planned
- [ ] Anonymous requests (IP-based rate limiting)
- [ ] Chunking system for crawled content
- [ ] AI evaluations (evals framework)
- [ ] Multi-model support

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.

## Support

For issues or questions, please open a GitHub issue.
