<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	
	// Mathematical constants from the Platonic Space
	const E = Math.E; // 2.71828...
	const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio 1.618...
	const PI = Math.PI;
	const FEIGENBAUM = 4.669201609; // Feigenbaum constant
	
	// Prime numbers - the cicada pattern (13, 17 years)
	const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];
	
	// Fibonacci sequence - appears everywhere in nature
	const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];
	
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let animationId: number;
	let time = 0;
	let mounted = false;
	
	// Interface types - different "thin clients" to the Platonic Space
	type InterfaceType = 'mathematics' | 'biology' | 'mind' | 'physics' | 'computation';
	let selectedInterface: InterfaceType = 'mathematics';
	let interfaceStrength = 0.5; // How strongly the interface pulls patterns
	let showConnections = true;
	let activePatterns: string[] = [];
	
	// Patterns that "ingress" through different interfaces
	const patternManifestations: Record<InterfaceType, { patterns: string[]; description: string; icon: string }> = {
		mathematics: {
			patterns: ['Prime Distribution', 'Golden Spiral', 'Euler\'s Identity', 'Symmetry Groups'],
			description: 'Mathematicians can perhaps interact with these patterns directly - they have their own new sense.',
			icon: '∞'
		},
		biology: {
			patterns: ['Cicada Cycles (13, 17yr)', 'Fibonacci in Flowers', 'Fractal Branching', 'Cellular Automata'],
			description: 'Biology exploits these truths as free lunches - evolution didn\'t have to pay for them.',
			icon: '🧬'
		},
		mind: {
			patterns: ['Delayed Gratification', 'Problem Solving', 'Associative Learning', 'Goal Directedness'],
			description: 'Higher agency patterns that we recognize as kinds of minds - behavioral competencies.',
			icon: '🧠'
		},
		physics: {
			patterns: ['Conservation Laws', 'Symmetry Breaking', 'Wave Interference', 'Quantum Superposition'],
			description: 'Physics is constrained by these patterns - they determine what\'s possible.',
			icon: '⚛️'
		},
		computation: {
			patterns: ['Turing Universality', 'NAND Completeness', 'Halting Problem', 'Emergence'],
			description: 'Even simple computational interfaces benefit from free lunches in that space.',
			icon: '💻'
		}
	};
	
	// Platonic objects floating in the space
	interface PlatonicObject {
		x: number;
		y: number;
		z: number; // Depth for parallax
		size: number;
		type: 'prime' | 'fibonacci' | 'spiral' | 'symmetry' | 'wave';
		value: number;
		angle: number;
		pulsePhase: number;
		connected: boolean;
	}
	
	let platonicObjects: PlatonicObject[] = [];
	
	// Initialize the Platonic Space with mathematical objects
	function initPlatonicSpace() {
		platonicObjects = [];
		
		// Add prime number objects
		PRIMES.slice(0, 10).forEach((prime, i) => {
			platonicObjects.push({
				x: 0.2 + Math.random() * 0.6,
				y: 0.1 + Math.random() * 0.3,
				z: 0.5 + Math.random() * 0.5,
				size: 15 + prime * 0.5,
				type: 'prime',
				value: prime,
				angle: (i / 10) * Math.PI * 2,
				pulsePhase: Math.random() * Math.PI * 2,
				connected: false
			});
		});
		
		// Add Fibonacci objects
		FIBONACCI.slice(0, 8).forEach((fib, i) => {
			platonicObjects.push({
				x: 0.15 + Math.random() * 0.7,
				y: 0.3 + Math.random() * 0.3,
				z: 0.3 + Math.random() * 0.7,
				size: 10 + Math.log(fib) * 5,
				type: 'fibonacci',
				value: fib,
				angle: (i / 8) * Math.PI * 2,
				pulsePhase: Math.random() * Math.PI * 2,
				connected: false
			});
		});
		
		// Add spiral/golden ratio objects
		for (let i = 0; i < 5; i++) {
			platonicObjects.push({
				x: 0.3 + Math.random() * 0.4,
				y: 0.5 + Math.random() * 0.3,
				z: 0.4 + Math.random() * 0.6,
				size: 25 + Math.random() * 15,
				type: 'spiral',
				value: PHI,
				angle: (i / 5) * Math.PI * 2,
				pulsePhase: Math.random() * Math.PI * 2,
				connected: false
			});
		}
		
		// Add symmetry group objects
		for (let i = 0; i < 4; i++) {
			platonicObjects.push({
				x: 0.1 + Math.random() * 0.8,
				y: 0.6 + Math.random() * 0.3,
				z: 0.6 + Math.random() * 0.4,
				size: 20 + Math.random() * 10,
				type: 'symmetry',
				value: i + 3, // Symmetry order
				angle: (i / 4) * Math.PI * 2,
				pulsePhase: Math.random() * Math.PI * 2,
				connected: false
			});
		}
	}
	
	function draw() {
		if (!ctx || !canvas) return;
		
		const w = canvas.width;
		const h = canvas.height;
		
		// Clear with slight trail effect
		ctx.fillStyle = 'rgba(10, 10, 20, 0.15)';
		ctx.fillRect(0, 0, w, h);
		
		// Draw the Platonic Space background (ethereal grid)
		drawPlatonicGrid(w, h);
		
		// Draw connections between patterns (if enabled)
		if (showConnections) {
			drawPatternConnections(w, h);
		}
		
		// Draw the floating Platonic objects
		platonicObjects.forEach((obj, i) => {
			drawPlatonicObject(obj, w, h, i);
		});
		
		// Draw the interface at the bottom
		drawInterface(w, h);
		
		// Draw ingressing patterns (flowing down from Platonic space to interface)
		drawIngressingPatterns(w, h);
		
		time += 0.016;
	}
	
	function drawPlatonicGrid(w: number, h: number) {
		ctx.strokeStyle = 'rgba(139, 92, 246, 0.05)';
		ctx.lineWidth = 1;
		
		// Perspective grid suggesting depth
		const gridSize = 40;
		const horizon = h * 0.2;
		
		for (let x = 0; x < w; x += gridSize) {
			ctx.beginPath();
			ctx.moveTo(x, horizon);
			ctx.lineTo(w/2 + (x - w/2) * 0.3, 0);
			ctx.stroke();
		}
		
		for (let y = horizon; y < h * 0.85; y += gridSize * 0.5) {
			const progress = (y - horizon) / (h * 0.65);
			ctx.globalAlpha = 0.05 + progress * 0.1;
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(w, y);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}
	
	function drawPlatonicObject(obj: PlatonicObject, w: number, h: number, index: number) {
		const pulse = Math.sin(time * 2 + obj.pulsePhase) * 0.3 + 0.7;
		const x = obj.x * w + Math.sin(time * 0.5 + obj.angle) * 20 * obj.z;
		const y = obj.y * h * 0.7 + Math.cos(time * 0.3 + obj.angle) * 15 * obj.z;
		const size = obj.size * obj.z * pulse;
		
		// Update connection state based on interface strength
		obj.connected = Math.random() < interfaceStrength * 0.1;
		
		// Glow effect
		const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
		
		let color1: string, color2: string;
		switch (obj.type) {
			case 'prime':
				color1 = 'rgba(139, 92, 246, 0.8)';
				color2 = 'rgba(139, 92, 246, 0)';
				break;
			case 'fibonacci':
				color1 = 'rgba(34, 197, 94, 0.8)';
				color2 = 'rgba(34, 197, 94, 0)';
				break;
			case 'spiral':
				color1 = 'rgba(236, 72, 153, 0.8)';
				color2 = 'rgba(236, 72, 153, 0)';
				break;
			case 'symmetry':
				color1 = 'rgba(6, 182, 212, 0.8)';
				color2 = 'rgba(6, 182, 212, 0)';
				break;
			default:
				color1 = 'rgba(255, 255, 255, 0.8)';
				color2 = 'rgba(255, 255, 255, 0)';
		}
		
		gradient.addColorStop(0, color1);
		gradient.addColorStop(1, color2);
		
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.arc(x, y, size, 0, Math.PI * 2);
		ctx.fill();
		
		// Draw the object shape
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(time * 0.5 + obj.angle);
		
		ctx.strokeStyle = color1.replace('0.8', '1');
		ctx.lineWidth = 2;
		
		switch (obj.type) {
			case 'prime':
				// Draw prime symbol (number in circle)
				ctx.font = `${size * 0.8}px monospace`;
				ctx.fillStyle = 'white';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillText(obj.value.toString(), 0, 0);
				break;
				
			case 'fibonacci':
				// Draw spiral segments
				ctx.beginPath();
				for (let i = 0; i < 8; i++) {
					const a = i * Math.PI / 4;
					const r = size * 0.3 * Math.pow(PHI, i / 3);
					ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
				}
				ctx.stroke();
				break;
				
			case 'spiral':
				// Draw golden spiral
				ctx.beginPath();
				for (let a = 0; a < Math.PI * 4; a += 0.1) {
					const r = size * 0.1 * Math.pow(E, 0.15 * a);
					ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
				}
				ctx.stroke();
				break;
				
			case 'symmetry':
				// Draw symmetry pattern (polygon)
				const sides = obj.value;
				ctx.beginPath();
				for (let i = 0; i <= sides; i++) {
					const a = (i / sides) * Math.PI * 2;
					const r = size * 0.6;
					if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
					else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
				}
				ctx.stroke();
				break;
		}
		
		ctx.restore();
	}
	
	function drawPatternConnections(w: number, h: number) {
		ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
		ctx.lineWidth = 1;
		
		for (let i = 0; i < platonicObjects.length; i++) {
			for (let j = i + 1; j < platonicObjects.length; j++) {
				const obj1 = platonicObjects[i];
				const obj2 = platonicObjects[j];
				
				const x1 = obj1.x * w + Math.sin(time * 0.5 + obj1.angle) * 20 * obj1.z;
				const y1 = obj1.y * h * 0.7 + Math.cos(time * 0.3 + obj1.angle) * 15 * obj1.z;
				const x2 = obj2.x * w + Math.sin(time * 0.5 + obj2.angle) * 20 * obj2.z;
				const y2 = obj2.y * h * 0.7 + Math.cos(time * 0.3 + obj2.angle) * 15 * obj2.z;
				
				const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
				
				if (dist < 150) {
					const alpha = (1 - dist / 150) * 0.2;
					ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
					ctx.beginPath();
					ctx.moveTo(x1, y1);
					ctx.lineTo(x2, y2);
					ctx.stroke();
				}
			}
		}
	}
	
	function drawInterface(w: number, h: number) {
		const interfaceY = h * 0.85;
		const interfaceHeight = h * 0.12;
		
		// Interface container (the "thin client")
		const gradient = ctx.createLinearGradient(0, interfaceY, 0, h);
		gradient.addColorStop(0, 'rgba(30, 30, 60, 0.9)');
		gradient.addColorStop(1, 'rgba(20, 20, 40, 0.95)');
		
		ctx.fillStyle = gradient;
		ctx.beginPath();
		ctx.roundRect(w * 0.1, interfaceY, w * 0.8, interfaceHeight, 15);
		ctx.fill();
		
		// Interface border glow
		const borderGlow = ctx.createLinearGradient(w * 0.1, interfaceY, w * 0.9, interfaceY);
		borderGlow.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
		borderGlow.addColorStop(0.5, 'rgba(236, 72, 153, 0.5)');
		borderGlow.addColorStop(1, 'rgba(99, 102, 241, 0.5)');
		
		ctx.strokeStyle = borderGlow;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(w * 0.1, interfaceY, w * 0.8, interfaceHeight, 15);
		ctx.stroke();
		
		// Interface label
		ctx.font = '14px system-ui';
		ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
		ctx.textAlign = 'center';
		ctx.fillText(`${patternManifestations[selectedInterface].icon} ${selectedInterface.toUpperCase()} INTERFACE`, w / 2, interfaceY + 25);
		ctx.font = '11px system-ui';
		ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
		ctx.fillText('(Thin Client to Platonic Space)', w / 2, interfaceY + 42);
		
		// Draw active patterns pulled through
		const patterns = patternManifestations[selectedInterface].patterns;
		const patternSpacing = (w * 0.7) / patterns.length;
		
		patterns.forEach((pattern, i) => {
			const px = w * 0.15 + i * patternSpacing + patternSpacing / 2;
			const py = interfaceY + interfaceHeight - 25;
			const isActive = Math.sin(time * 2 + i) > 1 - interfaceStrength * 2;
			
			if (isActive && !activePatterns.includes(pattern)) {
				activePatterns = [...activePatterns.slice(-5), pattern];
			}
			
			ctx.font = '10px system-ui';
			ctx.fillStyle = isActive ? 'rgba(139, 92, 246, 1)' : 'rgba(255, 255, 255, 0.4)';
			ctx.textAlign = 'center';
			ctx.fillText(pattern, px, py);
			
			if (isActive) {
				// Glow for active pattern
				ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
				ctx.shadowBlur = 10;
				ctx.fillText(pattern, px, py);
				ctx.shadowBlur = 0;
			}
		});
	}
	
	function drawIngressingPatterns(w: number, h: number) {
		// Draw flowing lines from Platonic objects to interface
		const interfaceY = h * 0.85;
		
		platonicObjects.forEach((obj, i) => {
			if (Math.random() > interfaceStrength * 0.3) return;
			
			const x = obj.x * w + Math.sin(time * 0.5 + obj.angle) * 20 * obj.z;
			const y = obj.y * h * 0.7 + Math.cos(time * 0.3 + obj.angle) * 15 * obj.z;
			
			const targetX = w * 0.2 + Math.random() * w * 0.6;
			const flowProgress = (time * 0.5 + i * 0.1) % 1;
			
			const gradient = ctx.createLinearGradient(x, y, targetX, interfaceY);
			
			let color: string;
			switch (obj.type) {
				case 'prime': color = '139, 92, 246'; break;
				case 'fibonacci': color = '34, 197, 94'; break;
				case 'spiral': color = '236, 72, 153'; break;
				case 'symmetry': color = '6, 182, 212'; break;
				default: color = '255, 255, 255';
			}
			
			gradient.addColorStop(0, `rgba(${color}, 0)`);
			gradient.addColorStop(flowProgress, `rgba(${color}, 0.6)`);
			gradient.addColorStop(Math.min(1, flowProgress + 0.1), `rgba(${color}, 0)`);
			
			ctx.strokeStyle = gradient;
			ctx.lineWidth = 2;
			ctx.beginPath();
			
			// Curved path
			const cpx = (x + targetX) / 2 + Math.sin(time + i) * 50;
			const cpy = (y + interfaceY) / 2;
			
			ctx.moveTo(x, y);
			ctx.quadraticCurveTo(cpx, cpy, targetX, interfaceY);
			ctx.stroke();
		});
	}
	
	function animate() {
		draw();
		animationId = requestAnimationFrame(animate);
	}
	
	onMount(() => {
		if (canvas) {
			ctx = canvas.getContext('2d')!;
			
			// Set canvas size
			const resizeCanvas = () => {
				const container = canvas.parentElement;
				if (container) {
					canvas.width = container.clientWidth;
					canvas.height = 500;
				}
			};
			
			resizeCanvas();
			window.addEventListener('resize', resizeCanvas);
			
			initPlatonicSpace();
			mounted = true;
			animate();
			
			return () => {
				window.removeEventListener('resize', resizeCanvas);
			};
		}
	});
	
	onDestroy(() => {
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
	});
	
	function selectInterface(type: InterfaceType) {
		selectedInterface = type;
		activePatterns = [];
	}
</script>

<div class="platonic-space-container">
	<div class="space-header">
		<h3>The Platonic Space</h3>
		<p class="header-subtitle">
			"There is a space of patterns that impact the physical world, but are not defined by what happens in the physical world."
		</p>
	</div>
	
	<div class="canvas-wrapper">
		<canvas bind:this={canvas} class="platonic-canvas"></canvas>
		
		<!-- Legend -->
		<div class="legend">
			<div class="legend-item">
				<span class="legend-dot prime"></span>
				<span>Prime Numbers</span>
			</div>
			<div class="legend-item">
				<span class="legend-dot fibonacci"></span>
				<span>Fibonacci</span>
			</div>
			<div class="legend-item">
				<span class="legend-dot spiral"></span>
				<span>Golden Ratio</span>
			</div>
			<div class="legend-item">
				<span class="legend-dot symmetry"></span>
				<span>Symmetry</span>
			</div>
		</div>
	</div>
	
	<!-- Interface Selector -->
	<div class="interface-selector">
		<div class="selector-label">Choose Your Interface (Thin Client)</div>
		<div class="interface-buttons">
			{#each Object.entries(patternManifestations) as [type, info]}
				<button
					class="interface-btn"
					class:active={selectedInterface === type}
					on:click={() => selectInterface(type as InterfaceType)}
				>
					<span class="interface-icon">{info.icon}</span>
					<span class="interface-name">{type}</span>
				</button>
			{/each}
		</div>
		<div class="interface-description">
			{patternManifestations[selectedInterface].description}
		</div>
	</div>
	
	<!-- Interface Strength -->
	<div class="strength-control">
		<label for="interface-strength">Interface Strength</label>
		<input
			id="interface-strength"
			type="range"
			min="0"
			max="1"
			step="0.01"
			bind:value={interfaceStrength}
		/>
		<span class="strength-value">{Math.round(interfaceStrength * 100)}%</span>
	</div>
	
	<!-- Active Patterns Feed -->
	<div class="patterns-feed">
		<div class="feed-label">Patterns Ingressing Through Interface:</div>
		<div class="feed-items">
			{#each activePatterns as pattern (pattern + Math.random())}
				<span class="feed-item" class:fade={activePatterns.indexOf(pattern) < activePatterns.length - 3}>
					{pattern}
				</span>
			{/each}
			{#if activePatterns.length === 0}
				<span class="feed-empty">Increase interface strength to pull patterns...</span>
			{/if}
		</div>
	</div>
	
	<!-- Options -->
	<div class="space-options">
		<label class="option-toggle">
			<input type="checkbox" bind:checked={showConnections} />
			<span class="toggle-slider"></span>
			<span>Show Pattern Connections</span>
		</label>
		<button class="reset-btn" on:click={initPlatonicSpace}>
			🔄 Regenerate Space
		</button>
	</div>
</div>

<style>
	.platonic-space-container {
		width: 100%;
		padding: 1.5rem;
		background: linear-gradient(135deg, rgba(17, 24, 39, 0.8), rgba(30, 27, 75, 0.6));
		border-radius: 16px;
		border: 1px solid rgba(139, 92, 246, 0.2);
	}

	@media (min-width: 1200px) {
		.platonic-space-container {
			padding: 2.5rem;
		}
	}
	
	.space-header {
		text-align: center;
		margin-bottom: 1.5rem;
	}
	
	.space-header h3 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
		background: linear-gradient(135deg, #8b5cf6, #ec4899);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	@media (min-width: 1200px) {
		.space-header h3 {
			font-size: 2rem;
		}
	}
	
	.header-subtitle {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		font-style: italic;
		margin: 0;
		max-width: 600px;
		margin: 0 auto;
	}

	@media (min-width: 1200px) {
		.header-subtitle {
			font-size: 1.1rem;
			max-width: 800px;
		}
	}
	
	.canvas-wrapper {
		position: relative;
		width: 100%;
		margin-bottom: 1.5rem;
	}
	
	.platonic-canvas {
		width: 100%;
		height: 500px;
		border-radius: 12px;
		background: linear-gradient(180deg, #0a0a14 0%, #151530 100%);
		box-shadow: 
			0 0 30px rgba(139, 92, 246, 0.2),
			inset 0 0 60px rgba(0, 0, 0, 0.5);
	}

	@media (min-width: 1200px) {
		.platonic-canvas {
			height: 600px;
		}
	}
	
	.legend {
		position: absolute;
		top: 10px;
		right: 10px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: rgba(0, 0, 0, 0.6);
		border-radius: 8px;
		backdrop-filter: blur(10px);
	}

	@media (min-width: 1200px) {
		.legend {
			padding: 1rem;
			gap: 0.75rem;
		}
	}
	
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.8);
	}

	@media (min-width: 1200px) {
		.legend-item {
			font-size: 0.9rem;
			gap: 0.75rem;
		}

		.legend-dot {
			width: 14px;
			height: 14px;
		}
	}
	
	.legend-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
	}
	
	.legend-dot.prime { background: #8b5cf6; }
	.legend-dot.fibonacci { background: #22c55e; }
	.legend-dot.spiral { background: #ec4899; }
	.legend-dot.symmetry { background: #06b6d4; }
	
	.interface-selector {
		margin-bottom: 1.5rem;
	}
	
	.selector-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		margin-bottom: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 1px;
		text-align: center;
	}

	@media (min-width: 1200px) {
		.selector-label {
			font-size: 1rem;
			margin-bottom: 1rem;
		}
	}
	
	.interface-buttons {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	@media (min-width: 1200px) {
		.interface-buttons {
			gap: 0.75rem;
			margin-bottom: 1.5rem;
		}
	}
	
	.interface-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 2px solid rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		color: white;
		cursor: pointer;
		transition: all 0.3s ease;
		min-width: 90px;
	}

	@media (min-width: 1200px) {
		.interface-btn {
			padding: 1rem 1.5rem;
			min-width: 120px;
			gap: 0.5rem;
		}
	}
	
	.interface-btn:hover {
		background: rgba(139, 92, 246, 0.1);
		border-color: rgba(139, 92, 246, 0.3);
		transform: translateY(-2px);
	}
	
	.interface-btn.active {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.2));
		border-color: #8b5cf6;
		box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
	}
	
	.interface-icon {
		font-size: 1.5rem;
	}

	@media (min-width: 1200px) {
		.interface-icon {
			font-size: 2rem;
		}
	}
	
	.interface-name {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	@media (min-width: 1200px) {
		.interface-name {
			font-size: 0.85rem;
		}
	}
	
	.interface-description {
		padding: 1rem;
		background: rgba(139, 92, 246, 0.1);
		border-radius: 8px;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
		text-align: center;
		border-left: 3px solid #8b5cf6;
		font-style: italic;
	}

	@media (min-width: 1200px) {
		.interface-description {
			padding: 1.25rem 1.5rem;
			font-size: 1.05rem;
			line-height: 1.6;
		}
	}
	
	.strength-control {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	@media (min-width: 1200px) {
		.strength-control {
			padding: 1.25rem 1.5rem;
		}
	}
	
	.strength-control label {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		white-space: nowrap;
	}

	@media (min-width: 1200px) {
		.strength-control label {
			font-size: 1rem;
		}
	}
	
	.strength-control input[type="range"] {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.2);
		outline: none;
		-webkit-appearance: none;
		appearance: none;
	}
	
	.strength-control input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #8b5cf6;
		cursor: pointer;
		box-shadow: 0 0 10px rgba(139, 92, 246, 0.5);
	}
	
	.strength-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #8b5cf6;
		min-width: 40px;
		text-align: right;
	}

	@media (min-width: 1200px) {
		.strength-value {
			font-size: 1rem;
			min-width: 50px;
		}
	}
	
	.patterns-feed {
		padding: 1rem;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	@media (min-width: 1200px) {
		.patterns-feed {
			padding: 1.25rem 1.5rem;
		}
	}
	
	.feed-label {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 1px;
		margin-bottom: 0.5rem;
	}

	@media (min-width: 1200px) {
		.feed-label {
			font-size: 0.875rem;
			margin-bottom: 0.75rem;
		}
	}
	
	.feed-items {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		min-height: 30px;
	}

	@media (min-width: 1200px) {
		.feed-items {
			gap: 0.75rem;
			min-height: 40px;
		}
	}
	
	.feed-item {
		padding: 0.25rem 0.75rem;
		background: rgba(139, 92, 246, 0.2);
		border: 1px solid rgba(139, 92, 246, 0.4);
		border-radius: 100px;
		font-size: 0.75rem;
		color: #a78bfa;
		animation: fadeIn 0.3s ease;
	}

	@media (min-width: 1200px) {
		.feed-item {
			padding: 0.35rem 1rem;
			font-size: 0.9rem;
		}
	}
	
	.feed-item.fade {
		opacity: 0.5;
	}
	
	.feed-empty {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.4);
		font-style: italic;
	}

	@media (min-width: 1200px) {
		.feed-empty {
			font-size: 0.95rem;
		}
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.space-options {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}
	
	.option-toggle {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.8);
	}
	
	.option-toggle input {
		display: none;
	}
	
	.toggle-slider {
		width: 40px;
		height: 22px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 11px;
		position: relative;
		transition: all 0.3s ease;
	}
	
	.toggle-slider::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		background: white;
		border-radius: 50%;
		transition: all 0.3s ease;
	}
	
	.option-toggle input:checked + .toggle-slider {
		background: #8b5cf6;
	}
	
	.option-toggle input:checked + .toggle-slider::after {
		transform: translateX(18px);
	}
	
	.reset-btn {
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		color: white;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.3s ease;
	}
	
	.reset-btn:hover {
		background: rgba(139, 92, 246, 0.2);
		border-color: rgba(139, 92, 246, 0.4);
	}
</style>
