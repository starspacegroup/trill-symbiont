<script lang="ts">
	import MusicGrid from '$lib/components/MusicGrid.svelte';
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
	
	// State for circle of fifths
	let selectedKey = 'C';
	let selectedScale = 'major';
	let selectedChord = 'I';
	let scaleFrequencies: number[] = [];
	let isSynchronized = false;
	let showHelp = false;
	
	// Handle circle of fifths events
	function handleKeyChange(event: CustomEvent) {
		selectedKey = event.detail.key;
		scaleFrequencies = event.detail.frequencies;
		console.log('Key changed to:', selectedKey, 'Frequencies:', scaleFrequencies);
	}
	
	function handleScaleChange(event: CustomEvent) {
		selectedScale = event.detail.scale;
		scaleFrequencies = event.detail.frequencies;
		console.log('Scale changed to:', selectedScale, 'Frequencies:', scaleFrequencies);
	}
	
	function handleChordChange(event: CustomEvent) {
		selectedChord = event.detail.chord;
		console.log('Chord changed to:', selectedChord);
	}
	
	function toggleSynchronization() {
		isSynchronized = !isSynchronized;
	}
	
	function toggleHelp() {
		showHelp = !showHelp;
	}
</script>

<svelte:head>
	<title>Trill Symbiont (alpha)</title>
</svelte:head>

<main class="min-h-screen bg-gray-900 text-white">
	<div class="container mx-auto px-4 py-8">
		<header class="text-center mb-8">
			<h1 class="text-5xl font-bold mb-2">Trill Symbiont</h1>
			<p class="text-gray-300 text-lg">A shared generative ambient music experience with Circle of Fifths synchronization</p>
			
			<div class="mt-4">
				<button
					on:click={toggleHelp}
					class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors text-lg"
				>
				{showHelp ? 'Hide Help' : 'Show Help'}
				</button>
			</div>
		</header>
		
		{#if showHelp}
		<div class="max-w-4xl mx-auto mb-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
			<h2 class="text-3xl font-bold text-white mb-4">How to Use Trill Symbiont</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<h3 class="text-xl font-semibold text-blue-400 mb-2">Circle of Fifths</h3>
					<ul class="text-gray-300 space-y-1 text-base">
						<li>• Click on keys in the circle to change the musical key</li>
						<li>• Use the scale dropdown to select different modes (major, minor, etc.)</li>
						<li>• Choose chords to hear harmonic progressions</li>
						<li>• Toggle "Show Degrees" to see scale degree numbers</li>
					</ul>
				</div>
				
				<div>
					<h3 class="text-xl font-semibold text-purple-400 mb-2">Music Grid</h3>
					<ul class="text-gray-300 space-y-1 text-base">
						<li>• Click squares to activate ambient sounds</li>
						<li>• Use "Enable Audio" to start the audio engine</li>
						<li>• Toggle "Synchronized to Key" to sync all sounds to the selected key</li>
						<li>• Adjust oscillator controls for each active square</li>
						<li>• Use evolution mode for generative patterns</li>
					</ul>
				</div>
			</div>
			
			<div class="mt-4 p-4 bg-gray-700 rounded-lg">
				<h4 class="text-lg font-semibold text-yellow-400 mb-2">Pro Tips</h4>
				<ul class="text-gray-300 space-y-1 text-base">
					<li>• Start with C major for a familiar sound</li>
					<li>• Try different scales like Dorian or Mixolydian for unique moods</li>
					<li>• Use synchronization to create harmonically coherent compositions</li>
					<li>• Experiment with evolution speed for dynamic patterns</li>
				</ul>
			</div>
		</div>
		{/if}
		
		<!-- Circle of Fifths Controls -->
		<div class="max-w-4xl mx-auto mb-8">
			<div class="flex flex-col lg:flex-row gap-6 items-center justify-between">
				<div class="flex-1">
					<CircleOfFifths
						{selectedKey}
						{selectedScale}
						{selectedChord}
						{isSynchronized}
						on:keyChange={handleKeyChange}
						on:scaleChange={handleScaleChange}
						on:chordChange={handleChordChange}
					/>
				</div>
				
				<div class="flex flex-col gap-4">
					<button
						on:click={toggleSynchronization}
						class="px-8 py-4 rounded-lg font-medium transition-colors {isSynchronized ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-lg"
					>
					{isSynchronized ? 'Synchronized to Key' : 'Free Mode'}
					</button>
					
				<div class="text-base text-gray-300 text-center">
						{#if isSynchronized}
						<p class="text-lg">All sounds synchronized to {selectedKey} {selectedScale}</p>
						<p class="text-sm mt-1">Scale frequencies: {scaleFrequencies.length} notes</p>
						{:else}
						<p class="text-lg">Free mode - each square uses its own frequency</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
		
		<!-- Music Grid -->
		<MusicGrid
			{selectedKey}
			{selectedScale}
			{scaleFrequencies}
			{isSynchronized}
			currentChord={selectedChord}
		/>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
