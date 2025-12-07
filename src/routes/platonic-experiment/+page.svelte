<script lang="ts">
	import Platonics from '$lib/components/Platonics.svelte';
	import { onMount } from 'svelte';

	let mounted = false;
	let mouseX = 0;
	let mouseY = 0;

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
	<title>Platonic Experiment | Trill Symbiont</title>
	<meta name="description" content="Explore the Platonic Space Hypothesis with pure JavaScript simulations - cellular automata, prime patterns, and emergent complexity." />
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
	<div 
		class="mouse-glow" 
		style="left: {mouseX}px; top: {mouseY}px;"
		class:visible={mounted}
	></div>

	<div class="content-wrapper">
		<header class="header" class:mounted>
			<!-- Back button -->
			<a href="/" class="back-link">
				<span class="back-arrow">←</span>
				<span class="back-text">Back to Main</span>
			</a>

			<!-- Title Section -->
			<div class="title-section">
				<div class="title-badge">
					<span class="badge-icon">🔮</span>
					<span class="badge-text">EXPERIMENTAL</span>
				</div>
				<h1 class="main-title">
					<span class="title-word">Platonic</span>
					<span class="title-word title-highlight">Experiment</span>
				</h1>
				<p class="subtitle">
					Exploring the <span class="highlight">Platonic Space Hypothesis</span> through 
					pure JavaScript cellular automata simulations
				</p>
			</div>

			<!-- Quick info cards -->
			<div class="info-cards">
				<div class="info-card">
					<span class="card-icon">⚡</span>
					<div class="card-content">
						<span class="card-title">Optimized</span>
						<span class="card-desc">TypedArrays</span>
					</div>
				</div>
				<div class="info-card">
					<span class="card-icon">🧬</span>
					<div class="card-content">
						<span class="card-title">Emergent</span>
						<span class="card-desc">Patterns</span>
					</div>
				</div>
				<div class="info-card">
					<span class="card-icon">🌊</span>
					<div class="card-content">
						<span class="card-title">Real-time</span>
						<span class="card-desc">Animation</span>
					</div>
				</div>
			</div>
		</header>

		<!-- Main Simulation Container -->
		<div class="simulation-container" class:mounted>
			<div class="container-glow"></div>
			<Platonics />
		</div>

		<!-- Theory Section -->
		<section class="theory-section" class:mounted>
			<h2 class="section-title">
				<span class="section-icon">📚</span>
				The Theory Behind It
			</h2>
			<div class="theory-grid">
				<article class="theory-card">
					<div class="theory-icon">🔢</div>
					<h3>Prime Synchronization</h3>
					<p>
						Like cicadas that emerge every 13 or 17 years, this pattern uses prime 
						modular arithmetic to create stable, self-organizing structures that resist 
						predatory timing.
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">⊕</div>
					<h3>XOR Logic Gates</h3>
					<p>
						Boolean XOR operations create complex interference patterns from simple rules, 
						demonstrating how digital logic can emerge from cellular automata.
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">🌀</div>
					<h3>Fibonacci Emergence</h3>
					<p>
						The golden ratio appears in nature from sunflowers to galaxies. This pattern 
						explores how Fibonacci sequences create self-similar fractal structures.
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">🌊</div>
					<h3>Edge of Chaos</h3>
					<p>
						Complex systems exhibit the most interesting behavior at the boundary between 
						order and chaos—where life and computation emerge.
					</p>
				</article>
			</div>
		</section>

		<!-- Footer -->
		<footer class="page-footer">
			<div class="footer-content">
				<span class="footer-brand">Trill Symbiont</span>
				<span class="footer-divider">•</span>
				<span class="footer-text">Exploring mathematical patterns in nature</span>
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
		0%, 100% {
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
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	@media (min-width: 768px) {
		.content-wrapper {
			padding: 3rem 2rem;
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
		max-width: 600px;
		margin: 0 auto;
		line-height: 1.6;
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
		0% { background-position: 0% 50%; }
		50% { background-position: 100% 50%; }
		100% { background-position: 0% 50%; }
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

	.section-icon {
		font-size: 1.75rem;
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

	/* Global body styles */
	:global(body) {
		margin: 0;
		padding: 0;
		background: #0a0a0f;
	}
</style>
