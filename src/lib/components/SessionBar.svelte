<script lang="ts">
	import { sessionSync } from '$lib/stores/sessionSync.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	type SharedSession = {
		id: string;
		name: string;
		creatorId: string;
		isActive: boolean;
		memberCount?: number;
	};

	let expanded = $state(false);
	let sessions = $state<SharedSession[]>([]);
	function randomHash() {
		return Math.random().toString(36).substring(2, 8);
	}

	let joinCode = $state('');
	let newSessionName = $state(randomHash());
	let isCreating = $state(false);
	let loading = $state(false);

	const user = $derived(
		page.data.user as {
			id: string;
			username: string;
			globalName: string | null;
			avatarUrl: string;
		} | null
	);

	async function loadSessions() {
		loading = true;
		try {
			const res = await fetch('/api/sessions');
			const data = (await res.json()) as { sessions?: SharedSession[] };
			sessions = data.sessions ?? [];
		} catch {
			sessions = [];
		} finally {
			loading = false;
		}
	}

	async function joinSession(sessionId: string) {
		await sessionSync.join(sessionId);
		expanded = false;
		// Update URL without full reload
		const url = new URL(window.location.href);
		url.searchParams.set('session', sessionId);
		goto(url.pathname + url.search, { replaceState: true, noScroll: true });
	}

	async function leaveSession() {
		await sessionSync.leave();
		const url = new URL(window.location.href);
		url.searchParams.delete('session');
		goto(url.pathname + url.search, { replaceState: true, noScroll: true });
	}

	async function joinByCode() {
		const code = joinCode.trim();
		if (!code) return;
		joinCode = '';
		await joinSession(code);
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
				newSessionName = randomHash();
				await joinSession(data.session.id);
			}
		} finally {
			isCreating = false;
		}
	}

	async function deleteSession(id: string, e: MouseEvent) {
		e.stopPropagation();
		if (sessionSync.isInSession(id)) {
			await sessionSync.leave();
		}
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

	function toggleExpanded() {
		expanded = !expanded;
		if (expanded) loadSessions();
	}

	function copyLink(sessionId: string, e: MouseEvent) {
		e.stopPropagation();
		const link = `${window.location.origin}/?session=${sessionId}`;
		navigator.clipboard.writeText(link);
	}
</script>

{#if user}
	<div class="session-bar">
		<!-- Current session indicator -->
		{#if sessionSync.connected}
			<div class="session-active">
				<div class="flex items-center gap-2">
					<span class="pulse-dot"></span>
					<span class="text-sm font-medium text-white truncate max-w-[140px]">
						{sessionSync.sessionName || sessionSync.sessionId}
					</span>
					<span
						class="flex items-center gap-1 rounded-full bg-indigo-600/60 px-2 py-0.5 text-xs text-indigo-200"
						title="{sessionSync.memberCount} {sessionSync.memberCount === 1 ? 'person' : 'people'} connected"
					>
						<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
							<path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
						</svg>
						{sessionSync.memberCount}
					</span>
				</div>

				<!-- Member avatars -->
				{#if sessionSync.members.length > 0}
					<div class="flex -space-x-2 ml-2">
						{#each sessionSync.members.slice(0, 5) as member}
							<div
								class="h-6 w-6 rounded-full border-2 border-gray-800 bg-gray-600 overflow-hidden"
								title={member.username}
							>
								{#if member.avatar}
									<img
										src="https://cdn.discordapp.com/avatars/{member.userId}/{member.avatar}.png?size=32"
										alt={member.username}
										class="h-full w-full object-cover"
									/>
								{:else}
									<span class="flex h-full w-full items-center justify-center text-[10px] text-gray-300">
										{member.username.charAt(0).toUpperCase()}
									</span>
								{/if}
							</div>
						{/each}
						{#if sessionSync.members.length > 5}
							<div class="flex h-6 w-6 items-center justify-center rounded-full border-2 border-gray-800 bg-gray-600 text-[10px] text-gray-300">
								+{sessionSync.members.length - 5}
							</div>
						{/if}
					</div>
				{/if}

				<button
					onclick={leaveSession}
					class="ml-2 rounded px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-900/50 hover:text-red-200"
					title="Leave session"
				>
					Leave
				</button>
			</div>
		{/if}

		<!-- Session switcher toggle -->
		<button
			onclick={toggleExpanded}
			class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors
				{sessionSync.connected
					? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
					: 'bg-indigo-600 text-white hover:bg-indigo-700'}"
		>
			{sessionSync.connected ? '⇄ Switch' : '+ Session'}
		</button>

		<!-- Dropdown -->
		{#if expanded}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="session-dropdown" role="menu" tabindex="-1" onclick={(e) => e.stopPropagation()}>
				<h3 class="mb-3 text-sm font-semibold text-white">Sessions</h3>

				<!-- Join by code -->
				<div class="mb-3 flex gap-2">
					<input
						type="text"
						bind:value={joinCode}
						placeholder="Join by code..."
						class="flex-1 rounded-md border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
						onkeydown={(e) => e.key === 'Enter' && joinByCode()}
					/>
					<button
						onclick={joinByCode}
						class="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
					>
						Join
					</button>
				</div>

				<!-- Create new -->
				<div class="mb-3 flex gap-2">
					<input
						type="text"
						bind:value={newSessionName}
						placeholder="New session name..."
						class="flex-1 rounded-md border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
						onkeydown={(e) => e.key === 'Enter' && createSession()}
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
				{#if loading}
					<p class="text-center text-xs text-gray-400">Loading...</p>
				{:else if sessions.length === 0}
					<p class="text-center text-xs text-gray-400">No sessions yet. Create one above!</p>
				{:else}
					<div class="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
						{#each sessions as session (session.id)}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div
								role="button"
								tabindex="0"
								onclick={() => joinSession(session.id)}
								class="flex cursor-pointer items-center justify-between rounded-md p-2 text-left text-sm transition-colors
									{sessionSync.isInSession(session.id)
										? 'bg-indigo-900/60 border border-indigo-500'
										: 'bg-gray-700/50 hover:bg-gray-700 border border-transparent'}"
							>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<span class="truncate font-medium text-gray-200">{session.name}</span>
										{#if sessionSync.isInSession(session.id)}
											<span class="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
												ACTIVE
											</span>
										{/if}
									</div>
									<div class="flex items-center gap-2 mt-0.5">
										<span class="font-mono text-xs text-gray-400">{session.id}</span>
										{#if session.memberCount !== undefined && session.memberCount > 0}
											<span class="flex items-center gap-0.5 text-xs text-green-400">
												<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
													<path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
												</svg>
												{session.memberCount}
											</span>
										{/if}
									</div>
								</div>
								<div class="flex gap-1 ml-2">
									<button
										onclick={(e) => copyLink(session.id, e)}
										class="rounded px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-gray-600"
										title="Copy link"
									>
										📋
									</button>
									<button
										onclick={(e) => deleteSession(session.id, e)}
										class="rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-gray-600"
										title="Delete"
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
	</div>
{/if}

<style>
	.session-bar {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.session-active {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		background: rgba(55, 65, 81, 0.8);
		border: 1px solid rgba(99, 102, 241, 0.4);
		border-radius: 0.5rem;
		padding: 0.375rem 0.75rem;
		backdrop-filter: blur(8px);
	}

	.session-dropdown {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.5rem;
		width: 22rem;
		background: rgb(31, 41, 55);
		border: 1px solid rgb(55, 65, 81);
		border-radius: 0.75rem;
		padding: 1rem;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
		z-index: 60;
	}

	.pulse-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgb(34, 197, 94);
		box-shadow: 0 0 6px rgb(34, 197, 94);
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
