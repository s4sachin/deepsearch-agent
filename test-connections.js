#!/usr/bin/env node
/**
 * Test script to verify Neon PostgreSQL and Upstash Redis connections
 * Run with: node test-connections.js
 */

import { config } from 'dotenv';
import postgres from 'postgres';
import Redis from 'ioredis';

// Load environment variables
config();

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

async function testPostgreSQL() {
  console.log('\n🔍 Testing Neon PostgreSQL connection...');

  if (!process.env.DATABASE_URL) {
    console.log(`${RED}❌ DATABASE_URL not found in .env file${RESET}`);
    return false;
  }

  const sql = postgres(process.env.DATABASE_URL, {
    ssl: 'require',
    max: 1
  });

  try {
    const result = await sql`SELECT NOW() as current_time, version() as version`;
    console.log(`${GREEN}✅ PostgreSQL connected successfully!${RESET}`);
    console.log(`   Server time: ${result[0]?.current_time}`);
    console.log(`   Version: ${result[0]?.version?.split(' ').slice(0, 2).join(' ')}`);
    await sql.end();
    return true;
  } catch (error) {
    console.log(`${RED}❌ PostgreSQL connection failed:${RESET}`);
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
    await sql.end();
    return false;
  }
}

async function testRedis() {
  console.log('\n🔍 Testing Upstash Redis connection...');

  if (!process.env.REDIS_URL) {
    console.log(`${RED}❌ REDIS_URL not found in .env file${RESET}`);
    return false;
  }

  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 50, 2000);
    }
  });

  try {
    // Test ping
    const ping = await client.ping();

    // Test write
    const testKey = 'test:connection:timestamp';
    const testValue = new Date().toISOString();
    await client.set(testKey, testValue, 'EX', 60); // Expire in 60 seconds

    // Test read
    const retrievedValue = await client.get(testKey);

    // Test delete
    await client.del(testKey);

    console.log(`${GREEN}✅ Redis connected successfully!${RESET}`);
    console.log(`   Ping response: ${ping}`);
    console.log(`   Write/Read test: ${retrievedValue === testValue ? 'PASSED' : 'FAILED'}`);

    await client.quit();
    return true;
  } catch (error) {
    console.log(`${RED}❌ Redis connection failed:${RESET}`);
    console.log(`   ${error instanceof Error ? error.message : String(error)}`);
    try {
      await client.quit();
    } catch {}
    return false;
  }
}

async function main() {
  console.log(`${YELLOW}==============================================`);
  console.log('Database Connection Test');
  console.log(`==============================================${RESET}`);

  const postgresOk = await testPostgreSQL();
  const redisOk = await testRedis();

  console.log(`\n${YELLOW}==============================================`);
  console.log('Summary');
  console.log(`==============================================${RESET}`);
  console.log(`PostgreSQL (Neon): ${postgresOk ? GREEN + '✅ PASSED' : RED + '❌ FAILED'}${RESET}`);
  console.log(`Redis (Upstash):   ${redisOk ? GREEN + '✅ PASSED' : RED + '❌ FAILED'}${RESET}`);

  if (postgresOk && redisOk) {
    console.log(`\n${GREEN}🎉 All connections are working!${RESET}`);
    process.exit(0);
  } else {
    console.log(`\n${RED}⚠️  Some connections failed. Please check your .env file.${RESET}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error(`${RED}Unexpected error:${RESET}`, error);
  process.exit(1);
});
