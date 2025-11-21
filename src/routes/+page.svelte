<script lang="ts">
	import MusicGrid from '$lib/components/MusicGrid.svelte';
	import CircleOfFifths from '$lib/components/CircleOfFifths.svelte';
	import PhysicsScene from '$lib/components/PhysicsScene.svelte';
	import DrumSequencer from '$lib/components/DrumSequencer.svelte';
	import DraggableWidget from '$lib/components/DraggableWidget.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	// State for circle of fifths
	let selectedKey = 'C';
	let selectedScale = 'major';
	let selectedChord = 'I';
	let scaleFrequencies: number[] = [];
	let isSynchronized = true; // Always synchronized - no free mode
	let showCircleOfFifths = false; // Collapsed by default
	let masterVolume = 1.0; // Master volume control (max by default)
	let tempo = 99; // BPM (beats per minute) for sequencer
	let isSequencerRunning = false;
	let currentSequenceStep = -1; // -1 means no active step
	let sequencerTimeoutId: number | null = null; // Track the timeout for cleanup

	// Widget layout state
	type WidgetId = 'master-controls' | 'drum-sequencer' | 'physics-scene' | 'circle-of-fifths' | 'music-grid';
	type ColumnId = 'column-1' | 'column-2' | 'column-3' | 'column-4';
	
	// All available widgets
	const allWidgets: WidgetId[] = ['master-controls', 'drum-sequencer', 'physics-scene', 'circle-of-fifths', 'music-grid'];
	
	// Layout configuration
	type LayoutPreset = {
		name: string;
		columns: number | number[]; // Single number or array for per-row columns
		rows: number;
		description: string;
	};
	
	// Generate a unique key for each layout configuration
	function getLayoutKey(layout: { columns: number | number[]; rows: number }): string {
		const cols = typeof layout.columns === 'number' ? layout.columns : layout.columns.join('-');
		return `layout-${cols}-${layout.rows}`;
	}

	const layoutPresets: LayoutPreset[] = [
		{ name: '1 Column', columns: 1, rows: 1, description: 'Single column (mobile)' },
		{ name: '2 Columns', columns: 2, rows: 1, description: 'Two equal columns' },
		{ name: '3 Columns', columns: 3, rows: 1, description: 'Three equal columns (default)' },
		{ name: '4 Columns', columns: 4, rows: 1, description: 'Four equal columns' },
		{ name: '2x2 Grid', columns: 2, rows: 2, description: 'Two columns, two rows' },
		{ name: '3x2 Grid', columns: 3, rows: 2, description: 'Three columns, two rows' },
		{ name: '2x3 Grid', columns: 2, rows: 3, description: 'Two columns, three rows' },
		{ name: '3+1 Stack', columns: [3, 1], rows: 2, description: 'Three columns top, one wide bottom' },
		{ name: '2+3 Stack', columns: [2, 3], rows: 2, description: 'Two columns top, three bottom' },
		{ name: '4+2 Stack', columns: [4, 2], rows: 2, description: 'Four columns top, two bottom' },
		{ name: '1+3 Stack', columns: [1, 3], rows: 2, description: 'One wide top, three columns bottom' },
		{ name: '3+2+1 Stack', columns: [3, 2, 1], rows: 3, description: 'Three, two, then one column' },
	];

	let selectedLayout: { columns: number | number[]; rows: number } = { columns: 3, rows: 1 };
	let showLayoutEditor = false;
	
	// Store layouts for each configuration (keyed by layout signature)
	let layoutConfigurations: Record<string, Record<ColumnId, WidgetId[]>> = {};
	
	let columns: Record<ColumnId, WidgetId[]> = {
		'column-1': ['master-controls', 'drum-sequencer'],
		'column-2': ['physics-scene', 'circle-of-fifths'],
		'column-3': ['music-grid'],
		'column-4': []
	};

	let draggedWidget: WidgetId | null = null;
	let draggedFromColumn: ColumnId | null = null;
	let dropIndicator: { columnId: ColumnId; index: number } | null = null;

	// Load layout from localStorage
	onMount(() => {
		if (browser) {
			// Check if mobile viewport
			const isMobile = window.innerWidth < 768;
			
			// Load all saved layout configurations
			const savedLayoutConfigs = localStorage.getItem('layout-configurations');
			if (savedLayoutConfigs) {
				try {
					layoutConfigurations = JSON.parse(savedLayoutConfigs);
				} catch (e) {
					console.error('Failed to parse saved layout configurations:', e);
				}
			}

			// Load the selected layout configuration (skip on mobile)
			if (!isMobile) {
				const savedLayoutConfig = localStorage.getItem('grid-layout-config');
				if (savedLayoutConfig) {
					try {
						selectedLayout = JSON.parse(savedLayoutConfig);
					} catch (e) {
						console.error('Failed to parse saved layout config:', e);
					}
				}
			} else {
				// Force single column on mobile
				selectedLayout = { columns: 1, rows: 1 };
			}

			// Load columns for the current layout
			const currentLayoutKey = getLayoutKey(selectedLayout);
			if (layoutConfigurations[currentLayoutKey]) {
				columns = layoutConfigurations[currentLayoutKey];
			} else {
				// If no saved layout for this configuration, distribute widgets intelligently
				distributeWidgets();
			}

			// Add touch event listeners to columns for mobile drag-and-drop
			const columnElements = document.querySelectorAll('.widget-column');
			columnElements.forEach((column) => {
				column.addEventListener('touchdragover', handleTouchDragOver as EventListener);
				column.addEventListener('touchdrop', handleTouchDrop as EventListener);
			});

			return () => {
				columnElements.forEach((column) => {
					column.removeEventListener('touchdragover', handleTouchDragOver as EventListener);
					column.removeEventListener('touchdrop', handleTouchDrop as EventListener);
				});
			};
		}
	});

	function saveLayout() {
		if (browser) {
			// Save the current columns for this specific layout configuration
			const layoutKey = getLayoutKey(selectedLayout);
			layoutConfigurations[layoutKey] = columns;
			localStorage.setItem('layout-configurations', JSON.stringify(layoutConfigurations));
		}
	}

	function saveLayoutConfig() {
		if (browser) {
			localStorage.setItem('grid-layout-config', JSON.stringify(selectedLayout));
		}
	}

	function applyLayoutPreset(preset: LayoutPreset) {
		const newLayout = { columns: preset.columns, rows: preset.rows };
		const newLayoutKey = getLayoutKey(newLayout);
		
		// Check if we have a saved configuration for this layout
		if (layoutConfigurations[newLayoutKey]) {
			// Restore saved configuration
			selectedLayout = newLayout;
			columns = layoutConfigurations[newLayoutKey];
			// Ensure all widgets are visible (in case widgets were added since last save)
			ensureAllWidgetsVisible();
		} else {
			// No saved configuration - distribute widgets intelligently
			selectedLayout = newLayout;
			distributeWidgets();
		}
		
		saveLayoutConfig();
		saveLayout();
	}

	function toggleLayoutEditor() {
		showLayoutEditor = !showLayoutEditor;
	}

	// Ensure all widgets are visible in the current layout
	function ensureAllWidgetsVisible() {
		// Collect all currently placed widgets
		const placedWidgets = new Set<WidgetId>();
		for (const columnId of activeColumnIds) {
			if (columns[columnId]) {
				columns[columnId].forEach(widget => placedWidgets.add(widget));
			}
		}
		
		// Find missing widgets
		const missingWidgets = allWidgets.filter(widget => !placedWidgets.has(widget));
		
		// Distribute missing widgets among available columns
		if (missingWidgets.length > 0) {
			missingWidgets.forEach((widget, index) => {
				const targetColumn = activeColumnIds[index % activeColumnIds.length];
				if (!columns[targetColumn]) {
					columns[targetColumn] = [];
				}
				columns[targetColumn].push(widget);
			});
			
			// Trigger reactivity
			columns = { ...columns };
		}
	}
	
	// Distribute all widgets intelligently across available columns
	function distributeWidgets() {
		// Clear all columns
		const columnKeys = Object.keys(columns) as ColumnId[];
		for (const columnId of columnKeys) {
			columns[columnId] = [];
		}
		
		// Distribute widgets evenly across active columns
		const numColumns = activeColumnIds.length;
		const widgetsPerColumn = Math.ceil(allWidgets.length / numColumns);
		
		allWidgets.forEach((widget, index) => {
			const columnIndex = Math.floor(index / widgetsPerColumn);
			if (columnIndex < activeColumnIds.length) {
				const targetColumn = activeColumnIds[columnIndex];
				if (!columns[targetColumn]) {
					columns[targetColumn] = [];
				}
				columns[targetColumn].push(widget);
			}
		});
		
		// Trigger reactivity
		columns = { ...columns };
		saveLayout();
	}

	// Get active column IDs based on selected layout
	$: activeColumnIds = (() => {
		const cols = selectedLayout.columns;
		if (typeof cols === 'number') {
			// Simple uniform grid
			return Array.from(
				{ length: cols },
				(_, i) => `column-${i + 1}` as ColumnId
			);
		} else {
			// Per-row column configuration - total slots across all rows
			const totalSlots = cols.reduce((sum, rowCols) => sum + rowCols, 0);
			return Array.from(
				{ length: totalSlots },
				(_, i) => `column-${i + 1}` as ColumnId
			);
		}
	})();

	// Ensure all columns in activeColumnIds exist and all widgets are visible
	$: {
		activeColumnIds.forEach(columnId => {
			if (!columns[columnId]) {
				columns[columnId] = [];
			}
		});
		
		// Whenever active columns change, ensure all widgets are still visible
		if (browser && activeColumnIds.length > 0) {
			ensureAllWidgetsVisible();
		}
	}

	// Calculate CSS grid positioning for variable column layouts
	function getColumnStyle(slotIndex: number, columnsPerRow: number[]): string {
		const maxCols = Math.max(...columnsPerRow);
		let currentSlot = 0;
		let rowNum = 1;
		let colStart = 1;
		
		// Find which row and column this slot belongs to
		for (let r = 0; r < columnsPerRow.length; r++) {
			const colsInRow = columnsPerRow[r];
			if (slotIndex < currentSlot + colsInRow) {
				// This slot is in row r
				rowNum = r + 1;
				const posInRow = slotIndex - currentSlot;
				const colSpan = Math.floor(maxCols / colsInRow);
				colStart = posInRow * colSpan + 1;
				return `grid-row: ${rowNum}; grid-column: ${colStart} / span ${colSpan};`;
			}
			currentSlot += colsInRow;
		}
		
		return '';
	}

	// Render a widget based on its ID
	function renderWidget(widgetId: WidgetId, columnId: ColumnId) {
		return { widgetId, columnId };
	}

	function handleDragStart(widgetId: WidgetId, columnId: ColumnId) {
		draggedWidget = widgetId;
		draggedFromColumn = columnId;
	}

	let dragOverColumn: ColumnId | null = null;

	function handleDragOver(event: DragEvent, columnId: ColumnId) {
		event.preventDefault();
		dragOverColumn = columnId;
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}

		// Calculate drop position based on mouse Y position
		const column = event.currentTarget as HTMLElement;
		const widgets = Array.from(column.querySelectorAll('.widget'));
		const mouseY = event.clientY;

		let dropIndex = columns[columnId].length; // Default to end

		for (let i = 0; i < widgets.length; i++) {
			const widget = widgets[i];
			const rect = widget.getBoundingClientRect();
			const midpoint = rect.top + rect.height / 2;

			if (mouseY < midpoint) {
				dropIndex = i;
				break;
			}
		}

		dropIndicator = { columnId, index: dropIndex };
	}

	function handleDragLeave(event: DragEvent) {
		const relatedTarget = event.relatedTarget as HTMLElement;
		const currentTarget = event.currentTarget as HTMLElement;
		
		// Only clear if we're actually leaving the column (not entering a child)
		if (!currentTarget.contains(relatedTarget)) {
			dragOverColumn = null;
			dropIndicator = null;
		}
	}

	function handleDrop(event: DragEvent, targetColumnId: ColumnId) {
		event.preventDefault();
		dragOverColumn = null;
		
		if (!draggedWidget || !draggedFromColumn || !dropIndicator) {
			dropIndicator = null;
			return;
		}

		// Remove from source column
		columns[draggedFromColumn] = columns[draggedFromColumn].filter(id => id !== draggedWidget);
		
		// Insert at specific position in target column
		const targetColumn = [...columns[targetColumnId]];
		targetColumn.splice(dropIndicator.index, 0, draggedWidget);
		columns[targetColumnId] = targetColumn;

		// Trigger reactivity
		columns = { ...columns };
		
		saveLayout();
		
		draggedWidget = null;
		draggedFromColumn = null;
		dropIndicator = null;
	}

	function handleDragEnd() {
		draggedWidget = null;
		draggedFromColumn = null;
		dragOverColumn = null;
		dropIndicator = null;
	}

	// Touch drag handlers for mobile
	function handleTouchDragOver(event: CustomEvent) {
		const { clientY, columnElement } = event.detail;
		const columnId = columnElement.getAttribute('aria-label')?.toLowerCase().replace(' ', '-') as ColumnId;
		
		if (!columnId) return;

		dragOverColumn = columnId;

		// Calculate drop position based on touch Y position
		const widgets = Array.from(columnElement.querySelectorAll('.widget')) as HTMLElement[];
		let dropIndex = columns[columnId].length; // Default to end

		for (let i = 0; i < widgets.length; i++) {
			const widget = widgets[i];
			const rect = widget.getBoundingClientRect();
			const midpoint = rect.top + rect.height / 2;

			if (clientY < midpoint) {
				dropIndex = i;
				break;
			}
		}

		dropIndicator = { columnId, index: dropIndex };
	}

	function handleTouchDrop(event: CustomEvent) {
		const { clientY } = event.detail;
		const columnElement = event.target as HTMLElement;
		const columnId = columnElement.getAttribute('aria-label')?.toLowerCase().replace(' ', '-') as ColumnId;

		if (!columnId || !draggedWidget || !draggedFromColumn || !dropIndicator) {
			dragOverColumn = null;
			dropIndicator = null;
			return;
		}

		// Remove from source column
		columns[draggedFromColumn] = columns[draggedFromColumn].filter(id => id !== draggedWidget);
		
		// Insert at specific position in target column
		const targetColumn = [...columns[columnId]];
		targetColumn.splice(dropIndicator.index, 0, draggedWidget);
		columns[columnId] = targetColumn;

		// Trigger reactivity
		columns = { ...columns };
		
		saveLayout();
		
		draggedWidget = null;
		draggedFromColumn = null;
		dragOverColumn = null;
		dropIndicator = null;
	}

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

	function toggleCircleOfFifths() {
		showCircleOfFifths = !showCircleOfFifths;
	}

	// Sequencer control functions
	function playSequencer() {
		if (!isSequencerRunning) {
			isSequencerRunning = true;
			// Only reset to step 0 if we're at -1 (fully stopped)
			if (currentSequenceStep < 0) {
				currentSequenceStep = 0;
			}
			// Otherwise, resume from current step
			runSequencer();
		}
	}

	function pauseSequencer() {
		isSequencerRunning = false;
		// Clear any pending timeout
		if (sequencerTimeoutId !== null) {
			clearTimeout(sequencerTimeoutId);
			sequencerTimeoutId = null;
		}
		// Keep currentSequenceStep as is (don't reset to -1)
	}

	function togglePlayPause() {
		if (isSequencerRunning) {
			pauseSequencer();
		} else {
			playSequencer();
		}
	}

	function stopSequencer() {
		isSequencerRunning = false;
		// Clear any pending timeout
		if (sequencerTimeoutId !== null) {
			clearTimeout(sequencerTimeoutId);
			sequencerTimeoutId = null;
		}
		currentSequenceStep = -1; // Reset to no active step
	}

	// Note: Removed auto-start on interaction - user must explicitly play sequencer

	// Sequencer function
	function runSequencer() {
		if (!isSequencerRunning) return;

		// Calculate interval based on tempo (BPM - beats per minute)
		// At 120 BPM, each beat is 500ms (60000ms / 120)
		// We'll use 8 steps per sequence, with each step being a half beat
		const intervalMs = 60000 / tempo / 2; // Half beat per step

		sequencerTimeoutId = setTimeout(() => {
			if (!isSequencerRunning) return; // Double-check we're still running
			currentSequenceStep = (currentSequenceStep + 1) % 8;
			runSequencer();
		}, intervalMs) as unknown as number;
	}
</script>

<svelte:head>
	<title>Trill Symbiont (alpha)</title>
</svelte:head>

<main class="min-h-screen bg-gray-900 text-white">
	<div class="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
		<header class="mb-6 text-center sm:mb-8">
			<h1 class="mb-2 text-3xl font-bold sm:text-4xl lg:text-5xl">Trill Symbiont</h1>
			<p class="text-sm text-gray-300 sm:text-base lg:text-lg">
				A shared generative ambient music experience with Circle of Fifths synchronization
			</p>

			<!-- Layout Editor (Tablet and up) -->
			<div class="mt-4 hidden md:block">
				<button
					on:click={toggleLayoutEditor}
					class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-indigo-700"
				>
					{showLayoutEditor ? '✓ Close Layout Editor' : '⚙️ Layout Editor'}
				</button>

				{#if showLayoutEditor}
					<div class="mt-4 rounded-lg bg-gray-800 p-4 shadow-lg">
						<h3 class="mb-3 text-lg font-semibold">Grid Layout Presets</h3>
						<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
							{#each layoutPresets as preset}
								<button
									on:click={() => applyLayoutPreset(preset)}
									class="rounded-lg border-2 p-3 text-left transition-all hover:scale-105 {JSON.stringify(selectedLayout.columns) === JSON.stringify(preset.columns) && selectedLayout.rows === preset.rows
										? 'border-indigo-500 bg-indigo-900/50'
										: 'border-gray-600 bg-gray-700/50 hover:border-indigo-400'}"
								>
									<div class="flex items-center gap-2">
										<!-- Grid Icon -->
										<div class="grid-icon" style="--icon-cols: {typeof preset.columns === 'number' ? preset.columns : Math.max(...preset.columns)}; --icon-rows: {preset.rows};">
											{#if typeof preset.columns === 'number'}
												{#each Array(preset.columns * preset.rows) as _, i}
													<div class="grid-icon-cell"></div>
												{/each}
											{:else}
												{#each preset.columns as rowCols, rowIndex}
													{#each Array(rowCols) as _, colIndex}
														<div class="grid-icon-cell variable-grid" style="grid-column: span {Math.max(...preset.columns) / rowCols};"></div>
													{/each}
												{/each}
											{/if}
										</div>
										<div class="flex-1">
											<div class="font-semibold">{preset.name}</div>
											<div class="text-xs text-gray-400">{preset.description}</div>
										</div>
									</div>
								</button>
							{/each}
						</div>
					<div class="mt-3 text-center text-xs text-gray-400">
						Current: {typeof selectedLayout.columns === 'number' 
							? `${selectedLayout.columns} column${selectedLayout.columns > 1 ? 's' : ''}` 
							: `${selectedLayout.columns.join('+')} columns per row`} × {selectedLayout.rows} row{selectedLayout.rows > 1 ? 's' : ''}
					</div>
					</div>
				{/if}
			</div>
		</header>
		
		<!-- Responsive Grid Layout -->
		<div class="widgets-grid" style="
			--grid-columns: {typeof selectedLayout.columns === 'number' ? selectedLayout.columns : Math.max(...selectedLayout.columns)}; 
			--grid-rows: {selectedLayout.rows};
			--is-variable: {typeof selectedLayout.columns === 'number' ? 0 : 1};
		">
			{#each activeColumnIds as columnId, slotIndex (columnId)}
			<!-- {columnId} -->
			<div 
				class="widget-column drop-zone" 
				class:drag-over={dragOverColumn === columnId}
				class:has-widgets={columns[columnId]?.length > 0}
				style="{typeof selectedLayout.columns !== 'number' ? getColumnStyle(slotIndex, selectedLayout.columns) : ''}"
				on:dragover={(e) => handleDragOver(e, columnId)}
				on:dragleave={handleDragLeave}
				on:drop={(e) => handleDrop(e, columnId)}
				role="region"
				aria-label="Column {columnId.split('-')[1]}"
			>
				{#each columns[columnId] as widgetId, index (widgetId)}
					{#if dropIndicator?.columnId === columnId && dropIndicator?.index === index}
						<div class="drop-indicator"></div>
					{/if}
					{#if widgetId === 'master-controls'}
						<DraggableWidget 
							id="master-controls" 
							title="🎚️ Master Controls"
							on:dragstart={() => handleDragStart('master-controls', columnId)}
							on:dragend={handleDragEnd}
						>
					<!-- Master Volume Control -->
					<div class="mb-4 flex flex-col gap-2">
						<label for="master-volume" class="text-center text-sm font-medium">Master Volume</label>
						<div class="flex items-center gap-3">
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

					<!-- Tempo Control -->
					<div class="flex flex-col gap-2">
						<label for="tempo" class="text-center text-sm font-medium">Tempo</label>
						<div class="flex items-center gap-3">
							<span class="text-sm text-gray-400">🐌</span>
							<input
								id="tempo"
								type="range"
								min="40"
								max="240"
								step="1"
								bind:value={tempo}
								class="slider h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-700"
							/>
							<span class="text-sm text-gray-400">🐇</span>
						</div>
						<div class="text-center text-sm text-gray-400">
							{tempo} BPM
						</div>
					</div>

					<!-- Sequencer Controls -->
					<div class="mt-4 flex flex-col gap-2">
						<div class="text-center text-sm font-medium">Sequencer</div>
						<div class="flex items-center justify-center gap-2">
							<button
								on:click={togglePlayPause}
								class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {isSequencerRunning
									? 'bg-yellow-600 hover:bg-yellow-700'
									: 'bg-green-600 hover:bg-green-700'}"
							>
								{isSequencerRunning ? '⏸ Pause' : '▶ Play'}
							</button>
							<button
								on:click={stopSequencer}
								class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-700"
							>
								⏹ Stop
							</button>
						</div>
						<div class="text-center text-sm text-gray-400">
							{isSequencerRunning ? '▶ Running' : currentSequenceStep >= 0 ? '⏸ Paused' : '⏹ Stopped'} - Step {currentSequenceStep >= 0 ? currentSequenceStep + 1 : '-'}/8
						</div>
					</div>
						</DraggableWidget>
				{:else if widgetId === 'drum-sequencer'}
					<DraggableWidget 
						id="drum-sequencer" 
						title="🥁 Drum Sequencer"
						on:dragstart={() => handleDragStart('drum-sequencer', columnId)}
						on:dragend={handleDragEnd}
					>
							<DrumSequencer {tempo} siteIsPlaying={isSequencerRunning} />
						</DraggableWidget>
				{:else if widgetId === 'physics-scene'}
					<DraggableWidget 
						id="physics-scene" 
						title="🌌 Physics Scene"
						on:dragstart={() => handleDragStart('physics-scene', columnId)}
						on:dragend={handleDragEnd}
					>
							<PhysicsScene {tempo} {scaleFrequencies} siteIsPlaying={isSequencerRunning} siteIsStopped={currentSequenceStep < 0} />
						</DraggableWidget>
				{:else if widgetId === 'circle-of-fifths'}
					<DraggableWidget 
						id="circle-of-fifths" 
						title="🎵 Circle of Fifths"
						on:dragstart={() => handleDragStart('circle-of-fifths', columnId)}
						on:dragend={handleDragEnd}
					>
							<CircleOfFifths
								{selectedKey}
								{selectedScale}
								{selectedChord}
								{isSynchronized}
								on:keyChange={handleKeyChange}
								on:scaleChange={handleScaleChange}
								on:chordChange={handleChordChange}
							/>
						</DraggableWidget>
					{:else if widgetId === 'music-grid'}
						<DraggableWidget 
							id="music-grid" 
							title="🎹 Music Grid"
							on:dragstart={() => handleDragStart('music-grid', columnId)}
						>
							<MusicGrid
								{selectedKey}
								{selectedScale}
								{scaleFrequencies}
								{isSynchronized}
								{masterVolume}
								{currentSequenceStep}
								currentChord={selectedChord}
							/>
						</DraggableWidget>
					{/if}
				{/each}
				{#if dropIndicator?.columnId === columnId && dropIndicator?.index === columns[columnId].length}
					<div class="drop-indicator"></div>
				{/if}
			</div>
			{/each}
		</div>
	</div>
</main>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}

	main {
		min-height: 100vh;
	}

	/* Mobile-first responsive grid layout */
	.widgets-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		width: 100%;
	}

	/* Tablet and up: use dynamic column layout */
	@media (min-width: 768px) {
		.widgets-grid {
			grid-template-columns: repeat(var(--grid-columns, 3), 1fr);
			grid-template-rows: repeat(var(--grid-rows, 1), minmax(300px, auto));
			gap: 1.5rem;
		}
	}

	/* Grid icon styling */
	.grid-icon {
		display: grid;
		grid-template-columns: repeat(var(--icon-cols, 3), 1fr);
		grid-template-rows: repeat(var(--icon-rows, 1), 1fr);
		gap: 2px;
		width: 32px;
		height: 32px;
		flex-shrink: 0;
	}

	.grid-icon-cell {
		background: currentColor;
		opacity: 0.6;
		border-radius: 2px;
		transition: opacity 0.2s;
	}

	button:hover .grid-icon-cell {
		opacity: 0.8;
	}

	.border-indigo-500 .grid-icon-cell {
		opacity: 1;
		background: rgb(99, 102, 241);
	}

	.widget-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0; /* Prevent overflow */
		min-height: 300px; /* Ensure drop target is visible even when empty */
		transition: all 0.3s ease;
		position: relative;
	}

	.widget-column.drop-zone {
		border: 2px dashed rgba(75, 85, 99, 0.4);
		border-radius: 12px;
		padding: 1rem;
		background: rgba(17, 24, 39, 0.3);
	}

	/* Hide dotted border on mobile */
	@media (max-width: 767px) {
		.widget-column.drop-zone {
			border: none;
			background: transparent;
			padding: 0;
		}
	}

	.widget-column.drop-zone.drag-over {
		border-color: rgba(99, 102, 241, 0.8);
		background: rgba(99, 102, 241, 0.1);
		box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
		transform: scale(1.02);
	}

	.widget-column.drop-zone:hover {
		border-color: rgba(99, 102, 241, 0.5);
		background: rgba(99, 102, 241, 0.05);
	}

	/* Improve touch interaction on mobile */
	@media (hover: none) and (pointer: coarse) {
		.widget-column.drop-zone {
			min-height: 400px;
			padding: 1.5rem;
		}
	}

	.drop-indicator {
		height: 4px;
		background: linear-gradient(90deg, transparent, rgb(99, 102, 241), transparent);
		border-radius: 2px;
		margin: 0.5rem 0;
		position: relative;
		animation: pulse 1s ease-in-out infinite;
		box-shadow: 0 0 10px rgba(99, 102, 241, 0.6);
	}

	.drop-indicator::before {
		content: '';
		position: absolute;
		left: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 8px;
		height: 8px;
		background: rgb(99, 102, 241);
		border-radius: 50%;
		box-shadow: 0 0 8px rgba(99, 102, 241, 0.8);
	}

	.drop-indicator::after {
		content: '';
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		width: 8px;
		height: 8px;
		background: rgb(99, 102, 241);
		border-radius: 50%;
		box-shadow: 0 0 8px rgba(99, 102, 241, 0.8);
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.6;
		}
	}

	/* Volume slider styling */
	.widgets-grid :global(.slider) {
		background: linear-gradient(to right, #4f46e5 0%, #4f46e5 100%);
	}

	.widgets-grid :global(.slider::-webkit-slider-thumb) {
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #ffffff;
		cursor: pointer;
		border: 2px solid #4f46e5;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.widgets-grid :global(.slider::-moz-range-thumb) {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #ffffff;
		cursor: pointer;
		border: 2px solid #4f46e5;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.widgets-grid :global(.slider::-webkit-slider-track) {
		height: 8px;
		border-radius: 4px;
		background: #374151;
	}

	.widgets-grid :global(.slider::-moz-range-track) {
		height: 8px;
		border-radius: 4px;
		background: #374151;
	}
</style>
