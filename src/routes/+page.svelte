<script lang="ts">
	import MusicGrid from '$lib/components/MusicGrid.svelte';
</script>

<svelte:head>
	<title>Trill Symbiont</title>
</svelte:head>

<main class="min-h-screen bg-gray-900 text-white">
	<div class="container mx-auto px-4 py-8">
		<header class="text-center mb-8">
			<h1 class="text-4xl font-bold mb-2">Ambient Music Grid</h1>
			<p class="text-gray-300">Click squares to create evolving ambient soundscapes</p>
		</header>
		
		<MusicGrid />
	</div>
</main>
