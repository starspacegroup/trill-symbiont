<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	type SharedSession = {
		id: string;
		name: string;
		creatorId: string;
		isActive: boolean;
	};

	let showSessionPanel = $state(false);
	let sessions = $state<SharedSession[]>([]);
	let newSessionName = $state('');
	let isCreating = $state(false);
	let copiedId = $state<string | null>(null);

	const user = $derived(page.data.user as { id: string; username: string; globalName: string | null; avatarUrl: string } | null);

	async function loadSessions() {
		try {
			const res = await fetch('/api/sessions');
			const data = (await res.json()) as { sessions?: SharedSession[] };
			sessions = data.sessions ?? [];
		} catch {
			sessions = [];
		}
	}

	async function createSession() {
		if (isCreating) return;
		isCreating = true;
		try {
			const res = await fetch('/api/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newSessionName || undefined })
			});
			const data = (await res.json()) as { session?: SharedSession };
			if (data.session) {
				sessions = [data.session, ...sessions];
				newSessionName = '';
				showSessionPanel = false;
				goto(`/?session=${data.session.id}`);
			}
		} finally {
			isCreating = false;
		}
	}

	async function deleteSession(id: string) {
		try {
			await fetch('/api/sessions', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id })
			});
			sessions = sessions.filter((s) => s.id !== id);
		} catch {
			// ignore
		}
	}

	function copyLink(sessionId: string) {
		const link = `${window.location.origin}/?session=${sessionId}`;
		navigator.clipboard.writeText(link);
		copiedId = sessionId;
		setTimeout(() => {
			copiedId = null;
		}, 2000);
	}

	function toggleSessionPanel() {
		showSessionPanel = !showSessionPanel;
		if (showSessionPanel) {
			loadSessions();
		}
	}
</script>

<div class="relative z-50 flex items-center gap-3">
	{#if user}
		<!-- Logged in -->
		<button
			onclick={toggleSessionPanel}
			class="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
		>
			+ Session
		</button>

		<div class="flex items-center gap-2">
			<img
				src={user.avatarUrl}
				alt={user.globalName ?? user.username}
				class="h-7 w-7 rounded-full"
			/>
			<span class="hidden text-sm font-medium text-gray-200 sm:inline">
				{user.globalName ?? user.username}
			</span>
		</div>

		<form method="POST" action="/auth/logout">
			<button
				type="submit"
				class="rounded-md bg-gray-700 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-600 hover:text-white"
			>
				Logout
			</button>
		</form>

		<!-- Session Panel Dropdown -->
		{#if showSessionPanel}
			<div
				class="absolute top-full right-0 mt-2 w-80 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl"
			>
				<h3 class="mb-3 text-sm font-semibold text-white">Shared Sessions</h3>

				<!-- Create new session -->
				<div class="mb-3 flex gap-2">
					<input
						type="text"
						bind:value={newSessionName}
						placeholder="Session name..."
						class="flex-1 rounded-md border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
						onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && createSession()}
					/>
					<button
						onclick={createSession}
						disabled={isCreating}
						class="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
					>
						{isCreating ? '...' : 'Create'}
					</button>
				</div>

				<!-- Session list -->
				{#if sessions.length === 0}
					<p class="text-center text-xs text-gray-400">No sessions yet</p>
				{:else}
					<div class="flex max-h-60 flex-col gap-2 overflow-y-auto">
						{#each sessions as session (session.id)}
							<div
								class="flex items-center justify-between rounded-md bg-gray-700/50 p-2 text-sm"
							>
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium text-gray-200">{session.name}</div>
									<div class="font-mono text-xs text-gray-400">{session.id}</div>
								</div>
								<div class="flex gap-1">
									<button
										onclick={() => copyLink(session.id)}
										class="rounded px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-gray-600"
										title="Copy shareable link"
									>
										{copiedId === session.id ? '✓' : '📋'}
									</button>
									<button
										onclick={() => deleteSession(session.id)}
										class="rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-gray-600"
										title="Delete session"
									>
										✕
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<!-- Not logged in -->
		<a
			href="/auth/discord"
			class="flex items-center gap-2 rounded-md bg-[#5865F2] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#4752C4]"
		>
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
				<path
					d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"
				/>
			</svg>
			Login
		</a>
	{/if}
</div>
