import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { sharedSessions, sessionPresence } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

const PRESENCE_TIMEOUT_MS = 15_000;

/** GET: Fetch session state + active members */
export const GET: RequestHandler = async ({ params, platform }) => {
  const d1 = platform?.env?.DB;
  if (!d1) return json({ error: 'No DB' }, { status: 500 });

  const db = getDb(d1);
  const sessionId = params.id;

  // Get the session
  const [session] = await db
    .select({
      id: sharedSessions.id,
      name: sharedSessions.name,
      state: sharedSessions.state,
      stateVersion: sharedSessions.stateVersion
    })
    .from(sharedSessions)
    .where(eq(sharedSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return json({ error: 'Session not found' }, { status: 404 });
  }

  // Clean up stale presence entries
  const cutoff = new Date(Date.now() - PRESENCE_TIMEOUT_MS);
  await db
    .delete(sessionPresence)
    .where(
      sql`${sessionPresence.sessionId} = ${sessionId} AND ${sessionPresence.lastSeen} < ${Math.floor(cutoff.getTime() / 1000)}`
    );

  // Get active members
  const members = await db
    .select({
      userId: sessionPresence.userId,
      username: sessionPresence.username,
      avatar: sessionPresence.avatar
    })
    .from(sessionPresence)
    .where(eq(sessionPresence.sessionId, sessionId));

  let state = {};
  try {
    state = JSON.parse(session.state || '{}');
  } catch {
    state = {};
  }

  return json({
    id: session.id,
    name: session.name,
    state,
    stateVersion: session.stateVersion,
    members
  });
};

/** PUT: Update session state (partial merge) */
export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  const d1 = platform?.env?.DB;
  if (!d1 || !locals.user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb(d1);
  const sessionId = params.id;

  const body = (await request.json()) as { state?: Record<string, unknown>; };
  if (!body.state) {
    return json({ error: 'Missing state' }, { status: 400 });
  }

  // Get current state
  const [session] = await db
    .select({
      state: sharedSessions.state,
      stateVersion: sharedSessions.stateVersion
    })
    .from(sharedSessions)
    .where(eq(sharedSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return json({ error: 'Session not found' }, { status: 404 });
  }

  let currentState = {};
  try {
    currentState = JSON.parse(session.state || '{}');
  } catch {
    currentState = {};
  }

  // Merge states (shallow merge — new values overwrite old)
  const mergedState = { ...currentState, ...body.state };
  const newVersion = (session.stateVersion ?? 0) + 1;

  await db
    .update(sharedSessions)
    .set({
      state: JSON.stringify(mergedState),
      stateVersion: newVersion
    })
    .where(eq(sharedSessions.id, sessionId));

  return json({ stateVersion: newVersion, state: mergedState });
};
