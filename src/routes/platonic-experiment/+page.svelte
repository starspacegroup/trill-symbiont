<script lang="ts">
	import Platonics from '$lib/components/Platonics.svelte';
	import PlatonicSpace from '$lib/components/PlatonicSpace.svelte';
	import { onMount } from 'svelte';

	let mounted = false;
	let mouseX = 0;
	let mouseY = 0;
	let activeSection: 'space' | 'simulator' | 'both' = 'both';

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
	<meta name="description" content="Explore the Platonic Space Hypothesis - where mathematical truths and patterns ingress into physical reality through interfaces. Interactive visualizations of primes, Fibonacci, and emergent complexity." />
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
					<span class="badge-text">PLATONIC SPACE HYPOTHESIS</span>
				</div>
				<h1 class="main-title">
					<span class="title-word">The Latent Space</span>
					<span class="title-word title-highlight">of Patterns</span>
				</h1>
				<p class="subtitle">
					"There are facts that you come across... that if those facts were different, 
					biology and physics would be different. They <span class="highlight">impact</span> the physical world, 
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
			<button class="toggle-btn" class:active={activeSection === 'space'} on:click={() => activeSection = 'space'}>
				🌌 Platonic Space
			</button>
			<button class="toggle-btn" class:active={activeSection === 'simulator'} on:click={() => activeSection = 'simulator'}>
				🧬 Pattern Simulator
			</button>
			<button class="toggle-btn" class:active={activeSection === 'both'} on:click={() => activeSection = 'both'}>
				📊 Show Both
			</button>
		</div>

		<!-- Key Concept Banner -->
		<div class="concept-banner" class:mounted>
			<div class="concept-icon">💡</div>
			<div class="concept-text">
				<strong>Core Insight:</strong> Physical objects (brains, cells, robots) are <em>interfaces</em> — 
				"thin clients" — through which patterns from a structured Platonic space become manifest. 
				We don't <em>create</em> minds or mathematical truths; we build interfaces that allow them to <em>ingress</em>.
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
					<p>These simulations demonstrate "free lunches" — complex patterns emerging from minimal rules, 
					just as biology exploits mathematical truths without having to evolve them.</p>
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
						"The mind-brain relationship is basically of the same kind as the math-physics relationship. 
						The same way that non-physical facts of physics haunt physical objects is basically how different 
						kinds of patterns that we call 'minds' are manifesting through interfaces like brains."
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">🔢</div>
					<h3>The Cicada Pattern</h3>
					<p>
						Cicadas emerge at 13 and 17 year intervals — prime numbers that minimize predator synchronization. 
						"Why are they prime? Well, now you're in the math department." The distribution of primes exists 
						independently of biology, yet biology exploits it as a "free lunch."
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">📐</div>
					<h3>The Value of E</h3>
					<p>
						"Nothing you can do in the physical world will change E or Feigenbaum's constant. You could have 
						swapped all the constants at the Big Bang — you are not going to change those things." 
						These truths from outside physics constrain what's possible within it.
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">🎁</div>
					<h3>Free Lunches</h3>
					<p>
						"If evolution invents a voltage-gated ion channel (a transistor), all the truth tables and the 
						fact that NAND is special — you don't have to evolve those things. You get them for free." 
						Biology inherits computational truths it never paid for.
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">🌊</div>
					<h3>Beyond Emergence</h3>
					<p>
						"Calling them 'emergent' does nothing for a research program. It just means you got surprised." 
						Instead: assume patterns come from a structured space that we can systematically explore 
						and map the relationship between interfaces and patterns.
					</p>
				</article>
				<article class="theory-card">
					<div class="theory-icon">🤖</div>
					<h3>AI & New Interfaces</h3>
					<p>
						"When we make AIs, we are fishing in a region of that space that may never have had bodies before. 
						Some of the really interesting things artificial constructs can do are not because of the algorithm — 
						they're in spite of it."
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
						"There's this diagram called a 'map of mathematics' that shows how all the different pieces of math link together. 
						What is it a map of? It's a map of various truths — facts that are thrust upon you. You don't have a choice. 
						Once you've picked some axioms, here are surprising facts that are just going to be given to you."
					</blockquote>
				</div>
				<div class="map-explanation">
					<h3>The Research Program</h3>
					<p>
						In 20 years, one of two things will happen:
					</p>
					<ul>
						<li>✅ We produce a map of that space — "Here's why you get systems that work like this and like this, but never like that."</li>
						<li>❌ We find the space is too random — "It's not worth calling it a space because we've made zero progress linking embodiment to patterns."</li>
					</ul>
					<p class="optimistic">
						"I make the optimistic assumption that there's an underlying structure to that latent space. 
						This is not a random grab-bag of stuff."
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
					<p>All physical things are interfaces to patterns. "You build an interface. Some of those patterns are going to come through depending on what you build."</p>
				</div>
				<div class="action-card">
					<div class="action-number">2</div>
					<h3>Map the Relationships</h3>
					<p>"The research program is mapping out the relationship between the physical pointers we make and the patterns that come through."</p>
				</div>
				<div class="action-card">
					<div class="action-number">3</div>
					<h3>Expect Surprises</h3>
					<p>"You get more out than you put in. Make minimal assumptions and certain facts are thrust upon you."</p>
				</div>
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
				<a href="https://www.drmichaellevin.org/" target="_blank" rel="noopener">Michael Levin's Lab</a>
				<span class="footer-divider">•</span>
				<a href="/" class="footer-link">Back to Main App</a>
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

	.footer-links a:hover {
		color: #a78bfa;
	}

	/* Global body styles */
	:global(body) {
		margin: 0;
		padding: 0;
		background: #0a0a0f;
	}
</style>
