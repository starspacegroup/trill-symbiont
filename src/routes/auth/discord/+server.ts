import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDiscordAuthUrl } from '$lib/server/discord';
import { encodeBase64url } from '@oslojs/encoding';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  const clientId = platform?.env?.DISCORD_CLIENT_ID;
  if (!clientId) {
    return new Response('Discord OAuth not configured', { status: 500 });
  }

  // Generate CSRF state token
  const state = encodeBase64url(crypto.getRandomValues(new Uint8Array(24)));
  cookies.set('discord-oauth-state', state, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 10 // 10 minutes
  });

  const redirectUri = `${url.origin}/auth/discord/callback`;
  const authUrl = getDiscordAuthUrl(clientId, redirectUri, state);

  redirect(302, authUrl);
};
