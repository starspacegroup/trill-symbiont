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

	// Track which control modules are expanded
	let expandedControls: boolean[] = Array(TOTAL_SQUARES).fill(false);

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
			primaryGain: 1.5,
			primaryDecay: 0.5,
			lfoFreq: 0.2,
			lfoWave: 'sine',
			lfoGain: 0,
			lfoDecay: 0.5
		}));

	let defaultOscillatorSettings = {
		primaryFreq: 1.0,
		primaryWave: 'sawtooth' as OscillatorType,
		primaryGain: 1.5,
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
		masterGain.gain.setValueAtTime(1 * masterVolume, audioContext.currentTime);
	}

	async function initAudio() {
		if (isAudioInitialized) return;

		try {
			const AudioContextClass =
				window.AudioContext ||
				(window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			audioContext = new AudioContextClass();
			masterGain = audioContext.createGain();
			masterGain.gain.value = 2 * masterVolume;
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
		const targetGain = 0.3 * oscillatorControls[index].primaryGain;
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
		const decayTimeoutId = window.setTimeout(
			() => {
				try {
					primaryOsc.stop();
					lfo.stop();
				} catch {
					// Oscillator already stopped
				}
				// Clean up the audio node but keep the square active
				audioNodes[index] = null;
			},
			(attackTime + maxDecay) * 1000
		);

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
		// Always update the control values
		const newControls = [...oscillatorControls];
		if (param in newControls[index]) {
			(newControls[index] as Record<string, number | OscillatorType>)[param] = value;
		}
		oscillatorControls = newControls;

		// If audio is active, also update the live audio parameters
		if (!audioContext || !audioNodes[index]) {
			return;
		}

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
					components.squareGain.gain.setValueAtTime(
						0.05 * (value as number),
						audioContext!.currentTime
					);
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
			primaryWave: 'sawtooth',
			primaryGain: 1.5,
			primaryDecay: 0.5,
			lfoFreq: 0.2,
			lfoWave: 'sine',
			lfoGain: 0,
			lfoDecay: 0.5
		};
	}

	// Toggle expanded state for control modules
	function toggleControlExpanded(index: number) {
		expandedControls[index] = !expandedControls[index];
		expandedControls = [...expandedControls];
	}

	// Knob control functions
	let knobDragState: {
		active: boolean;
		index: number;
		param: string;
		min: number;
		max: number;
		startY: number;
		startX: number;
		startValue: number;
	} | null = null;

	function getKnobAngle(value: number, min: number, max: number): number {
		const normalized = (value - min) / (max - min);
		// Map 0-1 to -135° to +135° (270° range)
		const angle = -135 + normalized * 270;
		return (angle * Math.PI) / 180; // Convert to radians
	}

	function getKnobArc(value: number, min: number, max: number): string {
		const normalized = (value - min) / (max - min);
		const angle = -135 + normalized * 270;

		const startAngle = -135;
		const endAngle = angle;

		const startRad = (startAngle * Math.PI) / 180;
		const endRad = (endAngle * Math.PI) / 180;

		const startX = 50 + 40 * Math.cos(startRad);
		const startY = 50 + 40 * Math.sin(startRad);
		const endX = 50 + 40 * Math.cos(endRad);
		const endY = 50 + 40 * Math.sin(endRad);

		const largeArc = endAngle - startAngle > 180 ? 1 : 0;

		return `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`;
	}

	function startKnobDrag(
		event: MouseEvent,
		index: number,
		param: string,
		min: number,
		max: number
	) {
		event.preventDefault();
		event.stopPropagation();

		const currentValue = oscillatorControls[index][
			param as keyof (typeof oscillatorControls)[number]
		] as number;

		console.log('Starting knob drag:', {
			index,
			param,
			currentValue,
			startX: event.clientX,
			startY: event.clientY
		});

		knobDragState = {
			active: true,
			index,
			param,
			min,
			max,
			startY: event.clientY,
			startX: event.clientX,
			startValue: currentValue
		};

		const handleMouseMove = (e: MouseEvent) => {
			if (!knobDragState) return;

			// Calculate deltas for both vertical and horizontal movement
			const deltaY = knobDragState.startY - e.clientY;
			const deltaX = e.clientX - knobDragState.startX;

			// Combine both movements - use whichever has greater magnitude
			const combinedDelta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;

			const range = knobDragState.max - knobDragState.min;
			const sensitivity = range / 200; // 200 pixels = full range
			const newValue = Math.max(
				knobDragState.min,
				Math.min(knobDragState.max, knobDragState.startValue + combinedDelta * sensitivity)
			);

			console.log('Mouse move:', { deltaY, deltaX, combinedDelta, newValue });

			updateOscillatorControl(knobDragState.index, knobDragState.param, newValue);
		};

		const handleMouseUp = () => {
			console.log('Mouse up - ending drag');
			knobDragState = null;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	// Knob drag state for default settings
	let defaultKnobDragState: {
		active: boolean;
		param: string;
		min: number;
		max: number;
		startY: number;
		startX: number;
		startValue: number;
	} | null = null;

	function startDefaultKnobDrag(event: MouseEvent, param: string, min: number, max: number) {
		event.preventDefault();
		event.stopPropagation();

		const currentValue = defaultOscillatorSettings[
			param as keyof typeof defaultOscillatorSettings
		] as number;

		defaultKnobDragState = {
			active: true,
			param,
			min,
			max,
			startY: event.clientY,
			startX: event.clientX,
			startValue: currentValue
		};

		const handleMouseMove = (e: MouseEvent) => {
			if (!defaultKnobDragState) return;

			// Calculate deltas for both vertical and horizontal movement
			const deltaY = defaultKnobDragState.startY - e.clientY;
			const deltaX = e.clientX - defaultKnobDragState.startX;

			// Combine both movements - use whichever has greater magnitude
			const combinedDelta = Math.abs(deltaY) > Math.abs(deltaX) ? deltaY : deltaX;

			const range = defaultKnobDragState.max - defaultKnobDragState.min;
			const sensitivity = range / 200; // 200 pixels = full range
			const newValue = Math.max(
				defaultKnobDragState.min,
				Math.min(
					defaultKnobDragState.max,
					defaultKnobDragState.startValue + combinedDelta * sensitivity
				)
			);

			updateDefaultSetting(defaultKnobDragState.param, newValue);
		};

		const handleMouseUp = () => {
			defaultKnobDragState = null;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
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
						class="text-center text-xs font-bold transition-all duration-200 {currentSequenceStep >=
							0 && colIndex === currentSequenceStep
							? 'scale-125 text-yellow-300'
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
								{@const isActiveColumn =
									currentSequenceStep >= 0 && index % 8 === currentSequenceStep}
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
										: 'bg-gray-700 hover:bg-gray-600'} {getSequencerGlow(index)} {isTriggered
										? 'trigger-pulse'
										: ''}"
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
			<label for="evolution-speed" class="text-base text-gray-300">Evolution Speed:</label>
			<input
				id="evolution-speed"
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
					<div class="grid grid-cols-2 gap-4">
						<div class="flex flex-col items-center">
							<span class="mb-1 text-sm text-gray-400">Frequency</span>
							<div
								class="knob-container-default"
								role="slider"
								aria-label="Default Primary Frequency"
								aria-valuemin="0.25"
								aria-valuemax="2.0"
								aria-valuenow={defaultOscillatorSettings.primaryFreq}
								tabindex="0"
								on:mousedown={(e) => startDefaultKnobDrag(e, 'primaryFreq', 0.25, 2.0)}
							>
								<svg class="knob" viewBox="0 0 100 100">
									<circle cx="50" cy="50" r="40" class="knob-track" />
									<path
										d={getKnobArc(defaultOscillatorSettings.primaryFreq, 0.25, 2.0)}
										class="knob-fill"
									/>
									<line
										x1="50"
										y1="50"
										x2={50 +
											35 * Math.cos(getKnobAngle(defaultOscillatorSettings.primaryFreq, 0.25, 2.0))}
										y2={50 +
											35 * Math.sin(getKnobAngle(defaultOscillatorSettings.primaryFreq, 0.25, 2.0))}
										class="knob-pointer"
									/>
								</svg>
							</div>
							<span class="text-sm text-gray-500"
								>{defaultOscillatorSettings.primaryFreq.toFixed(2)}x</span
							>
						</div>
						<div class="flex flex-col items-center">
							<span class="mb-1 text-sm text-gray-400">Gain</span>
							<div
								class="knob-container-default"
								role="slider"
								aria-label="Default Primary Gain"
								aria-valuemin="0.1"
								aria-valuemax="1.5"
								aria-valuenow={defaultOscillatorSettings.primaryGain}
								tabindex="0"
								on:mousedown={(e) => startDefaultKnobDrag(e, 'primaryGain', 0.1, 1.5)}
							>
								<svg class="knob" viewBox="0 0 100 100">
									<circle cx="50" cy="50" r="40" class="knob-track" />
									<path
										d={getKnobArc(defaultOscillatorSettings.primaryGain, 0.1, 1.5)}
										class="knob-fill"
									/>
									<line
										x1="50"
										y1="50"
										x2={50 +
											35 * Math.cos(getKnobAngle(defaultOscillatorSettings.primaryGain, 0.1, 1.5))}
										y2={50 +
											35 * Math.sin(getKnobAngle(defaultOscillatorSettings.primaryGain, 0.1, 1.5))}
										class="knob-pointer"
									/>
								</svg>
							</div>
							<span class="text-sm text-gray-500"
								>{defaultOscillatorSettings.primaryGain.toFixed(1)}</span
							>
						</div>
						<div class="flex flex-col items-center">
							<label for="default-primary-wave" class="mb-1 text-sm text-gray-400">Waveform</label>
							<select
								id="default-primary-wave"
								value={defaultOscillatorSettings.primaryWave}
								on:change={(e) =>
									updateDefaultSetting('primaryWave', e.currentTarget.value as OscillatorType)}
								class="w-full rounded border border-gray-500 bg-gray-600 px-2 py-1 text-sm text-white"
							>
								{#each waveTypes as waveType}
									<option value={waveType}>{waveType}</option>
								{/each}
							</select>
						</div>
						<div class="flex flex-col items-center">
							<span class="mb-1 text-sm text-gray-400">Decay</span>
							<div
								class="knob-container-default"
								role="slider"
								aria-label="Default Primary Decay"
								aria-valuemin="0.1"
								aria-valuemax="2.0"
								aria-valuenow={defaultOscillatorSettings.primaryDecay}
								tabindex="0"
								on:mousedown={(e) => startDefaultKnobDrag(e, 'primaryDecay', 0.1, 2.0)}
							>
								<svg class="knob" viewBox="0 0 100 100">
									<circle cx="50" cy="50" r="40" class="knob-track" />
									<path
										d={getKnobArc(defaultOscillatorSettings.primaryDecay, 0.1, 2.0)}
										class="knob-fill"
									/>
									<line
										x1="50"
										y1="50"
										x2={50 +
											35 * Math.cos(getKnobAngle(defaultOscillatorSettings.primaryDecay, 0.1, 2.0))}
										y2={50 +
											35 * Math.sin(getKnobAngle(defaultOscillatorSettings.primaryDecay, 0.1, 2.0))}
										class="knob-pointer"
									/>
								</svg>
							</div>
							<span class="text-sm text-gray-500"
								>{defaultOscillatorSettings.primaryDecay.toFixed(1)}s</span
							>
						</div>
					</div>
				</div>

				<div class="rounded-lg bg-gray-700 p-4">
					<h4 class="mb-3 text-xl font-semibold text-green-400">LFO (Modulation)</h4>
					<div class="grid grid-cols-2 gap-4">
						<div class="flex flex-col items-center">
							<span class="mb-1 text-sm text-gray-400">Frequency</span>
							<div
								class="knob-container-default"
								role="slider"
								aria-label="Default LFO Frequency"
								aria-valuemin="0.05"
								aria-valuemax="3.0"
								aria-valuenow={defaultOscillatorSettings.lfoFreq}
								tabindex="0"
								on:mousedown={(e) => startDefaultKnobDrag(e, 'lfoFreq', 0.05, 3.0)}
							>
								<svg class="knob" viewBox="0 0 100 100">
									<circle cx="50" cy="50" r="40" class="knob-track" />
									<path
										d={getKnobArc(defaultOscillatorSettings.lfoFreq, 0.05, 3.0)}
										class="knob-fill"
									/>
									<line
										x1="50"
										y1="50"
										x2={50 +
											35 * Math.cos(getKnobAngle(defaultOscillatorSettings.lfoFreq, 0.05, 3.0))}
										y2={50 +
											35 * Math.sin(getKnobAngle(defaultOscillatorSettings.lfoFreq, 0.05, 3.0))}
										class="knob-pointer"
									/>
								</svg>
							</div>
							<span class="text-sm text-gray-500"
								>{defaultOscillatorSettings.lfoFreq.toFixed(2)} Hz</span
							>
						</div>
						<div class="flex flex-col items-center">
							<span class="mb-1 text-sm text-gray-400">Depth</span>
							<div
								class="knob-container-default"
								role="slider"
								aria-label="Default LFO Depth"
								aria-valuemin="0"
								aria-valuemax="50"
								aria-valuenow={defaultOscillatorSettings.lfoGain}
								tabindex="0"
								on:mousedown={(e) => startDefaultKnobDrag(e, 'lfoGain', 0, 50)}
							>
								<svg class="knob" viewBox="0 0 100 100">
									<circle cx="50" cy="50" r="40" class="knob-track" />
									<path
										d={getKnobArc(defaultOscillatorSettings.lfoGain, 0, 50)}
										class="knob-fill"
									/>
									<line
										x1="50"
										y1="50"
										x2={50 + 35 * Math.cos(getKnobAngle(defaultOscillatorSettings.lfoGain, 0, 50))}
										y2={50 + 35 * Math.sin(getKnobAngle(defaultOscillatorSettings.lfoGain, 0, 50))}
										class="knob-pointer"
									/>
								</svg>
							</div>
							<span class="text-sm text-gray-500"
								>{defaultOscillatorSettings.lfoGain.toFixed(0)}</span
							>
						</div>
						<div class="flex flex-col items-center">
							<label for="default-lfo-wave" class="mb-1 text-sm text-gray-400">Waveform</label>
							<select
								id="default-lfo-wave"
								value={defaultOscillatorSettings.lfoWave}
								on:change={(e) =>
									updateDefaultSetting('lfoWave', e.currentTarget.value as OscillatorType)}
								class="w-full rounded border border-gray-500 bg-gray-600 px-2 py-1 text-sm text-white"
							>
								{#each waveTypes as waveType}
									<option value={waveType}>{waveType}</option>
								{/each}
							</select>
						</div>
						<div class="flex flex-col items-center">
							<span class="mb-1 text-sm text-gray-400">Decay</span>
							<div
								class="knob-container-default"
								role="slider"
								aria-label="Default LFO Decay"
								aria-valuemin="0.1"
								aria-valuemax="2.0"
								aria-valuenow={defaultOscillatorSettings.lfoDecay}
								tabindex="0"
								on:mousedown={(e) => startDefaultKnobDrag(e, 'lfoDecay', 0.1, 2.0)}
							>
								<svg class="knob" viewBox="0 0 100 100">
									<circle cx="50" cy="50" r="40" class="knob-track" />
									<path
										d={getKnobArc(defaultOscillatorSettings.lfoDecay, 0.1, 2.0)}
										class="knob-fill"
									/>
									<line
										x1="50"
										y1="50"
										x2={50 +
											35 * Math.cos(getKnobAngle(defaultOscillatorSettings.lfoDecay, 0.1, 2.0))}
										y2={50 +
											35 * Math.sin(getKnobAngle(defaultOscillatorSettings.lfoDecay, 0.1, 2.0))}
										class="knob-pointer"
									/>
								</svg>
							</div>
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
		<div class="mx-auto mt-8 max-w-6xl rounded-xl border border-gray-700 bg-gray-800 p-4">
			<h3 class="mb-3 text-center text-lg font-bold text-white">Per-Square Controls</h3>

			<div class="control-grid grid gap-3">
				{#each activeSquares as isActive, index}
					{#if isActive}
						<div
							class="control-module rounded-lg border border-gray-600 bg-gray-700 transition-all duration-300"
							class:expanded={expandedControls[index]}
						>
							<!-- Header with toggle button -->
							<div class="mb-2 flex items-center justify-between">
								<h4 class="flex-1 text-center text-sm font-semibold text-blue-400">
									Sq {index + 1}
								</h4>
								<button
									on:click={() => toggleControlExpanded(index)}
									class="rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-gray-600"
									aria-label={expandedControls[index] ? 'Collapse' : 'Expand'}
								>
									{expandedControls[index] ? '▼' : '▶'}
								</button>
							</div>

							<!-- Collapsed view: Primary controls only in square layout -->
							{#if !expandedControls[index]}
								<div class="grid grid-cols-2 gap-2">
									<div class="flex flex-col items-center">
										<span class="mb-1 text-xs text-gray-400">Freq</span>
										<div
											class="knob-container-small"
											role="slider"
											aria-label="Primary Frequency"
											aria-valuemin="0.25"
											aria-valuemax="2.0"
											aria-valuenow={oscillatorControls[index].primaryFreq}
											tabindex="0"
											on:mousedown={(e) => startKnobDrag(e, index, 'primaryFreq', 0.25, 2.0)}
										>
											<svg class="knob" viewBox="0 0 100 100">
												<circle cx="50" cy="50" r="40" class="knob-track" />
												<path
													d={getKnobArc(oscillatorControls[index].primaryFreq, 0.25, 2.0)}
													class="knob-fill"
												/>
												<line
													x1="50"
													y1="50"
													x2={50 +
														35 *
															Math.cos(
																getKnobAngle(oscillatorControls[index].primaryFreq, 0.25, 2.0)
															)}
													y2={50 +
														35 *
															Math.sin(
																getKnobAngle(oscillatorControls[index].primaryFreq, 0.25, 2.0)
															)}
													class="knob-pointer"
												/>
											</svg>
										</div>
										<span class="text-xs text-gray-500"
											>{oscillatorControls[index].primaryFreq.toFixed(2)}</span
										>
									</div>
									<div class="flex flex-col items-center">
										<span class="mb-1 text-xs text-gray-400">Gain</span>
										<div
											class="knob-container-small"
											role="slider"
											aria-label="Primary Gain"
											aria-valuemin="0.1"
											aria-valuemax="1.5"
											aria-valuenow={oscillatorControls[index].primaryGain}
											tabindex="0"
											on:mousedown={(e) => startKnobDrag(e, index, 'primaryGain', 0.1, 1.5)}
										>
											<svg class="knob" viewBox="0 0 100 100">
												<circle cx="50" cy="50" r="40" class="knob-track" />
												<path
													d={getKnobArc(oscillatorControls[index].primaryGain, 0.1, 1.5)}
													class="knob-fill"
												/>
												<line
													x1="50"
													y1="50"
													x2={50 +
														35 *
															Math.cos(
																getKnobAngle(oscillatorControls[index].primaryGain, 0.1, 1.5)
															)}
													y2={50 +
														35 *
															Math.sin(
																getKnobAngle(oscillatorControls[index].primaryGain, 0.1, 1.5)
															)}
													class="knob-pointer"
												/>
											</svg>
										</div>
										<span class="text-xs text-gray-500"
											>{oscillatorControls[index].primaryGain.toFixed(1)}</span
										>
									</div>
								</div>
							{/if}

							<!-- Expanded view: All controls -->
							{#if expandedControls[index]}
								<div class="mb-3">
									<h5 class="mb-2 text-center text-xs font-medium text-gray-300">Primary</h5>
									<div class="grid grid-cols-2 gap-2">
										<div class="flex flex-col items-center">
											<span class="mb-1 text-xs text-gray-400">Freq</span>
											<div
												class="knob-container"
												role="slider"
												aria-label="Primary Frequency"
												aria-valuemin="0.25"
												aria-valuemax="2.0"
												aria-valuenow={oscillatorControls[index].primaryFreq}
												tabindex="0"
												on:mousedown={(e) => startKnobDrag(e, index, 'primaryFreq', 0.25, 2.0)}
											>
												<svg class="knob" viewBox="0 0 100 100">
													<circle cx="50" cy="50" r="40" class="knob-track" />
													<path
														d={getKnobArc(oscillatorControls[index].primaryFreq, 0.25, 2.0)}
														class="knob-fill"
													/>
													<line
														x1="50"
														y1="50"
														x2={50 +
															35 *
																Math.cos(
																	getKnobAngle(oscillatorControls[index].primaryFreq, 0.25, 2.0)
																)}
														y2={50 +
															35 *
																Math.sin(
																	getKnobAngle(oscillatorControls[index].primaryFreq, 0.25, 2.0)
																)}
														class="knob-pointer"
													/>
												</svg>
											</div>
											<span class="text-xs text-gray-500"
												>{oscillatorControls[index].primaryFreq.toFixed(2)}</span
											>
										</div>
										<div class="flex flex-col items-center">
											<span class="mb-1 text-xs text-gray-400">Gain</span>
											<div
												class="knob-container"
												role="slider"
												aria-label="Primary Gain"
												aria-valuemin="0.1"
												aria-valuemax="1.5"
												aria-valuenow={oscillatorControls[index].primaryGain}
												tabindex="0"
												on:mousedown={(e) => startKnobDrag(e, index, 'primaryGain', 0.1, 1.5)}
											>
												<svg class="knob" viewBox="0 0 100 100">
													<circle cx="50" cy="50" r="40" class="knob-track" />
													<path
														d={getKnobArc(oscillatorControls[index].primaryGain, 0.1, 1.5)}
														class="knob-fill"
													/>
													<line
														x1="50"
														y1="50"
														x2={50 +
															35 *
																Math.cos(
																	getKnobAngle(oscillatorControls[index].primaryGain, 0.1, 1.5)
																)}
														y2={50 +
															35 *
																Math.sin(
																	getKnobAngle(oscillatorControls[index].primaryGain, 0.1, 1.5)
																)}
														class="knob-pointer"
													/>
												</svg>
											</div>
											<span class="text-xs text-gray-500"
												>{oscillatorControls[index].primaryGain.toFixed(1)}</span
											>
										</div>
										<div class="flex flex-col items-center">
											<label for="primary-wave-{index}" class="mb-1 text-xs text-gray-400"
												>Wave</label
											>
											<select
												id="primary-wave-{index}"
												value={oscillatorControls[index].primaryWave}
												on:change={(e) =>
													updateOscillatorControl(
														index,
														'primaryWave',
														e.currentTarget.value as OscillatorType
													)}
												class="w-full rounded border border-gray-500 bg-gray-600 px-1 py-0.5 text-xs text-white"
											>
												{#each waveTypes as waveType}
													<option value={waveType}>{waveType.substring(0, 3)}</option>
												{/each}
											</select>
										</div>
										<div class="flex flex-col items-center">
											<span class="mb-1 text-xs text-gray-400">Decay</span>
											<div
												class="knob-container"
												role="slider"
												aria-label="Primary Decay"
												aria-valuemin="0.1"
												aria-valuemax="2.0"
												aria-valuenow={oscillatorControls[index].primaryDecay}
												tabindex="0"
												on:mousedown={(e) => startKnobDrag(e, index, 'primaryDecay', 0.1, 2.0)}
											>
												<svg class="knob" viewBox="0 0 100 100">
													<circle cx="50" cy="50" r="40" class="knob-track" />
													<path
														d={getKnobArc(oscillatorControls[index].primaryDecay, 0.1, 2.0)}
														class="knob-fill"
													/>
													<line
														x1="50"
														y1="50"
														x2={50 +
															35 *
																Math.cos(
																	getKnobAngle(oscillatorControls[index].primaryDecay, 0.1, 2.0)
																)}
														y2={50 +
															35 *
																Math.sin(
																	getKnobAngle(oscillatorControls[index].primaryDecay, 0.1, 2.0)
																)}
														class="knob-pointer"
													/>
												</svg>
											</div>
											<span class="text-xs text-gray-500"
												>{oscillatorControls[index].primaryDecay.toFixed(1)}</span
											>
										</div>
									</div>
								</div>

								<div class="mb-2">
									<h5 class="mb-2 text-center text-xs font-medium text-gray-300">LFO</h5>
									<div class="grid grid-cols-2 gap-2">
										<div class="flex flex-col items-center">
											<span class="mb-1 text-xs text-gray-400">Freq</span>
											<div
												class="knob-container"
												role="slider"
												aria-label="LFO Frequency"
												aria-valuemin="0.05"
												aria-valuemax="3.0"
												aria-valuenow={oscillatorControls[index].lfoFreq}
												tabindex="0"
												on:mousedown={(e) => startKnobDrag(e, index, 'lfoFreq', 0.05, 3.0)}
											>
												<svg class="knob" viewBox="0 0 100 100">
													<circle cx="50" cy="50" r="40" class="knob-track" />
													<path
														d={getKnobArc(oscillatorControls[index].lfoFreq, 0.05, 3.0)}
														class="knob-fill"
													/>
													<line
														x1="50"
														y1="50"
														x2={50 +
															35 *
																Math.cos(
																	getKnobAngle(oscillatorControls[index].lfoFreq, 0.05, 3.0)
																)}
														y2={50 +
															35 *
																Math.sin(
																	getKnobAngle(oscillatorControls[index].lfoFreq, 0.05, 3.0)
																)}
														class="knob-pointer"
													/>
												</svg>
											</div>
											<span class="text-xs text-gray-500"
												>{oscillatorControls[index].lfoFreq.toFixed(2)}</span
											>
										</div>
										<div class="flex flex-col items-center">
											<span class="mb-1 text-xs text-gray-400">Depth</span>
											<div
												class="knob-container"
												role="slider"
												aria-label="LFO Depth"
												aria-valuemin="0"
												aria-valuemax="50"
												aria-valuenow={oscillatorControls[index].lfoGain}
												tabindex="0"
												on:mousedown={(e) => startKnobDrag(e, index, 'lfoGain', 0, 50)}
											>
												<svg class="knob" viewBox="0 0 100 100">
													<circle cx="50" cy="50" r="40" class="knob-track" />
													<path
														d={getKnobArc(oscillatorControls[index].lfoGain, 0, 50)}
														class="knob-fill"
													/>
													<line
														x1="50"
														y1="50"
														x2={50 +
															35 * Math.cos(getKnobAngle(oscillatorControls[index].lfoGain, 0, 50))}
														y2={50 +
															35 * Math.sin(getKnobAngle(oscillatorControls[index].lfoGain, 0, 50))}
														class="knob-pointer"
													/>
												</svg>
											</div>
											<span class="text-xs text-gray-500"
												>{oscillatorControls[index].lfoGain.toFixed(0)}</span
											>
										</div>
										<div class="flex flex-col items-center">
											<label for="lfo-wave-{index}" class="mb-1 text-xs text-gray-400">Wave</label>
											<select
												id="lfo-wave-{index}"
												value={oscillatorControls[index].lfoWave}
												on:change={(e) =>
													updateOscillatorControl(
														index,
														'lfoWave',
														e.currentTarget.value as OscillatorType
													)}
												class="w-full rounded border border-gray-500 bg-gray-600 px-1 py-0.5 text-xs text-white"
											>
												{#each waveTypes as waveType}
													<option value={waveType}>{waveType.substring(0, 3)}</option>
												{/each}
											</select>
										</div>
										<div class="flex flex-col items-center">
											<span class="mb-1 text-xs text-gray-400">Decay</span>
											<div
												class="knob-container"
												role="slider"
												aria-label="LFO Decay"
												aria-valuemin="0.1"
												aria-valuemax="2.0"
												aria-valuenow={oscillatorControls[index].lfoDecay}
												tabindex="0"
												on:mousedown={(e) => startKnobDrag(e, index, 'lfoDecay', 0.1, 2.0)}
											>
												<svg class="knob" viewBox="0 0 100 100">
													<circle cx="50" cy="50" r="40" class="knob-track" />
													<path
														d={getKnobArc(oscillatorControls[index].lfoDecay, 0.1, 2.0)}
														class="knob-fill"
													/>
													<line
														x1="50"
														y1="50"
														x2={50 +
															35 *
																Math.cos(
																	getKnobAngle(oscillatorControls[index].lfoDecay, 0.1, 2.0)
																)}
														y2={50 +
															35 *
																Math.sin(
																	getKnobAngle(oscillatorControls[index].lfoDecay, 0.1, 2.0)
																)}
														class="knob-pointer"
													/>
												</svg>
											</div>
											<span class="text-xs text-gray-500"
												>{oscillatorControls[index].lfoDecay.toFixed(1)}</span
											>
										</div>
									</div>
								</div>

								<button
									on:click={() => resetOscillatorControls(index)}
									class="w-full rounded bg-red-600 px-2 py-1 text-xs text-white transition-colors hover:bg-red-700"
								>
									Reset
								</button>
							{/if}
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

	/* Knob styles */
	.knob-container {
		width: 48px;
		height: 48px;
		cursor: pointer;
		user-select: none;
		outline: none;
	}

	.knob-container-small {
		width: 60px;
		height: 60px;
		cursor: pointer;
		user-select: none;
		outline: none;
	}

	.knob-container-default {
		width: 72px;
		height: 72px;
		cursor: pointer;
		user-select: none;
		outline: none;
	}

	.knob-container:focus,
	.knob-container-small:focus,
	.knob-container-default:focus {
		outline: 2px solid #3b82f6;
		outline-offset: 2px;
		border-radius: 50%;
	}

	.knob {
		width: 100%;
		height: 100%;
	}

	.knob-track {
		fill: none;
		stroke: #4b5563;
		stroke-width: 8;
	}

	.knob-fill {
		fill: rgba(59, 130, 246, 0.3);
		stroke: #3b82f6;
		stroke-width: 8;
		stroke-linecap: round;
	}

	.knob-pointer {
		stroke: #fff;
		stroke-width: 3;
		stroke-linecap: round;
	}

	.knob-container:hover .knob-fill,
	.knob-container-small:hover .knob-fill,
	.knob-container-default:hover .knob-fill {
		fill: rgba(37, 99, 235, 0.4);
		stroke: #2563eb;
	}

	.knob-container:hover .knob-pointer,
	.knob-container-small:hover .knob-pointer,
	.knob-container-default:hover .knob-pointer {
		stroke: #fbbf24;
	}

	/* Control grid layout */
	.control-grid {
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	}

	/* Control module styles */
	.control-module {
		padding: 0.5rem;
		min-height: 180px;
		display: flex;
		flex-direction: column;
	}

	.control-module.expanded {
		grid-column: span 1;
		grid-row: span 2;
		min-height: 380px;
		padding: 0.75rem;
	}

	@media (min-width: 768px) {
		.control-grid {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		}
	}

	@media (min-width: 1024px) {
		.control-grid {
			grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		}
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
