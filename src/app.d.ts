// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env & {
				DB: D1Database;
				DISCORD_CLIENT_ID: string;
				DISCORD_CLIENT_SECRET: string;
			};
			cf: CfProperties;
			ctx: ExecutionContext;
		}

		interface Locals {
			user: import('$lib/server/auth').User | null;
			session: import('$lib/server/auth').Session | null;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
	}
}

export { };
