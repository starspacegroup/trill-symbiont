<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	// Props
	export let tempo = 120; // BPM from parent
	export let siteIsPlaying = false; // Site playback state
	export let steps = 16; // Number of steps in the sequence

	// Local tempo state
	let isTiedToSiteTempo = true;
	let localTempo = tempo;

	// Playback sync state
	let isTiedToSitePlayback = true;

	// Reactive statement to sync local tempo when tied
	$: if (isTiedToSiteTempo) {
		localTempo = tempo;
	}

	// Reactive statement to sync playback when tied
	$: if (isTiedToSitePlayback) {
		if (siteIsPlaying && !isPlaying) {
			play();
		} else if (!siteIsPlaying && isPlaying) {
			stop();
		}
	}

	// Use the appropriate tempo
	$: effectiveTempo = isTiedToSiteTempo ? tempo : localTempo;

	// Drum samples (we'll use Web Audio API oscillators for simplicity)
	const drums = [
		{ name: 'Kick', frequency: 60 },
		{ name: 'Snare', frequency: 200 },
		{ name: 'Hi-Hat', frequency: 800 },
		{ name: 'Clap', frequency: 400 }
	];

	// Sequence state (each drum has an array of active steps)
	let sequence: boolean[][] = drums.map(() => Array(steps).fill(false));
	
	// Mute state for each drum
	let drumMutes: boolean[] = drums.map(() => false);
	let masterMute = false;
	
	// Playback state
	let isPlaying = false;
	let currentStep = -1;
	let audioContext: AudioContext | null = null;
	let intervalId: number | null = null;

	// Drag state for toggling steps
	let isDragging = false;
	let dragState: boolean | null = null; // true = setting, false = clearing
	let dragDrumIndex: number | null = null; // which drum row we're dragging in

	onMount(() => {
		// Initialize audio context
		audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
	});

	onDestroy(() => {
		stop();
		if (audioContext) {
			audioContext.close();
		}
	});

	function handleStepClick(drumIndex: number, stepIndex: number, event: MouseEvent) {
		event.preventDefault();
		// Left click enables
		if (event.button === 0) {
			sequence[drumIndex][stepIndex] = true;
		}
		// Right click disables
		else if (event.button === 2) {
			sequence[drumIndex][stepIndex] = false;
		}
		sequence = sequence;
	}

	function handleStepMouseDown(drumIndex: number, stepIndex: number, event: MouseEvent) {
		event.preventDefault();
		isDragging = true;
		dragDrumIndex = drumIndex;
		
		// Left click/drag enables, right click/drag disables
		if (event.button === 0) {
			dragState = true;
		} else if (event.button === 2) {
			dragState = false;
		}
		
		// Apply to the initial step
		if (dragState !== null) {
			sequence[drumIndex][stepIndex] = dragState;
			sequence = sequence;
		}
	}

	function handleStepMouseEnter(drumIndex: number, stepIndex: number) {
		if (isDragging && dragDrumIndex === drumIndex && dragState !== null) {
			// Apply the drag state to this step
			sequence[drumIndex][stepIndex] = dragState;
			sequence = sequence;
		}
	}

	function handleMouseUp() {
		isDragging = false;
		dragState = null;
		dragDrumIndex = null;
	}

	function handleContextMenu(event: MouseEvent) {
		event.preventDefault();
	}

	function fillPattern(drumIndex: number, interval: number) {
		for (let i = 0; i < steps; i++) {
			sequence[drumIndex][i] = (i % interval === 0);
		}
		sequence = sequence;
	}

	function playDrum(drumIndex: number) {
		if (!audioContext) return;

		const drum = drums[drumIndex];
		const now = audioContext.currentTime;
		
		// Create oscillator for the drum sound
		const osc = audioContext.createOscillator();
		const gain = audioContext.createGain();
		
		osc.connect(gain);
		gain.connect(audioContext.destination);
		
		if (drumIndex === 0) {
			// Kick: Low frequency with quick pitch drop
			osc.type = 'sine';
			osc.frequency.setValueAtTime(150, now);
			osc.frequency.exponentialRampToValueAtTime(drum.frequency, now + 0.05);
			gain.gain.setValueAtTime(1, now);
			gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
		} else if (drumIndex === 1) {
			// Snare: Noise-like with envelope
			osc.type = 'triangle';
			osc.frequency.setValueAtTime(drum.frequency, now);
			gain.gain.setValueAtTime(0.5, now);
			gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
		} else if (drumIndex === 2) {
			// Hi-hat: High frequency, short
			osc.type = 'square';
			osc.frequency.setValueAtTime(drum.frequency, now);
			gain.gain.setValueAtTime(0.3, now);
			gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
		} else {
			// Clap: Mid frequency
			osc.type = 'sawtooth';
			osc.frequency.setValueAtTime(drum.frequency, now);
			gain.gain.setValueAtTime(0.4, now);
			gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
		}
		
		osc.start(now);
		osc.stop(now + 0.5);
	}

	function startInterval() {
		if (intervalId !== null) {
			clearInterval(intervalId);
		}
		
		const stepTime = (60 / effectiveTempo) * 1000 / 4; // 16th notes
		
		intervalId = window.setInterval(() => {
			currentStep = (currentStep + 1) % steps;
			
			// Play all active drums at this step (respect mute states)
			if (!masterMute) {
				drums.forEach((_, drumIndex) => {
					if (sequence[drumIndex][currentStep] && !drumMutes[drumIndex]) {
						playDrum(drumIndex);
					}
				});
			}
		}, stepTime);
	}

	function restartInterval() {
		if (isPlaying) {
			startInterval();
		}
	}

	function play() {
		if (isPlaying) return;
		
		isPlaying = true;
		currentStep = -1;
		startInterval();
	}

	function stop() {
		isPlaying = false;
		currentStep = -1;
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	function clear() {
		sequence = drums.map(() => Array(steps).fill(false));
	}

	function toggleTempoTie() {
		isTiedToSiteTempo = !isTiedToSiteTempo;
		if (!isTiedToSiteTempo) {
			localTempo = tempo; // Initialize local tempo with current site tempo
		}
	}

	function togglePlaybackTie() {
		isTiedToSitePlayback = !isTiedToSitePlayback;
	}

	function toggleDrumMute(drumIndex: number) {
		drumMutes[drumIndex] = !drumMutes[drumIndex];
		drumMutes = drumMutes; // Trigger reactivity
	}

	function toggleMasterMute() {
		masterMute = !masterMute;
	}

	// Reactive: restart interval when tempo changes while playing
	$: if (isPlaying && effectiveTempo) {
		restartInterval();
	}
</script>

<svelte:window on:mouseup={handleMouseUp} />

<div class="drum-sequencer">
	<div class="controls">
		<div class="controls-top">
			<h3>Drum Sequencer</h3>
			<div class="buttons">
				<button 
					on:click={isPlaying ? stop : play}
					disabled={isTiedToSitePlayback}
					class:disabled={isTiedToSitePlayback}
				>
					{isPlaying ? '⏸ Stop' : '▶ Play'}
				</button>
				<button 
					class="mute-button"
					class:muted={masterMute}
					on:click={toggleMasterMute}
					title={masterMute ? 'Unmute all' : 'Mute all'}
				>
					{masterMute ? '🔇' : '🔊'}
				</button>
				<button on:click={clear}>Clear</button>
			</div>
		</div>
		<div class="tempo-controls">
			<button 
				class="tempo-tie-button" 
				class:tied={isTiedToSitePlayback}
				on:click={togglePlaybackTie}
				title={isTiedToSitePlayback ? 'Untie from site playback' : 'Tie to site playback'}
			>
				{isTiedToSitePlayback ? '🔗' : '🔓'} Playback
			</button>
			<button 
				class="tempo-tie-button" 
				class:tied={isTiedToSiteTempo}
				on:click={toggleTempoTie}
				title={isTiedToSiteTempo ? 'Untie from site tempo' : 'Tie to site tempo'}
			>
				{isTiedToSiteTempo ? '🔗' : '🔓'} Tempo: {effectiveTempo} BPM
			</button>
			{#if !isTiedToSiteTempo}
				<input
					type="range"
					min="40"
					max="240"
					step="1"
					bind:value={localTempo}
					class="tempo-slider"
				/>
			{/if}
		</div>
	</div>

	<div class="sequence-grid">
		{#each drums as drum, drumIndex}
			<div class="drum-row">
				<div class="drum-label">{drum.name}</div>
				<button 
					class="drum-mute-button"
					class:muted={drumMutes[drumIndex]}
					on:click={() => toggleDrumMute(drumIndex)}
					title={drumMutes[drumIndex] ? `Unmute ${drum.name}` : `Mute ${drum.name}`}
					aria-label={drumMutes[drumIndex] ? `Unmute ${drum.name}` : `Mute ${drum.name}`}
				>
					{drumMutes[drumIndex] ? '🔇' : '🔊'}
				</button>
				<select 
					class="fill-select"
					on:change={(e) => fillPattern(drumIndex, parseInt(e.currentTarget.value))}
					aria-label="Fill pattern for {drum.name}"
				>
					<option value="">Fill</option>
					<option value="1">1</option>
					<option value="2">2</option>
					<option value="4">4</option>
					<option value="8">8</option>
				</select>
				<div class="steps">
					{#each Array(steps) as _, stepIndex}
						<button
							class="step"
							class:active={sequence[drumIndex][stepIndex]}
							class:current={currentStep === stepIndex && isPlaying}
							on:click={(e) => handleStepClick(drumIndex, stepIndex, e)}
							on:mousedown={(e) => handleStepMouseDown(drumIndex, stepIndex, e)}
							on:mouseenter={() => handleStepMouseEnter(drumIndex, stepIndex)}
							on:contextmenu={handleContextMenu}
							aria-label="{drum.name} step {stepIndex + 1}"
						>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	.drum-sequencer {
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid #00ffff;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.controls-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.tempo-controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.tempo-tie-button {
		flex-shrink: 0;
		white-space: nowrap;
	}

	.tempo-tie-button.tied {
		background: rgba(0, 255, 100, 0.3);
		border-color: #00ff66;
	}

	.tempo-slider {
		flex: 1;
		height: 8px;
		border-radius: 4px;
		background: rgba(0, 255, 255, 0.2);
		border: 1px solid rgba(0, 255, 255, 0.3);
		outline: none;
		cursor: pointer;
	}

	.tempo-slider::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #00ffff;
		cursor: pointer;
		border: 2px solid #00ffff;
	}

	.tempo-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #00ffff;
		cursor: pointer;
		border: 2px solid #00ffff;
	}

	h3 {
		margin: 0;
		color: #00ffff;
		font-size: 1.2rem;
	}

	.buttons {
		display: flex;
		gap: 0.5rem;
	}

	button {
		background: rgba(0, 255, 255, 0.2);
		border: 1px solid #00ffff;
		color: #00ffff;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	button:hover:not(:disabled) {
		background: rgba(0, 255, 255, 0.4);
		transform: scale(1.05);
	}

	button:disabled,
	button.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.mute-button {
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
	}

	.mute-button.muted {
		background: rgba(255, 100, 100, 0.3);
		border-color: #ff6666;
	}

	.drum-mute-button {
		width: 36px;
		height: 32px;
		padding: 0.25rem;
		font-size: 0.9rem;
		flex-shrink: 0;
	}

	.drum-mute-button.muted {
		background: rgba(255, 100, 100, 0.3);
		border-color: #ff6666;
	}

	.sequence-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.drum-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.drum-label {
		width: 80px;
		color: #00ffff;
		font-size: 0.9rem;
		text-align: right;
	}

	.fill-select {
		background: rgba(0, 255, 255, 0.2);
		border: 1px solid #00ffff;
		color: #00ffff;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		cursor: pointer;
		outline: none;
		transition: all 0.2s;
	}

	.fill-select:hover {
		background: rgba(0, 255, 255, 0.3);
	}

	.fill-select option {
		background: #0a0a0a;
		color: #00ffff;
	}

	.steps {
		display: flex;
		gap: 0.25rem;
		flex: 1;
	}

	.step {
		width: 32px;
		height: 32px;
		padding: 0;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(0, 255, 255, 0.3);
		transition: all 0.1s;
		user-select: none;
	}

	.step:hover {
		background: rgba(0, 255, 255, 0.3);
		border-color: #00ffff;
		transform: scale(1.1);
	}

	.step.active {
		background: rgba(0, 255, 255, 0.6);
		border-color: #00ffff;
	}

	.step.current {
		box-shadow: 0 0 10px #00ffff;
		border-width: 2px;
	}

	@media (max-width: 768px) {
		.drum-sequencer {
			padding: 0.5rem;
		}

		.drum-label {
			width: 50px;
			font-size: 0.8rem;
		}

		.drum-mute-button {
			width: 30px;
			height: 28px;
			font-size: 0.8rem;
		}

		.fill-select {
			font-size: 0.7rem;
			padding: 0.2rem 0.3rem;
		}

		.step {
			width: 24px;
			height: 24px;
		}

		h3 {
			font-size: 1rem;
		}
	}
</style>
