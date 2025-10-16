import { drizzle } from 'drizzle-orm/d1';
import { drizzle as drizzleSqlite } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

// Handle both Cloudflare D1 (production) and local development
let db: any;

if (env.DB) {
  // Cloudflare D1 environment
  db = drizzle(env.DB, { schema });
} else if (env.DATABASE_URL) {
  // Local development environment
  const client = createClient({ url: env.DATABASE_URL });
  db = drizzleSqlite(client, { schema });
} else {
  // Fallback for build time or when neither is available
  // This prevents build errors but will fail at runtime if actually used
  db = null as any;
}

export { db };
