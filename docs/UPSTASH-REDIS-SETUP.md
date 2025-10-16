# Upstash Redis Setup Guide

## Overview

This project uses **Upstash Redis** - a serverless, cloud-hosted Redis service that's perfect for modern web applications. No Docker containers needed!

---

## Why Upstash Redis?

✅ **Serverless** - No infrastructure to manage
✅ **Global** - Low-latency edge locations worldwide
✅ **Generous Free Tier** - 10,000 commands/day free
✅ **Compatible** - Works with standard Redis clients (ioredis)
✅ **TLS/SSL** - Secure connections by default
✅ **REST API** - Optional HTTP-based access

---

## Setup Instructions

### Step 1: Create Upstash Account

1. Go to [https://upstash.com/](https://upstash.com/)
2. Click "Get Started" or "Sign Up"
3. Sign up with GitHub, Google, or email

### Step 2: Create a Redis Database

1. Once logged in, go to the [Redis Dashboard](https://console.upstash.com/redis)
2. Click **"Create Database"**
3. Configure your database:
   - **Name**: `deepsearch-app` (or any name you prefer)
   - **Type**: Choose based on your needs:
     - **Regional**: Single region (fastest for local development)
     - **Global**: Multi-region (best for production)
   - **Region**: Choose closest to you (e.g., `us-east-1`, `eu-west-1`)
   - **TLS**: ✅ Enabled (recommended)
   - **Eviction**: `noeviction` (recommended for cache)

4. Click **"Create"**

### Step 3: Get Your Connection URL

1. After creation, you'll see your database dashboard
2. Scroll down to **"Connect your database"** section
3. You'll see several connection options:

   **Option 1: Copy the Redis URL (Recommended)**
   ```
   Copy the URL that looks like:
   rediss://default:YOUR_PASSWORD@your-endpoint-12345.upstash.io:6379
   ```

   **Option 2: Use Environment Variables**
   ```bash
   UPSTASH_REDIS_REST_URL="https://your-endpoint-12345.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-token"
   ```

### Step 4: Configure Your `.env` File

1. Open your `.env` file (create from `.env.example` if needed):
   ```bash
   cp .env.example .env
   ```

2. Add your Upstash Redis URL:
   ```bash
   # Redis - Upstash Redis
   REDIS_URL="rediss://default:YOUR_PASSWORD@your-endpoint.upstash.io:6379"
   ```

   **Important Notes:**
   - Use `rediss://` (with double 's') for TLS/SSL connections
   - Replace `YOUR_PASSWORD` with your actual password
   - Replace `your-endpoint.upstash.io` with your actual endpoint

3. Save the file

### Step 5: Verify Connection

Test your Redis connection:

```bash
# Start the development server
pnpm dev

# The app will connect to Upstash Redis automatically
# Check console for "Cache hit/miss" messages when searching
```

---

## Configuration Details

### Current Setup

The application is already configured to work with Upstash Redis:

**File: `src/server/redis/redis.ts`**
```typescript
import { env } from "~/env";
import Redis from "ioredis";

export const redis = new Redis(env.REDIS_URL);
```

**File: `src/env.js`**
```javascript
server: {
  REDIS_URL: z.string().url(), // Validates Redis URL format
  // ...
}
```

### Connection Options

The `ioredis` client automatically detects TLS from the URL:
- `redis://` → Unencrypted connection (local only)
- `rediss://` → TLS/SSL encrypted (Upstash, production)

**For advanced configuration:**

```typescript
import Redis from "ioredis";

export const redis = new Redis(env.REDIS_URL, {
  // Optional: Custom settings
  tls: {
    rejectUnauthorized: true, // Verify SSL certificates
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  connectTimeout: 10000, // 10 seconds
  // Upstash-specific optimizations
  keepAlive: 30000,
  family: 4, // Force IPv4
});
```

---

## Upstash Plans & Pricing

### Free Tier (Forever Free)
- **10,000 commands/day**
- **256 MB storage**
- **1 database**
- TLS/SSL included
- Perfect for development and small projects

### Pay-as-you-go
- **$0.20 per 100K commands**
- **$0.25 per GB storage/month**
- No monthly minimums
- Scale to millions of requests

### Pro ($120/month)
- Unlimited databases
- Priority support
- Advanced features

**Check current pricing:** [https://upstash.com/pricing/redis](https://upstash.com/pricing/redis)

---

## Features Used in This Project

### 1. Caching (Primary Use)

**Search Results Cache:**
```typescript
// File: src/serper.ts
const fetchFromSerper = cacheWithRedis(
  "serper",
  async (url, options) => {
    // Fetch from Serper API
  }
);
```

**Cache Configuration:**
- **TTL**: 6 hours (21,600 seconds)
- **Key Format**: `serper:{"url":"...","options":{...}}`
- **Purpose**: Reduce Serper API costs and improve response time

### 2. Future Features

- **Session Storage**: User sessions (future enhancement)
- **Rate Limiting**: IP-based request limits
- **Real-time Features**: Pub/Sub for streaming responses
- **Analytics**: Track search patterns

---

## Monitoring Your Usage

### Upstash Console

1. Go to [https://console.upstash.com/redis](https://console.upstash.com/redis)
2. Click on your database
3. View **Metrics** tab:
   - Commands/day
   - Storage usage
   - Latency
   - Connected clients

### Key Metrics to Monitor

| Metric | Free Tier Limit | What to Watch |
|--------|----------------|---------------|
| **Commands/day** | 10,000 | Search requests × cache hits |
| **Storage** | 256 MB | Cached search results |
| **Databases** | 1 | Total Redis instances |

### Estimation for This App

**Example Usage:**
- 100 unique searches/day
- Cache hit rate: 70%
- Commands per search: ~3 (GET, SET, EXPIRE)

**Daily Commands:**
- Cache misses: 30 searches × 3 commands = 90
- Cache hits: 70 searches × 1 command = 70
- **Total: ~160 commands/day** ✅ Well within free tier!

---

## Troubleshooting

### Error: "Cannot connect to Redis"

**Check:**
1. ✅ REDIS_URL is correct in `.env`
2. ✅ URL starts with `rediss://` (note the double 's')
3. ✅ No spaces in the URL
4. ✅ Internet connection is active
5. ✅ Upstash database is active (check console)

**Test connection:**
```bash
# Using redis-cli with TLS
redis-cli -u "rediss://default:PASSWORD@endpoint.upstash.io:6379" PING
# Should return: PONG
```

### Error: "WRONGPASS invalid username-password pair"

**Solution:**
- Copy the password directly from Upstash console
- Ensure no extra characters or spaces
- URL-encode special characters if needed

### Error: "Connection timeout"

**Possible causes:**
1. Firewall blocking port 6379
2. Network issues
3. Upstash service outage (rare)

**Solution:**
- Try from different network
- Check [Upstash Status Page](https://status.upstash.com/)
- Use Upstash REST API as fallback

---

## Alternative: Upstash REST API

If you have connection issues with Redis protocol, use the REST API:

```typescript
// src/server/redis/upstash-rest.ts
interface UpstashResponse<T> {
  result: T;
}

export async function redisGet(key: string): Promise<string | null> {
  const response = await fetch(
    `${process.env.UPSTASH_REDIS_REST_URL}/get/${key}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      },
    }
  );
  const data: UpstashResponse<string | null> = await response.json();
  return data.result;
}

export async function redisSet(
  key: string,
  value: string,
  exSeconds?: number
): Promise<void> {
  const url = exSeconds
    ? `${process.env.UPSTASH_REDIS_REST_URL}/set/${key}/${value}/EX/${exSeconds}`
    : `${process.env.UPSTASH_REDIS_REST_URL}/set/${key}/${value}`;

  await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
    },
  });
}
```

---

## Migration from Local Redis

If you were using Docker Redis and want to migrate:

### Before (Local Docker)
```bash
REDIS_URL="redis://default:redis-pw@localhost:6379"
```

### After (Upstash)
```bash
REDIS_URL="rediss://default:YOUR_PASSWORD@your-endpoint.upstash.io:6379"
```

**Migration steps:**
1. Update `.env` with Upstash URL
2. Restart development server
3. Test the application
4. Stop Docker Redis container (optional):
   ```bash
   docker stop ai-app-template-redis
   docker rm ai-app-template-redis
   ```

**Data Migration** (if needed):
```bash
# Export from local Redis
redis-cli --rdb dump.rdb

# Import to Upstash (contact Upstash support for large imports)
# Or let cache rebuild naturally
```

---

## Best Practices

### 1. Environment Variables
✅ **DO:** Use `.env` file for local development
✅ **DO:** Use environment variables in production (Vercel, etc.)
❌ **DON'T:** Commit `.env` to git
❌ **DON'T:** Hardcode credentials in code

### 2. Error Handling
```typescript
try {
  const cached = await redis.get(key);
  // Use cached value
} catch (error) {
  console.error("Redis error:", error);
  // Fallback: fetch fresh data without cache
}
```

### 3. Key Naming
```typescript
// Good: Namespaced keys
"serper:search:typescript"
"user:session:123abc"
"ratelimit:ip:192.168.1.1"

// Bad: Generic keys
"search"
"user"
"limit"
```

### 4. TTL Strategy
```typescript
// Short TTL: Frequently changing data
await redis.set(key, value, "EX", 300); // 5 minutes

// Medium TTL: Search results
await redis.set(key, value, "EX", 21600); // 6 hours

// Long TTL: Static/rare changes
await redis.set(key, value, "EX", 86400); // 24 hours
```

---

## Production Deployment

### Vercel

1. Add environment variable in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `REDIS_URL` with your Upstash URL
   - Apply to Production, Preview, and Development

2. Deploy:
   ```bash
   vercel --prod
   ```

### Other Platforms

**Railway, Render, Fly.io:**
- Add `REDIS_URL` environment variable
- Use the same Upstash URL

**Docker:**
```dockerfile
ENV REDIS_URL=rediss://default:PASSWORD@endpoint.upstash.io:6379
```

---

## Additional Resources

- **Upstash Documentation**: https://docs.upstash.com/redis
- **ioredis Documentation**: https://github.com/redis/ioredis
- **Redis Commands**: https://redis.io/commands
- **Upstash Console**: https://console.upstash.com/redis
- **Upstash Blog**: https://blog.upstash.com/

---

## Support

### Upstash Support
- **Discord**: https://upstash.com/discord
- **Email**: support@upstash.com
- **Twitter**: [@upstash](https://twitter.com/upstash)

### This Project
- Check documentation in `docs/` directory
- Open an issue on GitHub
- Contact your team lead

---

**Happy caching! 🚀**
