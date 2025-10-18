<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	
	// Type definitions
	type Note = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B' | 'Eb' | 'Bb';
	type ScaleType = 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'locrian';
	type ChordType = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'vii°';
	
	// Music theory constants
	const NOTES: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
	const SHARP_NOTES: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
	const FLAT_NOTES: string[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
	
	// Circle of fifths order (clockwise from C)
	const CIRCLE_OF_FIFTHS: Note[] = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'Eb', 'Bb', 'F'];
	
	// Key signatures (number of sharps/flats)
	const KEY_SIGNATURES: Record<Note, number> = {
		'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'C#': 7,
		'G#': -4, 'Eb': -3, 'Bb': -2, 'F': -1
	} as Record<Note, number>;
	
	// Scale patterns (W = whole step, H = half step)
	const SCALE_PATTERNS: Record<ScaleType, string[]> = {
		major: ['W', 'W', 'H', 'W', 'W', 'W', 'H'],
		minor: ['W', 'H', 'W', 'W', 'H', 'W', 'W'],
		dorian: ['W', 'H', 'W', 'W', 'W', 'H', 'W'],
		phrygian: ['H', 'W', 'W', 'W', 'H', 'W', 'W'],
		lydian: ['W', 'W', 'W', 'H', 'W', 'W', 'H'],
		mixolydian: ['W', 'W', 'H', 'W', 'W', 'H', 'W'],
		locrian: ['H', 'W', 'W', 'H', 'W', 'W', 'W']
	};
	
	// Chord progressions for each key
	const CHORD_PROGRESSIONS: Record<string, Record<ChordType, number[]>> = {
		major: {
			'I': [1, 0, 0, 0, 1, 0, 0, 1], // C major chord
			'ii': [0, 0, 1, 0, 0, 0, 1, 0], // D minor chord
			'iii': [0, 0, 0, 0, 1, 0, 0, 1], // E minor chord
			'IV': [1, 0, 0, 1, 0, 0, 0, 1], // F major chord
			'V': [0, 0, 0, 0, 1, 0, 0, 0], // G major chord
			'vi': [0, 0, 1, 0, 0, 0, 1, 0], // A minor chord
			'vii°': [0, 0, 0, 0, 0, 0, 1, 0] // B diminished chord
		}
	};
	
	// Base frequencies for each note (A4 = 440Hz)
	const BASE_FREQUENCIES: Record<Note, number> = {
		'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
		'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
		'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88,
		'Eb': 311.13, 'Bb': 466.16 // Same as D# and A# respectively
	};
	
	// Component props
	export let selectedKey = 'C';
	export let selectedScale = 'major';
	export let selectedChord = 'I';
	export let isActive = false;
	export let isSynchronized = false;
	
	// Update the active state based on synchronization
	$: isActive = isSynchronized;
	
	// Internal state
	let hoveredKey = '';
	let showChordProgressions = true;
	let showScaleDegrees = true;
	
	const dispatch = createEventDispatcher();
	
	// Get note name with proper accidentals for the key
	function getNoteName(note: string, key: string): string {
		const keySignature = KEY_SIGNATURES[key as Note];
		if (keySignature < 0) {
			// Flat keys
			return FLAT_NOTES[NOTES.indexOf(note as Note)];
		}
		return SHARP_NOTES[NOTES.indexOf(note as Note)];
	}
	
	// Generate scale for a given key
	function generateScale(key: string, scaleType: string): string[] {
		const pattern = SCALE_PATTERNS[scaleType as ScaleType];
		if (!pattern) return [];
		
		const startIndex = NOTES.indexOf(key as Note);
		const scale = [key];
		let currentIndex = startIndex;
		
		for (let i = 0; i < pattern.length - 1; i++) {
			const step = pattern[i] === 'W' ? 2 : 1;
			currentIndex = (currentIndex + step) % 12;
			scale.push(NOTES[currentIndex]);
		}
		
		return scale;
	}
	
	// Get frequencies for current scale
	function getScaleFrequencies(): number[] {
		const scale = generateScale(selectedKey, selectedScale);
		return scale.map(note => BASE_FREQUENCIES[note as Note]);
	}
	
	// Get chord frequencies for current key and chord
	function getChordFrequencies(): number[] {
		const scale = generateScale(selectedKey, selectedScale);
		const chordPattern = CHORD_PROGRESSIONS[selectedScale]?.[selectedChord as ChordType];
		
		if (!chordPattern) return [];
		
		return chordPattern.map((include: number, index: number) =>
			include ? BASE_FREQUENCIES[scale[index] as Note] : 0
		).filter((freq: number) => freq > 0);
	}
	
	// Handle key selection
	function selectKey(key: string) {
		selectedKey = key;
		dispatch('keyChange', {
			key,
			scale: selectedScale,
			scaleNotes: generateScale(key, selectedScale),
			frequencies: getScaleFrequencies()
		});
	}
	
	// Handle scale selection
	function selectScale(scale: string) {
		selectedScale = scale;
		dispatch('scaleChange', {
			key: selectedKey,
			scale,
			scaleNotes: generateScale(selectedKey, scale),
			frequencies: getScaleFrequencies()
		});
	}
	
	// Handle chord selection
	function selectChord(chord: string) {
		selectedChord = chord;
		dispatch('chordChange', {
			key: selectedKey,
			scale: selectedScale,
			chord,
			chordFrequencies: getChordFrequencies()
		});
	}
	
	// Get position for circle of fifths visualization
	function getKeyPosition(key: string, index: number): { x: number; y: number } {
		const angle = (index * 30) * (Math.PI / 180); // 30 degrees apart
		const radius = 120;
		const centerX = 150;
		const centerY = 150;
		
		return {
			x: centerX + radius * Math.cos(angle - Math.PI / 2),
			y: centerY + radius * Math.sin(angle - Math.PI / 2)
		};
	}
	
	// Get color based on key signature
	function getKeyColor(key: string): string {
		const signature = KEY_SIGNATURES[key as Note];
		if (signature === 0) return '#10b981'; // C major - green (tonic)
		if (signature > 0) return '#3b82f6'; // Sharp keys - blue
		if (signature < 0) return '#8b5cf6'; // Flat keys - purple
		return '#6b7280';
	}
</script>

<div class="circle-of-fifths {isActive ? 'active' : ''}">
	<div class="controls-panel">
		<div class="control-group">
			<label for="scale-select">Scale:</label>
			<select id="scale-select" bind:value={selectedScale} on:change={() => selectScale(selectedScale)}>
				{#each Object.keys(SCALE_PATTERNS) as scale}
					<option value={scale}>{scale.charAt(0).toUpperCase() + scale.slice(1)}</option>
				{/each}
			</select>
		</div>
		
		<div class="control-group">
			<label for="chord-select">Chord:</label>
			<select id="chord-select" bind:value={selectedChord} on:change={() => selectChord(selectedChord)}>
				{#each Object.keys(CHORD_PROGRESSIONS.major) as chord}
					<option value={chord}>{chord}</option>
				{/each}
			</select>
		</div>
		
		<div class="control-group">
			<label>
				<input type="checkbox" bind:checked={showChordProgressions}>
				Show Chords
			</label>
		</div>
		
		<div class="control-group">
			<label>
				<input type="checkbox" bind:checked={showScaleDegrees}>
				Show Degrees
			</label>
		</div>
		
		{#if isSynchronized}
		<div class="sync-indicator">
			<div class="sync-light {isSynchronized ? 'active' : ''}"></div>
			<span class="sync-text">Synchronized</span>
		</div>
		{/if}
	</div>
	
	<div class="circle-container">
		<svg width="300" height="300" viewBox="0 0 300 300">
			<!-- Outer circle -->
			<circle cx="150" cy="150" r="140" fill="none" stroke="#374151" stroke-width="2"/>
			
			<!-- Inner circle for relative minor -->
			<circle cx="150" cy="150" r="90" fill="none" stroke="#4b5563" stroke-width="1" stroke-dasharray="5,5"/>
			
			<!-- Key positions -->
			{#each CIRCLE_OF_FIFTHS as key, index}
				{@const position = getKeyPosition(key, index)}
				{@const isSelected = key === selectedKey}
				{@const isHovered = key === hoveredKey}
				
				<!-- Key circle -->
				<circle
					cx={position.x}
					cy={position.y}
					r={isSelected ? 35 : 30}
					fill={getKeyColor(key)}
					stroke={isSelected ? '#fbbf24' : isHovered ? '#60a5fa' : 'none'}
					stroke-width={isSelected ? 3 : 2}
					class="key-circle {isSelected ? 'selected' : ''}"
					role="button"
					tabindex="0"
					aria-label={`Select ${getNoteName(key, key)} key`}
					aria-pressed={isSelected}
					on:click={() => selectKey(key)}
					on:mouseenter={() => hoveredKey = key}
					on:mouseleave={() => hoveredKey = ''}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							selectKey(key);
						}
					}}
				/>
				
				<!-- Key label -->
				<text
					x={position.x}
					y={position.y + 5}
					text-anchor="middle"
					class="key-label"
					fill="white"
					font-size="16"
					font-weight={isSelected ? 'bold' : 'normal'}
				>
					{getNoteName(key, key)}
				</text>
				
				<!-- Scale degree numbers -->
				{#if showScaleDegrees && key === selectedKey}
					{@const scale = generateScale(key, selectedScale)}
					{#each scale as note, noteIndex}
						{@const notePosition = getKeyPosition(note, CIRCLE_OF_FIFTHS.indexOf(note as Note))}
						<text
							x={notePosition.x + 25}
							y={notePosition.y + 5}
							text-anchor="middle"
							class="degree-label"
							fill="#fbbf24"
							font-size="14"
						>
							{noteIndex + 1}
						</text>
					{/each}
				{/if}
			{/each}
			
			<!-- Center tonic indicator -->
			<circle cx="150" cy="150" r="12" fill="#10b981"/>
			<text x="150" y="157" text-anchor="middle" class="center-label" fill="white" font-size="12">I</text>
		</svg>
	</div>
	
	<div class="info-panel">
		<div class="current-key">
			<h3>Current Key: {getNoteName(selectedKey, selectedKey)} {selectedScale}</h3>
			<div class="key-signature">
				Key Signature: {KEY_SIGNATURES[selectedKey as Note] > 0 ? '+' + KEY_SIGNATURES[selectedKey as Note] : KEY_SIGNATURES[selectedKey as Note]} {Math.abs(KEY_SIGNATURES[selectedKey as Note]) === 1 ? 'accidental' : 'accidentals'}
			</div>
		</div>
		
		<div class="scale-display">
			<h4>Scale Notes:</h4>
			<div class="scale-notes">
				{#each generateScale(selectedKey, selectedScale) as note, index}
					<span class="scale-note" class:tonic={index === 0}>
						{getNoteName(note, selectedKey)}
						{#if showScaleDegrees}
							<sub>{index + 1}</sub>
						{/if}
					</span>
				{/each}
			</div>
		</div>
		
		{#if showChordProgressions}
		<div class="chord-display">
			<h4>Current Chord: {selectedChord}</h4>
			<div class="chord-notes">
				{#each getChordFrequencies() as freq}
					<span class="chord-note">{freq.toFixed(1)} Hz</span>
				{/each}
			</div>
		</div>
		{/if}
	</div>
</div>

<style>
	.circle-of-fifths {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #1f2937;
		border-radius: 1rem;
		border: 1px solid #374151;
		color: white;
		font-family: system-ui, -apple-system, sans-serif;
	}
	
	.circle-of-fifths.active {
		border-color: #3b82f6;
		box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
	}
	
	.controls-panel {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: #374151;
		border-radius: 0.5rem;
		width: 100%;
	}
	
	.control-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	
	.control-group label {
		font-size: 1rem;
		color: #d1d5db;
	}
	
	.control-group select {
		padding: 0.25rem 0.5rem;
		background: #4b5563;
		color: white;
		border: 1px solid #6b7280;
		border-radius: 0.25rem;
		font-size: 1rem;
	}
	
	.control-group input[type="checkbox"] {
		margin-right: 0.5rem;
	}
	
	.circle-container {
		position: relative;
		margin: 1rem 0;
	}
	
	.key-circle {
		cursor: pointer;
		transition: all 0.2s ease;
	}
	
	.key-circle:hover {
		/* transform: scale(1.1); */
	}
	
	.key-circle.selected {
		animation: pulse 2s infinite;
	}
	
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}
	
	.key-label {
		pointer-events: none;
		user-select: none;
	}
	
	.degree-label {
		pointer-events: none;
		user-select: none;
	}
	
	.center-label {
		pointer-events: none;
		user-select: none;
	}
	
	.info-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		max-width: 400px;
	}
	
	.current-key h3 {
		margin: 0 0 0.5rem 0;
		color: #fbbf24;
		font-size: 1.25rem;
	}
	
	.key-signature {
		color: #9ca3af;
		font-size: 0.875rem;
	}
	
	.scale-display h4,
	.chord-display h4 {
		margin: 0 0 0.5rem 0;
		color: #60a5fa;
		font-size: 1rem;
	}
	
	.scale-notes,
	.chord-notes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	
	.scale-note,
	.chord-note {
		padding: 0.25rem 0.5rem;
		background: #4b5563;
		border-radius: 0.25rem;
		font-size: 1rem;
	}
	
	.scale-note.tonic {
		background: #10b981;
		font-weight: bold;
	}
	
	.scale-note sub {
		font-size: 0.8em;
		vertical-align: sub;
		margin-left: 0.1rem;
	}
</style>