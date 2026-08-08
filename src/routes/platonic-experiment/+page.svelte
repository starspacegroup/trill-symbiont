<script lang="ts">
	import Platonics from '$lib/components/Platonics.svelte';
	import PlatonicSpace from '$lib/components/PlatonicSpace.svelte';
	import { onMount } from 'svelte';

	type ProbeDomain = 'physics' | 'biology' | 'digital' | 'quantum';
	type EntropyMode = 'decrease' | 'neutral' | 'increase';

	interface ProbeMetric {
		id: string;
		label: string;
		value: number;
		description: string;
	}

	interface ProbeResult {
		series: number[];
		entropyStart: number;
		entropyEnd: number;
		entropyDelta: number;
		overallSignal: number;
		codeLikelihood: number;
		metrics: ProbeMetric[];
		findings: string[];
	}

	interface ProbeInput {
		domain: ProbeDomain;
		sampleSize: number;
		noiseLevel: number;
		coupling: number;
		recursionDepth: number;
		entropyMode: EntropyMode;
		seed: number;
	}

	const DOMAIN_DESCRIPTIONS: Record<ProbeDomain, { title: string; detail: string; icon: string }> =
		{
			physics: {
				title: 'Physics Constants / Dynamical Echoes',
				detail:
					'Searches for low-entropy signatures using spectral concentration, symmetry, and prime/Fibonacci indexing on constant-derived seeds.',
				icon: '⚛️'
			},
			biology: {
				title: 'Biology / Genetic Optimization',
				detail:
					'Models codon-like periodicity and constrained mutation drift to test if biological channels reveal compression-friendly structure.',
				icon: '🧬'
			},
			digital: {
				title: 'Digital Evolution / Compression',
				detail:
					'Runs a symbolic data-evolution proxy to test whether systems self-organize toward shorter algorithmic descriptions.',
				icon: '💾'
			},
			quantum: {
				title: 'Quantum Observer Effects',
				detail:
					'Simulates observer-coupled collapse pressure and checks if measurement channels bias trajectories toward lower information entropy.',
				icon: '🌌'
			}
		};

	const ADVANCED_CONCEPTS = [
		'Information Theory',
		'Algorithmic Complexity',
		'Spectral Analysis',
		'Dynamical Systems',
		'Chaos / Feigenbaum Scaling',
		'Number Theory',
		'Topological Invariants',
		'Group Symmetry',
		'Graph Flows',
		'Category-Theoretic Mappings',
		'Fractal Geometry',
		'Bayesian Inference'
	];

	const PRIME_INDEXES = [
		2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97,
		101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193,
		197, 199, 211, 223, 227, 229, 233, 239, 241, 251
	];

	const FIBONACCI_INDEXES = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];

	const PHI = (1 + Math.sqrt(5)) / 2;

	let mounted = false;
	let mouseX = 0;
	let mouseY = 0;
	let activeSection: 'space' | 'simulator' | 'both' = 'both';

	let selectedDomain: ProbeDomain = 'physics';
	let entropyMode: EntropyMode = 'decrease';
	let sampleSize = 256;
	let noiseLevel = 0.18;
	let coupling = 0.64;
	let recursionDepth = 4;
	let probeSeed = 314159;

	const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

	function toFixedSafe(value: number, digits = 3) {
		return Number.isFinite(value) ? value.toFixed(digits) : '0.000';
	}

	function createRng(seed: number) {
		let state = seed >>> 0;
		return () => {
			state = (1664525 * state + 1013904223) >>> 0;
			return state / 4294967296;
		};
	}

	function normalize(series: number[]) {
		const min = Math.min(...series);
		const max = Math.max(...series);
		const span = max - min;
		if (span < 1e-9) {
			return series.map(() => 0.5);
		}
		return series.map((value) => (value - min) / span);
	}

	function quantize(series: number[], bins: number) {
		return series.map((value) => Math.max(0, Math.min(bins - 1, Math.floor(value * bins))));
	}

	function shannonEntropy(values: number[], bins = 16) {
		if (values.length === 0) return 0;
		const counts = Array.from({ length: bins }, () => 0);
		for (const value of values) {
			counts[Math.max(0, Math.min(bins - 1, Math.floor(value * bins)))] += 1;
		}
		let entropy = 0;
		for (const count of counts) {
			if (count === 0) continue;
			const p = count / values.length;
			entropy -= p * Math.log2(p);
		}
		return entropy / Math.log2(bins);
	}

	function runLengthComplexity(series: number[]) {
		const q = quantize(series, 8);
		if (q.length < 2) return 0;
		let runs = 1;
		for (let i = 1; i < q.length; i++) {
			if (q[i] !== q[i - 1]) runs += 1;
		}
		const runRatio = runs / q.length;
		return clamp01(1 - runRatio);
	}

	function autocorrelationScore(series: number[], maxLag = 32) {
		const mean = series.reduce((acc, value) => acc + value, 0) / series.length;
		const centered = series.map((value) => value - mean);
		const variance = centered.reduce((acc, value) => acc + value * value, 0) / series.length;
		if (variance < 1e-9) return 0;
		let sum = 0;
		let count = 0;
		const limit = Math.min(maxLag, Math.floor(series.length / 2));
		for (let lag = 2; lag <= limit; lag++) {
			let cov = 0;
			for (let i = 0; i < series.length - lag; i++) {
				cov += centered[i] * centered[i + lag];
			}
			cov /= series.length - lag;
			sum += Math.abs(cov / variance);
			count += 1;
		}
		return clamp01(sum / Math.max(count, 1));
	}

	function spectralConcentration(series: number[]) {
		const n = series.length;
		if (n < 8) return 0;
		const magnitudes: number[] = [];
		for (let k = 1; k < Math.min(48, Math.floor(n / 2)); k++) {
			let real = 0;
			let imag = 0;
			for (let i = 0; i < n; i++) {
				const angle = (2 * Math.PI * k * i) / n;
				real += series[i] * Math.cos(angle);
				imag -= series[i] * Math.sin(angle);
			}
			magnitudes.push(Math.sqrt(real * real + imag * imag));
		}
		if (!magnitudes.length) return 0;
		const total = magnitudes.reduce((acc, value) => acc + value, 0);
		const top = [...magnitudes]
			.sort((a, b) => b - a)
			.slice(0, 4)
			.reduce((acc, value) => acc + value, 0);
		return clamp01(top / Math.max(total, 1e-9));
	}

	function primeAndFibonacciResonance(series: number[]) {
		const primeSet = PRIME_INDEXES.filter((index) => index <= series.length).map(
			(index) => series[index - 1]
		);
		const fibSet = FIBONACCI_INDEXES.filter((index) => index <= series.length).map(
			(index) => series[index - 1]
		);
		const baseline = series.reduce((acc, value) => acc + value, 0) / series.length;
		const primeMean = primeSet.length
			? primeSet.reduce((acc, value) => acc + value, 0) / primeSet.length
			: baseline;
		const fibMean = fibSet.length
			? fibSet.reduce((acc, value) => acc + value, 0) / fibSet.length
			: baseline;
		const primeSignal = clamp01(0.5 + (primeMean - baseline) * 2);
		const fibSignal = clamp01(0.5 + (fibMean - baseline) * 2);
		return {
			primeSignal,
			fibSignal
		};
	}

	function fractalStability(series: number[]) {
		const roughness = (lag: number) => {
			let sum = 0;
			let count = 0;
			for (let i = lag; i < series.length; i++) {
				sum += Math.abs(series[i] - series[i - lag]);
				count += 1;
			}
			return sum / Math.max(1, count);
		};
		const lags = [1, 2, 4, 8].filter((lag) => lag < series.length / 3);
		if (lags.length < 2) return 0;
		const points = lags.map((lag) => ({
			x: Math.log(lag),
			y: Math.log(Math.max(1e-8, roughness(lag)))
		}));
		const mx = points.reduce((acc, value) => acc + value.x, 0) / points.length;
		const my = points.reduce((acc, value) => acc + value.y, 0) / points.length;
		let num = 0;
		let den = 0;
		for (const point of points) {
			num += (point.x - mx) * (point.y - my);
			den += (point.x - mx) * (point.x - mx);
		}
		const slope = den > 0 ? num / den : 0;
		return clamp01(1 - Math.abs(slope - 0.5));
	}

	function topologicalLoopProxy(series: number[]) {
		if (series.length < 3) return 0;
		let signChanges = 0;
		let previousSign = 0;
		for (let i = 1; i < series.length; i++) {
			const diff = series[i] - series[i - 1];
			const sign = diff > 0 ? 1 : diff < 0 ? -1 : 0;
			if (sign !== 0 && previousSign !== 0 && sign !== previousSign) {
				signChanges += 1;
			}
			if (sign !== 0) previousSign = sign;
		}
		const normalized = signChanges / Math.max(1, series.length - 2);
		return clamp01(1 - Math.abs(normalized - 0.32) * 2.2);
	}

	function generateRawSeries(domain: ProbeDomain, sampleCount: number, rng: () => number) {
		const series: number[] = [];
		for (let i = 0; i < sampleCount; i++) {
			const t = i / sampleCount;
			if (domain === 'physics') {
				const alpha = 1 / 137.035999;
				const protonElectron = 1836.152673;
				const value =
					0.34 * Math.sin(2 * Math.PI * t * 7.5) +
					0.26 * Math.cos(2 * Math.PI * t * PHI * 2) +
					0.2 * Math.sin(2 * Math.PI * t * protonElectron * alpha) +
					0.15 * Math.cos(2 * Math.PI * t * Math.PI) +
					(rng() - 0.5) * 0.1;
				series.push(value);
			} else if (domain === 'biology') {
				const codonCycle = Math.sin(2 * Math.PI * t * 3);
				const gcBias = Math.cos(2 * Math.PI * t * 1.5 + PHI);
				const wave = 0.24 * Math.sin(2 * Math.PI * t * 13) + 0.2 * Math.cos(2 * Math.PI * t * 17);
				series.push(0.4 * codonCycle + 0.3 * gcBias + wave + (rng() - 0.5) * 0.1);
			} else if (domain === 'digital') {
				const rule = (Math.sin(2 * Math.PI * t * 29) + Math.cos(2 * Math.PI * t * 31)) * 0.2;
				const runBias = i % 16 < 10 ? 0.25 : -0.25;
				const parity = i % 2 === 0 ? 0.12 : -0.12;
				series.push(runBias + parity + rule + (rng() - 0.5) * 0.12);
			} else {
				const observerPhase = Math.sin(2 * Math.PI * t * 11 + PHI);
				const decoherence = Math.cos(2 * Math.PI * t * 23);
				const interference = Math.sin(2 * Math.PI * t * (Math.PI + PHI));
				series.push(
					0.35 * observerPhase + 0.2 * decoherence + 0.18 * interference + (rng() - 0.5) * 0.15
				);
			}
		}
		return normalize(series);
	}

	function evolveSeries(base: number[], config: ProbeInput, rng: () => number) {
		let current = [...base];
		for (let depth = 0; depth < config.recursionDepth; depth++) {
			const next: number[] = [];
			for (let i = 0; i < current.length; i++) {
				const left = current[(i - 1 + current.length) % current.length];
				const mid = current[i];
				const right = current[(i + 1) % current.length];
				const localMean = (left + mid + right) / 3;
				const attractor =
					config.domain === 'quantum' ? 0.5 + (localMean - 0.5) * config.coupling : localMean;
				let value = mid * (1 - config.coupling) + attractor * config.coupling;
				value += (rng() - 0.5) * config.noiseLevel;

				if (config.entropyMode === 'increase') {
					value += (rng() - 0.5) * config.noiseLevel * 1.3;
				} else if (config.entropyMode === 'neutral') {
					value += (mid - localMean) * 0.2;
				} else {
					value += (localMean - mid) * 0.35;
				}

				next.push(clamp01(value));
			}
			current = normalize(next);
		}
		return current;
	}

	function evaluateFindings(metrics: ProbeMetric[], entropyDelta: number, codeLikelihood: number) {
		const findings: string[] = [];
		if (entropyDelta <= 0) {
			findings.push(
				'Second-law infodynamics support: entropy stayed flat or decreased under the selected evolution rule.'
			);
		} else {
			findings.push(
				'Entropy increased under this configuration; try lower noise, higher coupling, or deeper recursion.'
			);
		}

		if (codeLikelihood > 0.72) {
			findings.push(
				'Potential optimization signature: multiple orthogonal metrics align with an information-minimizing attractor.'
			);
		}

		for (const metric of metrics) {
			if (metric.value > 0.74) {
				findings.push(
					`${metric.label} is high (${toFixedSafe(metric.value, 2)}), suggesting non-random structure in this channel.`
				);
			}
		}

		if (findings.length === 2) {
			findings.push(
				'No single smoking gun detected yet; continue parameter sweeps across domains for convergent evidence.'
			);
		}

		return findings;
	}

	function runInfodynamicProbe(input: ProbeInput): ProbeResult {
		const rng = createRng(input.seed + input.sampleSize * 11 + input.recursionDepth * 101);
		const initialSeries = generateRawSeries(input.domain, input.sampleSize, rng);
		const finalSeries = evolveSeries(initialSeries, input, rng);

		const startSlice = initialSeries.slice(0, Math.floor(initialSeries.length * 0.5));
		const endSlice = finalSeries.slice(Math.floor(finalSeries.length * 0.5));
		const entropyStart = shannonEntropy(startSlice);
		const entropyEnd = shannonEntropy(endSlice);
		const entropyDelta = entropyEnd - entropyStart;

		const compressibility = runLengthComplexity(finalSeries);
		const symmetry = autocorrelationScore(finalSeries);
		const spectrum = spectralConcentration(finalSeries);
		const fractal = fractalStability(finalSeries);
		const loop = topologicalLoopProxy(finalSeries);
		const { primeSignal, fibSignal } = primeAndFibonacciResonance(finalSeries);
		const observerLock = clamp01(
			(input.coupling * (1 - input.noiseLevel) + (1 - clamp01(entropyDelta + 0.5))) / 2
		);

		const metrics: ProbeMetric[] = [
			{
				id: 'entropy',
				label: 'Entropy Compression',
				value: clamp01(1 - (entropyDelta + 0.5)),
				description: 'Information-theoretic support for the second law of infodynamics in this run.'
			},
			{
				id: 'complexity',
				label: 'Algorithmic Compressibility',
				value: compressibility,
				description: 'Kolmogorov-style proxy from symbolic run-length structure.'
			},
			{
				id: 'spectrum',
				label: 'Spectral Concentration',
				value: spectrum,
				description: 'Fourier energy focusing into a few dominant modes.'
			},
			{
				id: 'symmetry',
				label: 'Group Symmetry Echo',
				value: symmetry,
				description: 'Autocorrelation coherence consistent with hidden symmetry constraints.'
			},
			{
				id: 'fractal',
				label: 'Fractal Stability',
				value: fractal,
				description: 'Multi-scale roughness slope consistency across nested resolutions.'
			},
			{
				id: 'topology',
				label: 'Topological Loop Proxy',
				value: loop,
				description: 'Derivative sign-change dynamics used as a coarse invariant signal.'
			},
			{
				id: 'prime',
				label: 'Prime/Fibonacci Resonance',
				value: (primeSignal + fibSignal) / 2,
				description: 'Number-theoretic index alignment against baseline amplitude.'
			},
			{
				id: 'observer',
				label: 'Observer Coupling Lock-In',
				value: observerLock,
				description: 'Quantum-inspired observer pressure toward low-entropy trajectories.'
			}
		];

		const overallSignal =
			metrics[0].value * 0.2 +
			metrics[1].value * 0.15 +
			metrics[2].value * 0.13 +
			metrics[3].value * 0.12 +
			metrics[4].value * 0.1 +
			metrics[5].value * 0.1 +
			metrics[6].value * 0.1 +
			metrics[7].value * 0.1;

		const codeLikelihood = clamp01(overallSignal * 0.92 + metrics[0].value * 0.08);
		const findings = evaluateFindings(metrics, entropyDelta, codeLikelihood);

		return {
			series: finalSeries,
			entropyStart,
			entropyEnd,
			entropyDelta,
			overallSignal,
			codeLikelihood,
			metrics,
			findings
		};
	}

	function rerollProbeSeed() {
		probeSeed = Math.floor(Math.random() * 1_000_000);
	}

	function navigateHome() {
		window.location.assign('/');
	}

	$: probeResult = runInfodynamicProbe({
		domain: selectedDomain,
		sampleSize,
		noiseLevel,
		coupling,
		recursionDepth,
		entropyMode,
		seed: probeSeed
	});

	$: sparklineSeries = probeResult.series.slice(0, 96);

	onMount(() => {
		mounted = true;

		const handleMouseMove = (e: MouseEvent) => {
			mouseX = e.clientX;
			mouseY = e.clientY;
		};

		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	});
</script>

<svelte:head>
	<title>Platonic Space Hypothesis | Trill Symbiont</title>
	<meta
		name="description"
		content="Explore the Platonic Space Hypothesis - where mathematical truths and patterns ingress into physical reality through interfaces. Interactive visualizations of primes, Fibonacci, and emergent complexity."
	/>
</svelte:head>

<main class="page-container">
	<!-- Animated gradient background -->
	<div class="animated-bg">
		<div class="gradient-orb orb-1"></div>
		<div class="gradient-orb orb-2"></div>
		<div class="gradient-orb orb-3"></div>
	</div>

	<!-- Grid pattern overlay -->
	<div class="grid-overlay"></div>

	<!-- Mouse follower glow -->
	<div class="mouse-glow" style="left: {mouseX}px; top: {mouseY}px;" class:visible={mounted}></div>

	<div class="content-wrapper">
		<header class="header" class:mounted>
			<!-- Back button -->
			<button type="button" class="back-link" on:click={navigateHome}>
				<span class="back-arrow">←</span>
				<span class="back-text">Back to Main</span>
			</button>

			<!-- Title Section -->
			<div class="title-section">
				<div class="title-badge">
					<span class="badge-icon">🔮</span>
					<span class="badge-text">PLATONIC SPACE HYPOTHESIS</span>
				</div>
				<h1 class="main-title">
					<span class="title-word">The Latent Space</span>
					<span class="title-word title-highlight">of Patterns</span>
				</h1>
				<p class="subtitle">
					"There are facts that you come across... that if those facts were different, biology and
					physics would be different. They <span class="highlight">impact</span> the physical world,
					but are not <span class="highlight">defined by</span> what happens in the physical world."
				</p>
				<p class="attribution">— Based on Michael Levin's Platonic Space research</p>
			</div>

			<!-- Quick info cards -->
			<div class="info-cards">
				<div class="info-card">
					<span class="card-icon">🧠</span>
					<div class="card-content">
						<span class="card-title">Thin Client</span>
						<span class="card-desc">Brain as Interface</span>
					</div>
				</div>
				<div class="info-card">
					<span class="card-icon">🎁</span>
					<div class="card-content">
						<span class="card-title">Free Lunches</span>
						<span class="card-desc">From Math Truths</span>
					</div>
				</div>
				<div class="info-card">
					<span class="card-icon">⬇️</span>
					<div class="card-content">
						<span class="card-title">Ingression</span>
						<span class="card-desc">Patterns Flow In</span>
					</div>
				</div>
			</div>
		</header>

		<!-- View Toggle -->
		<div class="view-toggle" class:mounted>
			<button
				class="toggle-btn"
				class:active={activeSection === 'space'}
				on:click={() => (activeSection = 'space')}
			>
				🌌 Platonic Space
			</button>
			<button
				class="toggle-btn"
				class:active={activeSection === 'simulator'}
				on:click={() => (activeSection = 'simulator')}
			>
				🧬 Pattern Simulator
			</button>
			<button
				class="toggle-btn"
				class:active={activeSection === 'both'}
				on:click={() => (activeSection = 'both')}
			>
				📊 Show Both
			</button>
		</div>

		<!-- Key Concept Banner -->
		<div class="concept-banner" class:mounted>
			<div class="concept-icon">💡</div>
			<div class="concept-text">
				<strong>Core Insight:</strong> Physical objects (brains, cells, robots) are
				<em>interfaces</em>
				— "thin clients" — through which patterns from a structured Platonic space become manifest. We
				don't <em>create</em> minds or mathematical truths; we build interfaces that allow them to
				<em>ingress</em>.
			</div>
		</div>

		<!-- Platonic Space Visualization -->
		{#if activeSection === 'space' || activeSection === 'both'}
			<div class="simulation-container" class:mounted>
				<div class="container-glow"></div>
				<PlatonicSpace />
			</div>
		{/if}

		<!-- Pattern Simulator -->
		{#if activeSection === 'simulator' || activeSection === 'both'}
			<div class="simulation-container" class:mounted>
				<div class="container-glow"></div>
				<div class="simulator-header">
					<h2>🧬 Cellular Automata: Emergent Patterns</h2>
					<p>
						These simulations demonstrate "free lunches" — complex patterns emerging from minimal
						rules, just as biology exploits mathematical truths without having to evolve them.
					</p>
				</div>
				<Platonics />
			</div>
		{/if}

		<!-- Theory Section -->
		<section class="theory-section" class:mounted>
			<h2 class="section-title">
				<span class="section-icon">📚</span>
				The Research Program
			</h2>

			<!-- Main Concept Cards -->
			<div class="theory-grid">
				<article class="theory-card featured">
					<div class="theory-icon">🔗</div>
					<h3>Math-Physics ≈ Mind-Brain</h3>
					<p>
						"The mind-brain relationship is basically of the same kind as the math-physics
						relationship. The same way that non-physical facts of physics haunt physical objects is
						basically how different kinds of patterns that we call 'minds' are manifesting through
						interfaces like brains."
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">🔢</div>
					<h3>The Cicada Pattern</h3>
					<p>
						Cicadas emerge at 13 and 17 year intervals — prime numbers that minimize predator
						synchronization. "Why are they prime? Well, now you're in the math department." The
						distribution of primes exists independently of biology, yet biology exploits it as a
						"free lunch."
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">📐</div>
					<h3>The Value of E</h3>
					<p>
						"Nothing you can do in the physical world will change E or Feigenbaum's constant. You
						could have swapped all the constants at the Big Bang — you are not going to change those
						things." These truths from outside physics constrain what's possible within it.
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">🎁</div>
					<h3>Free Lunches</h3>
					<p>
						"If evolution invents a voltage-gated ion channel (a transistor), all the truth tables
						and the fact that NAND is special — you don't have to evolve those things. You get them
						for free." Biology inherits computational truths it never paid for.
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">🌊</div>
					<h3>Beyond Emergence</h3>
					<p>
						"Calling them 'emergent' does nothing for a research program. It just means you got
						surprised." Instead: assume patterns come from a structured space that we can
						systematically explore and map the relationship between interfaces and patterns.
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">🤖</div>
					<h3>AI & New Interfaces</h3>
					<p>
						"When we make AIs, we are fishing in a region of that space that may never have had
						bodies before. Some of the really interesting things artificial constructs can do are
						not because of the algorithm — they're in spite of it."
					</p>
				</article>
			</div>
		</section>

		<!-- The Map Section -->
		<section class="map-section" class:mounted>
			<h2 class="section-title">
				<span class="section-icon">🗺️</span>
				Mapping the Space
			</h2>
			<div class="map-content">
				<div class="map-quote">
					<blockquote>
						"There's this diagram called a 'map of mathematics' that shows how all the different
						pieces of math link together. What is it a map of? It's a map of various truths — facts
						that are thrust upon you. You don't have a choice. Once you've picked some axioms, here
						are surprising facts that are just going to be given to you."
					</blockquote>
				</div>
				<div class="map-explanation">
					<h3>The Research Program</h3>
					<p>In 20 years, one of two things will happen:</p>
					<ul>
						<li>
							✅ We produce a map of that space — "Here's why you get systems that work like this
							and like this, but never like that."
						</li>
						<li>
							❌ We find the space is too random — "It's not worth calling it a space because we've
							made zero progress linking embodiment to patterns."
						</li>
					</ul>
					<p class="optimistic">
						"I make the optimistic assumption that there's an underlying structure to that latent
						space. This is not a random grab-bag of stuff."
					</p>
				</div>
			</div>
		</section>

		<!-- Actionable Insight -->
		<section class="action-section" class:mounted>
			<h2 class="section-title">
				<span class="section-icon">🔬</span>
				The Actionable Insight
			</h2>
			<div class="action-grid">
				<div class="action-card">
					<div class="action-number">1</div>
					<h3>Build Interfaces</h3>
					<p>
						All physical things are interfaces to patterns. "You build an interface. Some of those
						patterns are going to come through depending on what you build."
					</p>
				</div>
				<div class="action-card">
					<div class="action-number">2</div>
					<h3>Map the Relationships</h3>
					<p>
						"The research program is mapping out the relationship between the physical pointers we
						make and the patterns that come through."
					</p>
				</div>
				<div class="action-card">
					<div class="action-number">3</div>
					<h3>Expect Surprises</h3>
					<p>
						"You get more out than you put in. Make minimal assumptions and certain facts are thrust
						upon you."
					</p>
				</div>
			</div>
		</section>

		<section class="probe-section" class:mounted>
			<h2 class="section-title">
				<span class="section-icon">🧪</span>
				Infodynamics Probe Lab
			</h2>
			<p class="probe-intro">
				Qualitative research sandbox for testing the hypothesis that a simulation may encode
				information-efficient structure. This module operationalizes the second law of infodynamics
				by scanning for entropy-minimizing signatures across physics, biology, digital evolution,
				and observer-coupled quantum channels.
			</p>

			<div class="probe-grid">
				<div class="probe-panel controls-panel">
					<h3>Channel + Dynamics</h3>
					<p class="probe-panel-subtitle">
						{DOMAIN_DESCRIPTIONS[selectedDomain].icon}
						{DOMAIN_DESCRIPTIONS[selectedDomain].title}
					</p>
					<p class="probe-domain-detail">{DOMAIN_DESCRIPTIONS[selectedDomain].detail}</p>

					<label class="probe-control">
						<span>Domain</span>
						<select bind:value={selectedDomain}>
							<option value="physics">Physics Constants</option>
							<option value="biology">Biology / Genetic</option>
							<option value="digital">Digital Evolution</option>
							<option value="quantum">Quantum Observer</option>
						</select>
					</label>

					<label class="probe-control">
						<span>Entropy Mode</span>
						<select bind:value={entropyMode}>
							<option value="decrease">Decrease / Hold</option>
							<option value="neutral">Near-Neutral</option>
							<option value="increase">Increase (Stress Test)</option>
						</select>
					</label>

					<label class="probe-control">
						<span>Sample Size: {sampleSize}</span>
						<input type="range" min="96" max="512" step="32" bind:value={sampleSize} />
					</label>

					<label class="probe-control">
						<span>Noise Level: {noiseLevel.toFixed(2)}</span>
						<input type="range" min="0.02" max="0.6" step="0.01" bind:value={noiseLevel} />
					</label>

					<label class="probe-control">
						<span>Observer / Interface Coupling: {coupling.toFixed(2)}</span>
						<input type="range" min="0.1" max="0.95" step="0.01" bind:value={coupling} />
					</label>

					<label class="probe-control">
						<span>Recursion Depth: {recursionDepth}</span>
						<input type="range" min="1" max="8" step="1" bind:value={recursionDepth} />
					</label>

					<div class="probe-actions">
						<button class="probe-btn" type="button" on:click={rerollProbeSeed}>Reroll Seed</button>
						<span class="seed-readout">Seed {probeSeed}</span>
					</div>
				</div>

				<div class="probe-panel results-panel">
					<h3>Pattern Signal</h3>
					<div class="probe-kpis">
						<div class="kpi-card">
							<span class="kpi-label">Code Likelihood</span>
							<strong class="kpi-value">{(probeResult.codeLikelihood * 100).toFixed(1)}%</strong>
						</div>
						<div class="kpi-card">
							<span class="kpi-label">Entropy Δ</span>
							<strong class="kpi-value">{toFixedSafe(probeResult.entropyDelta, 4)}</strong>
						</div>
						<div class="kpi-card">
							<span class="kpi-label">Overall Signal</span>
							<strong class="kpi-value">{(probeResult.overallSignal * 100).toFixed(1)}%</strong>
						</div>
					</div>

					<div class="sparkline" aria-label="Signal waveform projection">
						{#each sparklineSeries as point, idx (idx)}
							<div
								class="spark-cell"
								style={`--h:${Math.max(8, Math.round(point * 100))}%; --i:${idx};`}
							></div>
						{/each}
					</div>

					<div class="entropy-readout">
						<span>Entropy start: {toFixedSafe(probeResult.entropyStart, 4)}</span>
						<span>Entropy end: {toFixedSafe(probeResult.entropyEnd, 4)}</span>
					</div>

					<div class="metrics-grid">
						{#each probeResult.metrics as metric (metric.id)}
							<article class="metric-card">
								<div class="metric-row">
									<h4>{metric.label}</h4>
									<span>{(metric.value * 100).toFixed(1)}%</span>
								</div>
								<div class="metric-meter">
									<div
										class="metric-fill"
										style={`--fill:${(metric.value * 100).toFixed(1)}%;`}
									></div>
								</div>
								<p>{metric.description}</p>
							</article>
						{/each}
					</div>
				</div>
			</div>

			<div class="probe-grid secondary-grid">
				<div class="probe-panel findings-panel">
					<h3>Glitch-Finding Log</h3>
					<ul>
						{#each probeResult.findings as finding (finding)}
							<li>{finding}</li>
						{/each}
					</ul>
				</div>
				<div class="probe-panel concepts-panel">
					<h3>Advanced Math Lens</h3>
					<p>Use these frameworks to interpret converging patterns and design next probe cycles:</p>
					<div class="concept-chip-grid">
						{#each ADVANCED_CONCEPTS as concept (concept)}
							<span class="concept-chip">{concept}</span>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<!-- Mathematical Formalism Section -->
		<section class="math-section" class:mounted>
			<h2 class="section-title">
				<span class="section-icon">∑</span>
				Mathematical Formalism
			</h2>
			<p class="math-intro">
				The probe engine applies rigorous quantitative frameworks from multiple mathematical
				domains. Below are the core formulas operationalizing the infodynamics hypothesis.
			</p>

			<div class="math-grid">
				<!-- Information Theory -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">📊 Information Theory</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Shannon Entropy (Normalized)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>H(X) = -<span class="fraction"
										><span class="numeator">1</span><span class="denominator">log₂(k)</span></span
									>
									Σ<sub>i=1</sub><sup>k</sup> p<sub>i</sub> log₂(p<sub>i</sub>)</span
								>
							</div>
							<span class="formula-explanation"
								>Direct measure of information entropy across quantized bins. Lower H → more
								structure / less randomness.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Entropy Delta (Infodynamics Test)</span>
							<div class="formula-display">
								<span class="formula-symbol">ΔH = H<sub>final</sub> − H<sub>initial</sub></span>
							</div>
							<span class="formula-explanation"
								>Second law violation candidate: if ΔH ≤ 0 under coupling + recursion → information
								minimization in evolution rule.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Probability Bins</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>p_i = (count_i / N), where max bins k in [8, 16, 32]</span
								>
							</div>
							<span class="formula-explanation"
								>Discretized histogram counts for discretized state space analysis.</span
							>
						</div>
					</div>
				</article>

				<!-- Spectral Analysis -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🌊 Spectral Analysis</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Discrete Fourier Transform (DFT)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>X<sub>k</sub> = Σ<sub>n=0</sub><sup>N-1</sup> x<sub>n</sub> e<sup
										>-i·2π·k·n/N</sup
									></span
								>
							</div>
							<span class="formula-explanation"
								>Extracts frequency-domain coherence. Magnitude |X<sub>k</sub>| reveals dominant
								oscillation modes.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Spectral Concentration (Low-Rank Syndrome)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>C = <span class="fraction"
										><span class="numeator">Σ<sub>top-4</sub> |X<sub>k</sub>|</span><span
											class="denominator">Σ<sub>all</sub> |X<sub>k</sub>|</span
										></span
									></span
								>
							</div>
							<span class="formula-explanation"
								>Ratio of energy in top-4 frequencies to total. High C → signal compressed into few
								modes (optimization signature).</span
							>
						</div>
					</div>
				</article>

				<!-- Dynamical Systems & Fractal Geometry -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🔄 Fractal & Multi-Scale Dynamics</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Fractal Roughness (Hurst via Slope)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>ρ(τ) = <span class="fraction"
										><span class="numeator">1</span><span class="denominator">N−τ</span></span
									>
									Σ<sub>i</sub> |x<sub>i+τ</sub> − x<sub>i</sub>|</span
								>
							</div>
							<span class="formula-explanation"
								>Average absolute jump over lag τ. Plotted log-log to extract slope (Hurst exponent
								proxy).</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Multi-Scale Stability</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>H ≈ <span class="fraction"
										><span class="numeator">Δ log ρ(τ)</span><span class="denominator">Δ log τ</span
										></span
									>, H ∈ [0,1]</span
								>
							</div>
							<span class="formula-explanation"
								>Stability near H ≈ 0.5 (Brownian motion) vs deviation → constraint-driven vs
								noise-driven.</span
							>
						</div>
					</div>
				</article>

				<!-- Symmetry & Autocorrelation -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🔄 Symmetry & Autocorrelation</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Autocorrelation (Template Echo)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>γ(k) = <span class="fraction"
										><span class="numeator">E[(X<sub>t</sub>−μ)(X<sub>t+k</sub>−μ)]</span><span
											class="denominator">σ²</span
										></span
									></span
								>
							</div>
							<span class="formula-explanation"
								>Correlation at lag k over demean / std. Non-random structure shows as non-zero
								coherence at specific lags.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Symmetry Score (Lag Coherence)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>S = <span class="fraction"
										><span class="numeator">1</span><span class="denominator">L</span></span
									>
									Σ<sub>k=2</sub><sup>L</sup> |γ(k)|</span
								>
							</div>
							<span class="formula-explanation"
								>Average autocorrelation magnitude over subset of lags. High S → hidden symmetry
								group or repetitive constraint.</span
							>
						</div>
					</div>
				</article>

				<!-- Topology & Graph Flows -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">⛓ Topological Invariants</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Derivative Sign Changes (Loop Index Proxy)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>Δ<sub>i</sub> = x<sub>i+1</sub> − x<sub>i</sub>, ε<sub>i</sub> = sgn(Δ<sub>i</sub
									>)</span
								>
							</div>
							<span class="formula-explanation"
								>Vector of signs: negative one, zero, or positive one. Transitions in sign pattern
								reveal topological winding.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Sign-Change Count (Topological Measure)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>T = <span class="fraction"
										><span class="numeator">Σ [ε<sub>i</sub> ≠ ε<sub>i-1</sub>]</span><span
											class="denominator">N</span
										></span
									>, target ≈ 0.32</span
								>
							</div>
							<span class="formula-explanation"
								>Normalized transition frequency. Proximity to 32% suggests topological loop balance
								in dynamical attractor.</span
							>
						</div>
					</div>
				</article>

				<!-- Number Theory & Prime/Fibonacci -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🔢 Number Theory & Resonance</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Prime Index Resonance</span>
							<div class="formula-display">
								<span class="formula-symbol">P = primes, M_P = (1/|P|) * Σ x_p for p in P</span>
							</div>
							<span class="formula-explanation"
								>Mean amplitude at prime-indexed positions. Deviation from baseline → potential
								number-theoretic optimization signature.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Fibonacci Index Resonance</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>F = Fibonacci sequence, M_F = (1/|F|) * Σ x_f for f in F</span
								>
							</div>
							<span class="formula-explanation"
								>Mean amplitude at Fibonacci positions. Golden-ratio-linked structure; high M<sub
									>F</sub
								> → nature-like optimization.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Combined Resonance Signal</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>R = <span class="fraction"
										><span class="numeator"
											>(M<sub>P</sub> − baseline) + (M<sub>F</sub> − baseline)</span
										><span class="denominator">2</span></span
									>, clamped ∈ [0,1]</span
								>
							</div>
							<span class="formula-explanation"
								>Orthogonal number-theoretic alignment. Multiple high values suggest encoding or
								constraint structure.</span
							>
						</div>
					</div>
				</article>

				<!-- Complexity & Compression -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🔗 Algorithmic Complexity</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Run-Length Encoding (RLE) Complexity</span>
							<div class="formula-display">
								<span class="formula-symbol">q_i = floor(x_i * k), where k in [4, 8, 16] bins</span>
							</div>
							<span class="formula-explanation"
								>Quantize signal into k discrete states; count symbol runs.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Compressibility Proxy (Kolmogorov-like)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>λ = 1 − <span class="fraction"
										><span class="numeator">runs</span><span class="denominator">N</span></span
									></span
								>
							</div>
							<span class="formula-explanation"
								>High λ → few runs → high compression ratio → lower Kolmogorov complexity proxy.</span
							>
						</div>
					</div>
				</article>

				<!-- Observer Coupling (Quantum-Inspired) -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🌌 Observer Coupling Pressure</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Localization Attractor</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>x<sub>i</sub><sup>new</sup> ← (1−α)x<sub>i</sub> + α·a<sub>i</sub>, α ∈ coupling
									∈ [0,1]</span
								>
							</div>
							<span class="formula-explanation"
								>Observer-induced collapse: system dragged toward classical "measured" state
								proportional to coupling strength.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Entropic Resistance Term</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>x<sub>i</sub> ← x<sub>i</sub><sup>evolved</sup> + (a<sub>i</sub> − x<sub>i</sub
									><sup>local</sup>) · (1 − noiseLevel) · entropyMode<sub>bias</sub></span
								>
							</div>
							<span class="formula-explanation"
								>Entropy mode (decrease/neutral/increase) biases evolution toward min/neutral/max
								information trajectories.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Observer Lock-In Score</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>Ω = <span class="fraction"
										><span class="numeator">α·(1−noise) + (1− clamp₀₋₁(ΔH + 0.5))</span><span
											class="denominator">2</span
										></span
									></span
								>
							</div>
							<span class="formula-explanation"
								>Joint probability of observer-driven convergence and entropy reduction.
								Quantum-inspired measurement pressure proxy.</span
							>
						</div>
					</div>
				</article>

				<!-- Evolution Rule & Recursion -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🔁 Recursive Evolution Rule</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Cellular-Automata-Like Step</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>x<sub>i</sub><sup>(t+1)</sup> ← attract(x<sub>i</sub><sup>(t)</sup>, localMean<sup
										>(t)</sup
									>, α, noise<sub>t</sub>, entropy<sub>bias</sub>)</span
								>
							</div>
							<span class="formula-explanation"
								>Synchronous update across all cells; uses neighborhood averaging as attractor,
								modulated by coupling.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Domain-Specific Baselines</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>physics: Ω = sin(ω<sub>i</sub> t) + fundamental constants, biology: ω = codon cycles,</span
								><br />
								<span class="formula-symbol"
									>digital: ω = XOR patterns, quantum: ω = phase + decoherence coupling</span
								>
							</div>
							<span class="formula-explanation"
								>Each domain seeds with domain-specific harmonic + noisy driver; evolution probes if
								structure survives.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Depth-k Recursion</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>x_final = apply_recursion_k_times(normalize(x_initial)), where k in [1, 8]</span
								>
							</div>
							<span class="formula-explanation"
								>Apply evolution rule k times. Deeper recursion → more opportunity for patterns to
								either converge or emerge.</span
							>
						</div>
					</div>
				</article>

				<!-- Quantum Mechanics -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🌌 Quantum Mechanics</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Time-Dependent Schrödinger Equation</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>i·h_bar·(∂ψ/∂t) = H·ψ, where H is the Hamiltonian operator</span
								>
							</div>
							<span class="formula-explanation"
								>Fundamental evolution equation for quantum wavefunctions. Deterministic in
								state-space; measurement introduces collapse.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Quantum State Superposition</span>
							<div class="formula-display">
								<span class="formula-symbol">|ψ⟩ = Σ_n c_n |φ_n⟩, where Σ_n |c_n|² = 1</span>
							</div>
							<span class="formula-explanation"
								>Quantum states are linear combinations of eigenstates. Coefficients c_n are
								probability amplitudes (Born rule).</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Heisenberg Uncertainty Principle</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>Δx · Δp ≥ h_bar / 2, where Δ denotes standard deviation</span
								>
							</div>
							<span class="formula-explanation"
								>Fundamental limit on simultaneous precision of conjugate observables. Dual to
								information-theoretic entropic bounds.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Quantum Measurement Postulate</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>P(eigenvalue = a) = |⟨φ_a|ψ⟩|², collapse: |ψ⟩ → |φ_a⟩</span
								>
							</div>
							<span class="formula-explanation"
								>Measurement outcomes are eigenvalues. Projection onto measured eigenvector →
								observer effect on state.</span
							>
						</div>
					</div>
				</article>

				<!-- Statistical Mechanics & Thermodynamics -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🔥 Statistical Mechanics & Thermodynamics</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Boltzmann Distribution</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>P(state_i) = (1/Z) * exp(-E_i / (k_B * T)), Z = Σ exp(-E_j / k_B*T)</span
								>
							</div>
							<span class="formula-explanation"
								>Probability of microstate at thermal equilibrium. Lower energy states favored
								exponentially by temperature T.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Partition Function (Canonical Ensemble)</span>
							<div class="formula-display">
								<span class="formula-symbol">Z(β) = Σ_i exp(-β E_i), where β = 1/(k_B*T)</span>
							</div>
							<span class="formula-explanation"
								>Sum of Boltzmann weights over all microstates. Encodes all thermodynamic
								information via derivatives of log(Z).</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Entropy (Gibbs Formulation)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>S = -k_B * Σ p_i * ln(p_i), where p_i is microstate probability</span
								>
							</div>
							<span class="formula-explanation"
								>Quantifies disorder in ensemble. Information-theoretic and thermodynamic entropy:
								same formula, different scales.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Second Law of Thermodynamics</span>
							<div class="formula-display">
								<span class="formula-symbol">dS_universe ≥ 0, (dS_system + dS_environment ≥ 0)</span
								>
							</div>
							<span class="formula-explanation"
								>Total entropy never decreases. Our infodynamics hypothesis: if a subsystem shows dS
								≤ 0 consistently, it may be engineered.</span
							>
						</div>
					</div>
				</article>

				<!-- Biological Mathematics -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🧬 Biological Mathematics</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Lotka-Volterra Equations (Predator-Prey)</span>
							<div class="formula-display">
								<span class="formula-symbol">dx/dt = αx - βxy, dy/dt = δxy - γy</span>
							</div>
							<span class="formula-explanation"
								>Nonlinear ODE model of ecosystem dynamics. Solutions exhibit cyclic attractor
								behavior (limit cycle).</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Hardy-Weinberg Equilibrium</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>p² + 2pq + q² = 1, where p + q = 1 (allele frequencies)</span
								>
							</div>
							<span class="formula-explanation"
								>Genetic stability in absence of selection. Deviation → suggests natural selection
								or other evolutionary pressure.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Genetic Drift (Random Walk)</span>
							<div class="formula-display">
								<span class="formula-symbol">Δp ~ sqrt(p(1-p)/N), with N = population size</span>
							</div>
							<span class="formula-explanation"
								>Stochastic change in allele frequency per generation. Smaller populations → faster
								fixation/loss of alleles.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Enzyme Kinetics (Michaelis-Menten)</span>
							<div class="formula-display">
								<span class="formula-symbol">v = (V_max * [S]) / (K_m + [S])</span>
							</div>
							<span class="formula-explanation"
								>Reaction rate as function of substrate concentration. Saturation behavior common in
								regulated biochemistry.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Codon Bias & GC Content</span>
							<div class="formula-display">
								<span class="formula-symbol">GC% = (count_G + count_C) / (total_bases) * 100</span>
							</div>
							<span class="formula-explanation"
								>Genomic AT/GC ratio varies by species and gene function. Optimization toward
								thermal stability or translation speed.</span
							>
						</div>
					</div>
				</article>

				<!-- Dynamical Systems & Chaos Theory -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">♾️ Dynamical Systems & Chaos</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Lyapunov Exponent (Sensitivity)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>L = lim_(t goes to infinity) (1/t) * ln(magnitude of Δx(t) / Δx(0))</span
								>
							</div>
							<span class="formula-explanation"
								>Rate of trajectory divergence. Near-zero L indicates stability, positive L
								indicates chaos, negative L indicates attracting fixed point.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Feigenbaum Constant (Period-Doubling)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>δ = lim_(n→∞) (a_n - a_(n-1)) / (a_(n+1) - a_n) ≈ 4.669...</span
								>
							</div>
							<span class="formula-explanation"
								>Universal scaling rate in onset of chaos. Appears across many nonlinear systems
								(logistic map, cycles).</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Attractor Dimension (Box-Counting)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>D = lim_(ε→0) ln(N(ε)) / ln(1/ε), where N(ε) = boxes covering attractor</span
								>
							</div>
							<span class="formula-explanation"
								>Fractal dimension of attractor. Integer = Euclidean; non-integer = strange
								(chaotic) attractor.</span
							>
						</div>
					</div>
				</article>

				<!-- Linear Algebra & Eigenvalue Problems -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">⬜ Linear Algebra & Eigensystems</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Eigenvalue Decomposition</span>
							<div class="formula-display">
								<span class="formula-symbol">A·v = λ·v, where (A - λI)·v = 0, det(A - λI) = 0</span>
							</div>
							<span class="formula-explanation"
								>Fundamental modes of linear operator. Diagonalization reveals independent evolving
								directions.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Principal Component Analysis (PCA)</span>
							<div class="formula-display">
								<span class="formula-symbol">Cov(X) = U·Λ·U², where Λ = diag(λ_1 ≥ λ_2 ≥ ...)</span>
							</div>
							<span class="formula-explanation"
								>Eigenvectors of covariance matrix = principal axes. Eigenvalues = variance along
								each axis.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Singular Value Decomposition (SVD)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>M = U·Σ·V^T, where Σ = diag(σ_1, σ_2, ...), σ_i ≥ 0</span
								>
							</div>
							<span class="formula-explanation"
								>Low-rank approximation via dominant singular values → compression / dimensionality
								reduction.</span
							>
						</div>
					</div>
				</article>

				<!-- Graph Theory & Network Analysis -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🕸️ Graph Theory & Networks</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Degree Distribution</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>P(k) = (probability of node with degree k), mean_k = 2m/n (m=edges, n=nodes)</span
								>
							</div>
							<span class="formula-explanation"
								>Power-law P(k) ~ k^(-α) → scale-free networks. Indicates optimization or
								self-organization.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Clustering Coefficient (Transitivity)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>C = (# triangles * 3) / (# connected triples), local: C_i = (edges among
									neighbors) / (max possible)</span
								>
							</div>
							<span class="formula-explanation"
								>Tendency to form cliques. High clustering → modular / hierarchical structure.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Shortest Path (Graph Diameter)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>d(u,v) = min length of path u → v, D = max_u,v d(u,v)</span
								>
							</div>
							<span class="formula-explanation"
								>Network diameter D. Small-world networks: short paths despite high clustering.</span
							>
						</div>
					</div>
				</article>

				<!-- Stochastic Processes -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">📊 Stochastic Processes & Probability</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Markov Chain (Memoryless)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>P(X_(n+1)=j | X_n=i, ..., X_0) = P(X_(n+1)=j | X_n=i) = P_ij</span
								>
							</div>
							<span class="formula-explanation"
								>Future state depends only on present, not history. Stationary dist: π = π·P
								(eigenvalue 1 of transition matrix).</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Brownian Motion (Wiener Process)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>dX_t = μ·dt + σ·dW_t, where dW_t is Gaussian increment</span
								>
							</div>
							<span class="formula-explanation"
								>Continuous random walk. Underlies diffusion and financial modeling. Hurst = 0.5.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Poisson Process (Event Arrivals)</span>
							<div class="formula-display">
								<span class="formula-symbol">P(N(t) = n) = (λt)^n * exp(-λt) / n!</span>
							</div>
							<span class="formula-explanation"
								>Rare events occurring at constant rate λ. Memoryless inter-arrival times follow
								Exponential dist.</span
							>
						</div>
					</div>
				</article>

				<!-- Differential Equations & Partial Differential Equations -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🔗 Differential Equations</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Heat / Diffusion Equation</span>
							<div class="formula-display">
								<span class="formula-symbol">∂u/∂t = α·∇²u, (Laplacian in space)</span>
							</div>
							<span class="formula-explanation"
								>Parabolic PDE describing diffusion / heat spreading. Entropy-increasing: profiles
								smooth over time.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Wave Equation (Hyperbolic)</span>
							<div class="formula-display">
								<span class="formula-symbol">∂²u/∂t² = c²·∇²u, (second-order in time)</span>
							</div>
							<span class="formula-explanation"
								>Conservative dynamics: energy preserved. Solutions = traveling / standing waves.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Navier-Stokes (Fluid Dynamics)</span>
							<div class="formula-display">
								<span class="formula-symbol">ρ(∂v/∂t + (v·∇)v) = -∇p + μ∇²v + f</span>
							</div>
							<span class="formula-explanation"
								>Momentum equations for viscous fluids. Nonlinear, turbulence at high Reynolds
								numbers.</span
							>
						</div>
					</div>
				</article>

				<!-- Information Geometry -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">📐 Information Geometry</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Fisher Information Matrix</span>
							<div class="formula-display">
								<span class="formula-symbol">I_ij(θ) = E[(∂ ln L / ∂θ_i) * (∂ ln L / ∂θ_j)]</span>
							</div>
							<span class="formula-explanation"
								>Curvature of log-likelihood surface. Inverse = Cramér-Rao lower bound on parameter
								uncertainty.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Kullback-Leibler Divergence (Relative Entropy)</span>
							<div class="formula-display">
								<span class="formula-symbol">D_KL(P||Q) = Σ P(x) * ln(P(x)/Q(x))</span>
							</div>
							<span class="formula-explanation"
								>Asymmetric measure of distribution distance. Zero iff P = Q; lower = closer to
								target Q.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Mutual Information (Dependence)</span>
							<div class="formula-display">
								<span class="formula-symbol">I(X;Y) = Σ p(x,y) * ln(p(x,y) / (p(x)*p(y)))</span>
							</div>
							<span class="formula-explanation"
								>Amount of information X contains about Y. Zero iff independent; equals H(X) iff
								Y=X.</span
							>
						</div>
					</div>
				</article>

				<!-- Category Theory & Abstraction -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🏛️ Category Theory & Abstraction</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Functor (Structure-Preserving Map)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>F: C → D, maps objects X_C to F(X_C) ∈ Obj(D), morphisms f to F(f)</span
								>
							</div>
							<span class="formula-explanation"
								>Higher-level abstraction: maps between mathematical structures themselves.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Natural Transformation</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>η: F ⇒ G (between functors F,G), comoherent family of morphisms η_X: F(X) → G(X)</span
								>
							</div>
							<span class="formula-explanation"
								>Structure-preserving map between functors. Unifies many mathematical concepts
								(universal properties).</span
							>
						</div>
					</div>
				</article>

				<!-- Measure Theory & Probability Spaces -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">Σ Measure Theory</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Probability Measure (Kolmogorov Axioms)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>P: F → [0,1], with P(Ω)=1, P(∅)=0, countable additivity</span
								>
							</div>
							<span class="formula-explanation"
								>Foundational axioms of probability. Any probability model must satisfy these three
								properties.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Borel σ-algebra (on ℝ^n)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>σ(open sets) = smallest σ-algebra containing all open intervals</span
								>
							</div>
							<span class="formula-explanation"
								>Enables well-defined Lebesgue measure on continuous spaces; covers "normal" events.</span
							>
						</div>
					</div>
				</article>

				<!-- Gauge Theory & Fields -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">⚛️ Gauge Theory & Field Theory</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">U(1) Gauge Symmetry (Electromagnetism)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>ψ(x) → e^(i·α(x))·ψ(x), requires ∂_μ → ∂_μ + ie·A_μ(x)</span
								>
							</div>
							<span class="formula-explanation"
								>Local phase invariance enforces introduction of gauge field (photon). Symmetry →
								interaction dynamics.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Yang-Mills Action (Non-Abelian Gauge)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>S = -(1/4g²) ∫ Tr(F_μν²) d^4x, F_μν = ∂_μ A_ν - ∂_ν A_μ + [A_μ, A_ν]</span
								>
							</div>
							<span class="formula-explanation"
								>Generalization to non-commuting gauge groups (SU(2), SU(3)). Basis for QCD and
								electroweak theory.</span
							>
						</div>
					</div>
				</article>

				<!-- Optimization & Variational Methods -->
				<article class="math-domain-card">
					<h3 class="math-domain-title">🎯 Optimization & Variational Methods</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Gradient Descent (Steepest Descent)</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>θ_(n+1) = θ_n - α·∇ L(θ_n), where α = learning rate</span
								>
							</div>
							<span class="formula-explanation"
								>Iterative minimization along negative gradient. Convergence rate depends on
								curvature (Hessian).</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Calculus of Variations (Euler-Lagrange)</span>
							<div class="formula-display">
								<span class="formula-symbol">δ ∫ L(y, y', x) dx = 0 ⟹ ∂L/∂y - d/dx(∂L/∂y') = 0</span
								>
							</div>
							<span class="formula-explanation"
								>Extremal path in function space. Variational principle: nature extremizes action
								(Hamilton's principle).</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Penalty / Constraint Methods</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>L_augmented = L(θ) + λ·||g(θ)||² (soft constraints)</span
								>
							</div>
							<span class="formula-explanation"
								>Encode constraints into objective. Trade-off parameter λ controls constraint
								violation tolerance.</span
							>
						</div>
					</div>
				</article>

				<!-- Composite Signal -->
				<article class="math-domain-card math-composite">
					<h3 class="math-domain-title">⚖ Composite Code Likelihood</h3>
					<div class="formula-block">
						<div class="formula-item">
							<span class="formula-label">Weighted Multi-Metric Fusion</span>
							<div class="formula-display">
								<span class="formula-symbol"
									>Σ_overall = 0.20·H + 0.15·λ + 0.13·C + 0.12·S + 0.10·Φ + 0.10·T + 0.10·R + 0.10·Ω</span
								>
							</div>
							<span class="formula-explanation"
								>Balanced weighting across all 8 orthogonal channels. First entry (entropy
								compression) most critical.</span
							>
						</div>
						<div class="formula-item">
							<span class="formula-label">Code Likelihood Estimate</span>
							<div class="formula-display">
								<span class="formula-symbol">L_code = clamp(0.92·Σ_overall + 0.08·H, 0, 1)</span>
							</div>
							<span class="formula-explanation"
								>Probability that observed pattern reflects information-efficient encoding or hidden
								constraint layer (vs. pure randomness).</span
							>
						</div>
					</div>
				</article>
			</div>
		</section>

		<!-- Footer -->
		<footer class="page-footer">
			<div class="footer-content">
				<span class="footer-brand">Trill Symbiont</span>
				<span class="footer-divider">•</span>
				<span class="footer-text">Exploring the Platonic Space Hypothesis</span>
			</div>
			<div class="footer-links">
				<a href="https://www.drmichaellevin.org/" target="_blank" rel="noopener"
					>Michael Levin's Lab</a
				>
				<span class="footer-divider">•</span>
				<button type="button" class="footer-link footer-link-btn" on:click={navigateHome}
					>Back to Main App</button
				>
			</div>
		</footer>
	</div>
</main>

<style>
	/* Page Container */
	.page-container {
		min-height: 100vh;
		background: #0a0a0f;
		color: white;
		position: relative;
		overflow-x: hidden;
	}

	/* Animated Background */
	.animated-bg {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.gradient-orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		opacity: 0.4;
		animation: float 20s ease-in-out infinite;
	}

	.orb-1 {
		width: 600px;
		height: 600px;
		background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
		top: -200px;
		left: -200px;
		animation-delay: 0s;
	}

	.orb-2 {
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, #6366f1 0%, transparent 70%);
		bottom: -150px;
		right: -150px;
		animation-delay: -7s;
	}

	.orb-3 {
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, #ec4899 0%, transparent 70%);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		animation-delay: -14s;
	}

	@keyframes float {
		0%,
		100% {
			transform: translate(0, 0) scale(1);
		}
		25% {
			transform: translate(50px, -30px) scale(1.1);
		}
		50% {
			transform: translate(-30px, 50px) scale(0.9);
		}
		75% {
			transform: translate(-50px, -20px) scale(1.05);
		}
	}

	/* Grid Overlay */
	.grid-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-image:
			linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px);
		background-size: 50px 50px;
		pointer-events: none;
		z-index: 1;
	}

	/* Mouse Glow */
	.mouse-glow {
		position: fixed;
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
		border-radius: 50%;
		pointer-events: none;
		transform: translate(-50%, -50%);
		z-index: 2;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.mouse-glow.visible {
		opacity: 1;
	}

	/* Content Wrapper */
	.content-wrapper {
		position: relative;
		z-index: 10;
		max-width: 100%;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	@media (min-width: 768px) {
		.content-wrapper {
			padding: 3rem 3rem;
			max-width: 95vw;
		}
	}

	@media (min-width: 1200px) {
		.content-wrapper {
			padding: 3rem 4rem;
			max-width: 92vw;
		}
	}

	@media (min-width: 1600px) {
		.content-wrapper {
			max-width: 90vw;
		}
	}

	/* Header */
	.header {
		margin-bottom: 3rem;
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.header.mounted {
		opacity: 1;
		transform: translateY(0);
	}

	/* Back Link */
	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 100px;
		color: rgba(255, 255, 255, 0.8);
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.3s ease;
		margin-bottom: 2rem;
	}

	.back-link:hover {
		background: rgba(139, 92, 246, 0.2);
		border-color: rgba(139, 92, 246, 0.4);
		color: white;
		transform: translateX(-5px);
	}

	.back-arrow {
		font-size: 1.2rem;
		transition: transform 0.3s ease;
	}

	.back-link:hover .back-arrow {
		transform: translateX(-3px);
	}

	/* Title Section */
	.title-section {
		text-align: center;
		margin-bottom: 2rem;
	}

	.title-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2));
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 100px;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 2px;
		color: #a78bfa;
		margin-bottom: 1rem;
	}

	.badge-icon {
		font-size: 1rem;
	}

	.main-title {
		font-size: clamp(2.5rem, 8vw, 5rem);
		font-weight: 800;
		line-height: 1.1;
		margin: 0 0 1rem;
		letter-spacing: -0.02em;
	}

	@media (min-width: 1200px) {
		.main-title {
			font-size: clamp(3.5rem, 6vw, 6rem);
		}
	}

	.title-word {
		display: block;
	}

	.title-highlight {
		background: linear-gradient(135deg, #8b5cf6, #ec4899, #6366f1);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.subtitle {
		font-size: clamp(1rem, 2.5vw, 1.25rem);
		color: rgba(255, 255, 255, 0.7);
		max-width: 800px;
		margin: 0 auto;
		line-height: 1.6;
	}

	@media (min-width: 1200px) {
		.subtitle {
			font-size: clamp(1.25rem, 2vw, 1.5rem);
			max-width: 900px;
		}
	}

	.highlight {
		color: #a78bfa;
		font-weight: 600;
	}

	/* Info Cards */
	.info-cards {
		display: flex;
		justify-content: center;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 2rem;
	}

	.info-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.25rem;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		transition: all 0.3s ease;
	}

	.info-card:hover {
		background: rgba(139, 92, 246, 0.1);
		border-color: rgba(139, 92, 246, 0.3);
		transform: translateY(-2px);
	}

	.card-icon {
		font-size: 1.5rem;
	}

	.card-content {
		display: flex;
		flex-direction: column;
	}

	.card-title {
		font-weight: 600;
		font-size: 0.875rem;
	}

	.card-desc {
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.5);
	}

	@media (min-width: 1200px) {
		.card-icon {
			font-size: 2rem;
		}

		.card-title {
			font-size: 1rem;
		}

		.card-desc {
			font-size: 0.875rem;
		}

		.info-card {
			padding: 1rem 1.5rem;
		}
	}

	/* Simulation Container */
	.simulation-container {
		position: relative;
		background: linear-gradient(135deg, rgba(17, 24, 39, 0.8), rgba(30, 27, 75, 0.6));
		border: 1px solid rgba(139, 92, 246, 0.2);
		border-radius: 24px;
		padding: 1.5rem;
		backdrop-filter: blur(20px);
		box-shadow:
			0 25px 50px -12px rgba(0, 0, 0, 0.5),
			0 0 0 1px rgba(255, 255, 255, 0.05) inset,
			0 0 100px rgba(139, 92, 246, 0.1);
		margin-bottom: 4rem;
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
	}

	.simulation-container.mounted {
		opacity: 1;
		transform: translateY(0);
	}

	.container-glow {
		position: absolute;
		top: -2px;
		left: -2px;
		right: -2px;
		bottom: -2px;
		background: linear-gradient(135deg, #8b5cf6, #ec4899, #6366f1, #8b5cf6);
		background-size: 300% 300%;
		border-radius: 26px;
		z-index: -1;
		opacity: 0.5;
		animation: gradient-rotate 8s ease infinite;
		filter: blur(20px);
	}

	@keyframes gradient-rotate {
		0% {
			background-position: 0% 50%;
		}
		50% {
			background-position: 100% 50%;
		}
		100% {
			background-position: 0% 50%;
		}
	}

	@media (min-width: 768px) {
		.simulation-container {
			padding: 2rem;
		}
	}

	/* Theory Section */
	.theory-section {
		margin-bottom: 4rem;
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s;
	}

	.theory-section.mounted {
		opacity: 1;
		transform: translateY(0);
	}

	.section-title {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 2rem;
		text-align: center;
	}

	@media (min-width: 1200px) {
		.section-title {
			font-size: 2rem;
			gap: 1rem;
		}
	}

	.section-icon {
		font-size: 1.75rem;
	}

	@media (min-width: 1200px) {
		.section-icon {
			font-size: 2.25rem;
		}
	}

	.theory-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 640px) {
		.theory-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.theory-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		padding: 1.5rem;
		transition: all 0.3s ease;
	}

	.theory-card:hover {
		background: rgba(139, 92, 246, 0.08);
		border-color: rgba(139, 92, 246, 0.3);
		transform: translateY(-5px);
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
	}

	.theory-icon {
		font-size: 2.5rem;
		margin-bottom: 1rem;
	}

	.theory-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 0.75rem;
		color: #a78bfa;
	}

	.theory-card p {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.6;
		margin: 0;
	}

	@media (min-width: 1200px) {
		.theory-card {
			padding: 2rem;
		}

		.theory-icon {
			font-size: 3rem;
		}

		.theory-card h3 {
			font-size: 1.35rem;
			margin-bottom: 1rem;
		}

		.theory-card p {
			font-size: 1.05rem;
			line-height: 1.7;
		}
	}

	@media (min-width: 1024px) {
		.theory-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 2rem;
		}
	}

	/* Footer */
	.page-footer {
		padding: 2rem 0;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.footer-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}

	.footer-brand {
		font-weight: 600;
		color: #a78bfa;
	}

	.footer-divider {
		opacity: 0.3;
	}

	/* View Toggle */
	.view-toggle {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s;
	}

	.view-toggle.mounted {
		opacity: 1;
		transform: translateY(0);
	}

	.toggle-btn {
		padding: 0.75rem 1.5rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 100px;
		color: rgba(255, 255, 255, 0.7);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	@media (min-width: 1200px) {
		.toggle-btn {
			padding: 1rem 2rem;
			font-size: 1rem;
		}
	}

	.toggle-btn:hover {
		background: rgba(139, 92, 246, 0.1);
		border-color: rgba(139, 92, 246, 0.3);
		color: white;
	}

	.toggle-btn.active {
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(99, 102, 241, 0.2));
		border-color: #8b5cf6;
		color: white;
		box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
	}

	/* Concept Banner */
	.concept-banner {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1.5rem;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1));
		border: 1px solid rgba(139, 92, 246, 0.3);
		border-radius: 16px;
		margin-bottom: 2rem;
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
	}

	.concept-banner.mounted {
		opacity: 1;
		transform: translateY(0);
	}

	.concept-icon {
		font-size: 2rem;
		flex-shrink: 0;
	}

	.concept-text {
		font-size: 0.95rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.9);
	}

	@media (min-width: 1200px) {
		.concept-banner {
			padding: 2rem 2.5rem;
			gap: 1.5rem;
		}

		.concept-icon {
			font-size: 2.5rem;
		}

		.concept-text {
			font-size: 1.15rem;
			line-height: 1.7;
		}
	}

	.concept-text strong {
		color: #a78bfa;
	}

	.concept-text em {
		color: #ec4899;
		font-style: normal;
		font-weight: 600;
	}

	/* Attribution */
	.attribution {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.4);
		margin-top: 0.5rem;
	}

	/* Simulator Header */
	.simulator-header {
		text-align: center;
		margin-bottom: 1.5rem;
		padding: 0 1rem;
	}

	.simulator-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 0 0.5rem;
		color: #a78bfa;
	}

	.simulator-header p {
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.6);
		margin: 0;
		max-width: 600px;
		margin: 0 auto;
	}

	/* Featured Theory Card */
	.theory-card.featured {
		grid-column: 1 / -1;
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1));
		border-color: rgba(139, 92, 246, 0.4);
	}

	.theory-card.featured h3 {
		font-size: 1.25rem;
	}

	.theory-card.featured p {
		font-size: 1rem;
		font-style: italic;
	}

	/* Map Section */
	.map-section {
		margin-bottom: 4rem;
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s;
	}

	.map-section.mounted {
		opacity: 1;
		transform: translateY(0);
	}

	.map-content {
		display: grid;
		gap: 2rem;
	}

	@media (min-width: 768px) {
		.map-content {
			grid-template-columns: 1fr 1fr;
		}
	}

	.map-quote {
		background: rgba(0, 0, 0, 0.3);
		border-radius: 16px;
		padding: 2rem;
		border-left: 4px solid #8b5cf6;
	}

	.map-quote blockquote {
		margin: 0;
		font-size: 1rem;
		line-height: 1.7;
		color: rgba(255, 255, 255, 0.85);
		font-style: italic;
	}

	@media (min-width: 1200px) {
		.map-quote {
			padding: 2.5rem;
		}

		.map-quote blockquote {
			font-size: 1.2rem;
			line-height: 1.8;
		}

		.map-explanation {
			padding: 2.5rem;
		}

		.map-explanation h3 {
			font-size: 1.35rem;
		}

		.map-explanation p,
		.map-explanation li {
			font-size: 1.05rem;
			line-height: 1.7;
		}
	}

	.map-explanation {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		padding: 2rem;
	}

	.map-explanation h3 {
		margin: 0 0 1rem;
		font-size: 1.125rem;
		color: #a78bfa;
	}

	.map-explanation p {
		margin: 0 0 1rem;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.6;
	}

	.map-explanation ul {
		margin: 0 0 1rem;
		padding-left: 0;
		list-style: none;
	}

	.map-explanation li {
		margin-bottom: 0.75rem;
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.5;
	}

	.map-explanation .optimistic {
		color: #a78bfa;
		font-weight: 500;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		padding-top: 1rem;
		margin-bottom: 0;
	}

	/* Action Section */
	.action-section {
		margin-bottom: 4rem;
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s;
	}

	.action-section.mounted {
		opacity: 1;
		transform: translateY(0);
	}

	.action-grid {
		display: grid;
		gap: 1.5rem;
	}

	@media (min-width: 768px) {
		.action-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.action-card {
		position: relative;
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		padding: 2rem 1.5rem 1.5rem;
		text-align: center;
		transition: all 0.3s ease;
	}

	.action-card:hover {
		background: rgba(139, 92, 246, 0.08);
		border-color: rgba(139, 92, 246, 0.3);
		transform: translateY(-5px);
	}

	.action-number {
		position: absolute;
		top: -15px;
		left: 50%;
		transform: translateX(-50%);
		width: 30px;
		height: 30px;
		background: linear-gradient(135deg, #8b5cf6, #6366f1);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 0.875rem;
	}

	.action-card h3 {
		margin: 0 0 0.75rem;
		font-size: 1rem;
		color: #a78bfa;
	}

	.action-card p {
		margin: 0;
		font-size: 0.85rem;
		color: rgba(255, 255, 255, 0.7);
		line-height: 1.6;
	}

	/* Infodynamics Probe Section */
	.probe-section {
		margin-bottom: 4rem;
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.75s;
	}

	.probe-section.mounted {
		opacity: 1;
		transform: translateY(0);
	}

	.probe-intro {
		max-width: 980px;
		margin: 0 auto 2rem;
		text-align: center;
		line-height: 1.7;
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.78);
	}

	.probe-grid {
		display: grid;
		gap: 1.25rem;
		grid-template-columns: 1fr;
		margin-bottom: 1.25rem;
	}

	@media (min-width: 1100px) {
		.probe-grid {
			grid-template-columns: minmax(340px, 0.85fr) minmax(520px, 1.15fr);
		}

		.secondary-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	.probe-panel {
		background: linear-gradient(160deg, rgba(13, 18, 28, 0.82), rgba(32, 17, 60, 0.63));
		border: 1px solid rgba(130, 135, 255, 0.24);
		border-radius: 16px;
		padding: 1.25rem;
		backdrop-filter: blur(10px);
	}

	.probe-panel h3 {
		margin: 0 0 0.6rem;
		font-size: 1.1rem;
		color: #d5ccff;
	}

	.probe-panel-subtitle {
		margin: 0;
		font-weight: 600;
		color: #a5b4fc;
		font-size: 0.95rem;
	}

	.probe-domain-detail {
		margin: 0.45rem 0 1rem;
		font-size: 0.84rem;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.72);
	}

	.probe-control {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		margin-bottom: 0.8rem;
	}

	.probe-control span {
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.77);
		font-weight: 600;
	}

	.probe-control select,
	.probe-control input {
		width: 100%;
	}

	.probe-control select {
		padding: 0.65rem 0.7rem;
		border-radius: 10px;
		border: 1px solid rgba(130, 135, 255, 0.35);
		background: rgba(6, 10, 20, 0.75);
		color: rgba(255, 255, 255, 0.92);
	}

	.probe-control input[type='range'] {
		accent-color: #8b5cf6;
	}

	.probe-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-top: 0.2rem;
	}

	.probe-btn {
		padding: 0.6rem 0.9rem;
		border-radius: 10px;
		border: 1px solid rgba(167, 139, 250, 0.45);
		background: linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(67, 56, 202, 0.35));
		color: #efe9ff;
		font-weight: 600;
		cursor: pointer;
		transition:
			transform 0.2s ease,
			border-color 0.2s ease;
	}

	.probe-btn:hover {
		transform: translateY(-1px);
		border-color: rgba(167, 139, 250, 0.85);
	}

	.seed-readout {
		font-size: 0.78rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.probe-kpis {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.7rem;
		margin-bottom: 1rem;
	}

	.kpi-card {
		padding: 0.7rem;
		border-radius: 12px;
		background: rgba(5, 8, 18, 0.65);
		border: 1px solid rgba(130, 135, 255, 0.25);
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.kpi-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.58);
	}

	.kpi-value {
		font-size: 1rem;
		color: #e3d8ff;
	}

	.sparkline {
		display: grid;
		grid-template-columns: repeat(96, minmax(0, 1fr));
		gap: 2px;
		height: 112px;
		align-items: end;
		padding: 0.6rem;
		background: rgba(5, 8, 18, 0.7);
		border-radius: 10px;
		border: 1px solid rgba(130, 135, 255, 0.22);
		margin-bottom: 0.8rem;
	}

	.spark-cell {
		height: var(--h);
		background: linear-gradient(180deg, rgba(196, 181, 253, 0.95), rgba(99, 102, 241, 0.85));
		border-radius: 2px 2px 0 0;
		opacity: 0.9;
	}

	.entropy-readout {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.8rem;
		color: rgba(255, 255, 255, 0.64);
		margin-bottom: 0.9rem;
		flex-wrap: wrap;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.65rem;
	}

	@media (min-width: 700px) {
		.metrics-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.metric-card {
		background: rgba(5, 8, 18, 0.6);
		border: 1px solid rgba(130, 135, 255, 0.2);
		border-radius: 10px;
		padding: 0.7rem;
	}

	.metric-row {
		display: flex;
		justify-content: space-between;
		gap: 0.6rem;
		align-items: baseline;
	}

	.metric-row h4 {
		margin: 0;
		font-size: 0.84rem;
		color: #d5ccff;
	}

	.metric-row span {
		font-size: 0.75rem;
		font-weight: 700;
		color: #b2c6ff;
	}

	.metric-meter {
		height: 7px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 999px;
		overflow: hidden;
		margin: 0.45rem 0 0.5rem;
	}

	.metric-fill {
		height: 100%;
		width: var(--fill);
		background: linear-gradient(90deg, #818cf8, #a78bfa, #34d399);
	}

	.metric-card p {
		margin: 0;
		font-size: 0.73rem;
		line-height: 1.4;
		color: rgba(255, 255, 255, 0.64);
	}

	.findings-panel ul {
		margin: 0;
		padding-left: 1rem;
		display: grid;
		gap: 0.55rem;
	}

	.findings-panel li {
		font-size: 0.84rem;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.82);
	}

	.concepts-panel p {
		margin: 0 0 0.9rem;
		font-size: 0.85rem;
		line-height: 1.55;
		color: rgba(255, 255, 255, 0.76);
	}

	.concept-chip-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.concept-chip {
		display: inline-flex;
		padding: 0.4rem 0.65rem;
		border-radius: 999px;
		font-size: 0.73rem;
		letter-spacing: 0.02em;
		background: rgba(129, 140, 248, 0.2);
		border: 1px solid rgba(129, 140, 248, 0.34);
		color: #e2e8ff;
	}

	@media (min-width: 1200px) {
		.action-grid {
			gap: 2rem;
		}

		.action-card {
			padding: 2.5rem 2rem 2rem;
		}

		.action-number {
			width: 36px;
			height: 36px;
			font-size: 1rem;
			top: -18px;
		}

		.action-card h3 {
			font-size: 1.25rem;
			margin-bottom: 1rem;
		}

		.action-card p {
			font-size: 1rem;
			line-height: 1.7;
		}
	}

	/* Footer Links */
	.footer-links {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-top: 0.75rem;
		flex-wrap: wrap;
	}

	.footer-links a {
		color: rgba(255, 255, 255, 0.5);
		text-decoration: none;
		font-size: 0.8rem;
		transition: color 0.3s ease;
	}

	.footer-link-btn {
		padding: 0;
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.footer-links a:hover {
		color: #a78bfa;
	}

	.footer-link-btn:hover {
		color: #a78bfa;
	}

	/* Mathematical Formalism Section */
	.math-section {
		margin-bottom: 4rem;
		opacity: 0;
		transform: translateY(30px);
		transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.9s;
	}

	.math-section.mounted {
		opacity: 1;
		transform: translateY(0);
	}

	.math-intro {
		max-width: 960px;
		margin: 0 auto 2.5rem;
		text-align: center;
		line-height: 1.7;
		font-size: 0.95rem;
		color: rgba(255, 255, 255, 0.78);
	}

	.math-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr;
	}

	@media (min-width: 760px) {
		.math-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 1.5rem;
		}
	}

	.math-domain-card {
		background: linear-gradient(165deg, rgba(15, 23, 42, 0.85), rgba(25, 15, 50, 0.7));
		border: 1px solid rgba(147, 112, 219, 0.3);
		border-radius: 14px;
		padding: 1rem;
		backdrop-filter: blur(12px);
		min-width: 0;
		overflow: hidden;
	}

	.math-domain-card.math-composite {
		grid-column: 1 / -1;
		background: linear-gradient(165deg, rgba(50, 30, 100, 0.4), rgba(25, 15, 50, 0.5));
		border-color: rgba(168, 85, 247, 0.4);
	}

	.math-domain-title {
		margin: 0 0 1rem;
		font-size: 1.3rem;
		font-weight: 600;
		color: #c4b5fd;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		line-height: 1.3;
	}

	.formula-block {
		display: grid;
		gap: 1rem;
	}

	.formula-item {
		padding: 0.95rem;
		background: rgba(5, 8, 18, 0.45);
		border-left: 3px solid rgba(147, 112, 219, 0.4);
		border-radius: 8px;
		min-width: 0;
	}

	.formula-label {
		display: block;
		font-size: 0.95rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: rgba(255, 255, 255, 0.65);
		margin-bottom: 0.5rem;
		line-height: 1.4;
	}

	.formula-display {
		background: rgba(15, 10, 35, 0.8);
		border: 1px solid rgba(147, 112, 219, 0.15);
		border-radius: 6px;
		padding: 0.9rem 1rem;
		font-family: 'Courier New', monospace;
		font-size: 1.08rem;
		line-height: 1.75;
		color: #e0d5ff;
		margin: 0.6rem 0;
		overflow-x: hidden;
		white-space: normal;
		overflow-wrap: anywhere;
		word-break: break-word;
		hyphens: auto;
	}

	.formula-symbol {
		display: block;
		white-space: normal;
		overflow-wrap: anywhere;
		word-break: break-word;
		min-width: 0;
	}

	.fraction {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		margin: 0 0.15em;
		line-height: 1.2;
	}

	.numeator {
		display: block;
		border-bottom: 1px solid #e0d5ff;
		padding: 0 0.3em;
		font-size: 0.8em;
	}

	.denominator {
		display: block;
		padding: 0 0.3em;
		font-size: 0.8em;
	}

	.formula-explanation {
		display: block;
		font-size: 0.98rem;
		color: rgba(255, 255, 255, 0.64);
		line-height: 1.65;
		margin-top: 0.5rem;
		font-style: italic;
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	@media (min-width: 1024px) {
		.math-domain-title {
			font-size: 1.4rem;
		}

		.formula-display {
			font-size: 1.14rem;
			padding: 1rem 1.2rem;
		}

		.formula-explanation {
			font-size: 1.02rem;
		}

		.math-domain-card {
			padding: 1.2rem;
		}
	}

	@media (min-width: 1360px) {
		.math-domain-card {
			padding: 1.35rem;
		}

		.formula-label {
			font-size: 1rem;
		}

		.formula-display {
			font-size: 1.2rem;
		}

		.formula-explanation {
			font-size: 1.06rem;
		}
	}

	/* Global body styles */
	:global(body) {
		margin: 0;
		padding: 0;
		background: #0a0a0f;
	}
</style>
