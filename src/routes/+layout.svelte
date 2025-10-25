<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		// Disable right-click context menu globally
		const handleContextMenu = (event: MouseEvent) => {
			event.preventDefault();
			return false;
		};

		document.addEventListener('contextmenu', handleContextMenu);

		// Cleanup function
		return () => {
			document.removeEventListener('contextmenu', handleContextMenu);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
