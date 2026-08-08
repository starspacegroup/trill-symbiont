import type { RequestEvent } from '@sveltejs/kit';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { sessions, users } from './db/schema';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;

export const sessionCookieName = 'auth-session';

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	return encodeBase64url(bytes);
}

export function hashToken(token: string): string {
	return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createSession(d1: D1Database, token: string, userId: string) {
	const db = getDb(d1);
	const sessionId = hashToken(token);
	const expiresAt = new Date(Date.now() + DAY_IN_MS * 30);

	await db.insert(sessions).values({
		id: sessionId,
		userId,
		expiresAt
	});

	return { id: sessionId, userId, expiresAt };
}

export async function validateSessionToken(d1: D1Database, token: string) {
	const db = getDb(d1);
	const sessionId = hashToken(token);

	const result = await db
		.select()
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(eq(sessions.id, sessionId))
		.limit(1);

	if (result.length === 0) {
		return { session: null, user: null };
	}

	const session = result[0].sessions;
	const user = result[0].users;

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		const newExpiry = new Date(Date.now() + DAY_IN_MS * 30);
		await db.update(sessions).set({ expiresAt: newExpiry }).where(eq(sessions.id, sessionId));
		session.expiresAt = newExpiry;
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(d1: D1Database, sessionId: string) {
	const db = getDb(d1);
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function upsertUser(
	d1: D1Database,
	discordUser: { id: string; username: string; global_name: string | null; avatar: string | null; }
) {
	const db = getDb(d1);
	const now = new Date();

	await db
		.insert(users)
		.values({
			id: discordUser.id,
			username: discordUser.username,
			globalName: discordUser.global_name,
			avatar: discordUser.avatar,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: users.id,
			set: {
				username: discordUser.username,
				globalName: discordUser.global_name,
				avatar: discordUser.avatar,
				updatedAt: now
			}
		});
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax'
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		path: '/'
	});
}
