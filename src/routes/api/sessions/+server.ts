import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { sharedSessions } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { encodeBase64url } from '@oslojs/encoding';

export const GET: RequestHandler = async ({ locals, platform }) => {
  const d1 = platform?.env?.DB;
  if (!d1 || !locals.user) {
    return json({ sessions: [] });
  }

  const db = getDb(d1);
  const userSessions = await db
    .select()
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
