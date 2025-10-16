# System Architecture Documentation

## DeepSearch AI Chat Application

**Version:** 1.0.0
**Last Updated:** October 2025

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Component Architecture](#4-component-architecture)
5. [Data Flow](#5-data-flow)
6. [Technology Stack](#6-technology-stack)
7. [Infrastructure](#7-infrastructure)
8. [Security Architecture](#8-security-architecture)
9. [Scalability Considerations](#9-scalability-considerations)

---

## 1. System Overview

DeepSearch is a full-stack TypeScript application built on Next.js 15 with the App Router pattern. The system integrates multiple services to provide an AI-powered conversational search experience.

### 1.1 Architecture Style

- **Pattern:** Monolithic with modular organization
- **Rendering:** Hybrid (Server-Side Rendering + Client-Side Interactivity)
- **API:** RESTful endpoints via Next.js Route Handlers
- **Database:** PostgreSQL with Drizzle ORM
- **Caching:** Redis for search result caching
- **Authentication:** OAuth 2.0 via NextAuth

### 1.2 Key Characteristics

- **Type Safety:** End-to-end TypeScript
- **Server Components:** React Server Components for optimal performance
- **Edge-Ready:** Designed for edge deployment
- **Stateless:** Session state managed externally (DB + Redis)

---

## 2. Architecture Principles

### 2.1 Design Principles

1. **Separation of Concerns**
   - Clear boundaries between presentation, business logic, and data layers
   - UI components isolated from data fetching logic
   - Server and client code explicitly separated

2. **Type Safety First**
   - TypeScript strict mode enabled
   - Zod schemas for runtime validation
   - Drizzle ORM for type-safe database queries
   - End-to-end type inference

3. **Performance Optimization**
   - Redis caching for expensive operations
   - Server-side rendering for SEO and initial load
   - Code splitting and lazy loading
   - Image optimization via Next.js Image component

4. **Security by Default**
   - Environment variables for secrets
   - SQL injection prevention via ORM
   - CSRF protection via NextAuth
   - Rate limiting (planned)

5. **Developer Experience**
   - Hot module replacement
   - Type checking in development
   - ESLint and Prettier for code quality
   - Clear project structure

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │   Mobile     │  │   Desktop    │          │
│  │   (React)    │  │   (Future)   │  │   (Future)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Application                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Presentation Layer (App Router)             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │   │
│  │  │  Pages   │  │Components│  │  Layouts │             │   │
│  │  └──────────┘  └──────────┘  └──────────┘             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 API Layer (Route Handlers)               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │   │
│  │  │   Auth   │  │   Chat   │  │  Search  │             │   │
│  │  └──────────┘  └──────────┘  └──────────┘             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Business Logic Layer                   │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │   │
│  │  │ Services │  │  Utils   │  │ Helpers  │             │   │
│  │  └──────────┘  └──────────┘  └──────────┘             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           │                    │                    │
           ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │      Redis       │  │  External APIs   │
│   (Drizzle ORM)  │  │   (ioredis)      │  │                  │
│                  │  │                  │  │  - Serper API    │
│  - Users         │  │  - Search Cache  │  │  - Discord OAuth │
│  - Sessions      │  │  - Session Store │  │  - LLM Provider  │
│  - Chats         │  │  - Rate Limits   │  │    (Future)      │
│  - Messages      │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 4. Component Architecture

### 4.1 Frontend Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout (RSC)
│   ├── page.tsx                 # Home page (RSC)
│   ├── chat.tsx                 # Chat interface (Client Component)
│   └── api/                     # API Routes
│       └── auth/                # Authentication endpoints
│
├── components/                   # React Components
│   ├── auth-button.tsx          # Auth UI (Client)
│   ├── chat-message.tsx         # Message display (Client)
│   ├── error-message.tsx        # Error UI (Client)
│   └── sign-in-modal.tsx        # Modal dialog (Client)
│
└── server/                       # Server-side code
    ├── auth/                     # Authentication
    ├── db/                       # Database
    └── redis/                    # Caching
```

#### 4.1.1 Component Types

**Server Components (RSC):**
- `app/layout.tsx` - Application shell
- `app/page.tsx` - Home page with auth check
- Used for: Data fetching, static content, SEO

**Client Components:**
- `app/chat.tsx` - Interactive chat interface
- `components/*` - All UI components
- Used for: Interactivity, state management, event handlers

### 4.2 Backend Architecture

```
src/server/
├── auth/
│   ├── index.ts                 # Auth instance export
│   └── config.ts                # NextAuth configuration
│
├── db/
│   ├── index.ts                 # Database client
│   └── schema.ts                # Drizzle schema definitions
│
└── redis/
    └── redis.ts                 # Redis client & caching utils
```

### 4.3 API Route Structure

```
app/api/
└── auth/
    └── [...nextauth]/
        └── route.ts             # NextAuth handler
```

**Planned API Routes:**
```
app/api/
├── auth/[...nextauth]/route.ts
├── chat/
│   ├── route.ts                 # Create/list chats
│   ├── [chatId]/route.ts       # Get/update/delete chat
│   └── [chatId]/messages/route.ts
├── search/route.ts              # Web search endpoint
└── crawl/route.ts               # Content crawling endpoint
```

---

## 5. Data Flow

### 5.1 Authentication Flow

```
┌─────────┐
│ Browser │
└────┬────┘
     │
     │ 1. Click "Sign in with Discord"
     ▼
┌─────────────────┐
│   NextAuth      │
│   Middleware    │
└────┬────────────┘
     │
     │ 2. Redirect to Discord OAuth
     ▼
┌─────────────────┐
│  Discord OAuth  │
└────┬────────────┘
     │
     │ 3. User authorizes
     ▼
┌─────────────────┐
│   NextAuth      │
│   Callback      │
└────┬────────────┘
     │
     │ 4. Store user in PostgreSQL
     ▼
┌─────────────────┐      ┌─────────────────┐
│   PostgreSQL    │◄────►│     Redis       │
│   (User Data)   │      │  (Session)      │
└─────────────────┘      └─────────────────┘
     │
     │ 5. Create session
     ▼
┌─────────────────┐
│   Browser       │
│   (Logged In)   │
└─────────────────┘
```

### 5.2 Message Flow (Planned)

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Send message
     ▼
┌──────────────────┐
│ Chat Component   │
└────┬─────────────┘
     │
     │ 2. POST /api/chat/[chatId]/messages
     ▼
┌──────────────────┐
│  API Handler     │
└────┬─────────────┘
     │
     │ 3. Save user message
     ▼
┌──────────────────┐
│   PostgreSQL     │
└──────────────────┘
     │
     │ 4. Trigger AI processing
     ▼
┌──────────────────────────────────────────┐
│         AI Processing Pipeline            │
│                                           │
│  ┌────────────┐    ┌────────────┐       │
│  │  Search    │───►│  Crawl     │       │
│  │  Web       │    │  Content   │       │
│  └────────────┘    └────────────┘       │
│        │                  │              │
│        │                  │              │
│        ▼                  ▼              │
│  ┌────────────────────────────┐         │
│  │    LLM Processing          │         │
│  │  (Synthesize Response)     │         │
│  └────────────────────────────┘         │
└──────────────────┬───────────────────────┘
                   │
                   │ 5. Save AI response
                   ▼
            ┌──────────────┐
            │  PostgreSQL  │
            └──────┬───────┘
                   │
                   │ 6. Stream response to client
                   ▼
            ┌──────────────┐
            │   Browser    │
            └──────────────┘
```

### 5.3 Search & Cache Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. Request search
       ▼
┌──────────────────┐
│  searchSerper()  │
└──────┬───────────┘
       │
       │ 2. Check Redis cache
       ▼
┌──────────────────┐         ┌─────────────┐
│      Redis       │◄────────┤ Cache hit?  │
└──────┬───────────┘         └─────────────┘
       │                            │
       │ No                        Yes
       │                            │
       │ 3. Call Serper API        │ 4. Return cached
       ▼                            ▼
┌──────────────────┐         ┌─────────────┐
│   Serper API     │         │   Client    │
└──────┬───────────┘         └─────────────┘
       │
       │ 5. Store in cache (6h TTL)
       ▼
┌──────────────────┐
│      Redis       │
└──────┬───────────┘
       │
       │ 6. Return results
       ▼
┌──────────────────┐
│     Client       │
└──────────────────┘
```

---

## 6. Technology Stack

### 6.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.2.4 | React framework, routing, SSR |
| **React** | 18.3.1 | UI library |
| **TypeScript** | 5.8.2 | Type safety |
| **Tailwind CSS** | 3.4.3 | Styling framework |
| **React Markdown** | 9.0.3 | Markdown rendering |
| **Lucide React** | 0.474.0 | Icon library |
| **Geist** | 1.3.0 | Font family |

### 6.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js API Routes** | 15.2.4 | Backend API |
| **NextAuth** | 5.0.0-beta.25 | Authentication |
| **Drizzle ORM** | 0.33.0 | Database ORM |
| **PostgreSQL** | (via postgres pkg) 3.4.4 | Primary database |
| **ioredis** | 5.5.0 | Redis client |
| **Zod** | 3.23.3 | Schema validation |

### 6.3 External Services

| Service | Purpose | Current Status |
|---------|---------|----------------|
| **Serper API** | Google search results | ✅ Implemented |
| **Discord OAuth** | User authentication | ✅ Implemented |
| **LLM Provider** | AI text generation | 📋 Planned |
| **Web Crawler** | Content extraction | 📋 Planned |

### 6.4 Development Tools

| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Drizzle Kit** | Database migrations |
| **Vitest** | Testing framework |
| **Evalite** | AI evaluation |
| **Docker** | Local development (DB, Redis) |

---

## 7. Infrastructure

### 7.1 Current Infrastructure (Development)

```
┌─────────────────────────────────────────┐
│          Local Development              │
│                                         │
│  ┌────────────────────────────────┐   │
│  │   Next.js Dev Server           │   │
│  │   (Port 3000)                  │   │
│  └────────────────────────────────┘   │
│                                         │
│  ┌────────────────────────────────┐   │
│  │   PostgreSQL (Docker)          │   │
│  │   Port: 5432                   │   │
│  │   Database: deepsearch         │   │
│  └────────────────────────────────┘   │
│                                         │
│  ┌────────────────────────────────┐   │
│  │   Redis (Docker)               │   │
│  │   Port: 6379                   │   │
│  └────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 7.2 Production Infrastructure (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel / Cloud Platform              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐  │
│  │         Edge Network (CDN)                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │  │
│  │  │   US     │  │   EU     │  │   ASIA   │      │  │
│  │  └──────────┘  └──────────┘  └──────────┘      │  │
│  └─────────────────────────────────────────────────┘  │
│                          │                             │
│                          ▼                             │
│  ┌─────────────────────────────────────────────────┐  │
│  │         Next.js Application                     │  │
│  │         (Serverless Functions)                  │  │
│  └─────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                │                    │
                ▼                    ▼
┌───────────────────────┐  ┌──────────────────────┐
│   Managed PostgreSQL  │  │   Managed Redis      │
│   (Neon, Supabase,    │  │   (Upstash, Redis    │
│    or RDS)            │  │    Cloud)            │
└───────────────────────┘  └──────────────────────┘
```

### 7.3 Environment Configuration

**Environment Variables:**

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/deepsearch"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication
NEXTAUTH_SECRET="random-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Discord OAuth
AUTH_DISCORD_ID="discord-client-id"
AUTH_DISCORD_SECRET="discord-client-secret"

# Serper API
SERPER_API_KEY="serper-api-key"

# Future: LLM Provider
OPENAI_API_KEY="openai-key"  # or
ANTHROPIC_API_KEY="anthropic-key"
```

---

## 8. Security Architecture

### 8.1 Authentication & Authorization

```
┌────────────────────────────────────────┐
│     NextAuth Security Layers           │
│                                        │
│  1. OAuth 2.0 with Discord            │
│     └─ Secure token exchange          │
│                                        │
│  2. Session Management                │
│     └─ Encrypted session tokens       │
│     └─ Secure HTTP-only cookies       │
│                                        │
│  3. CSRF Protection                   │
│     └─ Built-in CSRF tokens           │
│                                        │
│  4. Database Session Store            │
│     └─ PostgreSQL persistence         │
│     └─ Automatic session cleanup      │
└────────────────────────────────────────┘
```

### 8.2 Data Protection

**At Rest:**
- PostgreSQL encryption (managed service)
- Environment variables for secrets
- No sensitive data in client bundles

**In Transit:**
- HTTPS/TLS for all connections
- Secure WebSocket connections (future)
- API key authentication for external services

### 8.3 Input Validation

```typescript
// Example: Zod schema validation
import { z } from 'zod';

const MessageSchema = z.object({
  content: z.string().min(1).max(10000),
  chatId: z.string().uuid(),
});

// Usage in API route
const validated = MessageSchema.parse(request.body);
```

### 8.4 Rate Limiting (Planned)

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  Rate Limiter    │
│  (Redis-based)   │
└──────┬───────────┘
       │
       ├─► Authenticated: 100 req/min
       │
       └─► Anonymous: 10 req/min
```

### 8.5 API Security

- API key rotation strategy
- Request signing for webhooks
- IP whitelisting (if needed)
- DDoS protection via hosting provider

---

## 9. Scalability Considerations

### 9.1 Horizontal Scaling

**Next.js App:**
- Stateless serverless functions
- Auto-scaling on Vercel/AWS Lambda
- No server-side state (use Redis/DB)

**Database:**
- PostgreSQL connection pooling
- Read replicas for heavy read loads
- Prepared statements for performance

**Redis:**
- Cluster mode for high availability
- Eviction policy: LRU for cache
- Separate instances for cache vs. sessions

### 9.2 Performance Optimization

**Caching Strategy:**

| Layer | Technology | TTL | Purpose |
|-------|------------|-----|---------|
| **Browser** | HTTP Cache | 1 hour | Static assets |
| **CDN** | Edge Cache | 1 hour | Pages, images |
| **Application** | Redis | 6 hours | Search results |
| **Database** | Query Cache | N/A | Managed by PG |

**Code Splitting:**
```javascript
// Lazy load heavy components
const ChatInterface = dynamic(() => import('./chat'), {
  loading: () => <Spinner />,
});
```

### 9.3 Database Optimization

**Indexes:**
```sql
-- User lookups
CREATE INDEX idx_users_email ON users(email);

-- Chat queries
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_messages_chat_id ON messages(chat_id);

-- Session lookups
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

**Query Optimization:**
- Limit result sets (pagination)
- Use select projections (avoid SELECT *)
- Prepared statements via Drizzle
- Connection pooling

### 9.4 Monitoring & Observability

**Metrics to Track:**
- API response times (p50, p95, p99)
- Database query performance
- Cache hit/miss rates
- Error rates and types
- User engagement metrics

**Tools (Recommended):**
- Vercel Analytics (built-in)
- Sentry for error tracking
- LogRocket for session replay
- PostgreSQL slow query log
- Redis monitoring (INFO command)

---

## 10. Future Architecture Enhancements

### 10.1 Microservices Migration (Optional)

If the application grows significantly:

```
┌─────────────────────────────────────────────────┐
│              API Gateway (Next.js)              │
└────────┬────────────────────────────────────────┘
         │
         ├─► Auth Service (NextAuth)
         │
         ├─► Chat Service (Messages, Conversations)
         │
         ├─► Search Service (Serper, Crawling)
         │
         └─► AI Service (LLM Processing)
```

### 10.2 Event-Driven Architecture

For real-time features and better scalability:

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│  WebSocket  │─────►│ Message Queue│
│   Server    │      │  (Redis Pub/ │
└─────────────┘      │   Sub, etc)  │
                     └──────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   Worker 1    │  │   Worker 2    │  │   Worker 3    │
│  (Search)     │  │  (Crawl)      │  │  (AI)         │
└───────────────┘  └───────────────┘  └───────────────┘
```

### 10.3 Advanced Caching

**Multi-tier cache:**
- Browser cache (Service Worker)
- Edge cache (CDN)
- Application cache (Redis)
- Database cache (Materialized views)

---

## Appendix

### A. Directory Structure (Complete)

```
deepsearch-app/
├── .cursor/                      # Cursor IDE settings
├── .vscode/                      # VS Code settings
├── docs/                         # Documentation
│   ├── 01-product-requirements.md
│   ├── 02-architecture.md
│   ├── 03-api-documentation.md
│   ├── 04-database-schema.md
│   ├── 05-development-guide.md
│   └── 06-component-library.md
├── drizzle/                      # Database migrations
├── public/                       # Static assets
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API routes
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── chat.tsx
│   ├── components/               # React components
│   ├── server/                   # Server-side code
│   │   ├── auth/
│   │   ├── db/
│   │   └── redis/
│   ├── lib/                      # Shared utilities (future)
│   ├── types/                    # TypeScript types (future)
│   └── env.ts                    # Environment validation
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── drizzle.config.ts            # Drizzle configuration
├── next.config.js               # Next.js configuration
├── package.json                 # Dependencies
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Project README
```

### B. Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Redis configured and accessible
- [ ] OAuth credentials set up
- [ ] API keys configured
- [ ] SSL/TLS certificates
- [ ] Error tracking configured
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] Rate limiting enabled

---

**Document Control:**
- **Author:** Engineering Team
- **Last Updated:** October 2025
- **Review Cycle:** Quarterly or on major changes
