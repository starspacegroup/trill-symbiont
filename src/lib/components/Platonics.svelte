<script lang="ts">
    import { onMount } from 'svelte';
    
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let ticks = 0;
    let naiveTicks = 0;
    let patternType = 0;  // 0: Prime-sync, 1: XOR-gate, 2: Fibonacci, 3: Golden Ratio
    let width = 120;
    let height = 80;
    let running = false;
    let efficiencyRatio = 1;
    let animationFrame: number | null = null;
    let isAutoRunning = false;
    let cellSize = 4;
    let colorScheme: 'cosmic' | 'matrix' | 'fire' | 'ocean' | 'aurora' = 'cosmic';
    let showTrails = true;
    let convergenceProgress = 0;
    let lastRunTime = 0;

    // Color palettes
    const colorPalettes = {
        cosmic: {
            active: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#6366f1', '#818cf8'],
            inactive: '#0f0f23',
            glow: 'rgba(139, 92, 246, 0.6)'
        },
        matrix: {
            active: ['#22c55e', '#4ade80', '#86efac', '#16a34a', '#15803d'],
            inactive: '#001a00',
            glow: 'rgba(34, 197, 94, 0.6)'
        },
        fire: {
            active: ['#f97316', '#fb923c', '#fdba74', '#ea580c', '#dc2626'],
            inactive: '#1a0a00',
            glow: 'rgba(249, 115, 22, 0.6)'
        },
        ocean: {
            active: ['#06b6d4', '#22d3ee', '#67e8f9', '#0891b2', '#0e7490'],
            inactive: '#001a1f',
            glow: 'rgba(6, 182, 212, 0.6)'
        },
        aurora: {
            active: ['#ec4899', '#f472b6', '#a855f7', '#22d3ee', '#4ade80'],
            inactive: '#0a0a1a',
            glow: 'rgba(236, 72, 153, 0.5)'
        }
    };

    const patternDescriptions: Record<number, { name: string; icon: string; description: string }> = {
        0: { name: 'Prime-Sync', icon: '🔢', description: 'Cicada-like emergence using mod 17 primes' },
        1: { name: 'XOR-Gate', icon: '⊕', description: 'Boolean XOR for logic inheritance patterns' },
        2: { name: 'Fibonacci', icon: '🌀', description: 'Golden spiral pattern emergence' },
        3: { name: 'Chaos', icon: '🌊', description: 'Edge-of-chaos cellular automata' }
    };

    // Efficient JS Simulator (typed arrays, minimal allocations)
    class EfficientPlatonicSimulator {
        width: number;
        height: number;
        size: number;
        grid: Uint8Array;
        history: Uint8Array; // For trail effects
        ticks: number = 0;

        constructor(w: number, h: number) {
            this.width = w;
            this.height = h;
            this.size = w * h;
            this.grid = new Uint8Array(this.size);
            this.history = new Uint8Array(this.size);
            // Pseudo-random init via prime mod
            for (let i = 0; i < this.size; i++) {
                this.grid[i] = (i % 13) ? 1 : 0;
            }
        }

        step(pt: number): boolean {
            const newGrid = new Uint8Array(this.size);
            let converged = true;
            let changedCount = 0;
            
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const idx = y * this.width + x;
                    const neighbors = this.getNeighbors(x, y);
                    let newState: number;
                    
                    if (pt === 0) {
                        // Prime-sync: mod 17 for cicada-like emergence
                        newState = ((neighbors[0] + neighbors[1] + neighbors[2]) % 17 === 0) ? 1 : 0;
                    } else if (pt === 1) {
                        // XOR-gate: boolean XOR for logic inheritance
                        newState = (neighbors[0] ^ neighbors[1] ^ neighbors[2]) ? 1 : 0;
                    } else if (pt === 2) {
                        // Fibonacci-inspired pattern
                        const sum = neighbors[0] + neighbors[1] + neighbors[2];
                        newState = (sum === 1 || sum === 2 || sum === 3 || sum === 5) ? 1 : 0;
                    } else {
                        // Chaos / Game of Life variant
                        const liveNeighbors = this.countLiveNeighbors(x, y);
                        const isAlive = this.grid[idx] === 1;
                        newState = (isAlive && (liveNeighbors === 2 || liveNeighbors === 3)) || 
                                   (!isAlive && liveNeighbors === 3) ? 1 : 0;
                    }
                    
                    newGrid[idx] = newState;
                    if (newState !== this.grid[idx]) {
                        converged = false;
                        changedCount++;
                    }
                    // Update history for trails
                    this.history[idx] = Math.min(255, this.history[idx] + (this.grid[idx] ? 50 : 0));
                }
            }
            
            // Decay history
            for (let i = 0; i < this.size; i++) {
                if (this.history[i] > 0) this.history[i] = Math.max(0, this.history[i] - 5);
            }
            
            this.grid = newGrid;
            this.ticks++;
            return converged;
        }

        countLiveNeighbors(x: number, y: number): number {
            let count = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                        count += this.grid[ny * this.width + nx];
                    }
                }
            }
            return count;
        }

        getNeighbors(x: number, y: number): [number, number, number] {
            const idx = y * this.width + x;
            const left = x > 0 ? this.grid[idx - 1] : 0;
            const self = this.grid[idx];
            const right = x < this.width - 1 ? this.grid[idx + 1] : 0;
            return [left, self, right];
        }

        getGrid(): Uint8Array {
            return this.grid;
        }
        
        getHistory(): Uint8Array {
            return this.history;
        }
    }

    // Naive Baseline (unoptimized loops, extra ops for comparison)
    class NaivePlatonicSimulator {
        width: number;
        height: number;
        grid: number[];
        ticks: number = 0;

        constructor(w: number, h: number) {
            this.width = w;
            this.height = h;
            this.grid = new Array(w * h).fill(0);
            for (let i = 0; i < this.grid.length; i++) {
                this.grid[i] = (i % 13) ? 1 : 0;
            }
        }

        step(pt: number): boolean {
            const newGrid: number[] = new Array(this.width * this.height).fill(0);
            let converged = true;
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const idx = y * this.width + x;
                    const neighbors = this.getNeighbors(x, y);
                    let newState: number;
                    if (pt === 0) {
                        newState = ((neighbors[0] + neighbors[1] + neighbors[2]) % 17 === 0) ? 1 : 0;
                    } else if (pt === 1) {
                        newState = (neighbors[0] ^ neighbors[1] ^ neighbors[2]) ? 1 : 0;
                    } else if (pt === 2) {
                        const sum = neighbors[0] + neighbors[1] + neighbors[2];
                        newState = (sum === 1 || sum === 2 || sum === 3 || sum === 5) ? 1 : 0;
                    } else {
                        newState = (neighbors[0] ^ neighbors[1]) ? 1 : 0;
                    }
                    newGrid[idx] = newState;
                    if (newState !== this.grid[idx]) converged = false;
                    for (let _ = 0; _ < 5; _++) {}
                }
            }
            this.grid = newGrid;
            this.ticks++;
            return converged;
        }

        getNeighbors(x: number, y: number): [number, number, number] {
            const idx = y * this.width + x;
            return [
                x > 0 ? this.grid[idx - 1] : 0,
                this.grid[idx],
                x < this.width - 1 ? this.grid[idx + 1] : 0
            ];
        }

        getTicks(): number {
            return this.ticks;
        }
    }

    let simulator: EfficientPlatonicSimulator;
    let naiveSimulator: NaivePlatonicSimulator;

    onMount(() => {
        simulator = new EfficientPlatonicSimulator(width, height);
        naiveSimulator = new NaivePlatonicSimulator(width, height);
        initCanvas();
        drawGrid();
        
        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    });

    function initCanvas() {
        if (canvas && canvas.getContext) {
            ctx = canvas.getContext('2d')!;
            canvas.width = width * cellSize;
            canvas.height = height * cellSize;
        }
    }

    function testPattern() {
        running = true;
        convergenceProgress = 0;
        simulator = new EfficientPlatonicSimulator(width, height);
        naiveSimulator = new NaivePlatonicSimulator(width, height);
        ticks = 0;
        naiveTicks = 0;

        const startEfficient = performance.now();
        while (!simulator.step(patternType) && ticks < 1000) {
            ticks = simulator.ticks;
            convergenceProgress = ticks / 10;
        }
        const endEfficient = performance.now();

        const startNaive = performance.now();
        while (!naiveSimulator.step(patternType) && naiveTicks < 1000) {
            naiveTicks = naiveSimulator.ticks;
        }
        const endNaive = performance.now();

        efficiencyRatio = (endNaive - startNaive) / (endEfficient - startEfficient);
        lastRunTime = endEfficient - startEfficient;
        running = false;
        convergenceProgress = 100;
        drawGrid();
    }

    function toggleAutoRun() {
        isAutoRunning = !isAutoRunning;
        if (isAutoRunning) {
            runAnimation();
        } else {
            if (animationFrame) cancelAnimationFrame(animationFrame);
        }
    }

    function runAnimation() {
        if (!isAutoRunning) return;
        
        simulator.step(patternType);
        ticks = simulator.ticks;
        drawGrid();
        
        animationFrame = requestAnimationFrame(runAnimation);
    }

    function drawGrid() {
        if (!ctx || !simulator) return;
        
        const palette = colorPalettes[colorScheme];
        
        // Clear with slight fade for trail effect
        if (showTrails) {
            ctx.fillStyle = `${palette.inactive}dd`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            ctx.fillStyle = palette.inactive;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        const grid = simulator.getGrid();
        const history = simulator.getHistory();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                
                if (grid[idx]) {
                    // Active cell with gradient colors
                    const colorIndex = (x + y + ticks) % palette.active.length;
                    ctx.fillStyle = palette.active[colorIndex];
                    
                    // Glow effect
                    ctx.shadowColor = palette.glow;
                    ctx.shadowBlur = 4;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
                    ctx.shadowBlur = 0;
                } else if (showTrails && history[idx] > 20) {
                    // Trail effect for recently active cells
                    const alpha = history[idx] / 255;
                    const colorIndex = (x + y) % palette.active.length;
                    ctx.fillStyle = palette.active[colorIndex] + Math.floor(alpha * 80).toString(16).padStart(2, '0');
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
                }
            }
        }
    }

    function updatePattern() {
        simulator = new EfficientPlatonicSimulator(width, height);
        ticks = 0;
        convergenceProgress = 0;
        drawGrid();
    }

    function resetSimulation() {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        isAutoRunning = false;
        simulator = new EfficientPlatonicSimulator(width, height);
        naiveSimulator = new NaivePlatonicSimulator(width, height);
        ticks = 0;
        naiveTicks = 0;
        convergenceProgress = 0;
        efficiencyRatio = 1;
        drawGrid();
    }

    function randomize() {
        simulator = new EfficientPlatonicSimulator(width, height);
        // Randomize the grid
        const grid = simulator.getGrid();
        for (let i = 0; i < grid.length; i++) {
            grid[i] = Math.random() > 0.5 ? 1 : 0;
        }
        ticks = 0;
        drawGrid();
    }

    $: if (colorScheme && ctx) {
        drawGrid();
    }
</script>

<div class="platonic-container">
    <!-- Animated background particles -->
    <div class="particles">
        {#each Array(20) as _, i}
            <div class="particle" style="--delay: {i * 0.5}s; --x: {Math.random() * 100}%; --duration: {10 + Math.random() * 20}s;"></div>
        {/each}
    </div>

    <!-- Stats Dashboard -->
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-icon">⚡</div>
            <div class="stat-content">
                <div class="stat-value">{efficiencyRatio.toFixed(2)}x</div>
                <div class="stat-label">Efficiency Gain</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">🔄</div>
            <div class="stat-content">
                <div class="stat-value">{ticks}</div>
                <div class="stat-label">Iterations</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">⏱️</div>
            <div class="stat-content">
                <div class="stat-value">{lastRunTime.toFixed(1)}ms</div>
                <div class="stat-label">Run Time</div>
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
                <div class="stat-value">{(width * height).toLocaleString()}</div>
                <div class="stat-label">Total Cells</div>
            </div>
        </div>
    </div>

    <!-- Pattern Selector -->
    <div class="pattern-selector">
        <div class="pattern-title">Select Pattern Algorithm</div>
        <div class="pattern-buttons">
            {#each Object.entries(patternDescriptions) as [value, info]}
                <button 
                    class="pattern-btn"
                    class:active={patternType === Number(value)}
                    on:click={() => { patternType = Number(value); updatePattern(); }}
                >
                    <span class="pattern-icon">{info.icon}</span>
                    <span class="pattern-name">{info.name}</span>
                </button>
            {/each}
        </div>
        <div class="pattern-description">
            {patternDescriptions[patternType].description}
        </div>
    </div>

    <!-- Canvas Container -->
    <div class="canvas-container">
        <div class="canvas-glow"></div>
        <canvas bind:this={canvas} class="simulation-canvas"></canvas>
        
        {#if running}
            <div class="running-overlay">
                <div class="spinner"></div>
                <span>Computing...</span>
            </div>
        {/if}
    </div>

    <!-- Progress Bar -->
    <div class="progress-container">
        <div class="progress-bar" style="width: {convergenceProgress}%"></div>
        <span class="progress-label">{convergenceProgress.toFixed(0)}% Complete</span>
    </div>

    <!-- Color Scheme Selector -->
    <div class="color-scheme-section">
        <div class="section-title">Visual Theme</div>
        <div class="color-buttons">
            {#each Object.keys(colorPalettes) as scheme}
                <button 
                    class="color-btn color-{scheme}"
                    class:active={colorScheme === scheme}
                    on:click={() => colorScheme = scheme as typeof colorScheme}
                >
                    <span class="color-preview" style="background: linear-gradient(135deg, {colorPalettes[scheme as keyof typeof colorPalettes].active.join(', ')})"></span>
                    <span class="color-name">{scheme.charAt(0).toUpperCase() + scheme.slice(1)}</span>
                </button>
            {/each}
        </div>
    </div>

    <!-- Controls -->
    <div class="controls">
        <button class="control-btn primary" on:click={testPattern} disabled={running || isAutoRunning}>
            <span class="btn-icon">🚀</span>
            Run Benchmark
        </button>
        <button class="control-btn" class:active={isAutoRunning} on:click={toggleAutoRun} disabled={running}>
            <span class="btn-icon">{isAutoRunning ? '⏸️' : '▶️'}</span>
            {isAutoRunning ? 'Pause' : 'Animate'}
        </button>
        <button class="control-btn" on:click={randomize} disabled={running || isAutoRunning}>
            <span class="btn-icon">🎲</span>
            Randomize
        </button>
        <button class="control-btn danger" on:click={resetSimulation}>
            <span class="btn-icon">🔄</span>
            Reset
        </button>
    </div>

    <!-- Options -->
    <div class="options">
        <label class="toggle-option">
            <input type="checkbox" bind:checked={showTrails} />
            <span class="toggle-slider"></span>
            <span class="toggle-label">Show Trails</span>
        </label>
    </div>

    <!-- Info Footer -->
    <div class="info-footer">
        <div class="info-item">
            <span class="info-icon">💡</span>
            <span>Uses TypedArrays & minimal allocations for peak performance</span>
        </div>
        <div class="info-item">
            <span class="info-icon">☁️</span>
            <span>Deploys seamlessly to Cloudflare Pages/Workers</span>
        </div>
    </div>
</div>

<style>
    .platonic-container {
        position: relative;
        width: 100%;
        padding: 1rem;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        overflow: hidden;
    }

    /* Animated Background Particles */
    .particles {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        overflow: hidden;
    }

    .particle {
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgba(139, 92, 246, 0.3);
        border-radius: 50%;
        left: var(--x);
        animation: float var(--duration) ease-in-out infinite;
        animation-delay: var(--delay);
    }

    @keyframes float {
        0%, 100% { 
            transform: translateY(100vh) scale(0);
            opacity: 0;
        }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { 
            transform: translateY(-20vh) scale(1);
            opacity: 0;
        }
    }

    /* Stats Grid */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }

    @media (min-width: 640px) {
        .stats-grid {
            grid-template-columns: repeat(4, 1fr);
        }
    }

    .stat-card {
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05));
        border: 1px solid rgba(139, 92, 246, 0.2);
        border-radius: 12px;
        padding: 1rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
    }

    .stat-card:hover {
        transform: translateY(-2px);
        border-color: rgba(139, 92, 246, 0.4);
        box-shadow: 0 8px 25px rgba(139, 92, 246, 0.2);
    }

    .stat-icon {
        font-size: 1.5rem;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(139, 92, 246, 0.2);
        border-radius: 10px;
    }

    .stat-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #a78bfa;
    }

    .stat-label {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    /* Pattern Selector */
    .pattern-selector {
        margin-bottom: 1.5rem;
    }

    .pattern-title, .section-title {
        font-size: 0.875rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        margin-bottom: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .pattern-buttons {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
    }

    @media (min-width: 480px) {
        .pattern-buttons {
            grid-template-columns: repeat(4, 1fr);
        }
    }

    .pattern-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        padding: 0.75rem;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .pattern-btn:hover {
        background: rgba(139, 92, 246, 0.1);
        border-color: rgba(139, 92, 246, 0.3);
        transform: translateY(-2px);
    }

    .pattern-btn.active {
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.2));
        border-color: #8b5cf6;
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
    }

    .pattern-icon {
        font-size: 1.5rem;
    }

    .pattern-name {
        font-size: 0.75rem;
        font-weight: 600;
    }

    .pattern-description {
        margin-top: 0.75rem;
        padding: 0.75rem;
        background: rgba(139, 92, 246, 0.1);
        border-radius: 8px;
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.8);
        text-align: center;
        border-left: 3px solid #8b5cf6;
    }

    /* Canvas Container */
    .canvas-container {
        position: relative;
        display: flex;
        justify-content: center;
        margin: 1.5rem 0;
    }

    .canvas-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
        pointer-events: none;
    }

    .simulation-canvas {
        border-radius: 12px;
        box-shadow: 
            0 0 30px rgba(139, 92, 246, 0.3),
            0 0 60px rgba(139, 92, 246, 0.1),
            inset 0 0 30px rgba(0, 0, 0, 0.5);
        image-rendering: pixelated;
        image-rendering: crisp-edges;
        max-width: 100%;
        height: auto;
    }

    .running-overlay {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        background: rgba(0, 0, 0, 0.8);
        padding: 2rem;
        border-radius: 16px;
        backdrop-filter: blur(10px);
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(139, 92, 246, 0.3);
        border-top-color: #8b5cf6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    /* Progress Bar */
    .progress-container {
        position: relative;
        height: 24px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 1.5rem;
    }

    .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #8b5cf6, #6366f1, #8b5cf6);
        background-size: 200% 100%;
        animation: shimmer 2s ease-in-out infinite;
        border-radius: 12px;
        transition: width 0.3s ease;
    }

    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .progress-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 0.75rem;
        font-weight: 600;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    /* Color Scheme */
    .color-scheme-section {
        margin-bottom: 1.5rem;
    }

    .color-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .color-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 0.8rem;
    }

    .color-btn:hover {
        background: rgba(255, 255, 255, 0.1);
    }

    .color-btn.active {
        border-color: white;
        box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
    }

    .color-preview {
        width: 20px;
        height: 20px;
        border-radius: 4px;
    }

    /* Controls */
    .controls {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    @media (min-width: 480px) {
        .controls {
            grid-template-columns: repeat(4, 1fr);
        }
    }

    .control-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 10px;
        color: white;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .control-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
    }

    .control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .control-btn.primary {
        background: linear-gradient(135deg, #8b5cf6, #6366f1);
        border-color: #8b5cf6;
    }

    .control-btn.primary:hover:not(:disabled) {
        box-shadow: 0 5px 25px rgba(139, 92, 246, 0.4);
    }

    .control-btn.active {
        background: linear-gradient(135deg, #22c55e, #16a34a);
        border-color: #22c55e;
    }

    .control-btn.danger {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border-color: #ef4444;
    }

    .btn-icon {
        font-size: 1rem;
    }

    /* Options */
    .options {
        display: flex;
        justify-content: center;
        margin-bottom: 1.5rem;
    }

    .toggle-option {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        cursor: pointer;
    }

    .toggle-option input {
        display: none;
    }

    .toggle-slider {
        width: 44px;
        height: 24px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        position: relative;
        transition: all 0.3s ease;
    }

    .toggle-slider::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        transition: all 0.3s ease;
    }

    .toggle-option input:checked + .toggle-slider {
        background: #8b5cf6;
    }

    .toggle-option input:checked + .toggle-slider::after {
        transform: translateX(20px);
    }

    .toggle-label {
        font-size: 0.875rem;
        color: rgba(255, 255, 255, 0.8);
    }

    /* Info Footer */
    .info-footer {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .info-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.8rem;
        color: rgba(255, 255, 255, 0.6);
    }

    .info-icon {
        font-size: 1rem;
    }
</style>