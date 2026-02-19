<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import AuthHeader from '$lib/components/AuthHeader.svelte';
	import SessionBar from '$lib/components/SessionBar.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';
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

<div class="fixed top-0 right-0 z-50 flex items-center gap-3 p-2">
	<SessionBar />
	<AuthHeader />
</div>

<ToastContainer />

{@render children?.()}
