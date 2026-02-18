import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCodeForToken, getDiscordUser } from '$lib/server/discord';
import * as auth from '$lib/server/auth';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  const d1 = platform?.env?.DB;
  const clientId = platform?.env?.DISCORD_CLIENT_ID;
  const clientSecret = platform?.env?.DISCORD_CLIENT_SECRET;

  if (!d1 || !clientId || !clientSecret) {
    return new Response('Discord OAuth not configured', { status: 500 });
  }

  // Verify CSRF state
  const state = url.searchParams.get('state');
  const storedState = cookies.get('discord-oauth-state');

  if (!state || !storedState || state !== storedState) {
    return new Response('Invalid OAuth state', { status: 400 });
  }

  cookies.delete('discord-oauth-state', { path: '/' });

  const code = url.searchParams.get('code');
  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  try {
    const redirectUri = `${url.origin}/auth/discord/callback`;

    // Exchange code for access token
    let tokenData;
    try {
      tokenData = await exchangeCodeForToken(clientId, clientSecret, code, redirectUri);
    } catch (e) {
      console.error('Token exchange failed:', e);
      return new Response(`Authentication failed: token exchange error`, { status: 500 });
    }

    // Fetch Discord user info
    let discordUser;
    try {
      discordUser = await getDiscordUser(tokenData.access_token);
    } catch (e) {
      console.error('Discord user fetch failed:', e);
      return new Response(`Authentication failed: user fetch error`, { status: 500 });
    }

    // Upsert user in database
    try {
      await auth.upsertUser(d1, discordUser);
    } catch (e) {
      console.error('User upsert failed:', e);
      return new Response(`Authentication failed: database user error`, { status: 500 });
    }

    // Create auth session
    try {
      const sessionToken = auth.generateSessionToken();
      const session = await auth.createSession(d1, sessionToken, discordUser.id);
      auth.setSessionTokenCookie(
        { cookies } as Parameters<typeof auth.setSessionTokenCookie>[0],
        sessionToken,
        session.expiresAt
      );
    } catch (e) {
      console.error('Session creation failed:', e);
      return new Response(`Authentication failed: session creation error`, { status: 500 });
    }
  } catch (error) {
    console.error('Discord OAuth error:', error);
    return new Response('Authentication failed', { status: 500 });
  }

  redirect(302, '/');
};
