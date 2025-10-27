<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let selectedKey = 'C';
	export let selectedScale = 'major';
	export let scaleFrequencies: number[] = [];
	export let isSynchronized = false;
	export let currentChord = 'I';
	export let masterVolume = 1.0;
	export let currentSequenceStep = -1;

	const GRID_SIZE = 8;
	const TOTAL_SQUARES = GRID_SIZE * GRID_SIZE;

	let audioContext: AudioContext | null = null;
	let masterGain: GainNode | null = null;
	let isAudioInitialized = false;

	let activeSquares: boolean[] = Array(TOTAL_SQUARES).fill(false);
	let audioNodes: ({
		primaryOsc: OscillatorNode;
		lfo: OscillatorNode;
		lfoGain: GainNode;
		squareGain: GainNode;
		decayTimeoutId?: number;
	} | null)[] = Array(TOTAL_SQUARES).fill(null);

	let evolutionInterval: number | null = null;
	let isEvolving = false;
	let evolutionSpeed = 500;
	let currentStep = 0;
	let maxSteps = 16;

	let rightClickActive = false;
	let rightClickIndex: number | null = null;

	// Track triggered squares for animation
	let triggeredSquares: boolean[] = Array(TOTAL_SQUARES).fill(false);

	let oscillatorControls: Array<{
		primaryFreq: number;
		primaryWave: OscillatorType;
		primaryGain: number;
		primaryDecay: number;
		lfoFreq: number;
		lfoWave: OscillatorType;
		lfoGain: number;
		lfoDecay: number;
	}> = Array(TOTAL_SQUARES)
		.fill(null)
		.map(() => ({
			primaryFreq: 1.0,
			primaryWave: 'sawtooth',
			primaryGain: 1.0,
			primaryDecay: 0.5,
			lfoFreq: 0.2,
			lfoWave: 'sine',
			lfoGain: 0,
			lfoDecay: 0.5
		}));

	let defaultOscillatorSettings = {
		primaryFreq: 1.0,
		primaryWave: 'sawtooth' as OscillatorType,
		primaryGain: 1.0,
		primaryDecay: 0.5,
		lfoFreq: 0.2,
		lfoWave: 'sine' as OscillatorType,
		lfoGain: 0,
		lfoDecay: 0.5
	};

	let baseFrequencies = [
		130.81, 146.83, 164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 146.83, 164.81, 174.61, 196.0,
		220.0, 246.94, 261.63, 293.66, 164.81, 174.61, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63,
		174.61, 196.0, 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 196.0, 220.0, 246.94, 261.63,
		293.66, 329.63, 349.23, 392.0, 220.0, 246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0,
		246.94, 261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 261.63, 293.66, 329.63, 349.23,
		392.0, 440.0, 493.88, 523.25
	];

	const waveTypes: OscillatorType[] = ['sine', 'triangle', 'square', 'sawtooth'];

	$: if (masterGain && audioContext) {
		masterGain.gain.setValueAtTime(0.6 * masterVolume, audioContext.currentTime);
	}

	async function initAudio() {
		if (isAudioInitialized) return;

		try {
			const AudioContextClass =
				window.AudioContext ||
				(window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			audioContext = new AudioContextClass();
			masterGain = audioContext.createGain();
			masterGain.gain.value = 0.15 * masterVolume;
			masterGain.connect(audioContext.destination);
			isAudioInitialized = true;
		} catch (error) {
			console.error('Failed to initialize audio:', error);
		}
	}

	function createAmbientSound(index: number): {
		primaryOsc: OscillatorNode;
		lfo: OscillatorNode;
		lfoGain: GainNode;
		squareGain: GainNode;
		decayTimeoutId?: number;
	} | null {
		if (!audioContext || !masterGain) return null;

		const squareGain = audioContext.createGain();
		const targetGain = 0.05 * oscillatorControls[index].primaryGain;
		squareGain.gain.value = 0; // Start at 0 for attack

		const primaryOsc = audioContext.createOscillator();
		const primaryFilter = audioContext.createBiquadFilter();

		const controls = oscillatorControls[index];

		let baseFrequency: number;
		if (isSynchronized && scaleFrequencies.length > 0) {
			const scaleIndex = index % scaleFrequencies.length;
			baseFrequency = scaleFrequencies[scaleIndex];
		} else {
			baseFrequency = baseFrequencies[index] || 200 + index * 10;
		}

		primaryOsc.frequency.setValueAtTime(
			baseFrequency * controls.primaryFreq,
			audioContext!.currentTime
		);
		primaryOsc.type = controls.primaryWave;

		primaryFilter.type = 'lowpass';
		primaryFilter.frequency.setValueAtTime(800 + index * 40, audioContext.currentTime);
		primaryFilter.Q.setValueAtTime(1.2, audioContext.currentTime);

		const lfo = audioContext.createOscillator();
		const lfoGain = audioContext.createGain();

		lfo.frequency.setValueAtTime(controls.lfoFreq, audioContext!.currentTime);
		lfo.type = controls.lfoWave;
		lfoGain.gain.value = 0; // Start at 0 for attack

		const attackTime = 0.05;
		const decayTime = controls.primaryDecay;
		const lfoDecayTime = controls.lfoDecay;
		const maxDecay = Math.max(decayTime, lfoDecayTime);

		// Apply attack envelope to primary oscillator
		squareGain.gain.setValueAtTime(0, audioContext.currentTime);
		squareGain.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + attackTime);
		
		// Schedule decay after attack
		squareGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + attackTime + decayTime);

		// Apply attack envelope to LFO
		const targetLfoGain = controls.lfoGain;
		lfoGain.gain.setValueAtTime(0, audioContext.currentTime);
		lfoGain.gain.linearRampToValueAtTime(targetLfoGain, audioContext.currentTime + attackTime);
		
		// Schedule LFO decay after attack
		lfoGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + attackTime + lfoDecayTime);

		lfo.connect(lfoGain);
		lfoGain.connect(primaryOsc.frequency);

		primaryOsc.connect(primaryFilter);
		primaryFilter.connect(squareGain);

		squareGain.connect(masterGain);

		primaryOsc.start();
		lfo.start();

		// Schedule automatic stop and cleanup after decay completes
		const decayTimeoutId = window.setTimeout(() => {
			try {
				primaryOsc.stop();
				lfo.stop();
			} catch {
				// Oscillator already stopped
			}
			// Clean up the audio node but keep the square active
			audioNodes[index] = null;
		}, (attackTime + maxDecay) * 1000);

		return {
			primaryOsc,
			lfo,
			lfoGain,
			squareGain,
			decayTimeoutId
		};
	}

	function stopAmbientSound(
		components: {
			primaryOsc: OscillatorNode;
			lfo: OscillatorNode;
			lfoGain: GainNode;
			squareGain: GainNode;
		} | null,
		index: number
	) {
		if (!components || !audioContext) return;

		const decayTime = oscillatorControls[index]?.primaryDecay || 0.5;
		const lfoDecayTime = oscillatorControls[index]?.lfoDecay || 0.5;

		// Apply decay envelope to primary oscillator
		const currentGain = components.squareGain.gain.value;
		components.squareGain.gain.cancelScheduledValues(audioContext.currentTime);
		components.squareGain.gain.setValueAtTime(currentGain, audioContext.currentTime);
		components.squareGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + decayTime);

		// Apply decay envelope to LFO
		const currentLfoGain = components.lfoGain.gain.value;
		components.lfoGain.gain.cancelScheduledValues(audioContext.currentTime);
		components.lfoGain.gain.setValueAtTime(currentLfoGain, audioContext.currentTime);
		components.lfoGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + lfoDecayTime);

		const maxDecay = Math.max(decayTime, lfoDecayTime);
		setTimeout(() => {
			try {
				components.primaryOsc.stop();
				components.lfo.stop();
				// Clean up the audio node reference after stopping
				audioNodes[index] = null;
			} catch {
				// Oscillator already stopped
				audioNodes[index] = null;
			}
		}, maxDecay * 1000);
	}

	async function toggleSquare(index: number) {
		if (!isAudioInitialized) {
			await initAudio();
		}

		const wasActive = activeSquares[index];
		
		// If the square is already active, stop it first
		if (wasActive && audioNodes[index]) {
			// Cancel the auto-decay timeout
			if (audioNodes[index]?.decayTimeoutId) {
				clearTimeout(audioNodes[index]!.decayTimeoutId);
			}
			// Stop immediately
			try {
				audioNodes[index]!.primaryOsc.stop();
				audioNodes[index]!.lfo.stop();
			} catch {
				// Already stopped
			}
			audioNodes[index] = null;
		}

		activeSquares[index] = !activeSquares[index];
		activeSquares = [...activeSquares];

		if (activeSquares[index]) {
			oscillatorControls[index] = { ...defaultOscillatorSettings };
			oscillatorControls = [...oscillatorControls];
			audioNodes[index] = createAmbientSound(index);
		}
	}

	async function handleRightMouseDown(index: number) {
		if (!isAudioInitialized) {
			await initAudio();
		}

		rightClickActive = true;
		rightClickIndex = index;

		// If square is already active with auto-decay, cancel the decay and restart
		if (activeSquares[index] && audioNodes[index]) {
			if (audioNodes[index]?.decayTimeoutId) {
				clearTimeout(audioNodes[index]!.decayTimeoutId);
			}
			try {
				audioNodes[index]!.primaryOsc.stop();
				audioNodes[index]!.lfo.stop();
			} catch {
				// Already stopped
			}
			audioNodes[index] = null;
		}

		if (!activeSquares[index]) {
			activeSquares[index] = true;
			activeSquares = [...activeSquares];
		}
		
		oscillatorControls[index] = { ...defaultOscillatorSettings };
		oscillatorControls = [...oscillatorControls];
		audioNodes[index] = createAmbientSound(index);
	}

	function handleRightMouseUp() {
		if (rightClickActive && rightClickIndex !== null) {
			const index = rightClickIndex;
			if (activeSquares[index]) {
				activeSquares[index] = false;
				activeSquares = [...activeSquares];
				// The sound will naturally decay via the scheduled envelope
			}
		}

		rightClickActive = false;
		rightClickIndex = null;
	}

	function handleMouseLeave() {
		if (rightClickActive && rightClickIndex !== null) {
			handleRightMouseUp();
		}
	}

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
		const evolutionChance = 0.1;

		for (let i = 0; i < TOTAL_SQUARES; i++) {
			if (Math.random() < evolutionChance) {
				const neighbors = getNeighbors(i);
				const activeNeighbors = neighbors.filter((n) => activeSquares[n]).length;

				const activationChance = activeNeighbors / 4;

				if (Math.random() < activationChance) {
					if (!activeSquares[i]) {
						toggleSquare(i);
					}
				} else {
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

		const directions = [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1]
		];

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
		if (isEvolving) {
			stopEvolution();
		}

		audioNodes.forEach((components, i) => {
			if (components) {
				// Clear any pending decay timeouts
				if (components.decayTimeoutId) {
					clearTimeout(components.decayTimeoutId);
				}
				try {
					components.primaryOsc.stop();
					components.lfo.stop();
				} catch {
					// Oscillator already stopped
				}
				audioNodes[i] = null;
			}
		});

		if (audioContext) {
			try {
				audioContext.close();
			} catch {
				// AudioContext already closed
			}
			audioContext = null;
			masterGain = null;
			isAudioInitialized = false;
		}

		activeSquares = Array(TOTAL_SQUARES).fill(false);
	}

	function randomizeGrid() {
		clearGrid();
		for (let i = 0; i < TOTAL_SQUARES; i++) {
			if (Math.random() < 0.25) {
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

	function updateOscillatorControl(index: number, param: string, value: number | OscillatorType) {
		if (!audioContext || !audioNodes[index]) return;

		const newControls = [...oscillatorControls];
		if (param in newControls[index]) {
			(newControls[index] as Record<string, number | OscillatorType>)[param] = value;
		}
		oscillatorControls = newControls;

		const components = audioNodes[index];
		if (!components) return;

		try {
			switch (param) {
				case 'primaryFreq': {
					let baseFreq: number;
					if (isSynchronized && scaleFrequencies.length > 0) {
						const scaleIndex = index % scaleFrequencies.length;
						baseFreq = scaleFrequencies[scaleIndex];
					} else {
						baseFreq = baseFrequencies[index] || 200 + index * 10;
					}
					components.primaryOsc.frequency.setValueAtTime(
						baseFreq * (value as number),
						audioContext!.currentTime
					);
					break;
				}
				case 'primaryWave':
					components.primaryOsc.type = value as OscillatorType;
					break;
				case 'primaryGain':
					components.squareGain.gain.setValueAtTime(0.05 * (value as number), audioContext!.currentTime);
					break;
				case 'primaryDecay':
					// Decay is applied when stopping the sound, not continuously
					break;
				case 'lfoFreq':
					components.lfo.frequency.setValueAtTime(value as number, audioContext!.currentTime);
					break;
				case 'lfoWave':
					components.lfo.type = value as OscillatorType;
					break;
				case 'lfoGain':
					components.lfoGain.gain.setValueAtTime(value as number, audioContext!.currentTime);
					break;
				case 'lfoDecay':
					// Decay is applied when stopping the sound, not continuously
					break;
			}
		} catch {
			// Parameter update failed
		}

		activeSquares = [...activeSquares];
		oscillatorControls = [...oscillatorControls];
	}

	function resetOscillatorControls(index: number) {
		oscillatorControls[index] = {
			primaryFreq: 1.0,
			primaryWave: 'sine',
			primaryGain: 0.7,
			primaryDecay: 0.5,
			lfoFreq: 0.2,
			lfoWave: 'sine',
			lfoGain: 10,
			lfoDecay: 0.5
		};
		oscillatorControls = [...oscillatorControls];
	}

	function updateDefaultSetting(param: string, value: number | OscillatorType) {
		if (param in defaultOscillatorSettings) {
			(defaultOscillatorSettings as Record<string, number | OscillatorType>)[param] = value;
		}
		defaultOscillatorSettings = { ...defaultOscillatorSettings };
	}

	function applyDefaultsToAllActive() {
		if (!audioContext) return;

		activeSquares.forEach((isActive, index) => {
			if (isActive) {
				oscillatorControls[index] = { ...defaultOscillatorSettings };
				updateOscillatorControl(index, 'primaryFreq', defaultOscillatorSettings.primaryFreq);
				updateOscillatorControl(index, 'primaryWave', defaultOscillatorSettings.primaryWave);
				updateOscillatorControl(index, 'primaryGain', defaultOscillatorSettings.primaryGain);
				updateOscillatorControl(index, 'primaryDecay', defaultOscillatorSettings.primaryDecay);
				updateOscillatorControl(index, 'lfoFreq', defaultOscillatorSettings.lfoFreq);
				updateOscillatorControl(index, 'lfoWave', defaultOscillatorSettings.lfoWave);
				updateOscillatorControl(index, 'lfoGain', defaultOscillatorSettings.lfoGain);
				updateOscillatorControl(index, 'lfoDecay', defaultOscillatorSettings.lfoDecay);
			}
		});
		oscillatorControls = [...oscillatorControls];
	}

	function resetDefaultSettings() {
		defaultOscillatorSettings = {
			primaryFreq: 1.0,
			primaryWave: 'sine',
			primaryGain: 0.7,
			primaryDecay: 0.5,
			lfoFreq: 0.2,
			lfoWave: 'sine',
			lfoGain: 10,
			lfoDecay: 0.5
		};
	}

	onDestroy(() => {
		stopEvolution();
		audioNodes.forEach((node) => {
			if (node) {
				// Clear any pending decay timeouts
				if (node.decayTimeoutId) {
					clearTimeout(node.decayTimeoutId);
				}
				try {
					node.primaryOsc.stop();
					node.lfo.stop();
				} catch {
					// Already stopped
				}
			}
		});

		if (audioContext) {
			audioContext.close();
		}

		rightClickActive = false;
		rightClickIndex = null;
	});

	onMount(() => {
		const handleGlobalMouseUp = () => {
			if (rightClickActive) {
				handleRightMouseUp();
			}
		};

		document.addEventListener('mouseup', handleGlobalMouseUp);

		return () => {
			document.removeEventListener('mouseup', handleGlobalMouseUp);
		};
	});

	$: if (isSynchronized && scaleFrequencies.length > 0) {
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
					} catch {
						// Frequency update failed
					}
				}
			});
		}
	}

	$: if (oscillatorControls && activeSquares.some(Boolean)) {
		activeSquares = [...activeSquares];
	}

	$: if (currentSequenceStep >= 0 && isAudioInitialized) {
		// Reset all triggered states
		triggeredSquares = Array(TOTAL_SQUARES).fill(false);
		
		for (let row = 0; row < 8; row++) {
			const index = row * 8 + currentSequenceStep;
			if (activeSquares[index]) {
				// Mark this square as triggered for visual animation
				triggeredSquares[index] = true;
				
				// If there's no active audio node, re-trigger the sound
				if (!audioNodes[index]) {
					audioNodes[index] = createAmbientSound(index);
				} else {
					// If there is an active audio node, boost it momentarily
					const components = audioNodes[index];
					if (components && audioContext) {
						try {
							const currentGain = oscillatorControls[index].primaryGain * 0.05;
							const boostGain = currentGain * 2.0;

							components.squareGain.gain.cancelScheduledValues(audioContext.currentTime);
							components.squareGain.gain.setValueAtTime(boostGain, audioContext.currentTime);
							components.squareGain.gain.exponentialRampToValueAtTime(
								currentGain,
								audioContext.currentTime + 0.08
							);
						} catch {
							// Gain scheduling failed
						}
					}
				}
			}
		}
	}

	function getCurrentChordFrequencies(): number[] {
		if (!isSynchronized || scaleFrequencies.length === 0) return [];

		const chordMap: Record<string, number[]> = {
			I: [0, 2, 4],
			ii: [1, 3, 5],
			iii: [2, 4, 6],
			IV: [3, 5, 0],
			V: [4, 6, 1],
			vi: [5, 0, 2],
			'vii°': [6, 1, 3]
		};

		const chordIndices = chordMap[currentChord] || [0, 2, 4];
		return chordIndices.map((i) => scaleFrequencies[i % scaleFrequencies.length]);
	}

	function frequencyToHue(frequency: number): number {
		const minFreq = 130;
		const maxFreq = 523;
		const normalizedFreq = Math.max(0, Math.min(1, (frequency - minFreq) / (maxFreq - minFreq)));

		const hue = 220 + normalizedFreq * 180;
		return hue;
	}

	function getCurrentFrequency(index: number): number {
		let baseFrequency: number;
		if (isSynchronized && scaleFrequencies.length > 0) {
			const scaleIndex = index % scaleFrequencies.length;
			baseFrequency = scaleFrequencies[scaleIndex];
		} else {
			baseFrequency = baseFrequencies[index] || 200 + index * 10;
		}

		const controls = oscillatorControls[index];
		return baseFrequency * controls.primaryFreq;
	}

	function getSaturation(index: number): number {
		if (!activeSquares[index]) return 0;
		const volume = oscillatorControls[index].primaryGain;
		const saturation = 65 + volume * 30;
		return saturation;
	}

	function getLightness(index: number): number {
		if (!activeSquares[index]) return 0;
		const volume = oscillatorControls[index].primaryGain;
		const lightness = 50 + volume * 15;
		return lightness;
	}

	function getSequencerGlow(index: number): string {
		if (currentSequenceStep < 0) return ''; // No highlighting when sequencer is stopped
		const col = index % 8;
		if (col === currentSequenceStep && activeSquares[index]) {
			return 'ring-4 ring-yellow-300 ring-opacity-90';
		} else if (col === currentSequenceStep) {
			return 'ring-2 ring-yellow-500 ring-opacity-40';
		}
		return '';
	}

	const rowLabels = [
		{ name: 'Root (Tonic)', color: 'text-blue-400' },
		{ name: 'Major 2nd', color: 'text-green-400' },
		{ name: 'Major 3rd', color: 'text-yellow-400' },
		{ name: 'Perfect 4th', color: 'text-orange-400' },
		{ name: 'Perfect 5th', color: 'text-red-400' },
		{ name: 'Major 6th', color: 'text-purple-400' },
		{ name: 'Major 7th', color: 'text-pink-400' },
		{ name: 'Octave', color: 'text-cyan-400' }
	];
</script>

<div class="mx-auto max-w-4xl">
	<div class="mb-4 rounded-xl bg-gray-800 p-6">
		<h3 class="mb-4 text-center text-2xl font-bold text-white">
			Music Grid - Organized by Intervals
		</h3>
		<p class="mb-6 text-center text-gray-400">
			Each row represents a different musical interval. Click to activate, right-click to hold.
		</p>

		<!-- Column step indicators -->
		<div class="mb-2 flex items-center">
			<div class="w-32"></div>
			<div class="grid flex-1 grid-cols-8 gap-2">
				{#each Array(8) as _, colIndex}
					<div
						class="text-center text-xs font-bold transition-all duration-200 {currentSequenceStep >= 0 && colIndex === currentSequenceStep
							? 'text-yellow-300 scale-125'
							: 'text-gray-500'}"
					>
						{colIndex + 1}
					</div>
				{/each}
			</div>
		</div>

		<div class="space-y-4">
			{#each rowLabels as row, rowIndex (rowIndex)}
				<div>
					<div class="mb-2 flex items-center">
						<div class="w-32 text-sm font-semibold {row.color}">{row.name}</div>
						<div class="grid flex-1 grid-cols-8 gap-2">
							{#each Array(8) as _, colIndex}
								{@const index = rowIndex * 8 + colIndex}
								{@const currentFreq = getCurrentFrequency(index)}
								{@const hue = frequencyToHue(currentFreq)}
								{@const saturation = getSaturation(index)}
								{@const lightness = getLightness(index)}
								{@const primaryColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`}
								{@const secondaryColor = `hsl(${(hue + 30) % 360}, ${Math.max(40, saturation - 20)}%, ${Math.max(30, lightness - 10)}%)`}
								{@const glowColor = `hsl(${hue}, ${saturation}%, ${Math.min(70, lightness + 20)}%)`}
								{@const isActiveColumn = currentSequenceStep >= 0 && (index % 8) === currentSequenceStep}
								{@const isTriggered = triggeredSquares[index]}
								<button
									on:click={() => toggleSquare(index)}
									on:mousedown|preventDefault={(e) => {
										if (e.button === 2) {
											handleRightMouseDown(index);
										}
									}}
									on:contextmenu|preventDefault
									on:mouseleave={handleMouseLeave}
									class="aspect-square transform rounded-lg transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-blue-400 focus:outline-none {activeSquares[
										index
									]
										? 'shadow-lg'
										: 'bg-gray-700 hover:bg-gray-600'} {getSequencerGlow(index)} {isTriggered ? 'trigger-pulse' : ''}"
									aria-label="{row.name} {colIndex + 1}"
									style={activeSquares[index]
										? `background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); box-shadow: 0 4px 20px ${glowColor}, 0 0 40px ${glowColor}40${isActiveColumn ? ', 0 0 30px rgba(255, 220, 50, 0.8), 0 0 60px rgba(255, 220, 50, 0.4), inset 0 0 20px rgba(255, 220, 50, 0.6)' : ''};`
										: isActiveColumn
											? 'box-shadow: 0 0 15px rgba(255, 220, 50, 0.5), 0 0 30px rgba(255, 220, 50, 0.25); border: 2px solid rgba(255, 220, 50, 0.4);'
											: ''}
								></button>
							{/each}
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<div class="mx-auto max-w-4xl">
	<div class="mb-6 space-y-4 text-center">
		<div>
			<button
				on:click={() => {
					initAudio();
				}}
				class="mr-4 rounded-lg bg-blue-600 px-8 py-4 text-lg font-medium transition-colors hover:bg-blue-700"
				disabled={isAudioInitialized}
			>
				{isAudioInitialized ? '✓ Audio Ready' : '♫ Enable Audio'}
			</button>
		</div>

		{#if isSynchronized && scaleFrequencies.length > 0}
			<div class="rounded-lg bg-gray-800 p-4">
				<div class="mb-2 flex items-center justify-center gap-2">
					<span class="text-xl">♫</span>
					<span class="text-lg">Synchronized to {selectedKey} {selectedScale}</span>
				</div>
				{#if currentChord}
					<div class="flex flex-wrap items-center justify-center gap-3">
						<span class="text-base text-gray-400">Current Chord:</span>
						<span class="text-lg font-bold text-yellow-400">{currentChord}</span>
						<div class="flex gap-2">
							{#each getCurrentChordFrequencies() as freq}
								<span class="rounded bg-gray-700 px-2 py-1 text-sm">{freq.toFixed(1)}Hz</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex flex-wrap justify-center gap-4">
			<button
				on:click={isEvolving ? stopEvolution : startEvolution}
				class="px-6 py-3 {isEvolving
					? 'bg-red-600 hover:bg-red-700'
					: 'bg-green-600 hover:bg-green-700'} rounded-lg text-lg font-medium transition-colors"
				disabled={!isAudioInitialized}
			>
				{isEvolving ? '⏸ Stop Evolution' : '▶ Start Evolution'}
			</button>

			<button
				on:click={randomizeGrid}
				class="rounded-lg bg-purple-600 px-6 py-3 text-lg font-medium transition-colors hover:bg-purple-700"
				disabled={!isAudioInitialized}
			>
				🎲 Randomize
			</button>

			<button
				on:click={clearGrid}
				class="rounded-lg bg-gray-600 px-6 py-3 text-lg font-medium transition-colors hover:bg-gray-700"
			>
				✖ Clear All
			</button>
		</div>

		<div class="mt-4 flex items-center justify-center gap-4">
			<label class="text-base text-gray-300">Evolution Speed:</label>
			<input
				type="range"
				min="100"
				max="2000"
				step="100"
				value={evolutionSpeed}
				on:input={(e) => updateEvolutionSpeed(parseInt(e.currentTarget.value))}
				class="w-32"
			/>
			<span class="text-base text-gray-400">{evolutionSpeed}ms</span>
		</div>
	</div>

	<div class="mt-6 text-center text-gray-400">
		<p class="mb-2 text-base">Click squares to activate ambient sounds</p>
		<p class="text-sm">Right-click and hold for temporary activation</p>
	</div>

	<div class="mt-4 text-center">
		<div class="inline-flex items-center space-x-4 text-base">
			<div class="flex items-center">
				<div
					class="h-4 w-4 rounded-full {isEvolving
						? 'animate-pulse bg-green-500'
						: 'bg-gray-500'} mr-2"
				></div>
				<span>{isEvolving ? 'Evolving' : 'Static'}</span>
			</div>
			<div class="flex items-center">
				<div
					class="h-4 w-4 rounded-full {isAudioInitialized ? 'bg-blue-500' : 'bg-gray-500'} mr-2"
				></div>
				<span>{isAudioInitialized ? 'Audio Active' : 'Audio Disabled'}</span>
			</div>
			<div class="flex items-center">
				<span class="text-gray-400"
					>Active: {activeSquares.filter(Boolean).length}/{TOTAL_SQUARES}</span
				>
			</div>
		</div>
	</div>

	<div class="mx-auto mt-6 max-w-4xl">
		<div class="rounded-xl border border-gray-700 bg-gray-800 p-6">
			<h3 class="mb-4 text-center text-2xl font-bold text-white">
				Default Settings for New Squares
			</h3>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
				<div class="rounded-lg bg-gray-700 p-4">
					<h4 class="mb-3 text-xl font-semibold text-blue-400">Primary Oscillator</h4>
					<div class="space-y-3">
						<div>
							<label for="default-primary-freq" class="mb-1 block text-sm text-gray-400"
								>Frequency Multiplier</label
							>
							<input
								id="default-primary-freq"
								type="range"
								min="0.25"
								max="2.0"
								step="0.25"
								value={defaultOscillatorSettings.primaryFreq}
								on:input={(e) =>
									updateDefaultSetting('primaryFreq', parseFloat(e.currentTarget.value))}
								class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
							/>
							<span class="text-sm text-gray-500"
								>{defaultOscillatorSettings.primaryFreq.toFixed(2)}x</span
							>
						</div>
						<div>
							<label for="default-primary-wave" class="mb-1 block text-sm text-gray-400"
								>Waveform</label
							>
							<select
								id="default-primary-wave"
								value={defaultOscillatorSettings.primaryWave}
								on:change={(e) => updateDefaultSetting('primaryWave', e.currentTarget.value as OscillatorType)}
								class="w-full rounded border border-gray-500 bg-gray-600 px-2 py-1 text-sm text-white"
							>
								{#each waveTypes as waveType}
									<option value={waveType}>{waveType}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="default-primary-gain" class="mb-1 block text-sm text-gray-400">Gain</label
							>
							<input
								id="default-primary-gain"
								type="range"
								min="0.1"
								max="1.5"
								step="0.1"
								value={defaultOscillatorSettings.primaryGain}
								on:input={(e) =>
									updateDefaultSetting('primaryGain', parseFloat(e.currentTarget.value))}
								class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
							/>
							<span class="text-sm text-gray-500"
								>{defaultOscillatorSettings.primaryGain.toFixed(1)}</span
							>
						</div>
						<div>
							<label for="default-primary-decay" class="mb-1 block text-sm text-gray-400">Decay (s)</label
							>
							<input
								id="default-primary-decay"
								type="range"
								min="0.1"
								max="2.0"
								step="0.1"
								value={defaultOscillatorSettings.primaryDecay}
								on:input={(e) =>
									updateDefaultSetting('primaryDecay', parseFloat(e.currentTarget.value))}
								class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
							/>
							<span class="text-sm text-gray-500"
								>{defaultOscillatorSettings.primaryDecay.toFixed(1)}s</span
							>
						</div>
					</div>
				</div>

				<div class="rounded-lg bg-gray-700 p-4">
					<h4 class="mb-3 text-xl font-semibold text-green-400">LFO (Modulation)</h4>
					<div class="space-y-3">
						<div>
							<label for="default-lfo-freq" class="mb-1 block text-sm text-gray-400"
								>Frequency (Hz)</label
							>
							<input
								id="default-lfo-freq"
								type="range"
								min="0.05"
								max="3.0"
								step="0.05"
								value={defaultOscillatorSettings.lfoFreq}
								on:input={(e) => updateDefaultSetting('lfoFreq', parseFloat(e.currentTarget.value))}
								class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
							/>
							<span class="text-sm text-gray-500"
								>{defaultOscillatorSettings.lfoFreq.toFixed(2)} Hz</span
							>
						</div>
						<div>
							<label for="default-lfo-wave" class="mb-1 block text-sm text-gray-400">Waveform</label
							>
							<select
								id="default-lfo-wave"
								value={defaultOscillatorSettings.lfoWave}
								on:change={(e) => updateDefaultSetting('lfoWave', e.currentTarget.value as OscillatorType)}
								class="w-full rounded border border-gray-500 bg-gray-600 px-2 py-1 text-sm text-white"
							>
								{#each waveTypes as waveType}
									<option value={waveType}>{waveType}</option>
								{/each}
							</select>
						</div>
						<div>
							<label for="default-lfo-gain" class="mb-1 block text-sm text-gray-400"
								>Depth (Amount)</label
							>
							<input
								id="default-lfo-gain"
								type="range"
								min="0"
								max="50"
								step="5"
								value={defaultOscillatorSettings.lfoGain}
								on:input={(e) => updateDefaultSetting('lfoGain', parseFloat(e.currentTarget.value))}
								class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
							/>
							<span class="text-sm text-gray-500">{defaultOscillatorSettings.lfoGain}</span>
						</div>
						<div>
							<label for="default-lfo-decay" class="mb-1 block text-sm text-gray-400">Decay (s)</label
							>
							<input
								id="default-lfo-decay"
								type="range"
								min="0.1"
								max="2.0"
								step="0.1"
								value={defaultOscillatorSettings.lfoDecay}
								on:input={(e) => updateDefaultSetting('lfoDecay', parseFloat(e.currentTarget.value))}
								class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
							/>
							<span class="text-sm text-gray-500"
								>{defaultOscillatorSettings.lfoDecay.toFixed(1)}s</span
							>
						</div>
					</div>
				</div>
			</div>

			<div class="mt-6 flex flex-wrap justify-center gap-4">
				<button
					on:click={applyDefaultsToAllActive}
					class="rounded-lg bg-blue-600 px-6 py-3 text-lg font-medium transition-colors hover:bg-blue-700"
					disabled={!activeSquares.some(Boolean)}
				>
					Apply to All Active
				</button>
				<button
					on:click={resetDefaultSettings}
					class="rounded-lg bg-gray-600 px-6 py-3 text-lg font-medium transition-colors hover:bg-gray-700"
				>
					Reset Defaults
				</button>
			</div>

			<div class="mt-4 text-center text-sm text-gray-400">
				<p>These settings will be applied to newly activated squares</p>
			</div>
		</div>
	</div>

	{#if activeSquares.some(Boolean)}
		<div class="mx-auto mt-8 max-w-6xl rounded-xl border border-gray-700 bg-gray-800 p-6">
			<h3 class="mb-4 text-center text-2xl font-bold text-white">Per-Square Controls</h3>

			<div
				class="grid max-h-96 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
			>
				{#each activeSquares as isActive, index}
					{#if isActive}
						<div class="min-w-64 rounded-lg border border-gray-600 bg-gray-700 p-4">
							<h4 class="mb-3 text-center text-lg font-semibold text-blue-400">
								Square {index + 1}
							</h4>

							<div class="mb-4">
								<h5 class="mb-2 text-sm font-medium text-gray-300">Primary Oscillator</h5>
								<div class="space-y-2">
									<div>
										<label class="mb-1 block text-xs text-gray-400">Frequency</label>
										<input
											type="range"
											min="0.25"
											max="2.0"
											step="0.25"
											value={oscillatorControls[index].primaryFreq}
											on:input={(e) =>
												updateOscillatorControl(
													index,
													'primaryFreq',
													parseFloat(e.currentTarget.value)
												)}
											class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
										/>
										<span class="text-xs text-gray-500"
											>{oscillatorControls[index].primaryFreq.toFixed(2)}x</span
										>
									</div>
									<div>
										<label class="mb-1 block text-xs text-gray-400">Waveform</label>
										<select
											value={oscillatorControls[index].primaryWave}
											on:change={(e) =>
												updateOscillatorControl(index, 'primaryWave', e.currentTarget.value as OscillatorType)}
											class="w-full rounded border border-gray-500 bg-gray-600 px-2 py-1 text-xs text-white"
										>
											{#each waveTypes as waveType}
												<option value={waveType}>{waveType}</option>
											{/each}
										</select>
									</div>
									<div>
										<label class="mb-1 block text-xs text-gray-400">Gain</label>
										<input
											type="range"
											min="0.1"
											max="1.5"
											step="0.1"
											value={oscillatorControls[index].primaryGain}
											on:input={(e) =>
												updateOscillatorControl(
													index,
													'primaryGain',
													parseFloat(e.currentTarget.value)
												)}
											class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
										/>
										<span class="text-xs text-gray-500"
											>{oscillatorControls[index].primaryGain.toFixed(1)}</span
										>
									</div>
									<div>
										<label class="mb-1 block text-xs text-gray-400">Decay (s)</label>
										<input
											type="range"
											min="0.1"
											max="2.0"
											step="0.1"
											value={oscillatorControls[index].primaryDecay}
											on:input={(e) =>
												updateOscillatorControl(
													index,
													'primaryDecay',
													parseFloat(e.currentTarget.value)
												)}
											class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
										/>
										<span class="text-xs text-gray-500"
											>{oscillatorControls[index].primaryDecay.toFixed(1)}s</span
										>
									</div>
								</div>
							</div>

							<div class="mb-4">
								<h5 class="mb-2 text-sm font-medium text-gray-300">LFO</h5>
								<div class="space-y-2">
									<div>
										<label class="mb-1 block text-xs text-gray-400">Frequency</label>
										<input
											type="range"
											min="0.05"
											max="3.0"
											step="0.05"
											value={oscillatorControls[index].lfoFreq}
											on:input={(e) =>
												updateOscillatorControl(
													index,
													'lfoFreq',
													parseFloat(e.currentTarget.value)
												)}
											class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
										/>
										<span class="text-xs text-gray-500"
											>{oscillatorControls[index].lfoFreq.toFixed(2)} Hz</span
										>
									</div>
									<div>
										<label class="mb-1 block text-xs text-gray-400">Waveform</label>
										<select
											value={oscillatorControls[index].lfoWave}
											on:change={(e) =>
												updateOscillatorControl(index, 'lfoWave', e.currentTarget.value as OscillatorType)}
											class="w-full rounded border border-gray-500 bg-gray-600 px-2 py-1 text-xs text-white"
										>
											{#each waveTypes as waveType}
												<option value={waveType}>{waveType}</option>
											{/each}
										</select>
									</div>
									<div>
										<label class="mb-1 block text-xs text-gray-400">Depth</label>
										<input
											type="range"
											min="0"
											max="50"
											step="5"
											value={oscillatorControls[index].lfoGain}
											on:input={(e) =>
												updateOscillatorControl(
													index,
													'lfoGain',
													parseFloat(e.currentTarget.value)
												)}
											class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
										/>
										<span class="text-xs text-gray-500">{oscillatorControls[index].lfoGain}</span>
									</div>
									<div>
										<label class="mb-1 block text-xs text-gray-400">Decay (s)</label>
										<input
											type="range"
											min="0.1"
											max="2.0"
											step="0.1"
											value={oscillatorControls[index].lfoDecay}
											on:input={(e) =>
												updateOscillatorControl(
													index,
													'lfoDecay',
													parseFloat(e.currentTarget.value)
												)}
											class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
										/>
										<span class="text-xs text-gray-500"
											>{oscillatorControls[index].lfoDecay.toFixed(1)}s</span
										>
									</div>
								</div>
							</div>

							<button
								on:click={() => resetOscillatorControls(index)}
								class="w-full rounded bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
							>
								Reset
							</button>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		background: transparent;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-track {
		background: #4b5563;
		height: 8px;
		border-radius: 4px;
	}

	input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		background: #3b82f6;
		height: 16px;
		width: 16px;
		border-radius: 50%;
		cursor: pointer;
	}

	input[type='range']::-webkit-slider-thumb:hover {
		background: #2563eb;
	}

	input[type='range']::-moz-range-track {
		background: #4b5563;
		height: 8px;
		border-radius: 4px;
		border: none;
	}

	input[type='range']::-moz-range-thumb {
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
	}

	select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
	}

	/* Trigger pulse animation for sequencer */
	@keyframes triggerPulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.15);
		}
		100% {
			transform: scale(1);
		}
	}

	.trigger-pulse {
		animation: triggerPulse 0.15s ease-out;
	}
</style>
