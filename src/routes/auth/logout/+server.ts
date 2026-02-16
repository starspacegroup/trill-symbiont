import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as auth from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies, locals, platform }) => {
  const d1 = platform?.env?.DB;

  if (locals.session && d1) {
    await auth.invalidateSession(d1, locals.session.id);
  }

  auth.deleteSessionTokenCookie({ cookies } as Parameters<typeof auth.deleteSessionTokenCookie>[0]);

  redirect(302, '/');
};
