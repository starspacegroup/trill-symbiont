<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	// Grid configuration
	const GRID_SIZE = 8;
	const TOTAL_SQUARES = GRID_SIZE * GRID_SIZE;
	
	// Audio context and synthesis
	let audioContext: AudioContext | null = null;
	let masterGain: GainNode | null = null;
	let isAudioInitialized = false;
	
	// Grid state
	let activeSquares: boolean[] = Array(TOTAL_SQUARES).fill(false);
	let audioNodes: (OscillatorNode | null)[] = Array(TOTAL_SQUARES).fill(null);
	
	// Musical parameters
	const baseFrequencies = [
		130.81, 146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, // C3-C4
		146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66, // D3-D4
		164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66, 329.63, // E3-E4
		174.61, 196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23, // F3-F4
		196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, // G3-G4
		220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00, // A3-A4
		246.94, 261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, // B3-B4
		261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25  // C4-C5
	];
	
	const waveTypes: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];
	
	// Initialize audio context
	async function initAudio() {
		if (isAudioInitialized) return;
		
		try {
			audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			masterGain = audioContext.createGain();
			masterGain.gain.value = 0.3;
			masterGain.connect(audioContext.destination);
			isAudioInitialized = true;
		} catch (error) {
			console.error('Failed to initialize audio:', error);
		}
	}
	
	// Create ambient sound for a square
	function createAmbientSound(index: number): OscillatorNode | null {
		if (!audioContext || !masterGain) return null;
		
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		const filter = audioContext.createBiquadFilter();
		
		// Set frequency based on position (musical scale)
		const frequency = baseFrequencies[index] || 200 + (index * 10);
		oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
		
		// Use different wave types for variety
		oscillator.type = waveTypes[index % waveTypes.length];
		
		// Create ambient envelope
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(800 + (index * 50), audioContext.currentTime);
		filter.Q.setValueAtTime(1, audioContext.currentTime);
		
		gainNode.gain.setValueAtTime(0, audioContext.currentTime);
		gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.5);
		
		// Connect nodes
		oscillator.connect(filter);
		filter.connect(gainNode);
		gainNode.connect(masterGain);
		
		oscillator.start();
		
		return oscillator;
	}
	
	// Stop ambient sound
	function stopAmbientSound(oscillator: OscillatorNode | null, index: number) {
		if (!oscillator || !audioContext) return;
		
		const gainNode = oscillator.context.createGain();
		gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
		gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
		
		setTimeout(() => {
			try {
				oscillator.stop();
			} catch (e) {
				// Oscillator might already be stopped
			}
		}, 1000);
	}
	
	// Toggle square state
	async function toggleSquare(index: number) {
		if (!isAudioInitialized) {
			await initAudio();
		}
		
		activeSquares[index] = !activeSquares[index];
		activeSquares = [...activeSquares]; // Trigger reactivity
		
		if (activeSquares[index]) {
			// Start sound
			audioNodes[index] = createAmbientSound(index);
		} else {
			// Stop sound
			stopAmbientSound(audioNodes[index], index);
			audioNodes[index] = null;
		}
	}
	
	// Cleanup on component destroy
	onDestroy(() => {
		audioNodes.forEach((node, index) => {
			if (node) {
				stopAmbientSound(node, index);
			}
		});
		
		if (audioContext) {
			audioContext.close();
		}
	});
</script>

<div class="max-w-4xl mx-auto">
	<div class="mb-6 text-center">
		<button 
			on:click={initAudio}
			class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
			disabled={isAudioInitialized}
		>
			{isAudioInitialized ? 'Audio Ready' : 'Enable Audio'}
		</button>
	</div>
	
	<div class="grid grid-cols-8 gap-2 max-w-2xl mx-auto p-4 bg-gray-800 rounded-xl">
		{#each Array(TOTAL_SQUARES) as _, index}
			<button
				on:click={() => toggleSquare(index)}
				class="aspect-square rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 {activeSquares[index] 
					? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/50' 
					: 'bg-gray-700 hover:bg-gray-600'}"
				aria-label="Square {index + 1}"
			>
				<div class="w-full h-full rounded-lg {activeSquares[index] ? 'animate-bounce' : ''}"></div>
			</button>
		{/each}
	</div>
	
	<div class="mt-8 text-center text-gray-400">
		<p class="mb-2">Click squares to activate ambient sounds</p>
		<p class="text-sm">Each square creates a different tone in an evolving musical loop</p>
	</div>
</div>