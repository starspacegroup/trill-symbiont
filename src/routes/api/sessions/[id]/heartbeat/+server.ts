import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { sessionPresence, sharedSessions } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

/** POST: Send heartbeat / join session */
export const POST: RequestHandler = async ({ params, locals, platform }) => {
  const d1 = platform?.env?.DB;
  if (!d1 || !locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb(d1);
  const sessionId = params.id;

  // Verify session exists
  const [session] = await db
    .select({ id: sharedSessions.id })
    .from(sharedSessions)
    .where(eq(sharedSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return json({ error: 'Session not found' }, { status: 404 });
  }

  const now = Math.floor(Date.now() / 1000);

  // Upsert presence (INSERT OR REPLACE)
  await db.run(
    sql`INSERT INTO session_presence (session_id, user_id, username, avatar, last_seen)
        VALUES (${sessionId}, ${locals.user.id}, ${locals.user.username}, ${locals.user.avatar}, ${now})
        ON CONFLICT (session_id, user_id)
        DO UPDATE SET username = ${locals.user.username}, avatar = ${locals.user.avatar}, last_seen = ${now}`
  );

  return json({ ok: true });
};

/** DELETE: Leave session (remove presence) */
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  const d1 = platform?.env?.DB;
  if (!d1 || !locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb(d1);
  const sessionId = params.id;

  await db
    .delete(sessionPresence)
    .where(
      sql`${sessionPresence.sessionId} = ${sessionId} AND ${sessionPresence.userId} = ${locals.user.id}`
    );

  return json({ ok: true });
};
