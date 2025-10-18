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
	let audioNodes: ({
		primaryOsc: OscillatorNode;
		secondaryOsc: OscillatorNode;
		lfo: OscillatorNode;
		squareGain: GainNode;
	} | null)[] = Array(TOTAL_SQUARES).fill(null);
	
	// Evolution and timing
	let evolutionInterval: number | null = null;
	let isEvolving = false;
	let evolutionSpeed = 42; // milliseconds
	let currentStep = 0;
	let maxSteps = 16;
	
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
	function createAmbientSound(index: number): {
		primaryOsc: OscillatorNode;
		secondaryOsc: OscillatorNode;
		lfo: OscillatorNode;
		squareGain: GainNode;
	} | null {
		if (!audioContext || !masterGain) return null;
		
		// Create square-specific gain node for unified control
		const squareGain = audioContext.createGain();
		squareGain.gain.value = 0.05;
		
		// Primary oscillator
		const primaryOsc = audioContext.createOscillator();
		const primaryFilter = audioContext.createBiquadFilter();
		
		// Set frequency based on position (musical scale)
		const baseFrequency = baseFrequencies[index] || 200 + (index * 10);
		primaryOsc.frequency.setValueAtTime(baseFrequency, audioContext.currentTime);
		primaryOsc.type = waveTypes[index % waveTypes.length];
		
		// Create ambient envelope for primary
		primaryFilter.type = 'lowpass';
		primaryFilter.frequency.setValueAtTime(600 + (index * 30), audioContext.currentTime);
		primaryFilter.Q.setValueAtTime(0.7, audioContext.currentTime);
		
		// Secondary oscillator for harmonic content
		const secondaryOsc = audioContext.createOscillator();
		const secondaryFilter = audioContext.createBiquadFilter();
		
		secondaryOsc.frequency.setValueAtTime(baseFrequency * 1.5, audioContext.currentTime);
		secondaryOsc.type = 'sine';
		secondaryFilter.type = 'highpass';
		secondaryFilter.frequency.setValueAtTime(200, audioContext.currentTime);
		
		// LFO for subtle modulation
		const lfo = audioContext.createOscillator();
		const lfoGain = audioContext.createGain();
		
		lfo.frequency.setValueAtTime(0.2 + (index * 0.05), audioContext.currentTime);
		lfo.type = 'sine';
		lfoGain.gain.setValueAtTime(10, audioContext.currentTime);
		
		// Connect LFO to primary oscillator frequency
		lfo.connect(lfoGain);
		lfoGain.connect(primaryOsc.frequency);
		
		// Connect primary chain to square gain
		primaryOsc.connect(primaryFilter);
		primaryFilter.connect(squareGain);
		
		// Connect secondary chain to square gain
		secondaryOsc.connect(secondaryFilter);
		secondaryFilter.connect(squareGain);
		
		// Connect square gain to master
		squareGain.connect(masterGain);
		
		// Start oscillators
		primaryOsc.start();
		secondaryOsc.start();
		lfo.start();
		
		// Return all components for cleanup
		return {
			primaryOsc,
			secondaryOsc,
			lfo,
			squareGain
		};
	}
	
	// Stop ambient sound
	function stopAmbientSound(components: {
		primaryOsc: OscillatorNode;
		secondaryOsc: OscillatorNode;
		lfo: OscillatorNode;
		squareGain: GainNode;
	} | null, index: number) {
		if (!components || !audioContext) return;
		
		// Fade out the square's gain over 3 seconds
		components.squareGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 3);
		
		// Stop all oscillators after fade completes
		setTimeout(() => {
			try {
				components.primaryOsc.stop();
				components.secondaryOsc.stop();
				components.lfo.stop();
			} catch (e) {
				// Oscillators might already be stopped
			}
		}, 3000);
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
	
	// Evolution functions
	function startEvolution() {
		if (evolutionInterval) return;
		
		isEvolving = true;
		evolutionInterval = window.setInterval(() => {
			evolvePattern();
			currentStep = (currentStep + 1) % maxSteps;
		}, evolutionSpeed);
	}
	
	function stopEvolution() {
		if (evolutionInterval) {
			clearInterval(evolutionInterval);
			evolutionInterval = null;
		}
		isEvolving = false;
	}
	
	function evolvePattern() {
		// Simple evolution: randomly toggle some squares based on current state
		const evolutionChance = 0.1; // 10% chance per step
		
		for (let i = 0; i < TOTAL_SQUARES; i++) {
			if (Math.random() < evolutionChance) {
				// Weight the evolution based on neighboring squares
				const neighbors = getNeighbors(i);
				const activeNeighbors = neighbors.filter(n => activeSquares[n]).length;
				
				// More likely to activate if neighbors are active
				const activationChance = activeNeighbors / 4;
				
				if (Math.random() < activationChance) {
					if (!activeSquares[i]) {
						toggleSquare(i);
					}
				} else {
					// Random chance to deactivate
					if (activeSquares[i] && Math.random() < 0.3) {
						toggleSquare(i);
					}
				}
			}
		}
	}
	
	function getNeighbors(index: number): number[] {
		const neighbors: number[] = [];
		const row = Math.floor(index / GRID_SIZE);
		const col = index % GRID_SIZE;
		
		// Check all 4 directions
		const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
		
		for (const [dr, dc] of directions) {
			const newRow = row + dr;
			const newCol = col + dc;
			
			if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
				neighbors.push(newRow * GRID_SIZE + newCol);
			}
		}
		
		return neighbors;
	}
	
	function clearGrid() {
		// Stop evolution when clearing grid to prevent sound from restarting
		if (isEvolving) {
			stopEvolution();
		}
		
		// Stop all audio nodes immediately and reset audio state
		audioNodes.forEach((components, index) => {
			if (components) {
				try {
					// Stop oscillators immediately without fade out
					components.primaryOsc.stop();
					components.secondaryOsc.stop();
					components.lfo.stop();
				} catch (e) {
					// Oscillators might already be stopped
				}
				audioNodes[index] = null;
			}
		});
		
		// Reset audio context to ensure no lingering sounds
		if (audioContext) {
			try {
				audioContext.close();
			} catch (e) {
				// Audio context might already be closed
			}
			audioContext = null;
			masterGain = null;
			isAudioInitialized = false;
		}
		
		// Clear all active squares
		activeSquares = Array(TOTAL_SQUARES).fill(false);
	}
	
	function randomizeGrid() {
		clearGrid();
		for (let i = 0; i < TOTAL_SQUARES; i++) {
			if (Math.random() < 0.3) { // 30% chance to activate
				toggleSquare(i);
			}
		}
	}
	
	function updateEvolutionSpeed(speed: number) {
		evolutionSpeed = speed;
		if (isEvolving) {
			stopEvolution();
			startEvolution();
		}
	}
	
	// Cleanup on component destroy
	onDestroy(() => {
		stopEvolution();
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

	<div class="max-w-4xl mx-auto">
	<div class="mb-6 text-center space-y-4">
		<div>
			<button
				on:click={initAudio}
				class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors mr-4"
				disabled={isAudioInitialized}
			>
				{isAudioInitialized ? 'Audio Ready' : 'Enable Audio'}
			</button>
		</div>
		
		<div class="flex flex-wrap justify-center gap-4">
			<button
				on:click={isEvolving ? stopEvolution : startEvolution}
				class="px-4 py-2 {isEvolving ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} rounded-lg font-medium transition-colors"
				disabled={!isAudioInitialized}
			>
				{isEvolving ? 'Stop Evolution' : 'Start Evolution'}
			</button>
			
			<button
				on:click={randomizeGrid}
				class="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors"
				disabled={!isAudioInitialized}
			>
				Randomize
			</button>
			
			<button
				on:click={clearGrid}
				class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
			>
				Clear All
			</button>
		</div>
		
		<div class="flex items-center justify-center gap-4 mt-4">
			<label class="text-sm text-gray-300">Evolution Speed:</label>
			<input
				type="range"
				min="32"
				max="9001"
				step="100"
				value={evolutionSpeed}
				on:input={(e) => updateEvolutionSpeed(parseInt(e.currentTarget.value))}
				class="w-32"
			/>
			<span class="text-sm text-gray-400">{evolutionSpeed}ms</span>
		</div>
	</div>
	
	<div class="mt-6 text-center text-gray-400">
		<p class="mb-2">Click squares to activate ambient sounds</p>
		<p class="text-sm">Each square creates a different tone in an evolving musical loop</p>
	</div>
	
	<div class="mt-4 text-center">
		<div class="inline-flex items-center space-x-4 text-sm">
			<div class="flex items-center">
				<div class="w-3 h-3 rounded-full {isEvolving ? 'bg-green-500 animate-pulse' : 'bg-gray-500'} mr-2"></div>
				<span>{isEvolving ? 'Evolving' : 'Static'}</span>
			</div>
			<div class="flex items-center">
				<div class="w-3 h-3 rounded-full {isAudioInitialized ? 'bg-blue-500' : 'bg-gray-500'} mr-2"></div>
				<span>{isAudioInitialized ? 'Audio Active' : 'Audio Disabled'}</span>
			</div>
			<div class="flex items-center">
				<span class="text-gray-400">Active: {activeSquares.filter(Boolean).length}/{TOTAL_SQUARES}</span>
			</div>
		</div>
	</div>
</div>