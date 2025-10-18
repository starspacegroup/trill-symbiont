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
	
	// Oscillator controls for each square
	let oscillatorControls: Array<{
		primaryFreq: number;
		primaryWave: OscillatorType;
		primaryGain: number;
		secondaryFreq: number;
		secondaryWave: OscillatorType;
		secondaryGain: number;
		lfoFreq: number;
		lfoWave: OscillatorType;
		lfoGain: number;
	}> = Array(TOTAL_SQUARES).fill(null).map(() => ({
		primaryFreq: 1.0,
		primaryWave: 'sine',
		primaryGain: 1.0,
		secondaryFreq: 1.5,
		secondaryWave: 'sine',
		secondaryGain: 0.5,
		lfoFreq: 0.2,
		lfoWave: 'sine',
		lfoGain: 10
	}));
	
	// Default settings for new square activations
	let defaultOscillatorSettings = {
		primaryFreq: 1.0,
		primaryWave: 'sine' as OscillatorType,
		primaryGain: 1.0,
		secondaryFreq: 1.5,
		secondaryWave: 'sine' as OscillatorType,
		secondaryGain: 0.5,
		lfoFreq: 0.2,
		lfoWave: 'sine' as OscillatorType,
		lfoGain: 10
	};
	
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
		squareGain.gain.value = 0.05 * oscillatorControls[index].primaryGain;
		
		// Primary oscillator
		const primaryOsc = audioContext.createOscillator();
		const primaryFilter = audioContext.createBiquadFilter();
		
		// Get current controls for this square
		const controls = oscillatorControls[index];
		
		// Set frequency based on position (musical scale) with control multiplier
		const baseFrequency = baseFrequencies[index] || 200 + (index * 10);
		primaryOsc.frequency.setValueAtTime(baseFrequency * controls.primaryFreq, audioContext.currentTime);
		primaryOsc.type = controls.primaryWave;
		
		// Create ambient envelope for primary
		primaryFilter.type = 'lowpass';
		primaryFilter.frequency.setValueAtTime(600 + (index * 30), audioContext.currentTime);
		primaryFilter.Q.setValueAtTime(0.7, audioContext.currentTime);
		
		// Secondary oscillator for harmonic content
		const secondaryOsc = audioContext.createOscillator();
		const secondaryFilter = audioContext.createBiquadFilter();
		
		secondaryOsc.frequency.setValueAtTime(baseFrequency * controls.secondaryFreq, audioContext.currentTime);
		secondaryOsc.type = controls.secondaryWave;
		secondaryFilter.type = 'highpass';
		secondaryFilter.frequency.setValueAtTime(200, audioContext.currentTime);
		
		// LFO for subtle modulation
		const lfo = audioContext.createOscillator();
		const lfoGain = audioContext.createGain();
		
		lfo.frequency.setValueAtTime(controls.lfoFreq, audioContext.currentTime);
		lfo.type = controls.lfoWave;
		lfoGain.gain.setValueAtTime(controls.lfoGain, audioContext.currentTime);
		
		// Connect LFO to primary oscillator frequency
		lfo.connect(lfoGain);
		lfoGain.connect(primaryOsc.frequency);
		
		// Connect primary chain to square gain
		primaryOsc.connect(primaryFilter);
		primaryFilter.connect(squareGain);
		
		// Connect secondary chain to square gain with gain control
		const secondaryGain = audioContext.createGain();
		secondaryGain.gain.value = 0.05 * oscillatorControls[index].secondaryGain;
		secondaryOsc.connect(secondaryFilter);
		secondaryFilter.connect(secondaryGain);
		secondaryGain.connect(squareGain);
		
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
			// Apply default settings to this square
			oscillatorControls[index] = { ...defaultOscillatorSettings };
			oscillatorControls = [...oscillatorControls];
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
	
	// Update oscillator parameters in real-time
	function updateOscillatorControl(index: number, param: string, value: any) {
		if (!audioContext || !audioNodes[index]) return;
		
		// Update the control value
		const newControls = [...oscillatorControls];
		(newControls[index] as any)[param] = value;
		oscillatorControls = newControls;
		
		const components = audioNodes[index];
		if (!components) return;
		
		try {
			switch (param) {
				case 'primaryFreq':
					components.primaryOsc.frequency.setValueAtTime(
						(baseFrequencies[index] || 200 + (index * 10)) * value,
						audioContext.currentTime
					);
					break;
				case 'primaryWave':
					components.primaryOsc.type = value;
					break;
				case 'primaryGain':
					components.squareGain.gain.setValueAtTime(0.05 * value, audioContext.currentTime);
					break;
				case 'secondaryFreq':
					components.secondaryOsc.frequency.setValueAtTime(
						(baseFrequencies[index] || 200 + (index * 10)) * value,
						audioContext.currentTime
					);
					break;
				case 'secondaryWave':
					components.secondaryOsc.type = value;
					break;
				case 'lfoFreq':
					components.lfo.frequency.setValueAtTime(value, audioContext.currentTime);
					break;
				case 'lfoWave':
					components.lfo.type = value;
					break;
				case 'lfoGain':
					// Find the LFO gain node (we need to store it)
					break;
			}
		} catch (e) {
			console.warn('Failed to update oscillator parameter:', e);
		}
	}
	
	// Reset oscillator controls to defaults
	function resetOscillatorControls(index: number) {
		oscillatorControls[index] = {
			primaryFreq: 1.0,
			primaryWave: 'sine',
			primaryGain: 1.0,
			secondaryFreq: 1.5,
			secondaryWave: 'sine',
			secondaryGain: 0.5,
			lfoFreq: 0.2,
			lfoWave: 'sine',
			lfoGain: 10
		};
		oscillatorControls = [...oscillatorControls];
	}
	
	// Update default oscillator settings
	function updateDefaultSetting(param: string, value: any) {
		(defaultOscillatorSettings as any)[param] = value;
		defaultOscillatorSettings = { ...defaultOscillatorSettings };
	}
	
	// Apply current default settings to all active squares
	function applyDefaultsToAllActive() {
		if (!audioContext) return;
		
		activeSquares.forEach((isActive, index) => {
			if (isActive) {
				oscillatorControls[index] = { ...defaultOscillatorSettings };
				// Update the audio parameters in real-time
				updateOscillatorControl(index, 'primaryFreq', defaultOscillatorSettings.primaryFreq);
				updateOscillatorControl(index, 'primaryWave', defaultOscillatorSettings.primaryWave);
				updateOscillatorControl(index, 'primaryGain', defaultOscillatorSettings.primaryGain);
				updateOscillatorControl(index, 'secondaryFreq', defaultOscillatorSettings.secondaryFreq);
				updateOscillatorControl(index, 'secondaryWave', defaultOscillatorSettings.secondaryWave);
				updateOscillatorControl(index, 'lfoFreq', defaultOscillatorSettings.lfoFreq);
				updateOscillatorControl(index, 'lfoWave', defaultOscillatorSettings.lfoWave);
			}
		});
		oscillatorControls = [...oscillatorControls];
	}
	
	// Reset default settings to original defaults
	function resetDefaultSettings() {
		defaultOscillatorSettings = {
			primaryFreq: 1.0,
			primaryWave: 'sine',
			primaryGain: 1.0,
			secondaryFreq: 1.5,
			secondaryWave: 'sine',
			secondaryGain: 0.5,
			lfoFreq: 0.2,
			lfoWave: 'sine',
			lfoGain: 10
		};
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

<style>
	/* Custom range input styling */
	input[type="range"] {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}

	input[type="range"]::-webkit-slider-track {
		background: #4b5563;
		height: 8px;
		border-radius: 4px;
	}

	input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		background: #3b82f6;
		height: 16px;
		width: 16px;
		border-radius: 50%;
		cursor: pointer;
	}

	input[type="range"]::-webkit-slider-thumb:hover {
		background: #2563eb;
	}

	input[type="range"]::-moz-range-track {
		background: #4b5563;
		height: 8px;
		border-radius: 4px;
		border: none;
	}

	input[type="range"]::-moz-range-thumb {
		background: #3b82f6;
		height: 16px;
		width: 16px;
		border-radius: 50%;
		cursor: pointer;
		border: none;
	}

	select {
		background-color: #4b5563;
		color: white;
		border: 1px solid #6b7280;
		border-radius: 4px;
		padding: 4px 8px;
		font-size: 12px;
	}

	select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
	}
</style>
	
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
	
	<!-- Default Settings Panel -->
	<div class="max-w-4xl mx-auto mt-6">
		<div class="bg-gray-800 rounded-xl border border-gray-700 p-6">
			<h3 class="text-xl font-bold text-white mb-4 text-center">Default Settings for New Squares</h3>
			
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<!-- Primary Oscillator Defaults -->
				<div class="bg-gray-700 rounded-lg p-4">
					<h4 class="text-lg font-semibold text-blue-400 mb-3">Primary Oscillator</h4>
					<div class="space-y-3">
						<div>
							<label for="default-primary-freq" class="text-xs text-gray-400 block mb-1">Frequency Multiplier</label>
							<input
								id="default-primary-freq"
								type="range"
								min="0.1"
								max="3.0"
								step="0.1"
								value={defaultOscillatorSettings.primaryFreq}
								on:input={(e) => updateDefaultSetting('primaryFreq', parseFloat(e.currentTarget.value))}
								class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
							/>
							<span class="text-xs text-gray-500">{defaultOscillatorSettings.primaryFreq.toFixed(1)}x</span>
						</div>
						<div>
							<label for="default-primary-wave" class="text-xs text-gray-400 block mb-1">Waveform</label>
							<select
								id="default-primary-wave"
								value={defaultOscillatorSettings.primaryWave}
								on:change={(e) => updateDefaultSetting('primaryWave', e.currentTarget.value)}
								class="w-full px-2 py-1 bg-gray-600 text-white text-xs rounded border border-gray-500"
							>
								{#each waveTypes as waveType}
									<option value={waveType}>{waveType}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="default-primary-gain" class="text-xs text-gray-400 block mb-1">Gain</label>
							<input
								id="default-primary-gain"
								type="range"
								min="0.1"
								max="2.0"
								step="0.1"
								value={defaultOscillatorSettings.primaryGain}
								on:input={(e) => updateDefaultSetting('primaryGain', parseFloat(e.currentTarget.value))}
								class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
							/>
							<span class="text-xs text-gray-500">{defaultOscillatorSettings.primaryGain.toFixed(1)}</span>
						</div>
					</div>
				</div>
				
				<!-- Secondary Oscillator Defaults -->
				<div class="bg-gray-700 rounded-lg p-4">
					<h4 class="text-lg font-semibold text-purple-400 mb-3">Secondary Oscillator</h4>
					<div class="space-y-3">
						<div>
							<label for="default-secondary-freq" class="text-xs text-gray-400 block mb-1">Frequency Multiplier</label>
							<input
								id="default-secondary-freq"
								type="range"
								min="0.1"
								max="4.0"
								step="0.1"
								value={defaultOscillatorSettings.secondaryFreq}
								on:input={(e) => updateDefaultSetting('secondaryFreq', parseFloat(e.currentTarget.value))}
								class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
							/>
							<span class="text-xs text-gray-500">{defaultOscillatorSettings.secondaryFreq.toFixed(1)}x</span>
						</div>
						<div>
							<label for="default-secondary-wave" class="text-xs text-gray-400 block mb-1">Waveform</label>
							<select
								id="default-secondary-wave"
								value={defaultOscillatorSettings.secondaryWave}
								on:change={(e) => updateDefaultSetting('secondaryWave', e.currentTarget.value)}
								class="w-full px-2 py-1 bg-gray-600 text-white text-xs rounded border border-gray-500"
							>
								{#each waveTypes as waveType}
									<option value={waveType}>{waveType}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="default-secondary-gain" class="text-xs text-gray-400 block mb-1">Gain</label>
							<input
								id="default-secondary-gain"
								type="range"
								min="0.1"
								max="2.0"
								step="0.1"
								value={defaultOscillatorSettings.secondaryGain}
								on:input={(e) => updateDefaultSetting('secondaryGain', parseFloat(e.currentTarget.value))}
								class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
							/>
							<span class="text-xs text-gray-500">{defaultOscillatorSettings.secondaryGain.toFixed(1)}</span>
						</div>
					</div>
				</div>
				
				<!-- LFO Defaults -->
				<div class="bg-gray-700 rounded-lg p-4">
					<h4 class="text-lg font-semibold text-green-400 mb-3">LFO</h4>
					<div class="space-y-3">
						<div>
							<label for="default-lfo-freq" class="text-xs text-gray-400 block mb-1">Frequency (Hz)</label>
							<input
								id="default-lfo-freq"
								type="range"
								min="0.1"
								max="5.0"
								step="0.1"
								value={defaultOscillatorSettings.lfoFreq}
								on:input={(e) => updateDefaultSetting('lfoFreq', parseFloat(e.currentTarget.value))}
								class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
							/>
							<span class="text-xs text-gray-500">{defaultOscillatorSettings.lfoFreq.toFixed(1)} Hz</span>
						</div>
						<div>
							<label for="default-lfo-wave" class="text-xs text-gray-400 block mb-1">Waveform</label>
							<select
								id="default-lfo-wave"
								value={defaultOscillatorSettings.lfoWave}
								on:change={(e) => updateDefaultSetting('lfoWave', e.currentTarget.value)}
								class="w-full px-2 py-1 bg-gray-600 text-white text-xs rounded border border-gray-500"
							>
								{#each waveTypes as waveType}
									<option value={waveType}>{waveType}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="default-lfo-gain" class="text-xs text-gray-400 block mb-1">Gain</label>
							<input
								id="default-lfo-gain"
								type="range"
								min="1"
								max="20"
								step="1"
								value={defaultOscillatorSettings.lfoGain}
								on:input={(e) => updateDefaultSetting('lfoGain', parseFloat(e.currentTarget.value))}
								class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
							/>
							<span class="text-xs text-gray-500">{defaultOscillatorSettings.lfoGain}</span>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Action Buttons -->
			<div class="flex flex-wrap justify-center gap-4 mt-6">
				<button
					on:click={applyDefaultsToAllActive}
					class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
					disabled={!activeSquares.some(Boolean)}
				>
					Apply to All Active
				</button>
				<button
					on:click={resetDefaultSettings}
					class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
				>
					Reset Defaults
				</button>
			</div>
			
			<div class="mt-4 text-center text-gray-400 text-sm">
				<p>These settings will be applied to new squares when activated</p>
			</div>
		</div>
	</div>
	
	<!-- Oscillator Controls Panel -->
	{#if activeSquares.some(Boolean)}
	<div class="max-w-6xl mx-auto mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
		<h3 class="text-xl font-bold text-white mb-4 text-center">Oscillator Controls</h3>
		
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
			{#each activeSquares as isActive, index}
				{#if isActive}
				<div class="bg-gray-700 rounded-lg p-4 border border-gray-600 min-w-64">
					<h4 class="text-lg font-semibold text-blue-400 mb-3 text-center">Square {index + 1}</h4>
					
					<!-- Primary Oscillator Controls -->
					<div class="mb-4">
						<h5 class="text-sm font-medium text-gray-300 mb-2">Primary Oscillator</h5>
						<div class="space-y-2">
							<div>
								<label class="text-xs text-gray-400 block mb-1">Frequency Multiplier</label>
								<input
									type="range"
									min="0.1"
									max="3.0"
									step="0.1"
									value={oscillatorControls[index].primaryFreq}
									on:input={(e) => updateOscillatorControl(index, 'primaryFreq', parseFloat(e.currentTarget.value))}
									class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
								/>
								<span class="text-xs text-gray-500">{oscillatorControls[index].primaryFreq.toFixed(1)}x</span>
							</div>
							<div>
								<label class="text-xs text-gray-400 block mb-1">Waveform</label>
								<select
									value={oscillatorControls[index].primaryWave}
									on:change={(e) => updateOscillatorControl(index, 'primaryWave', e.currentTarget.value)}
									class="w-full px-2 py-1 bg-gray-600 text-white text-xs rounded border border-gray-500"
								>
									{#each waveTypes as waveType}
										<option value={waveType}>{waveType}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="text-xs text-gray-400 block mb-1">Gain</label>
								<input
									type="range"
									min="0.1"
									max="2.0"
									step="0.1"
									value={oscillatorControls[index].primaryGain}
									on:input={(e) => updateOscillatorControl(index, 'primaryGain', parseFloat(e.currentTarget.value))}
									class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
								/>
								<span class="text-xs text-gray-500">{oscillatorControls[index].primaryGain.toFixed(1)}</span>
							</div>
						</div>
					</div>
					
					<!-- Secondary Oscillator Controls -->
					<div class="mb-4">
						<h5 class="text-sm font-medium text-gray-300 mb-2">Secondary Oscillator</h5>
						<div class="space-y-2">
							<div>
								<label class="text-xs text-gray-400 block mb-1">Frequency Multiplier</label>
								<input
									type="range"
									min="0.1"
									max="4.0"
									step="0.1"
									value={oscillatorControls[index].secondaryFreq}
									on:input={(e) => updateOscillatorControl(index, 'secondaryFreq', parseFloat(e.currentTarget.value))}
									class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
								/>
								<span class="text-xs text-gray-500">{oscillatorControls[index].secondaryFreq.toFixed(1)}x</span>
							</div>
							<div>
								<label class="text-xs text-gray-400 block mb-1">Waveform</label>
								<select
									value={oscillatorControls[index].secondaryWave}
									on:change={(e) => updateOscillatorControl(index, 'secondaryWave', e.currentTarget.value)}
									class="w-full px-2 py-1 bg-gray-600 text-white text-xs rounded border border-gray-500"
								>
									{#each waveTypes as waveType}
										<option value={waveType}>{waveType}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
					
					<!-- LFO Controls -->
					<div class="mb-4">
						<h5 class="text-sm font-medium text-gray-300 mb-2">LFO (Low Frequency Oscillator)</h5>
						<div class="space-y-2">
							<div>
								<label class="text-xs text-gray-400 block mb-1">Frequency (Hz)</label>
								<input
									type="range"
									min="0.1"
									max="5.0"
									step="0.1"
									value={oscillatorControls[index].lfoFreq}
									on:input={(e) => updateOscillatorControl(index, 'lfoFreq', parseFloat(e.currentTarget.value))}
									class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
								/>
								<span class="text-xs text-gray-500">{oscillatorControls[index].lfoFreq.toFixed(1)} Hz</span>
							</div>
							<div>
								<label class="text-xs text-gray-400 block mb-1">Waveform</label>
								<select
									value={oscillatorControls[index].lfoWave}
									on:change={(e) => updateOscillatorControl(index, 'lfoWave', e.currentTarget.value)}
									class="w-full px-2 py-1 bg-gray-600 text-white text-xs rounded border border-gray-500"
								>
									{#each waveTypes as waveType}
										<option value={waveType}>{waveType}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
					
					<button
						on:click={() => resetOscillatorControls(index)}
						class="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
					>
						Reset to Defaults
					</button>
				</div>
				{/if}
			{/each}
		</div>
	</div>
	{/if}
</div>