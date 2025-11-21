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

		// Disable middle-click default behavior (autoscroll)
		const handleMouseDown = (event: MouseEvent) => {
			if (event.button === 1) {
				event.preventDefault();
				return false;
			}
		};

		document.addEventListener('contextmenu', handleContextMenu);
		document.addEventListener('mousedown', handleMouseDown);

		// Cleanup function
		return () => {
			document.removeEventListener('contextmenu', handleContextMenu);
			document.removeEventListener('mousedown', handleMouseDown);
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
