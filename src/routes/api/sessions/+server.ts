import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { sharedSessions, sessionPresence } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { encodeBase64url } from '@oslojs/encoding';

const PRESENCE_TIMEOUT_MS = 15_000;

export const GET: RequestHandler = async ({ locals, platform }) => {
  const d1 = platform?.env?.DB;
  if (!d1 || !locals.user) {
    return json({ sessions: [] });
  }

  const db = getDb(d1);

  // Clean up stale presence entries globally
  const cutoff = Math.floor((Date.now() - PRESENCE_TIMEOUT_MS) / 1000);
  await db.run(sql`DELETE FROM session_presence WHERE last_seen < ${cutoff}`);

  // Get user's created sessions with member counts
  const userSessions = await db
    .select({
      id: sharedSessions.id,
      name: sharedSessions.name,
      creatorId: sharedSessions.creatorId,
      createdAt: sharedSessions.createdAt,
      isActive: sharedSessions.isActive,
      memberCount: sql<number>`(SELECT COUNT(*) FROM session_presence WHERE session_id = ${sharedSessions.id})`.as('member_count')
    })
    .from(sharedSessions)
    .where(eq(sharedSessions.creatorId, locals.user.id))
    .orderBy(desc(sharedSessions.createdAt));

  return json({ sessions: userSessions });
};

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  const d1 = platform?.env?.DB;
  if (!d1 || !locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string; };
  const name = body.name?.trim() || `Session ${new Date().toLocaleDateString()}`;

  // Generate a short unique code
  const code = encodeBase64url(crypto.getRandomValues(new Uint8Array(6)));

  const db = getDb(d1);
  await db.insert(sharedSessions).values({
    id: code,
    name,
    creatorId: locals.user.id
  });

  return json({ session: { id: code, name, creatorId: locals.user.id, isActive: true } });
};

export const DELETE: RequestHandler = async ({ request, locals, platform }) => {
  const d1 = platform?.env?.DB;
  if (!d1 || !locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { id?: string; };
  const sessionId = body.id;
  if (!sessionId) {
    return json({ error: 'Missing session ID' }, { status: 400 });
  }

  const db = getDb(d1);

  // Only allow deleting own sessions
  const existing = await db
    .select()
    .from(sharedSessions)
    .where(eq(sharedSessions.id, sessionId))
    .limit(1);

  if (existing.length === 0 || existing[0].creatorId !== locals.user.id) {
    return json({ error: 'Not found or not authorized' }, { status: 404 });
  }

  await db.delete(sharedSessions).where(eq(sharedSessions.id, sessionId));
  return json({ success: true });
};
