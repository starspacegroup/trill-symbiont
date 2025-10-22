<script lang="ts">
	import MusicGrid from '$lib/components/MusicGrid.svelte';
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';

	// State for circle of fifths
	let selectedKey = 'C';
	let selectedScale = 'major';
	let selectedChord = 'I';
	let scaleFrequencies: number[] = [];
	let isSynchronized = true; // Default to synced mode for better music theory compliance
	let showHelp = false;
	let showCircleOfFifths = false; // Collapsed by default
	let masterVolume = 1.0; // Master volume control (max by default)

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

	function toggleCircleOfFifths() {
		showCircleOfFifths = !showCircleOfFifths;
	}
</script>

<svelte:head>
	<title>Trill Symbiont (alpha)</title>
</svelte:head>

<main class="min-h-screen bg-gray-900 text-white">
	<div class="container mx-auto px-4 py-8">
		<header class="mb-8 text-center">
			<h1 class="mb-2 text-5xl font-bold">Trill Symbiont</h1>
			<p class="text-lg text-gray-300">
				A shared generative ambient music experience with Circle of Fifths synchronization
			</p>

			<div class="mt-4">
				<button
					on:click={toggleHelp}
					class="rounded-lg bg-indigo-600 px-6 py-3 text-lg font-medium transition-colors hover:bg-indigo-700"
				>
					{showHelp ? 'Hide Help' : 'Show Help'}
				</button>
			</div>
		</header>

		{#if showHelp}
			<div class="mx-auto mb-8 max-w-4xl rounded-xl border border-gray-700 bg-gray-800 p-6">
				<h2 class="mb-4 text-3xl font-bold text-white">How to Use Trill Symbiont</h2>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div>
						<h3 class="mb-2 text-xl font-semibold text-blue-400">Circle of Fifths</h3>
						<ul class="space-y-1 text-base text-gray-300">
							<li>• Click on keys in the circle to change the musical key</li>
							<li>• Use the scale dropdown to select different modes (major, minor, etc.)</li>
							<li>• Choose chords to hear harmonic progressions</li>
							<li>• Toggle "Show Degrees" to see scale degree numbers</li>
						</ul>
					</div>

					<div>
						<h3 class="mb-2 text-xl font-semibold text-purple-400">Music Grid</h3>
						<ul class="space-y-1 text-base text-gray-300">
							<li>• Click squares to activate ambient sounds</li>
							<li>• Use "Enable Audio" to start the audio engine</li>
							<li>• Toggle "Synchronized to Key" to sync all sounds to the selected key</li>
							<li>• Use the Master Volume slider to control overall audio level</li>
							<li>• Adjust oscillator controls for each active square</li>
							<li>• Use evolution mode for generative patterns</li>
						</ul>
					</div>
				</div>

				<div class="mt-4 rounded-lg bg-gray-700 p-4">
					<h4 class="mb-2 text-lg font-semibold text-yellow-400">Pro Tips</h4>
					<ul class="space-y-1 text-base text-gray-300">
						<li>• Start with C major for a familiar sound</li>
						<li>• Try different scales like Dorian or Mixolydian for unique moods</li>
						<li>• Use synchronization to create harmonically coherent compositions</li>
						<li>• Experiment with evolution speed for dynamic patterns</li>
					</ul>
				</div>
			</div>
		{/if}

		<!-- Circle of Fifths Section - Collapsible at top -->
		<div class="mx-auto mb-8 max-w-4xl">
			<div class="rounded-xl border border-gray-700 bg-gray-800">
				<button
					on:click={toggleCircleOfFifths}
					class="hover:bg-gray-750 flex w-full items-center justify-between rounded-t-xl px-6 py-4 transition-colors"
				>
					<h2 class="text-2xl font-bold text-white">🎵 Rule of Fifths</h2>
					<span class="text-2xl text-gray-400">{showCircleOfFifths ? '▼' : '▶'}</span>
				</button>

				{#if showCircleOfFifths}
					<div class="border-t border-gray-700 p-6">
						<div class="flex flex-col items-center justify-between gap-6 lg:flex-row">
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
									class="rounded-lg px-8 py-4 font-medium transition-colors {isSynchronized
										? 'bg-green-600 hover:bg-green-700'
										: 'bg-blue-600 hover:bg-blue-700'} text-lg"
								>
									{isSynchronized ? 'Synchronized to Key' : 'Free Mode'}
								</button>

								<!-- Master Volume Control -->
								<div class="flex flex-col gap-2">
									<label for="master-volume" class="text-center text-lg font-medium"
										>Master Volume</label
									>
									<div class="flex items-center gap-4">
										<span class="text-sm text-gray-400">🔇</span>
										<input
											id="master-volume"
											type="range"
											min="0"
											max="1"
											step="0.01"
											bind:value={masterVolume}
											class="slider h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-700"
										/>
										<span class="text-sm text-gray-400">🔊</span>
									</div>
									<div class="text-center text-sm text-gray-400">
										{Math.round(masterVolume * 100)}%
									</div>
								</div>

								<div class="text-center text-base text-gray-300">
									{#if isSynchronized}
										<p class="text-lg">All sounds synchronized to {selectedKey} {selectedScale}</p>
										<p class="mt-1 text-sm">Scale frequencies: {scaleFrequencies.length} notes</p>
									{:else}
										<p class="text-lg">Free mode - each square uses its own frequency</p>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Music Grid -->
		<div class="flex flex-col gap-8">
			<div>
				<MusicGrid
					{selectedKey}
					{selectedScale}
					{scaleFrequencies}
					{isSynchronized}
					{masterVolume}
					currentChord={selectedChord}
				/>
			</div>
		</div>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}

	/* Volume slider styling */
	.slider {
		background: linear-gradient(to right, #4f46e5 0%, #4f46e5 100%);
	}

	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #ffffff;
		cursor: pointer;
		border: 2px solid #4f46e5;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #ffffff;
		cursor: pointer;
		border: 2px solid #4f46e5;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.slider::-webkit-slider-track {
		height: 8px;
		border-radius: 4px;
		background: #374151;
	}

	.slider::-moz-range-track {
		height: 8px;
		border-radius: 4px;
		background: #374151;
	}
</style>
