import type { LayoutServerLoad } from './$types';
import { getAvatarUrl } from '$lib/server/discord';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (locals.user) {
    return {
      user: {
        id: locals.user.id,
        username: locals.user.username,
        globalName: locals.user.globalName,
        avatarUrl: getAvatarUrl(locals.user.id, locals.user.avatar)
      }
    };
  }

  return { user: null };
};
