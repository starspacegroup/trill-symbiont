import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, platform }) => {
	// Get the Durable Object namespace
	const id = platform?.env?.SYNC?.idFromName('global-sync');
	if (!id || !platform?.env?.SYNC) {
		return new Response('Durable Objects not available', { status: 503 });
	}

	const stub = platform.env.SYNC.get(id);

	// Forward the WebSocket upgrade request to the Durable Object
	return await stub.fetch(request);
};
