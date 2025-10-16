# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deep-Search-Agent is an AI-powered conversational search platform built with Next.js 15 that combines web search capabilities (via Serper API) with LLM processing (Azure AI) to provide intelligent, research-backed answers. The application features Discord OAuth authentication, PostgreSQL persistence, and Redis caching.

## Development Commands

### Setup and Dependencies
```bash
pnpm install                    # Install dependencies (use pnpm, not npm)
```

### Database Setup
The project requires PostgreSQL and Redis. Use Docker Desktop and run:
```bash
./start-database.sh             # Start PostgreSQL container
./start-redis.sh                # Start Redis container
```

### Database Management
```bash
pnpm db:generate                # Generate Drizzle migrations from schema
pnpm db:migrate                 # Run migrations
pnpm db:push                    # Push schema changes directly (dev only)
pnpm db:studio                  # Open Drizzle Studio GUI
```

### Development
```bash
pnpm dev                        # Start dev server with Turbopack
pnpm build                      # Production build
pnpm start                      # Start production server
pnpm preview                    # Build and start production server
```

### Code Quality
```bash
pnpm check                      # Run linting + type checking
pnpm lint                       # Run ESLint
pnpm lint:fix                   # Auto-fix ESLint issues
pnpm typecheck                  # Run TypeScript type checking
pnpm format:check               # Check Prettier formatting
pnpm format:write               # Auto-format with Prettier
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

**Planned Agent Flow**:
1. Search (Serper API - cached)
2. Crawl (extract page content)
3. Synthesize (LLM processing with search context)
4. Respond (stream to frontend)

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
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:migrate` to apply migration
4. Drizzle maintains type safety across the stack

### React Server Components (RSC)

- Server components by default (no "use client" directive)
- Use client components only for interactivity (forms, state, event handlers)
- Fetch data directly in server components using `async` functions
- Use `auth()` from [src/server/auth/index.ts](src/server/auth/index.ts) to get session in RSC

### Code Formatting

- Prettier configured with Tailwind plugin ([prettier.config.js](prettier.config.js))
- Auto-formats on save (recommended VSCode setting)
- Tailwind classes automatically ordered

## Current Development Status

**Implemented**:
- Authentication (Discord OAuth)
- Database schema (Auth tables)
- Web search integration (Serper API)
- Redis caching layer
- Basic UI components
- LLM configuration (Azure)

**In Progress** (see [README.md](README.md)):
- Chat history persistence
- Agent loop implementation
- Content crawling/scraping
- Rate limiting (IP-based for anonymous users)
- Conversation summarization for long contexts
- Chat editing and rerun functionality
- Follow-up question generation

## Key File Locations

- **LLM**: [src/agent.ts](src/agent.ts)
- **Search**: [src/serper.ts](src/serper.ts)
- **Auth Config**: [src/server/auth/config.ts](src/server/auth/config.ts)
- **Database Schema**: [src/server/db/schema.ts](src/server/db/schema.ts)
- **Database Client**: [src/server/db/index.ts](src/server/db/index.ts)
- **Redis Client**: [src/server/redis/redis.ts](src/server/redis/redis.ts)
- **Environment**: [src/env.js](src/env.js)
- **Drizzle Config**: [drizzle.config.ts](drizzle.config.ts)
