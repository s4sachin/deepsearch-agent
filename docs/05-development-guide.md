# Development Setup Guide

## DeepSearch AI Chat Application

**Version:** 1.0.0
**Last Updated:** October 2025

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Initial Setup](#2-initial-setup)
3. [Environment Configuration](#3-environment-configuration)
4. [Running the Application](#4-running-the-application)
5. [Development Workflow](#5-development-workflow)
6. [Testing](#6-testing)
7. [Database Management](#7-database-management)
8. [Troubleshooting](#8-troubleshooting)
9. [Deployment](#9-deployment)

---

## 1. Prerequisites

### 1.1 Required Software

| Software | Minimum Version | Recommended Version | Installation |
|----------|----------------|---------------------|--------------|
| **Node.js** | 18.x | 20.x or later | [nodejs.org](https://nodejs.org/) |
| **pnpm** | 8.x | Latest | `npm install -g pnpm` |
| **Docker Desktop** | 20.x | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | 2.x | Latest | [git-scm.com](https://git-scm.com/) |

### 1.2 Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features
- **Cursor IDE** (alternative to VS Code)
- **PostgreSQL Client** (optional): pgAdmin, TablePlus, or DBeaver
- **Redis Client** (optional): RedisInsight or redis-cli

### 1.3 Required Accounts

- **Discord Developer Account** - For OAuth authentication
  - Create app at: https://discord.com/developers/applications
- **Serper API Account** - For web search functionality
  - Sign up at: https://serper.dev/
- **LLM Provider Account** (Future) - OpenAI, Anthropic, etc.

---

## 2. Initial Setup

### 2.1 Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd 01-day-1-app

# Or if already cloned, navigate to the directory
cd /path/to/01-day-1-app
```

### 2.2 Install Dependencies

```bash
# Install all dependencies using pnpm
pnpm install

# This will install:
# - Next.js and React
# - TypeScript and type definitions
# - Drizzle ORM and PostgreSQL client
# - NextAuth and authentication providers
# - Tailwind CSS and UI libraries
# - Development tools (ESLint, Prettier, etc.)
```

**Note:** This project uses `pnpm` for faster installs and better disk space efficiency. If you prefer `npm`:

```bash
npm install
```

### 2.3 Start Docker Services

The application requires PostgreSQL and Redis to run. Start them using the provided scripts:

```bash
# Start PostgreSQL database (runs in background)
./start-database.sh

# Start Redis server (runs in background)
./start-redis.sh
```

**What these scripts do:**
- Create Docker containers for PostgreSQL and Redis
- Set up persistent volumes for data storage
- Configure networking and ports
- Start services in detached mode

**Verify services are running:**
```bash
# Check Docker containers
docker ps

# You should see:
# - postgres container on port 5432
# - redis container on port 6379
```

---

## 3. Environment Configuration

### 3.1 Create .env File

```bash
# Copy the example environment file
cp .env.example .env
```

### 3.2 Configure Environment Variables

Edit `.env` and fill in the required values:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/deepsearch"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# NextAuth Configuration
NEXTAUTH_SECRET="generate-a-random-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Discord OAuth
AUTH_DISCORD_ID="your-discord-client-id"
AUTH_DISCORD_SECRET="your-discord-client-secret"

# Serper API
SERPER_API_KEY="your-serper-api-key"

# Optional: LLM Provider (Future)
# OPENAI_API_KEY="your-openai-key"
# ANTHROPIC_API_KEY="your-anthropic-key"
```

### 3.3 Obtain API Keys

#### Discord OAuth Setup

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name your application (e.g., "DeepSearch Local Dev")
4. Go to "OAuth2" → "General"
5. Copy the **Client ID** → paste as `AUTH_DISCORD_ID`
6. Click "Reset Secret" → copy the **Client Secret** → paste as `AUTH_DISCORD_SECRET`
7. Add redirect URL: `http://localhost:3000/api/auth/callback/discord`
8. Save changes

#### Serper API Key

1. Go to https://serper.dev/
2. Sign up for an account
3. Go to API Keys section
4. Copy your API key → paste as `SERPER_API_KEY`
5. Note: Free tier includes 1,000 searches/month

#### NextAuth Secret

Generate a secure random string:

```bash
# On macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Paste the output as NEXTAUTH_SECRET
```

### 3.4 Verify Environment

```bash
# Test database connection
node -e "const postgres = require('postgres'); const sql = postgres(process.env.DATABASE_URL); sql\`SELECT 1\`.then(() => console.log('✅ Database connected')).catch(e => console.error('❌ Database error:', e.message));"

# Test Redis connection
node test-redis.js
# Should output: ✅ Redis connected
```

---

## 4. Running the Application

### 4.1 Database Setup

```bash
# Generate initial database schema
pnpm db:push

# Or run migrations (if they exist)
pnpm db:migrate

# Open Drizzle Studio to view database (optional)
pnpm db:studio
# Opens at http://localhost:4983
```

### 4.2 Start Development Server

```bash
# Start Next.js development server with Turbopack
pnpm dev

# The application will be available at:
# http://localhost:3000
```

**What happens:**
- Next.js starts in development mode
- Turbopack provides fast hot module replacement (HMR)
- TypeScript is compiled on-the-fly
- Tailwind CSS is processed
- API routes are available
- Browser automatically opens (or navigate manually)

### 4.3 Verify Application

1. **Home Page**: Navigate to http://localhost:3000
   - Should see the chat interface
   - Sidebar with auth button

2. **Sign In**: Click "Sign in with Discord"
   - Redirects to Discord OAuth
   - Authorize the application
   - Redirects back to app

3. **Test Chat** (once implemented):
   - Type a message
   - Should see response from AI

### 4.4 Development Servers

| Service | URL | Purpose |
|---------|-----|---------|
| **Next.js App** | http://localhost:3000 | Main application |
| **Drizzle Studio** | http://localhost:4983 | Database GUI |
| **PostgreSQL** | localhost:5432 | Database server |
| **Redis** | localhost:6379 | Cache server |

---

## 5. Development Workflow

### 5.1 Code Quality

```bash
# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Fix linting issues automatically
pnpm lint:fix

# Check code formatting
pnpm format:check

# Format code automatically
pnpm format:write

# Run all checks (type + lint)
pnpm check
```

### 5.2 Git Workflow

**Recommended Branch Strategy:**

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add feature description"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub/GitLab
```

**Commit Message Convention:**

```
feat: new feature
fix: bug fix
docs: documentation changes
style: formatting, missing semicolons, etc.
refactor: code restructuring
test: adding tests
chore: updating build tasks, etc.
```

### 5.3 Hot Reload

The development server supports hot reload:

- **React Components**: Changes auto-refresh
- **API Routes**: Automatically reloaded
- **Styles**: Instant updates
- **Environment Variables**: Require server restart

**To restart the server:**
```bash
# Press Ctrl+C to stop
# Then run again
pnpm dev
```

### 5.4 Component Development

**Create a new component:**

```bash
# Create component file
touch src/components/my-component.tsx
```

```typescript
// src/components/my-component.tsx
interface MyComponentProps {
  title: string;
}

export const MyComponent = ({ title }: MyComponentProps) => {
  return (
    <div className="rounded-lg bg-gray-800 p-4">
      <h2 className="text-xl font-bold text-gray-200">{title}</h2>
    </div>
  );
};
```

**Import and use:**
```typescript
import { MyComponent } from "~/components/my-component";

<MyComponent title="Hello World" />
```

### 5.5 API Route Development

**Create a new API route:**

```bash
# Create directory and file
mkdir -p src/app/api/example
touch src/app/api/example/route.ts
```

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    message: "Hello from API",
    user: session.user.name,
  });
}
```

**Test the API:**
```bash
curl http://localhost:3000/api/example
```

---

## 6. Testing

### 6.1 Test Setup (Future)

The project is configured with Vitest for testing:

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### 6.2 Writing Tests (Future)

**Example Component Test:**

```typescript
// src/components/__tests__/my-component.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../my-component';

describe('MyComponent', () => {
  it('renders title correctly', () => {
    render(<MyComponent title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });
});
```

**Example API Test:**

```typescript
// src/app/api/example/__tests__/route.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '../route';

describe('GET /api/example', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await GET(new Request('http://localhost:3000/api/example'));
    expect(response.status).toBe(401);
  });
});
```

### 6.3 AI Evaluation (Evalite)

The project includes Evalite for AI-specific testing:

```bash
# Run evaluations (when implemented)
pnpm eval

# This will test:
# - Response quality
# - Search relevance
# - Source accuracy
```

---

## 7. Database Management

### 7.1 Common Commands

```bash
# Push schema changes to database (development)
pnpm db:push

# Generate migration from schema changes
pnpm db:generate

# Run pending migrations
pnpm db:migrate

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

### 7.2 Database Migrations

**Creating a migration:**

1. Update schema in `src/server/db/schema.ts`
2. Generate migration:
   ```bash
   pnpm db:generate
   ```
3. Review generated SQL in `drizzle/` directory
4. Apply migration:
   ```bash
   pnpm db:migrate
   ```

**Example: Add a new table**

```typescript
// src/server/db/schema.ts
export const chats = createTable("chat", {
  id: varchar("id", { length: 255 }).notNull().primaryKey(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 500 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
```

```bash
# Generate migration
pnpm db:generate
# Creates: drizzle/0001_add_chats_table.sql

# Apply migration
pnpm db:migrate
```

### 7.3 Database Access

**Using Drizzle Studio:**

```bash
pnpm db:studio
```
- Visual database browser
- Edit data directly
- View relationships
- Execute queries

**Using psql (PostgreSQL CLI):**

```bash
# Connect to database
docker exec -it deepsearch-postgres psql -U postgres -d deepsearch

# List tables
\dt

# Describe table
\d ai-app-template_user

# Run query
SELECT * FROM "ai-app-template_user";

# Exit
\q
```

### 7.4 Database Reset

**Warning: This deletes all data!**

```bash
# Stop database
docker stop deepsearch-postgres

# Remove container and volume
docker rm -v deepsearch-postgres

# Restart database
./start-database.sh

# Re-run migrations
pnpm db:push
```

---

## 8. Troubleshooting

### 8.1 Common Issues

#### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 pnpm dev
```

#### Database Connection Failed

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# If not running, start it
./start-database.sh

# Check logs
docker logs deepsearch-postgres

# Verify DATABASE_URL in .env
```

#### Redis Connection Failed

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solutions:**
```bash
# Check if Redis is running
docker ps | grep redis

# If not running, start it
./start-redis.sh

# Check logs
docker logs deepsearch-redis

# Test connection
node test-redis.js
```

#### NextAuth Configuration Error

**Problem:** `[next-auth][error][MISSING_SECRET]`

**Solution:**
```bash
# Ensure NEXTAUTH_SECRET is set in .env
# Generate a new secret
openssl rand -base64 32

# Add to .env
NEXTAUTH_SECRET="<generated-secret>"
```

#### Discord OAuth Not Working

**Problem:** OAuth redirect fails or shows error

**Solutions:**
1. Verify Discord application settings:
   - Redirect URI: `http://localhost:3000/api/auth/callback/discord`
   - Client ID and Secret are correct

2. Check environment variables:
   ```bash
   # In .env
   AUTH_DISCORD_ID="..."
   AUTH_DISCORD_SECRET="..."
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. Restart dev server after changing .env

#### Type Errors

**Problem:** TypeScript compilation errors

**Solution:**
```bash
# Run type check to see all errors
pnpm typecheck

# Common fixes:
# 1. Restart TypeScript server in VS Code (Cmd+Shift+P → "Restart TS Server")
# 2. Delete node_modules and reinstall
rm -rf node_modules .next
pnpm install

# 3. Clear Next.js cache
rm -rf .next
```

#### Module Not Found

**Problem:** `Module not found: Can't resolve '~/...'`

**Solution:**
```bash
# The ~ alias is configured in tsconfig.json
# Ensure it's properly set up:

# tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "~/*": ["./src/*"]
    }
  }
}

# Restart dev server
```

### 8.2 Docker Issues

#### Docker Desktop Not Running

```bash
# On macOS
open -a Docker

# On Linux
sudo systemctl start docker

# Verify
docker ps
```

#### Container Won't Start

```bash
# Check container logs
docker logs deepsearch-postgres
docker logs deepsearch-redis

# Remove and recreate
docker rm -f deepsearch-postgres
./start-database.sh
```

#### Disk Space Issues

```bash
# Clean up Docker
docker system prune -a

# Remove unused volumes
docker volume prune
```

### 8.3 Performance Issues

#### Slow Development Server

```bash
# Turbopack should be fast by default
# If slow, try:

# 1. Clear .next cache
rm -rf .next

# 2. Upgrade Next.js
pnpm update next

# 3. Check for large files in public/
du -sh public/*

# 4. Disable source maps in next.config.js (dev only)
```

#### Slow Database Queries

```bash
# Enable query logging in PostgreSQL
# Check drizzle logs in console

# Analyze slow queries in Drizzle Studio
pnpm db:studio
```

---

## 9. Deployment

### 9.1 Build for Production

```bash
# Create production build
pnpm build

# This will:
# - Compile TypeScript
# - Bundle JavaScript
# - Optimize images
# - Generate static pages
# - Create server functions
```

### 9.2 Test Production Build Locally

```bash
# Build and start production server
pnpm preview

# Or separately:
pnpm build
pnpm start
```

### 9.3 Deploy to Vercel

**One-Click Deploy:**

1. Push code to GitHub
2. Import project at https://vercel.com/new
3. Configure environment variables
4. Deploy

**CLI Deploy:**

```bash
# Install Vercel CLI
pnpm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

**Environment Variables:**

Set these in Vercel dashboard:
- `DATABASE_URL` (use Neon, Supabase, or Vercel Postgres)
- `REDIS_URL` (use Upstash Redis)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your production URL)
- `AUTH_DISCORD_ID`
- `AUTH_DISCORD_SECRET`
- `SERPER_API_KEY`

### 9.4 Deploy to Other Platforms

**Docker Deployment:**

```dockerfile
# Dockerfile (create this)
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm && pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build image
docker build -t deepsearch-app .

# Run container
docker run -p 3000:3000 --env-file .env deepsearch-app
```

---

## 10. Best Practices

### 10.1 Code Organization

- **Components**: Keep small, focused, reusable
- **API Routes**: One responsibility per route
- **Database Queries**: Use Drizzle query builder, avoid raw SQL
- **Types**: Define interfaces for all data structures
- **Error Handling**: Always handle errors gracefully

### 10.2 Performance

- **Images**: Use Next.js `<Image>` component
- **Fonts**: Use next/font for optimization
- **Code Splitting**: Dynamic imports for large components
- **Caching**: Use Redis aggressively
- **Database**: Index frequently queried columns

### 10.3 Security

- **Never commit .env** - Use .env.example template
- **Validate all inputs** - Use Zod schemas
- **Sanitize user content** - Prevent XSS
- **Use prepared statements** - Drizzle handles this
- **Rate limit API routes** - Prevent abuse

### 10.4 Git Hygiene

```bash
# Before committing
pnpm check          # Type check + lint
pnpm format:write   # Format code

# Commit
git add .
git commit -m "feat: descriptive message"

# Push
git push
```

---

## Appendix

### A. Useful Commands Reference

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm preview          # Build and start production

# Code Quality
pnpm typecheck        # Type check
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix lint issues
pnpm format:check     # Check formatting
pnpm format:write     # Format code
pnpm check            # Type + lint

# Database
pnpm db:push          # Push schema changes
pnpm db:generate      # Generate migration
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio

# Docker
./start-database.sh   # Start PostgreSQL
./start-redis.sh      # Start Redis
docker ps             # List running containers
docker logs <name>    # View container logs
```

### B. VS Code Configuration

**Recommended settings.json:**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### C. Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Drizzle ORM**: https://orm.drizzle.team/
- **NextAuth**: https://next-auth.js.org/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **TypeScript**: https://www.typescriptlang.org/docs

---

**Document Control:**
- **Author:** Engineering Team
- **Last Updated:** October 2025
- **Review Cycle:** On tooling changes
