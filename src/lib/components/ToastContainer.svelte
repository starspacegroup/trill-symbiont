<script lang="ts">
	import { getToasts, removeToast, type Toast } from '$lib/stores/toastStore.svelte';

	const typeStyles: Record<string, string> = {
		info: 'bg-blue-600/90 border-blue-400',
		success: 'bg-green-600/90 border-green-400',
		warning: 'bg-yellow-600/90 border-yellow-400',
		error: 'bg-red-600/90 border-red-400'
	};

	const typeIcons: Record<string, string> = {
		info: 'ℹ️',
		success: '✓',
		warning: '⚠',
		error: '✕'
	};
</script>

<div class="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
	{#each getToasts() as toast (toast.id)}
		<div
			class="pointer-events-auto flex min-w-[280px] max-w-[400px] items-center gap-3 rounded-lg border px-4 py-3 shadow-xl backdrop-blur-sm transition-all duration-300 {typeStyles[toast.type] ?? typeStyles.info}"
			role="alert"
		>
			<span class="text-lg">{typeIcons[toast.type] ?? 'ℹ️'}</span>
			<span class="flex-1 text-sm font-medium text-white">{toast.message}</span>
			<button
				onclick={() => removeToast(toast.id)}
				class="ml-2 text-white/70 transition-colors hover:text-white"
				aria-label="Dismiss"
			>
				✕
			</button>
		</div>
	{/each}
</div>
