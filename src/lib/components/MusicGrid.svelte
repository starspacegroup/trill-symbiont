<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	// Props for circle of fifths integration
	export let selectedKey = 'C';
	export let selectedScale = 'major';
	export let scaleFrequencies: number[] = [];
	export let isSynchronized = false;
	export let currentChord = 'I';
	export let masterVolume = 1.0; // New volume control prop
	
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
	
	// Right-click tracking
	let rightClickActive = false;
	let rightClickIndex: number | null = null;
	
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
	let baseFrequencies = [
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
	
	// Reactive statement to update master volume
	$: if (masterGain && audioContext) {
		masterGain.gain.setValueAtTime(10.0 * masterVolume, audioContext.currentTime);
	}
	
	// Initialize audio context
	async function initAudio() {
		if (isAudioInitialized) return;
		
		try {
			audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			masterGain = audioContext.createGain();
			masterGain.gain.value = 10.0 * masterVolume; // Set to max and apply volume control
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
		
		// Set frequency based on synchronization mode
		let baseFrequency: number;
		if (isSynchronized && scaleFrequencies.length > 0) {
			// Use scale frequencies from circle of fifths
			const scaleIndex = index % scaleFrequencies.length;
			baseFrequency = scaleFrequencies[scaleIndex];
		} else {
			// Use original grid frequencies
			baseFrequency = baseFrequencies[index] || 200 + (index * 10);
		}
		
		primaryOsc.frequency.setValueAtTime(baseFrequency * controls.primaryFreq, audioContext!.currentTime);
		primaryOsc.type = controls.primaryWave;
		
		// Create ambient envelope for primary
		primaryFilter.type = 'lowpass';
		primaryFilter.frequency.setValueAtTime(600 + (index * 30), audioContext.currentTime);
		primaryFilter.Q.setValueAtTime(0.7, audioContext.currentTime);
		
		// Secondary oscillator for harmonic content
		const secondaryOsc = audioContext.createOscillator();
		const secondaryFilter = audioContext.createBiquadFilter();
		
		// Use the same base frequency for secondary oscillator
		secondaryOsc.frequency.setValueAtTime(baseFrequency * controls.secondaryFreq, audioContext!.currentTime);
		secondaryOsc.type = controls.secondaryWave;
		secondaryFilter.type = 'highpass';
		secondaryFilter.frequency.setValueAtTime(200, audioContext.currentTime);
		
		// LFO for subtle modulation
		const lfo = audioContext.createOscillator();
		const lfoGain = audioContext.createGain();
		
		lfo.frequency.setValueAtTime(controls.lfoFreq, audioContext!.currentTime);
		lfo.type = controls.lfoWave;
		lfoGain.gain.setValueAtTime(controls.lfoGain, audioContext!.currentTime);
		
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
		components.squareGain.gain.linearRampToValueAtTime(0, audioContext!.currentTime + 3);
		
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
	
	// Right-click activation functions
	async function handleRightMouseDown(index: number, event: MouseEvent) {
		event.preventDefault(); // Prevent context menu
		if (!isAudioInitialized) {
			await initAudio();
		}
		
		rightClickActive = true;
		rightClickIndex = index;
		
		// Activate the square
		if (!activeSquares[index]) {
			activeSquares[index] = true;
			activeSquares = [...activeSquares];
			oscillatorControls[index] = { ...defaultOscillatorSettings };
			oscillatorControls = [...oscillatorControls];
			audioNodes[index] = createAmbientSound(index);
		}
	}
	
	function handleRightMouseUp(event: MouseEvent) {
		if (rightClickActive && rightClickIndex !== null) {
			// Deactivate the square
			const index = rightClickIndex;
			if (activeSquares[index]) {
				activeSquares[index] = false;
				activeSquares = [...activeSquares];
				stopAmbientSound(audioNodes[index], index);
				audioNodes[index] = null;
			}
		}
		
		rightClickActive = false;
		rightClickIndex = null;
	}
	
	function handleMouseLeave(event: MouseEvent) {
		// Handle case where mouse leaves the button while right-click is active
		if (rightClickActive && rightClickIndex !== null) {
			handleRightMouseUp(event);
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
					let baseFreq: number;
					if (isSynchronized && scaleFrequencies.length > 0) {
						const scaleIndex = index % scaleFrequencies.length;
						baseFreq = scaleFrequencies[scaleIndex];
					} else {
						baseFreq = baseFrequencies[index] || 200 + (index * 10);
					}
					components.primaryOsc.frequency.setValueAtTime(
						baseFreq * value,
						audioContext!.currentTime
					);
					break;
				case 'primaryWave':
					components.primaryOsc.type = value;
					break;
				case 'primaryGain':
					components.squareGain.gain.setValueAtTime(0.05 * value, audioContext!.currentTime);
					break;
				case 'secondaryFreq':
					let baseFreq2: number;
					if (isSynchronized && scaleFrequencies.length > 0) {
						const scaleIndex = index % scaleFrequencies.length;
						baseFreq2 = scaleFrequencies[scaleIndex];
					} else {
						baseFreq2 = baseFrequencies[index] || 200 + (index * 10);
					}
					components.secondaryOsc.frequency.setValueAtTime(
						baseFreq2 * value,
						audioContext!.currentTime
					);
					break;
				case 'secondaryWave':
					components.secondaryOsc.type = value;
					break;
				case 'lfoFreq':
					components.lfo.frequency.setValueAtTime(value, audioContext!.currentTime);
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
		
		// Force reactivity update for color changes
		// This ensures the colors update in real-time when audio parameters change
		activeSquares = [...activeSquares];
		// Also trigger reactivity on oscillator controls to update colors
		oscillatorControls = [...oscillatorControls];
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
		
		// Clean up right-click state
		rightClickActive = false;
		rightClickIndex = null;
	});
	
	// Global mouse event listeners for right-click handling
	onMount(() => {
		const handleGlobalMouseUp = (event: MouseEvent) => {
			if (rightClickActive) {
				handleRightMouseUp(event);
			}
		};
		
		document.addEventListener('mouseup', handleGlobalMouseUp);
		
		return () => {
			document.removeEventListener('mouseup', handleGlobalMouseUp);
		};
	});
	
	// Reactive statement to update frequencies when synchronization changes
	$: if (isSynchronized && scaleFrequencies.length > 0) {
		// Update frequencies for all active squares
		if (audioContext && isAudioInitialized) {
			audioNodes.forEach((components, index) => {
				if (components && activeSquares[index]) {
					const controls = oscillatorControls[index];
					const scaleIndex = index % scaleFrequencies.length;
					const baseFreq = scaleFrequencies[scaleIndex];
					
					try {
						components.primaryOsc.frequency.setValueAtTime(
							baseFreq * controls.primaryFreq,
							audioContext!.currentTime
						);
						components.secondaryOsc.frequency.setValueAtTime(
							baseFreq * controls.secondaryFreq,
							audioContext!.currentTime
						);
					} catch (e) {
						console.warn('Failed to update frequency:', e);
					}
				}
			});
		}
	}
	
	// Reactive statement to update colors when oscillator parameters change
	$: if (oscillatorControls && activeSquares.some(Boolean)) {
		// This reactive statement ensures colors update when any oscillator parameter changes
		// The colors are calculated in the template, but this forces reactivity
		activeSquares = [...activeSquares];
	}
	
	// Get current chord frequencies for display
	function getCurrentChordFrequencies(): number[] {
		if (!isSynchronized || scaleFrequencies.length === 0) return [];
		
		// Simple chord mapping based on current chord
		const chordMap: Record<string, number[]> = {
			'I': [0, 2, 4], // Root, 3rd, 5th
			'ii': [1, 3, 5], // 2nd, 4th, 6th
			'iii': [2, 4, 6], // 3rd, 5th, 7th
			'IV': [3, 5, 0], // 4th, 6th, root
			'V': [4, 6, 1], // 5th, 7th, 2nd
			'vi': [5, 0, 2], // 6th, root, 3rd
			'vii°': [6, 1, 3] // 7th, 2nd, 4th
		};
		
		const chordIndices = chordMap[currentChord] || [0, 2, 4];
		return chordIndices.map(i => scaleFrequencies[i % scaleFrequencies.length]);
	}

	// Color mapping functions for audio visualization
	function frequencyToHue(frequency: number): number {
		// Map frequency range (130-523Hz) to hue range (0-360 degrees)
		// Low frequencies (bass) -> warm colors (red/orange)
		// High frequencies (treble) -> cool colors (blue/purple)
		const minFreq = 130;
		const maxFreq = 523;
		const normalizedFreq = Math.max(50, Math.min(1, (frequency - minFreq) / (maxFreq - minFreq)));
		
		// Map to hue: 0-60 (red-orange) for low, 240-300 (blue-purple) for high
		const hue = normalizedFreq * 300; // 0-300 degrees covers red to purple
		console.log(`Frequency: ${frequency.toFixed(1)}Hz -> Hue: ${hue.toFixed(1)}°`);
		return hue;
	}

	function getSquareColor(index: number): string {
		if (!activeSquares[index]) return 'bg-gray-700 hover:bg-gray-600';
		
		// Get the current frequency for this square
		let baseFrequency: number;
		if (isSynchronized && scaleFrequencies.length > 0) {
			const scaleIndex = index % scaleFrequencies.length;
			baseFrequency = scaleFrequencies[scaleIndex];
		} else {
			baseFrequency = baseFrequencies[index] || 200 + (index * 10);
		}
		
		// Apply frequency multiplier
		const controls = oscillatorControls[index];
		const actualFrequency = baseFrequency * controls.primaryFreq;
		
		// Get hue based on frequency
		const hue = frequencyToHue(actualFrequency);
		
		// Get brightness based on volume (gain)
		const volume = controls.primaryGain;
		const lightness = 40 + (volume * 30); // 40-100% lightness based on volume
		
		// Get saturation based on volume
		const saturation = 60 + (volume * 40); // 60-100% saturation based on volume
		
		// Create gradient with primary and secondary colors
		const primaryColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
		const secondaryColor = `hsl(${(hue + 30) % 360}, ${saturation - 20}%, ${lightness - 10}%)`;
		
		return `bg-gradient-to-br from-[${primaryColor}] to-[${secondaryColor}] shadow-lg`;
	}

	function getSquareShadowColor(index: number): string {
		if (!activeSquares[index]) return '';
		
		let baseFrequency: number;
		if (isSynchronized && scaleFrequencies.length > 0) {
			const scaleIndex = index % scaleFrequencies.length;
			baseFrequency = scaleFrequencies[scaleIndex];
		} else {
			baseFrequency = baseFrequencies[index] || 200 + (index * 10);
		}
		
		const controls = oscillatorControls[index];
		const actualFrequency = baseFrequency * controls.primaryFreq;
		const hue = frequencyToHue(actualFrequency);
		
		return `shadow-[hsl(${hue}, 80%, 50%)]/50`;
	}

	function getCurrentFrequency(index: number): number {
		let baseFrequency: number;
		if (isSynchronized && scaleFrequencies.length > 0) {
			const scaleIndex = index % scaleFrequencies.length;
			baseFrequency = scaleFrequencies[scaleIndex];
		} else {
			baseFrequency = baseFrequencies[index] || 200 + (index * 10);
		}
		
		const controls = oscillatorControls[index];
		return baseFrequency * controls.primaryFreq;
	}

	function getSaturation(index: number): number {
		if (!activeSquares[index]) return 0;
		const volume = oscillatorControls[index].primaryGain;
		const saturation = 70 + (volume * 30); // 70-100% saturation based on volume
		console.log(`Square ${index}: Volume ${volume} -> Saturation ${saturation}%`);
		return saturation;
	}

	function getLightness(index: number): number {
		if (!activeSquares[index]) return 0;
		const volume = oscillatorControls[index].primaryGain;
		const lightness = 50 + (volume * 40); // 50-90% lightness based on volume
		console.log(`Square ${index}: Volume ${volume} -> Lightness ${lightness}%`);
		return lightness;
	}
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
		font-size: 16px;
	}

	select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
	}

	/* Ensure proper color display for active squares */
	:global(.animate-bounce) {
		animation: bounce 1s infinite;
	}

	@keyframes bounce {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-10%); }
	}

	/* Ensure gradient backgrounds are visible */
	button[style*="background: linear-gradient"] {
		background-blend-mode: normal !important;
	}
</style>
	
	<!-- Music Grid with Categories -->
	<div class="max-w-4xl mx-auto">
		<div class="bg-gray-800 rounded-xl p-6 mb-4">
			<h3 class="text-2xl font-bold text-white mb-4 text-center">Music Grid - Organized by Intervals</h3>
			<p class="text-gray-400 text-center mb-6">Each row represents a different musical interval or harmonic relationship</p>
			
			<!-- Grid with labeled rows -->
			<div class="space-y-4">
				<!-- Row 1: Root (Tonic) -->
				<div>
					<div class="flex items-center mb-2">
						<div class="w-32 text-sm font-semibold text-blue-400">Root (Tonic)</div>
						<div class="grid grid-cols-8 gap-2 flex-1">
							{#each Array(8) as _, colIndex}
								{@const index = 0 * 8 + colIndex}
								{@const currentFreq = getCurrentFrequency(index)}
								{@const hue = frequencyToHue(currentFreq)}
								{@const saturation = 100}
								{@const lightness = 50}
								{@const primaryColor = 99}
								{@const secondaryColor = 99}
								<button
									on:click={() => toggleSquare(index)}
									on:mousedown|preventDefault={(e) => {
										if (e.button === 2) {
											handleRightMouseDown(index, e);
										}
									}}
									on:contextmenu|preventDefault
									on:mouseleave={handleMouseLeave}
									class="aspect-square rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 {activeSquares[index]
										? 'shadow-lg border-2'
										: 'bg-gray-700 hover:bg-gray-600'}"
									aria-label="Root note {colIndex + 1}"
									style="{activeSquares[index]
										? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); box-shadow: 0 0 15px ${primaryColor}; border-color: ${primaryColor}; border-width: 2px;`
										: ''}"
								>
									<div class="w-full h-full rounded-lg transition-all duration-75 {activeSquares[index] ? 'animate-bounce bg-pink-600' : ''}" style="{activeSquares[index] ? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});` : ''}"></div>
								</button>
							{/each}
						</div>
					</div>
				</div>
				
				<!-- Row 2: Major 2nd -->
				<div>
					<div class="flex items-center mb-2">
						<div class="w-32 text-sm font-semibold text-green-400">Major 2nd</div>
						<div class="grid grid-cols-8 gap-2 flex-1">
							{#each Array(8) as _, colIndex}
								{@const index = 1 * 8 + colIndex}
								{@const currentFreq = getCurrentFrequency(index)}
								{@const hue = frequencyToHue(currentFreq)}
								{@const saturation = 100}
								{@const lightness = 50}
								{@const primaryColor = 99}
								{@const secondaryColor = 99}
								<button
									on:click={() => toggleSquare(index)}
									on:mousedown|preventDefault={(e) => {
										if (e.button === 2) {
											handleRightMouseDown(index, e);
										}
									}}
									on:contextmenu|preventDefault
									on:mouseleave={handleMouseLeave}
									class="aspect-square rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 {activeSquares[index]
										? 'shadow-lg border-2'
										: 'bg-gray-700 hover:bg-gray-600'}"
									aria-label="Major 2nd {colIndex + 1}"
									style="{activeSquares[index]
										? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); box-shadow: 0 0 15px ${primaryColor}; border-color: ${primaryColor}; border-width: 2px;`
										: ''}"
								>
									<div class="w-full h-full rounded-lg transition-all duration-75 {activeSquares[index] ? 'animate-bounce bg-pink-600' : ''}" style="{activeSquares[index] ? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});` : ''}"></div>
								</button>
							{/each}
						</div>
					</div>
				</div>
				
				<!-- Row 3: Major 3rd -->
				<div>
					<div class="flex items-center mb-2">
						<div class="w-32 text-sm font-semibold text-yellow-400">Major 3rd</div>
						<div class="grid grid-cols-8 gap-2 flex-1">
							{#each Array(8) as _, colIndex}
								{@const index = 2 * 8 + colIndex}
								{@const currentFreq = getCurrentFrequency(index)}
								{@const hue = frequencyToHue(currentFreq)}
								{@const saturation = 100}
								{@const lightness = 50}
								{@const primaryColor = 99}
								{@const secondaryColor = 99}
								<button
									on:click={() => toggleSquare(index)}
									on:mousedown|preventDefault={(e) => {
										if (e.button === 2) {
											handleRightMouseDown(index, e);
										}
									}}
									on:contextmenu|preventDefault
									on:mouseleave={handleMouseLeave}
									class="aspect-square rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 {activeSquares[index]
										? 'shadow-lg border-2'
										: 'bg-gray-700 hover:bg-gray-600'}"
									aria-label="Major 3rd {colIndex + 1}"
									style="{activeSquares[index]
										? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); box-shadow: 0 0 15px ${primaryColor}; border-color: ${primaryColor}; border-width: 2px;`
										: ''}"
								>
									<div class="w-full h-full rounded-lg transition-all duration-75 {activeSquares[index] ? 'animate-bounce bg-pink-600' : ''}" style="{activeSquares[index] ? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});` : ''}"></div>
								</button>
							{/each}
						</div>
					</div>
				</div>
				
				<!-- Row 4: Perfect 4th -->
				<div>
					<div class="flex items-center mb-2">
						<div class="w-32 text-sm font-semibold text-orange-400">Perfect 4th</div>
						<div class="grid grid-cols-8 gap-2 flex-1">
							{#each Array(8) as _, colIndex}
								{@const index = 3 * 8 + colIndex}
								{@const currentFreq = getCurrentFrequency(index)}
								{@const hue = frequencyToHue(currentFreq)}
								{@const saturation = 100}
								{@const lightness = 50}
								{@const primaryColor = 99}
								{@const secondaryColor = 99}
								<button
									on:click={() => toggleSquare(index)}
									on:mousedown|preventDefault={(e) => {
										if (e.button === 2) {
											handleRightMouseDown(index, e);
										}
									}}
									on:contextmenu|preventDefault
									on:mouseleave={handleMouseLeave}
									class="aspect-square rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 {activeSquares[index]
										? 'shadow-lg border-2'
										: 'bg-gray-700 hover:bg-gray-600'}"
									aria-label="Perfect 4th {colIndex + 1}"
									style="{activeSquares[index]
										? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); box-shadow: 0 0 15px ${primaryColor}; border-color: ${primaryColor}; border-width: 2px;`
										: ''}"
								>
									<div class="w-full h-full rounded-lg transition-all duration-75 {activeSquares[index] ? 'animate-bounce bg-pink-600' : ''}" style="{activeSquares[index] ? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});` : ''}"></div>
								</button>
							{/each}
						</div>
					</div>
				</div>
				
				<!-- Row 5: Perfect 5th -->
				<div>
					<div class="flex items-center mb-2">
						<div class="w-32 text-sm font-semibold text-red-400">Perfect 5th</div>
						<div class="grid grid-cols-8 gap-2 flex-1">
							{#each Array(8) as _, colIndex}
								{@const index = 4 * 8 + colIndex}
								{@const currentFreq = getCurrentFrequency(index)}
								{@const hue = frequencyToHue(currentFreq)}
								{@const saturation = 100}
								{@const lightness = 50}
								{@const primaryColor = 99}
								{@const secondaryColor = 99}
								<button
									on:click={() => toggleSquare(index)}
									on:mousedown|preventDefault={(e) => {
										if (e.button === 2) {
											handleRightMouseDown(index, e);
										}
									}}
									on:contextmenu|preventDefault
									on:mouseleave={handleMouseLeave}
									class="aspect-square rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 {activeSquares[index]
										? 'shadow-lg border-2'
										: 'bg-gray-700 hover:bg-gray-600'}"
									aria-label="Perfect 5th {colIndex + 1}"
									style="{activeSquares[index]
										? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); box-shadow: 0 0 15px ${primaryColor}; border-color: ${primaryColor}; border-width: 2px;`
										: ''}"
								>
									<div class="w-full h-full rounded-lg transition-all duration-75 {activeSquares[index] ? 'animate-bounce bg-pink-600' : ''}" style="{activeSquares[index] ? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});` : ''}"></div>
								</button>
							{/each}
						</div>
					</div>
				</div>
				
				<!-- Row 6: Major 6th -->
				<div>
					<div class="flex items-center mb-2">
						<div class="w-32 text-sm font-semibold text-purple-400">Major 6th</div>
						<div class="grid grid-cols-8 gap-2 flex-1">
							{#each Array(8) as _, colIndex}
								{@const index = 5 * 8 + colIndex}
								{@const currentFreq = getCurrentFrequency(index)}
								{@const hue = frequencyToHue(currentFreq)}
								{@const saturation = 100}
								{@const lightness = 50}
								{@const primaryColor = 99}
								{@const secondaryColor = 99}
								<button
									on:click={() => toggleSquare(index)}
									on:mousedown|preventDefault={(e) => {
										if (e.button === 2) {
											handleRightMouseDown(index, e);
										}
									}}
									on:contextmenu|preventDefault
									on:mouseleave={handleMouseLeave}
									class="aspect-square rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 {activeSquares[index]
										? 'shadow-lg border-2'
										: 'bg-gray-700 hover:bg-gray-600'}"
									aria-label="Major 6th {colIndex + 1}"
									style="{activeSquares[index]
										? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); box-shadow: 0 0 15px ${primaryColor}; border-color: ${primaryColor}; border-width: 2px;`
										: ''}"
								>
									<div class="w-full h-full rounded-lg transition-all duration-75 {activeSquares[index] ? 'animate-bounce bg-pink-600' : ''}" style="{activeSquares[index] ? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});` : ''}"></div>
								</button>
							{/each}
						</div>
					</div>
				</div>
				
				<!-- Row 7: Major 7th -->
				<div>
					<div class="flex items-center mb-2">
						<div class="w-32 text-sm font-semibold text-pink-400">Major 7th</div>
						<div class="grid grid-cols-8 gap-2 flex-1">
							{#each Array(8) as _, colIndex}
								{@const index = 6 * 8 + colIndex}
								{@const currentFreq = getCurrentFrequency(index)}
								{@const hue = frequencyToHue(currentFreq)}
								{@const saturation = 100}
								{@const lightness = 50}
								{@const primaryColor = 99}
								{@const secondaryColor = 99}
								<button
									on:click={() => toggleSquare(index)}
									on:mousedown|preventDefault={(e) => {
										if (e.button === 2) {
											handleRightMouseDown(index, e);
										}
									}}
									on:contextmenu|preventDefault
									on:mouseleave={handleMouseLeave}
									class="aspect-square rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 {activeSquares[index]
										? 'shadow-lg border-2'
										: 'bg-gray-700 hover:bg-gray-600'}"
									aria-label="Major 7th {colIndex + 1}"
									style="{activeSquares[index]
										? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); box-shadow: 0 0 15px ${primaryColor}; border-color: ${primaryColor}; border-width: 2px;`
										: ''}"
								>
									<div class="w-full h-full rounded-lg transition-all duration-75 {activeSquares[index] ? 'animate-bounce bg-pink-600' : ''}" style="{activeSquares[index] ? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});` : ''}"></div>
								</button>
							{/each}
						</div>
					</div>
				</div>
				
				<!-- Row 8: Octave -->
				<div>
					<div class="flex items-center mb-2">
						<div class="w-32 text-sm font-semibold text-cyan-400">Octave</div>
						<div class="grid grid-cols-8 gap-2 flex-1">
							{#each Array(8) as _, colIndex}
								{@const index = 7 * 8 + colIndex}
								{@const currentFreq = getCurrentFrequency(index)}
								{@const hue = frequencyToHue(currentFreq)}
								{@const saturation = 100}
								{@const lightness = 50}
								{@const primaryColor = 99}
								{@const secondaryColor = 99}
								<button
									on:click={() => toggleSquare(index)}
									on:mousedown|preventDefault={(e) => {
										if (e.button === 2) {
											handleRightMouseDown(index, e);
										}
									}}
									on:contextmenu|preventDefault
									on:mouseleave={handleMouseLeave}
									class="aspect-square rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 {activeSquares[index]
										? 'shadow-lg border-2'
										: 'bg-gray-700 hover:bg-gray-600'}"
									aria-label="Octave {colIndex + 1}"
									style="{activeSquares[index]
										? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); box-shadow: 0 0 15px ${primaryColor}; border-color: ${primaryColor}; border-width: 2px;`
										: ''}"
								>
									<div class="w-full h-full rounded-lg transition-all duration-75 {activeSquares[index] ? 'animate-bounce bg-pink-600' : ''}" style="{activeSquares[index] ? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});` : ''}"></div>
								</button>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="max-w-4xl mx-auto">
	<div class="mb-6 text-center space-y-4">
		<div>
			<button
				on:click={initAudio}
				class="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors mr-4 text-lg"
				disabled={isAudioInitialized}
			>
				{isAudioInitialized ? 'Audio Ready' : 'Enable Audio'}
			</button>
		</div>
		
		{#if isSynchronized && scaleFrequencies.length > 0}
		<div class="synchronization-info">
			<div class="sync-status">
				<span class="sync-icon text-lg">🎵</span>
				<span class="text-lg">Synchronized to {selectedKey} {selectedScale}</span>
			</div>
			{#if currentChord}
			<div class="chord-info">
				<span class="chord-label text-lg">Current Chord:</span>
				<span class="chord-name text-lg font-bold">{currentChord}</span>
				<div class="chord-frequencies">
					{#each getCurrentChordFrequencies() as freq}
						<span class="freq-badge text-base">{freq.toFixed(1)}Hz</span>
					{/each}
				</div>
			</div>
			{/if}
		</div>
		{/if}
		
		<div class="flex flex-wrap justify-center gap-4">
			<button
				on:click={isEvolving ? stopEvolution : startEvolution}
				class="px-6 py-3 {isEvolving ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} rounded-lg font-medium transition-colors text-lg"
				disabled={!isAudioInitialized}
			>
				{isEvolving ? 'Stop Evolution' : 'Start Evolution'}
			</button>
			
			<button
				on:click={randomizeGrid}
				class="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors text-lg"
				disabled={!isAudioInitialized}
			>
				Randomize
			</button>
			
			<button
				on:click={clearGrid}
				class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors text-lg"
			>
				Clear All
			</button>
		</div>
		
		<div class="flex items-center justify-center gap-4 mt-4">
			<label class="text-base text-gray-300">Evolution Speed:</label>
			<input
				type="range"
				min="32"
				max="9001"
				step="100"
				value={evolutionSpeed}
				on:input={(e) => updateEvolutionSpeed(parseInt(e.currentTarget.value))}
				class="w-32"
			/>
			<span class="text-base text-gray-400">{evolutionSpeed}ms</span>
		</div>
	</div>
	
	<div class="mt-6 text-center text-gray-400">
		<p class="mb-2 text-lg">Click squares to activate ambient sounds</p>
		<p class="text-base">Right-click and hold to temporarily activate squares</p>
		<p class="text-base">Each square creates a different tone in an evolving musical loop</p>
	</div>
	
	<div class="mt-4 text-center">
		<div class="inline-flex items-center space-x-4 text-base">
			<div class="flex items-center">
				<div class="w-4 h-4 rounded-full {isEvolving ? 'bg-green-500 animate-pulse' : 'bg-gray-500'} mr-2"></div>
				<span class="text-base">{isEvolving ? 'Evolving' : 'Static'}</span>
			</div>
			<div class="flex items-center">
				<div class="w-4 h-4 rounded-full {isAudioInitialized ? 'bg-blue-500' : 'bg-gray-500'} mr-2"></div>
				<span class="text-base">{isAudioInitialized ? 'Audio Active' : 'Audio Disabled'}</span>
			</div>
			<div class="flex items-center">
				<span class="text-gray-400 text-base">Active: {activeSquares.filter(Boolean).length}/{TOTAL_SQUARES}</span>
			</div>
		</div>
	</div>
	
	<!-- Default Settings Panel -->
	<div class="max-w-4xl mx-auto mt-6">
		<div class="bg-gray-800 rounded-xl border border-gray-700 p-6">
			<h3 class="text-2xl font-bold text-white mb-4 text-center">Default Settings for New Squares</h3>
			
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<!-- Primary Oscillator Defaults -->
				<div class="bg-gray-700 rounded-lg p-4">
					<h4 class="text-xl font-semibold text-blue-400 mb-3">Primary Oscillator</h4>
					<div class="space-y-3">
						<div>
							<label for="default-primary-freq" class="text-sm text-gray-400 block mb-1">Frequency Multiplier</label>
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
							<span class="text-sm text-gray-500">{defaultOscillatorSettings.primaryFreq.toFixed(1)}x</span>
						</div>
						<div>
							<label for="default-primary-wave" class="text-sm text-gray-400 block mb-1">Waveform</label>
							<select
								id="default-primary-wave"
								value={defaultOscillatorSettings.primaryWave}
								on:change={(e) => updateDefaultSetting('primaryWave', e.currentTarget.value)}
								class="w-full px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500"
							>
								{#each waveTypes as waveType}
									<option value={waveType}>{waveType}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="default-primary-gain" class="text-sm text-gray-400 block mb-1">Gain</label>
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
							<span class="text-sm text-gray-500">{defaultOscillatorSettings.primaryGain.toFixed(1)}</span>
						</div>
					</div>
				</div>
				
				<!-- Secondary Oscillator Defaults -->
				<div class="bg-gray-700 rounded-lg p-4">
					<h4 class="text-xl font-semibold text-purple-400 mb-3">Secondary Oscillator</h4>
					<div class="space-y-3">
						<div>
							<label for="default-secondary-freq" class="text-sm text-gray-400 block mb-1">Frequency Multiplier</label>
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
							<span class="text-sm text-gray-500">{defaultOscillatorSettings.secondaryFreq.toFixed(1)}x</span>
						</div>
						<div>
							<label for="default-secondary-wave" class="text-sm text-gray-400 block mb-1">Waveform</label>
							<select
								id="default-secondary-wave"
								value={defaultOscillatorSettings.secondaryWave}
								on:change={(e) => updateDefaultSetting('secondaryWave', e.currentTarget.value)}
								class="w-full px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500"
							>
								{#each waveTypes as waveType}
									<option value={waveType}>{waveType}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="default-secondary-gain" class="text-sm text-gray-400 block mb-1">Gain</label>
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
							<span class="text-sm text-gray-500">{defaultOscillatorSettings.secondaryGain.toFixed(1)}</span>
						</div>
					</div>
				</div>
				
				<!-- LFO Defaults -->
				<div class="bg-gray-700 rounded-lg p-4">
					<h4 class="text-xl font-semibold text-green-400 mb-3">LFO</h4>
					<div class="space-y-3">
						<div>
							<label for="default-lfo-freq" class="text-sm text-gray-400 block mb-1">Frequency (Hz)</label>
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
							<span class="text-sm text-gray-500">{defaultOscillatorSettings.lfoFreq.toFixed(1)} Hz</span>
						</div>
						<div>
							<label for="default-lfo-wave" class="text-sm text-gray-400 block mb-1">Waveform</label>
							<select
								id="default-lfo-wave"
								value={defaultOscillatorSettings.lfoWave}
								on:change={(e) => updateDefaultSetting('lfoWave', e.currentTarget.value)}
								class="w-full px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500"
							>
								{#each waveTypes as waveType}
									<option value={waveType}>{waveType}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="default-lfo-gain" class="text-sm text-gray-400 block mb-1">Gain</label>
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
							<span class="text-sm text-gray-500">{defaultOscillatorSettings.lfoGain}</span>
						</div>
					</div>
				</div>
			</div>
			
			<!-- Action Buttons -->
			<div class="flex flex-wrap justify-center gap-4 mt-6">
				<button
					on:click={applyDefaultsToAllActive}
					class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors text-lg"
					disabled={!activeSquares.some(Boolean)}
				>
					Apply to All Active
				</button>
				<button
					on:click={resetDefaultSettings}
					class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors text-lg"
				>
					Reset Defaults
				</button>
			</div>
			
			<div class="mt-4 text-center text-gray-400 text-base">
				<p>These settings will be applied to new squares when activated</p>
			</div>
		</div>
	</div>
	
	<!-- Oscillator Controls Panel -->
	{#if activeSquares.some(Boolean)}
	<div class="max-w-6xl mx-auto mt-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
		<h3 class="text-2xl font-bold text-white mb-4 text-center">Oscillator Controls</h3>
		
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
			{#each activeSquares as isActive, index}
				{#if isActive}
				<div class="bg-gray-700 rounded-lg p-4 border border-gray-600 min-w-64">
					<h4 class="text-xl font-semibold text-blue-400 mb-3 text-center">Square {index + 1}</h4>
					
					<!-- Primary Oscillator Controls -->
					<div class="mb-4">
						<h5 class="text-base font-medium text-gray-300 mb-2">Primary Oscillator</h5>
						<div class="space-y-2">
							<div>
								<label class="text-sm text-gray-400 block mb-1">Frequency Multiplier</label>
								<input
									type="range"
									min="0.1"
									max="3.0"
									step="0.1"
									value={oscillatorControls[index].primaryFreq}
									on:input={(e) => updateOscillatorControl(index, 'primaryFreq', parseFloat(e.currentTarget.value))}
									class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
								/>
								<span class="text-sm text-gray-500">{oscillatorControls[index].primaryFreq.toFixed(1)}x</span>
							</div>
							<div>
								<label class="text-sm text-gray-400 block mb-1">Waveform</label>
								<select
									value={oscillatorControls[index].primaryWave}
									on:change={(e) => updateOscillatorControl(index, 'primaryWave', e.currentTarget.value)}
									class="w-full px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500"
								>
									{#each waveTypes as waveType}
										<option value={waveType}>{waveType}</option>
									{/each}
								</select>
							</div>
							<div>
								<label class="text-sm text-gray-400 block mb-1">Gain</label>
								<input
									type="range"
									min="0.1"
									max="2.0"
									step="0.1"
									value={oscillatorControls[index].primaryGain}
									on:input={(e) => updateOscillatorControl(index, 'primaryGain', parseFloat(e.currentTarget.value))}
									class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
								/>
								<span class="text-sm text-gray-500">{oscillatorControls[index].primaryGain.toFixed(1)}</span>
							</div>
						</div>
					</div>
					
					<!-- Secondary Oscillator Controls -->
					<div class="mb-4">
						<h5 class="text-base font-medium text-gray-300 mb-2">Secondary Oscillator</h5>
						<div class="space-y-2">
							<div>
								<label class="text-sm text-gray-400 block mb-1">Frequency Multiplier</label>
								<input
									type="range"
									min="0.1"
									max="4.0"
									step="0.1"
									value={oscillatorControls[index].secondaryFreq}
									on:input={(e) => updateOscillatorControl(index, 'secondaryFreq', parseFloat(e.currentTarget.value))}
									class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
								/>
								<span class="text-sm text-gray-500">{oscillatorControls[index].secondaryFreq.toFixed(1)}x</span>
							</div>
							<div>
								<label class="text-sm text-gray-400 block mb-1">Waveform</label>
								<select
									value={oscillatorControls[index].secondaryWave}
									on:change={(e) => updateOscillatorControl(index, 'secondaryWave', e.currentTarget.value)}
									class="w-full px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500"
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
						<h5 class="text-base font-medium text-gray-300 mb-2">LFO (Low Frequency Oscillator)</h5>
						<div class="space-y-2">
							<div>
								<label class="text-sm text-gray-400 block mb-1">Frequency (Hz)</label>
								<input
									type="range"
									min="0.1"
									max="5.0"
									step="0.1"
									value={oscillatorControls[index].lfoFreq}
									on:input={(e) => updateOscillatorControl(index, 'lfoFreq', parseFloat(e.currentTarget.value))}
									class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
								/>
								<span class="text-sm text-gray-500">{oscillatorControls[index].lfoFreq.toFixed(1)} Hz</span>
							</div>
							<div>
								<label class="text-sm text-gray-400 block mb-1">Waveform</label>
								<select
									value={oscillatorControls[index].lfoWave}
									on:change={(e) => updateOscillatorControl(index, 'lfoWave', e.currentTarget.value)}
									class="w-full px-2 py-1 bg-gray-600 text-white text-sm rounded border border-gray-500"
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
						class="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
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