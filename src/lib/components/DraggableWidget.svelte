<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';

	export let id: string; // Unique identifier for this widget
	export let title: string = '';

	let isCollapsed = false;
	let isDragging = false;
	let isTouching = false;
	let touchStartTimer: number | null = null;
	let autoScrollTimer: number | null = null;
	let dragHandleElement: HTMLElement;
	const dispatch = createEventDispatcher();

	// Auto-scroll configuration
	const SCROLL_THRESHOLD = 100; // Distance from edge to start scrolling (px)
	const MAX_SCROLL_SPEED = 20; // Maximum scroll speed (px per frame)

	// Load collapse state from localStorage
	onMount(() => {
		if (browser) {
			const savedCollapsed = localStorage.getItem(`widget-${id}-collapsed`);
			if (savedCollapsed !== null) {
				isCollapsed = savedCollapsed === 'true';
			}
		}
	});

	// Save collapse state to localStorage
	function saveCollapseState() {
		if (browser) {
			localStorage.setItem(`widget-${id}-collapsed`, String(isCollapsed));
		}
	}

	function toggleCollapse() {
		isCollapsed = !isCollapsed;
		saveCollapseState();
	}

	function handleDragStart(event: DragEvent) {
		// Only allow drag if started from the drag handle
		const target = event.target as HTMLElement;
		if (!target.classList.contains('drag-handle')) {
			event.preventDefault();
			return;
		}

		isDragging = true;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', id);
		}
		dispatch('dragstart');
	}

	function handleDragEnd() {
		isDragging = false;
		dispatch('dragend');
	}

	function handleMouseDown(event: MouseEvent) {
		// Prevent dragging if not clicking on the drag handle
		const target = event.target as HTMLElement;
		if (!target.classList.contains('drag-handle')) {
			event.stopPropagation();
		}
	}

	// Touch events for mobile support
	function handleTouchStart(event: TouchEvent) {
		const target = event.target as HTMLElement;
		if (!target.classList.contains('drag-handle')) {
			return;
		}

		isTouching = true;
		
		// Start a timer for long press (500ms)
		touchStartTimer = window.setTimeout(() => {
			if (isTouching) {
				// Trigger haptic feedback if available
				if (navigator.vibrate) {
					navigator.vibrate(50);
				}
				
				// Simulate drag start for touch
				isDragging = true;
				dispatch('dragstart');
				
				// Prevent default to avoid text selection
				event.preventDefault();
			}
		}, 500);
	}

	function handleTouchMove(event: TouchEvent) {
		if (!isDragging || !isTouching) {
			return;
		}

		// Prevent default scrolling while dragging
		event.preventDefault();
		
		const touch = event.touches[0];
		const touchY = touch.clientY;
		
		// Handle auto-scrolling near viewport edges
		const viewportHeight = window.innerHeight;
		const distanceFromTop = touchY;
		const distanceFromBottom = viewportHeight - touchY;

		// Clear existing auto-scroll
		if (autoScrollTimer !== null) {
			cancelAnimationFrame(autoScrollTimer);
			autoScrollTimer = null;
		}

		// Start auto-scroll if near top or bottom
		if (distanceFromTop < SCROLL_THRESHOLD || distanceFromBottom < SCROLL_THRESHOLD) {
			autoScroll(distanceFromTop, distanceFromBottom);
		}
		
		// Find the column under the touch point
		const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
		if (elementAtPoint) {
			const column = elementAtPoint.closest('.widget-column');
			if (column) {
				// Dispatch a custom event to update drop indicator
				const dragOverEvent = new CustomEvent('touchdragover', {
					detail: { clientX: touch.clientX, clientY: touch.clientY, columnElement: column }
				});
				column.dispatchEvent(dragOverEvent);
			}
		}
	}

	function autoScroll(distanceFromTop: number, distanceFromBottom: number) {
		let scrollSpeed = 0;

		if (distanceFromTop < SCROLL_THRESHOLD) {
			// Scroll up - speed increases as we get closer to top
			const intensity = 1 - (distanceFromTop / SCROLL_THRESHOLD);
			scrollSpeed = -intensity * MAX_SCROLL_SPEED;
		} else if (distanceFromBottom < SCROLL_THRESHOLD) {
			// Scroll down - speed increases as we get closer to bottom
			const intensity = 1 - (distanceFromBottom / SCROLL_THRESHOLD);
			scrollSpeed = intensity * MAX_SCROLL_SPEED;
		}

		if (scrollSpeed !== 0) {
			window.scrollBy(0, scrollSpeed);
			
			// Continue auto-scrolling
			autoScrollTimer = requestAnimationFrame(() => {
				if (isDragging && isTouching) {
					// Get current touch position (we need to maintain it)
					const currentTouch = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
					if (currentTouch) {
						autoScroll(distanceFromTop, distanceFromBottom);
					}
				}
			});
		}
	}

	function handleTouchEnd(event: TouchEvent) {
		// Clear the long press timer
		if (touchStartTimer !== null) {
			clearTimeout(touchStartTimer);
			touchStartTimer = null;
		}

		// Clear auto-scroll timer
		if (autoScrollTimer !== null) {
			cancelAnimationFrame(autoScrollTimer);
			autoScrollTimer = null;
		}

		if (isDragging && isTouching) {
			// Get the final touch position
			const touch = event.changedTouches[0];
			const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);
			
			if (elementAtPoint) {
				const column = elementAtPoint.closest('.widget-column');
				if (column) {
					// Trigger drop event
					const dropEvent = new CustomEvent('touchdrop', {
						detail: { clientX: touch.clientX, clientY: touch.clientY }
					});
					column.dispatchEvent(dropEvent);
				}
			}

			isDragging = false;
			dispatch('dragend');
		}

		isTouching = false;
	}

	function handleTouchCancel() {
		// Clear the long press timer
		if (touchStartTimer !== null) {
			clearTimeout(touchStartTimer);
			touchStartTimer = null;
		}

		// Clear auto-scroll timer
		if (autoScrollTimer !== null) {
			cancelAnimationFrame(autoScrollTimer);
			autoScrollTimer = null;
		}

		if (isDragging) {
			isDragging = false;
			dispatch('dragend');
		}

		isTouching = false;
	}
</script>

<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<div
	class="widget"
	class:collapsed={isCollapsed}
	class:dragging={isDragging}
	draggable="false"
	on:mousedown={handleMouseDown}
	role="region"
	aria-label={title}
>
	<div class="widget-header">
		<span 
			bind:this={dragHandleElement}
			class="drag-handle" 
			class:touching={isTouching && !isDragging}
			draggable="true"
			on:dragstart={handleDragStart}
			on:dragend={handleDragEnd}
			on:touchstart={handleTouchStart}
			on:touchmove={handleTouchMove}
			on:touchend={handleTouchEnd}
			on:touchcancel={handleTouchCancel}
			title="Drag to move widget"
			role="button"
			tabindex="0"
		>⠿</span>
		<h3 class="widget-title">{title}</h3>
		<button 
			class="collapse-button" 
			class:collapsed={isCollapsed}
			on:click={toggleCollapse} 
			aria-label={isCollapsed ? 'Expand widget' : 'Collapse widget'}
		>
			▼
		</button>
	</div>
	{#if !isCollapsed}
		<div class="widget-content">
			<slot />
		</div>
	{/if}
</div>

<style>
	.widget {
		background: rgb(31, 41, 55);
		border: 2px solid rgb(55, 65, 81);
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		overflow: hidden;
		width: 100%;
		transition: all 0.2s ease;
	}

	.widget:hover {
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		border-color: rgb(75, 85, 99);
	}

	.widget.dragging {
		opacity: 0.6;
		cursor: grabbing;
		transform: scale(1.05) rotate(2deg);
		box-shadow: 0 12px 36px rgba(99, 102, 241, 0.4);
		border-color: rgb(99, 102, 241);
	}

	.widget-header {
		background: rgb(17, 24, 39);
		border-bottom: 1px solid rgb(55, 65, 81);
		padding: 12px 16px;
		display: flex;
		gap: 12px;
		align-items: center;
		user-select: none;
	}

	.drag-handle {
		color: rgb(156, 163, 175);
		font-size: 1.25rem;
		cursor: grab;
		flex-shrink: 0;
		transition: all 0.2s;
		padding: 8px;
		border-radius: 4px;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
		touch-action: none;
	}

	.drag-handle:hover {
		color: rgb(209, 213, 219);
		background: rgba(75, 85, 99, 0.3);
	}

	.drag-handle.touching {
		background: rgba(99, 102, 241, 0.2);
		color: rgb(99, 102, 241);
		transform: scale(1.1);
	}

	.widget.dragging .drag-handle {
		cursor: grabbing;
		color: rgb(99, 102, 241);
	}

	@media (hover: none) and (pointer: coarse) {
		/* Increase touch target size on touch devices */
		.drag-handle {
			padding: 12px;
			font-size: 1.5rem;
		}
	}

	.widget-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: white;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		pointer-events: none;
	}

	.collapse-button {
		background: none;
		border: none;
		color: rgb(156, 163, 175);
		font-size: 1rem;
		cursor: pointer;
		padding: 4px 8px;
		transition: all 0.3s ease;
		flex-shrink: 0;
		transform: rotate(0deg);
	}

	.collapse-button.collapsed {
		transform: rotate(-90deg);
	}

	.collapse-button:hover {
		color: rgb(209, 213, 219);
	}

	.widget-content {
		padding: 16px;
		overflow: auto;
		max-height: calc(100vh - 100px);
		pointer-events: auto;
	}
</style>
