import { defineConfig } from 'drizzle-kit';

// For local development, use DATABASE_URL if available
// For Cloudflare D1, the database is accessed via the DB binding in runtime
const databaseUrl = process.env.DATABASE_URL || 'file:local.db';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: databaseUrl },
	verbose: true,
	strict: true
});
