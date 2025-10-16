# API Documentation

## DeepSearch AI Chat Application

**Version:** 1.0.0
**Last Updated:** October 2025
**Base URL:** `http://localhost:3000` (development)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Current Endpoints](#3-current-endpoints)
4. [Planned Endpoints](#4-planned-endpoints)
5. [Data Models](#5-data-models)
6. [Error Handling](#6-error-handling)
7. [Rate Limiting](#7-rate-limiting)

---

## 1. Overview

### 1.1 API Design Principles

- **RESTful:** Following REST conventions for predictable endpoints
- **JSON:** All request/response bodies use JSON format
- **Type-Safe:** TypeScript types for all API contracts
- **Versioned:** Future-ready for API versioning
- **Documented:** OpenAPI/Swagger compatible (future)

### 1.2 Request/Response Format

**Standard Request Headers:**
```http
Content-Type: application/json
Accept: application/json
Cookie: next-auth.session-token=<token>
```

**Standard Success Response:**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-10-16T12:00:00Z",
    "requestId": "req_123456"
  }
}
```

**Standard Error Response:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-10-16T12:00:00Z",
    "requestId": "req_123456"
  }
}
```

---

## 2. Authentication

### 2.1 NextAuth Endpoints

All authentication is handled via NextAuth.js.

#### Sign In

**Endpoint:** `GET /api/auth/signin`

**Description:** Initiates OAuth flow with Discord

**Query Parameters:**
- `callbackUrl` (optional): URL to redirect after successful sign-in

**Response:** Redirects to Discord OAuth consent screen

**Example:**
```http
GET /api/auth/signin?callbackUrl=/chat
```

---

#### Sign Out

**Endpoint:** `GET /api/auth/signout`

**Description:** Ends user session

**Response:** Redirects to home page

**Example:**
```http
GET /api/auth/signout
```

---

#### Session Check

**Endpoint:** `GET /api/auth/session`

**Description:** Get current session information

**Authentication:** Optional

**Response:**
```json
{
  "user": {
    "id": "usr_123abc",
    "name": "John Doe",
    "email": "john@example.com",
    "image": "https://cdn.discordapp.com/avatars/..."
  },
  "expires": "2025-11-16T12:00:00Z"
}
```

**Unauthenticated Response:**
```json
null
```

---

#### OAuth Callback

**Endpoint:** `GET /api/auth/callback/discord`

**Description:** Discord OAuth callback handler (automatic)

**Used By:** NextAuth internally

---

### 2.2 Protected Routes

Protected API routes require an active session. Include session cookie in requests.

**Check Authentication in API Route:**
```typescript
import { auth } from "~/server/auth";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
      { status: 401 }
    );
  }

  // Proceed with authenticated logic
}
```

---

## 3. Current Endpoints

### 3.1 Search API (Internal)

**Module:** `src/serper.ts`
**Function:** `searchSerper()`

This is currently a server-side function, not an exposed API endpoint.

**Function Signature:**
```typescript
async function searchSerper(
  body: SerperTool.SearchInput,
  signal: AbortSignal | undefined
): Promise<SerperTool.SearchResult>
```

**Input:**
```typescript
{
  q: string;        // Search query
  num: number;      // Number of results (max 100)
}
```

**Output:**
```typescript
{
  searchParameters: {
    q: string;
    type: string;
    engine: string;
  };
  knowledgeGraph?: {
    title: string;
    type: string;
    rating?: number;
    ratingCount?: number;
    imageUrl?: string;
    attributes?: Record<string, string>;
  };
  organic: Array<{
    title: string;
    link: string;
    snippet: string;
    sitelinks?: Array<{
      title: string;
      link: string;
    }>;
    position: number;
    date?: string;
  }>;
  peopleAlsoAsk?: Array<{
    question: string;
    snippet: string;
    title: string;
    link: string;
  }>;
  relatedSearches?: Array<{
    query: string;
  }>;
  credits: number;
}
```

**Caching:**
- 6-hour TTL in Redis
- Cache key: `serper:<JSON.stringify(args)>`

**Example Usage:**
```typescript
const results = await searchSerper(
  { q: "TypeScript best practices", num: 10 },
  AbortSignal.timeout(5000)
);
```

---

## 4. Planned Endpoints

### 4.1 Chat Management

#### Create Chat

**Endpoint:** `POST /api/chat`

**Authentication:** Required

**Request Body:**
```json
{
  "title": "Optional chat title"
}
```

**Response:** `201 Created`
```json
{
  "data": {
    "id": "chat_123abc",
    "userId": "usr_456def",
    "title": "New Chat",
    "createdAt": "2025-10-16T12:00:00Z",
    "updatedAt": "2025-10-16T12:00:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `429 Too Many Requests` - Rate limit exceeded

---

#### List Chats

**Endpoint:** `GET /api/chat`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional, default: 50, max: 100): Number of chats to return
- `offset` (optional, default: 0): Pagination offset
- `sort` (optional, default: "updatedAt"): Sort field

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "chat_123abc",
      "userId": "usr_456def",
      "title": "TypeScript Questions",
      "createdAt": "2025-10-15T10:00:00Z",
      "updatedAt": "2025-10-16T12:00:00Z",
      "messageCount": 15
    }
  ],
  "meta": {
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated

---

#### Get Chat

**Endpoint:** `GET /api/chat/[chatId]`

**Authentication:** Required

**Path Parameters:**
- `chatId`: Chat identifier

**Response:** `200 OK`
```json
{
  "data": {
    "id": "chat_123abc",
    "userId": "usr_456def",
    "title": "TypeScript Questions",
    "createdAt": "2025-10-15T10:00:00Z",
    "updatedAt": "2025-10-16T12:00:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized to access this chat
- `404 Not Found` - Chat does not exist

---

#### Update Chat

**Endpoint:** `PATCH /api/chat/[chatId]`

**Authentication:** Required

**Path Parameters:**
- `chatId`: Chat identifier

**Request Body:**
```json
{
  "title": "Updated Chat Title"
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "id": "chat_123abc",
    "userId": "usr_456def",
    "title": "Updated Chat Title",
    "createdAt": "2025-10-15T10:00:00Z",
    "updatedAt": "2025-10-16T12:30:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized to modify this chat
- `404 Not Found` - Chat does not exist

---

#### Delete Chat

**Endpoint:** `DELETE /api/chat/[chatId]`

**Authentication:** Required

**Path Parameters:**
- `chatId`: Chat identifier

**Response:** `204 No Content`

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized to delete this chat
- `404 Not Found` - Chat does not exist

---

### 4.2 Message Management

#### Send Message

**Endpoint:** `POST /api/chat/[chatId]/messages`

**Authentication:** Required

**Path Parameters:**
- `chatId`: Chat identifier

**Request Body:**
```json
{
  "content": "What are TypeScript generics?",
  "role": "user"
}
```

**Response:** `201 Created` (Streaming)

**Streaming Format:** Server-Sent Events (SSE)

```
event: message
data: {"type": "start", "messageId": "msg_123abc"}

event: token
data: {"content": "TypeScript"}

event: token
data: {"content": " generics"}

event: token
data: {"content": " allow"}

event: search
data: {"query": "typescript generics", "results": 10}

event: source
data: {"title": "TypeScript Docs", "url": "https://..."}

event: message
data: {"type": "complete", "messageId": "msg_123abc"}
```

**Non-Streaming Response:** `201 Created`
```json
{
  "data": {
    "id": "msg_123abc",
    "chatId": "chat_123abc",
    "role": "assistant",
    "content": "TypeScript generics allow you to create reusable components...",
    "sources": [
      {
        "title": "TypeScript Documentation",
        "url": "https://www.typescriptlang.org/docs/handbook/generics.html",
        "snippet": "Generics provide a way to make components work with any data type..."
      }
    ],
    "createdAt": "2025-10-16T12:00:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized to access this chat
- `404 Not Found` - Chat does not exist
- `400 Bad Request` - Invalid message content
- `429 Too Many Requests` - Rate limit exceeded

---

#### List Messages

**Endpoint:** `GET /api/chat/[chatId]/messages`

**Authentication:** Required

**Path Parameters:**
- `chatId`: Chat identifier

**Query Parameters:**
- `limit` (optional, default: 50, max: 100): Number of messages
- `before` (optional): Message ID for pagination (older messages)
- `after` (optional): Message ID for pagination (newer messages)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "msg_123abc",
      "chatId": "chat_123abc",
      "role": "user",
      "content": "What are TypeScript generics?",
      "createdAt": "2025-10-16T11:59:00Z"
    },
    {
      "id": "msg_456def",
      "chatId": "chat_123abc",
      "role": "assistant",
      "content": "TypeScript generics allow...",
      "sources": [...],
      "createdAt": "2025-10-16T12:00:00Z"
    }
  ],
  "meta": {
    "hasMore": false,
    "nextCursor": null
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized to access this chat
- `404 Not Found` - Chat does not exist

---

#### Delete Message

**Endpoint:** `DELETE /api/chat/[chatId]/messages/[messageId]`

**Authentication:** Required

**Path Parameters:**
- `chatId`: Chat identifier
- `messageId`: Message identifier

**Response:** `204 No Content`

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Not authorized to delete this message
- `404 Not Found` - Message does not exist

---

### 4.3 Search Endpoint

#### Public Search

**Endpoint:** `POST /api/search`

**Authentication:** Optional (rate limits vary)

**Request Body:**
```json
{
  "query": "TypeScript best practices",
  "num": 10
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "searchParameters": {
      "q": "TypeScript best practices",
      "type": "search",
      "engine": "google"
    },
    "organic": [
      {
        "title": "TypeScript Best Practices",
        "link": "https://example.com/typescript-best-practices",
        "snippet": "Learn the best practices for TypeScript development...",
        "position": 1
      }
    ],
    "knowledgeGraph": null,
    "peopleAlsoAsk": [...],
    "relatedSearches": [...]
  },
  "meta": {
    "cached": true,
    "cacheAge": 3600
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid query
- `429 Too Many Requests` - Rate limit exceeded
- `503 Service Unavailable` - Serper API error

---

### 4.4 Content Crawling

#### Crawl URL

**Endpoint:** `POST /api/crawl`

**Authentication:** Required

**Request Body:**
```json
{
  "url": "https://example.com/article",
  "options": {
    "extractImages": false,
    "maxLength": 50000
  }
}
```

**Response:** `200 OK`
```json
{
  "data": {
    "url": "https://example.com/article",
    "title": "Article Title",
    "content": "Extracted markdown content...",
    "metadata": {
      "author": "John Doe",
      "publishedAt": "2025-10-10T00:00:00Z",
      "wordCount": 1500
    },
    "images": [],
    "links": [
      {
        "text": "Related Article",
        "href": "https://example.com/related"
      }
    ]
  },
  "meta": {
    "cached": true,
    "crawledAt": "2025-10-16T12:00:00Z"
  }
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `400 Bad Request` - Invalid URL
- `403 Forbidden` - robots.txt disallows crawling
- `404 Not Found` - URL not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Crawling failed

---

## 5. Data Models

### 5.1 User

```typescript
interface User {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 5.2 Session

```typescript
interface Session {
  sessionToken: string;
  userId: string;
  expires: Date;
}
```

---

### 5.3 Chat (Planned)

```typescript
interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### 5.4 Message (Planned)

```typescript
interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: Source[];
  metadata?: {
    searchQuery?: string;
    crawledUrls?: string[];
    model?: string;
    tokens?: number;
  };
  createdAt: Date;
}

interface Source {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
}
```

---

### 5.5 Search Result

```typescript
interface SearchResult {
  searchParameters: {
    q: string;
    type: string;
    engine: string;
  };
  knowledgeGraph?: KnowledgeGraph;
  organic: OrganicResult[];
  peopleAlsoAsk?: PeopleAlsoAskResult[];
  relatedSearches?: RelatedSearch[];
  credits: number;
}

interface OrganicResult {
  title: string;
  link: string;
  snippet: string;
  sitelinks?: Sitelink[];
  position: number;
  date?: string;
}
```

---

## 6. Error Handling

### 6.1 HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Successful GET, PATCH, PUT |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid input data |
| `401` | Unauthorized | Authentication required |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |
| `503` | Service Unavailable | External service error |

### 6.2 Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    details?: any;          // Additional error context
    field?: string;         // Field that caused error (validation)
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}
```

### 6.3 Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | No valid session |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Input validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `EXTERNAL_API_ERROR` | Third-party API error |
| `DATABASE_ERROR` | Database operation failed |
| `INTERNAL_ERROR` | Unexpected server error |

### 6.4 Error Handling Example

```typescript
try {
  const session = await auth();
  if (!session?.user) {
    return Response.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "You must be signed in to perform this action"
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: generateRequestId()
        }
      },
      { status: 401 }
    );
  }

  // API logic here

} catch (error) {
  console.error("API Error:", error);

  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: generateRequestId()
      }
    },
    { status: 500 }
  );
}
```

---

## 7. Rate Limiting

### 7.1 Rate Limit Tiers

| Tier | Requests/Minute | Requests/Hour | Requests/Day |
|------|-----------------|---------------|--------------|
| **Anonymous** | 10 | 100 | 500 |
| **Authenticated** | 100 | 1,000 | 10,000 |
| **Admin** | Unlimited | Unlimited | Unlimited |

### 7.2 Rate Limit Headers

All API responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1697462400
```

### 7.3 Rate Limit Error Response

When rate limit is exceeded:

**Status:** `429 Too Many Requests`

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit. Please try again later.",
    "details": {
      "limit": 100,
      "resetAt": "2025-10-16T12:30:00Z"
    }
  }
}
```

### 7.4 Rate Limiting Implementation

```typescript
import { redis } from "~/server/redis/redis";

async function checkRateLimit(userId: string, tier: "anonymous" | "authenticated") {
  const limits = {
    anonymous: { requests: 10, window: 60 },
    authenticated: { requests: 100, window: 60 }
  };

  const limit = limits[tier];
  const key = `ratelimit:${userId}:${Math.floor(Date.now() / (limit.window * 1000))}`;

  const current = await redis.incr(key);
  await redis.expire(key, limit.window);

  if (current > limit.requests) {
    throw new Error("Rate limit exceeded");
  }

  return {
    limit: limit.requests,
    remaining: limit.requests - current,
    reset: Math.ceil(Date.now() / (limit.window * 1000)) * limit.window
  };
}
```

---

## 8. Webhooks (Future)

### 8.1 Webhook Events

Future webhook support for real-time updates:

| Event | Description |
|-------|-------------|
| `chat.created` | New chat created |
| `chat.updated` | Chat title or metadata updated |
| `chat.deleted` | Chat deleted |
| `message.created` | New message sent |
| `message.completed` | AI response completed |

### 8.2 Webhook Payload

```json
{
  "event": "message.created",
  "timestamp": "2025-10-16T12:00:00Z",
  "data": {
    "id": "msg_123abc",
    "chatId": "chat_123abc",
    "role": "user",
    "content": "What are TypeScript generics?"
  }
}
```

---

## Appendix

### A. API Client Examples

#### JavaScript/TypeScript

```typescript
// Using fetch
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ title: 'New Chat' }),
  credentials: 'include', // Include cookies
});

const data = await response.json();
```

#### cURL

```bash
# Create chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{"title": "New Chat"}'

# Get session
curl http://localhost:3000/api/auth/session \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### B. Testing

```typescript
// Example API route test (Vitest)
import { describe, it, expect } from 'vitest';

describe('POST /api/chat', () => {
  it('should create a new chat', async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Chat' }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.data).toHaveProperty('id');
    expect(data.data.title).toBe('Test Chat');
  });

  it('should require authentication', async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Chat' }),
      credentials: 'omit', // Don't send cookies
    });

    expect(response.status).toBe(401);
  });
});
```

---

**Document Control:**
- **Author:** Engineering Team
- **Last Updated:** October 2025
- **Review Cycle:** On API changes
