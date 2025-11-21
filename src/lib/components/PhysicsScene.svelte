<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import * as CANNON from 'cannon-es';

	// Props
	let { 
		tempo = 99,
		scaleFrequencies = []
	}: { 
		tempo?: number;
		scaleFrequencies?: number[];
	} = $props();

	let container: HTMLDivElement;
	let scene: THREE.Scene;
	let camera = $state<THREE.PerspectiveCamera>();
	let renderer: THREE.WebGLRenderer;
	let world: CANNON.World;
	let animationId: number;
	let controls = $state<OrbitControls>();
	
	// Default camera position
	const DEFAULT_CAMERA_POSITION = { 
		x: -84.1, 
		y: 30.5, 
		z: 28.8 
	};
	const DEFAULT_CAMERA_TARGET = { x: 0.0, y: 0.0, z: 0.0 };
	
	// Physics bodies and meshes
	let bodies: CANNON.Body[] = [];
	let meshes: THREE.Mesh[] = [];
	let hillBody: CANNON.Body;
	let hillMesh: THREE.Mesh;
	
	// Controls
	let isPlaying = $state(true);
	let isMuted = $state(false);
	let isFullscreen = $state(false);
	let showLegend = $state(false);
	let speedMultiplier = $state(1.0); // Speed offset multiplier
	let useTempoCorrelation = $state(true); // Whether to correlate speed with tempo
	let emitterInterval: ReturnType<typeof setInterval> | null = null;
	
	// Camera info for display (reactive)
	let cameraPos = $state({ x: 0, y: 0, z: 0 });
	let cameraTarget = $state({ x: 0, y: 0, z: 0 });
	let cameraFov = $state(75);
	let cameraDistance = $state(0);
	
	// Legend meshes
	let gridHelper: THREE.GridHelper;
	let axesHelper: THREE.AxesHelper;
	let distanceMarkers: THREE.Group;
	
	// Audio - Web Audio API
	let audioContext: AudioContext | null = null;
	let masterGain: GainNode | null = null;
	let collisionSounds = new Set<string>();
	
	// Constants
	const EMIT_INTERVAL = 1500; // ms
	const MAX_OBJECTS = 20;
	const HILL_SEGMENTS = 80;
	
	// Calculate time scale based on tempo (99 BPM is baseline/1.0x speed) and speed multiplier
	const BASE_TEMPO = 99;
	const timeScale = $derived(
		useTempoCorrelation ? (tempo / BASE_TEMPO) * speedMultiplier : speedMultiplier
	);

	function initScene() {
		// Three.js setup
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x0a0a0a);
		
	camera = new THREE.PerspectiveCamera(
		42,
		container.clientWidth / container.clientHeight,
		0.1,
		1000
	);
	camera.position.set(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z);
	camera.lookAt(DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z);		renderer = new THREE.WebGLRenderer({ antialias: true });
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.setPixelRatio(window.devicePixelRatio);
		container.appendChild(renderer.domElement);
		
		// Camera controls
		controls = new OrbitControls(camera, renderer.domElement);
		controls.enableDamping = true;
		controls.dampingFactor = 0.05;
		controls.mouseButtons = {
			LEFT: THREE.MOUSE.ROTATE,
			MIDDLE: THREE.MOUSE.PAN,
			RIGHT: THREE.MOUSE.ROTATE
		};
		controls.target.set(DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z);
		controls.update();
		
		// Lighting
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		scene.add(ambientLight);
		
		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
		directionalLight.position.set(5, 10, 5);
		scene.add(directionalLight);
		
	// Cannon.js physics world
	world = new CANNON.World();
	world.gravity.set(0, -9.82, 0);
	
	// Use SAPBroadphase for better performance and accuracy with many objects
	world.broadphase = new CANNON.SAPBroadphase(world);
	
	// CRITICAL: MAXIMUM solver iterations to prevent ANY tunneling possibility
	(world.solver as CANNON.GSSolver).iterations = 100; // Doubled from 50
	(world.solver as CANNON.GSSolver).tolerance = 0.00001; // Even stricter tolerance
	
	// CRITICAL: Disable sleeping to ensure ALL collisions are ALWAYS processed
	world.allowSleep = false;
	
	// CRITICAL: Maximum stiffness on default contact material
	world.defaultContactMaterial.contactEquationStiffness = 1e12; // Increased from 1e10
	world.defaultContactMaterial.contactEquationRelaxation = 4; // Increased from 3
	world.defaultContactMaterial.frictionEquationStiffness = 1e12;
	world.defaultContactMaterial.frictionEquationRelaxation = 4;
	
	// Create physics materials
	const groundMaterial = new CANNON.Material('ground');
	const objectMaterial = new CANNON.Material('object');
	
	// Create contact material with MAXIMUM stiffness to ABSOLUTELY prevent tunneling
	const contactMaterial = new CANNON.ContactMaterial(
		groundMaterial,
		objectMaterial,
		{
			friction: 0.8,
			restitution: 0.3,
			// CRITICAL: MAXIMUM stiffness - objects CANNOT penetrate terrain
			contactEquationStiffness: 1e12,
			contactEquationRelaxation: 4,
			frictionEquationStiffness: 1e12,
			frictionEquationRelaxation: 4
		}
	);
	world.addContactMaterial(contactMaterial);
	
	// Also add self-collision material with maximum stiffness
	const objectContact = new CANNON.ContactMaterial(
		objectMaterial,
		objectMaterial,
		{
			friction: 0.5,
			restitution: 0.4,
			// CRITICAL: Maximum stiffness for object-object collisions
			contactEquationStiffness: 1e12,
			contactEquationRelaxation: 4,
			frictionEquationStiffness: 1e12,
			frictionEquationRelaxation: 4
		}
	);
	world.addContactMaterial(objectContact);
	
	// Store materials for later use
	(world as any).groundMaterial = groundMaterial;
	(world as any).objectMaterial = objectMaterial;		// Create hill
		createHill();
		
		// Create legend helpers
		createLegend();
		
		// Audio setup - Web Audio API
		try {
			const AudioContextClass =
				window.AudioContext ||
				(window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
			audioContext = new AudioContextClass();
			masterGain = audioContext.createGain();
			masterGain.gain.value = 0.5;
			masterGain.connect(audioContext.destination);
		} catch (error) {
			console.error('Failed to initialize audio:', error);
		}
	}
	
	function createHill() {
		// Create very wide terrain with mountain ridge on left running perpendicular to camera
		const matrix: number[][] = [];
		const sizeX = HILL_SEGMENTS;
		const sizeY = HILL_SEGMENTS;
		
		for (let i = 0; i < sizeX; i++) {
			matrix.push([]);
			for (let j = 0; j < sizeY; j++) {
				// Normalize coordinates from 0 to 1
				const x = i / (sizeX - 1);
				const y = j / (sizeY - 1);
				
			// Convert to world coordinates
			// After 90° CCW rotation: x maps to depth (near/far), y maps to width (left/right)
			const xWorld = x * 2 - 1; // -1 to 1
			const zWorld = y * 2 - 1; // -1 to 1
			
			// Base ground level
			let height = 0.2;
			
			// CANYON: Carve a massive canyon starting near camera and extending into distance
			// Canyon runs along z-axis (perpendicular to camera view, going into distance)
			// Positioned slightly right of center
			const canyonCenterZ = zWorld; // Canyon extends along entire z-axis
			const canyonCenterX = xWorld - 0.1; // Slightly right of center (positive x)
			const distanceFromCanyonCenter = Math.abs(canyonCenterX);
			
			// Canyon width and depth
			const canyonWidth = 0.25; // How wide the canyon is
			const canyonDepth = 18; // How deep to carve down
			
			// Canyon profile - U-shaped with some variation
			if (distanceFromCanyonCenter < canyonWidth) {
				// Main canyon carving
				const normalizedDist = distanceFromCanyonCenter / canyonWidth; // 0 at center, 1 at edge
				const canyonProfile = Math.cos(normalizedDist * Math.PI / 2); // Smooth falloff
				
				// Vary depth based on distance (deeper towards front/near camera)
				const depthVariation = 0.7 + (1 - zWorld) * 0.3; // Deeper in front (zWorld = -1)
				
				// Add jagged walls and rock layers
				const wallDetail = 
					Math.sin(zWorld * 15) * 0.4 +
					Math.cos(zWorld * 8) * 0.6 +
					Math.abs(Math.sin(zWorld * 25)) * 0.3;
				
				// Carve the canyon (negative height)
				height -= canyonDepth * canyonProfile * depthVariation + wallDetail * canyonProfile;
			}
			
			// Create EXTREME jagged mountain face on the front-left
			// Mountain positioned at xWorld = -0.65 (left edge)
			const mountainX = xWorld + 0.65; // Distance from mountain peak line
			
			// EXTREME jagged peak in front (near camera, zWorld < 0)
			// This creates a dramatic mountain face right in our view
			const nearnessFactor = Math.max(0, 1 - zWorld); // Higher in front (zWorld = -1)
			
			// MOUNTAIN CANYON: Deep canyon at base of mountain (parallel to mountain ridge)
			// Positioned between mountain and plains
			const mountainCanyonCenter = xWorld + 0.45; // At the mountain base
			const distanceFromMountainCanyon = Math.abs(mountainCanyonCenter);
			const mountainCanyonWidth = 0.15;
			const mountainCanyonDepth = 25;
			
			if (distanceFromMountainCanyon < mountainCanyonWidth && mountainX < 0.7) {
				const normalizedDist = distanceFromMountainCanyon / mountainCanyonWidth;
				const canyonProfile = Math.cos(normalizedDist * Math.PI / 2);
				
				// Canyon depth varies along its length
				const lengthVariation = 0.8 + Math.sin(zWorld * 4) * 0.2;
				
				// Jagged canyon walls
				const canyonWallDetail = 
					Math.sin(zWorld * 12) * 0.6 +
					Math.cos(zWorld * 8) * 0.5 +
					Math.abs(Math.sin(zWorld * 20)) * 0.4;
				
				height -= mountainCanyonDepth * canyonProfile * lengthVariation + canyonWallDetail * canyonProfile;
			}
			
			if (mountainX < 0.6) {
				// Base mountain height - taller in front
				const baseMountainHeight = (20 + nearnessFactor * 8) * Math.exp(-mountainX * mountainX * 8);
				height += baseMountainHeight;
				
				// EXTREME jagged features - many overlapping frequencies
				const jaggedDetail = 
					Math.sin(zWorld * 8) * 1.5 + 
					Math.cos(zWorld * 12) * 1.2 +
					Math.sin(zWorld * 20) * 0.8 +
					Math.cos(mountainX * 15) * 1.0 +
					Math.sin(zWorld * 6 + mountainX * 10) * 1.3 +
					Math.cos(zWorld * 15 - mountainX * 8) * 0.9 +
					Math.sin(zWorld * 25 + mountainX * 12) * 0.7;
				
				// Apply jagged detail more intensely near the front and peak
				const jaggedIntensity = Math.exp(-mountainX * mountainX * 5) * (0.5 + nearnessFactor * 0.8);
				height += jaggedDetail * jaggedIntensity;
				
				// Add sharp ridges and spires
				const spires = 
					Math.abs(Math.sin(zWorld * 10)) * 2.0 +
					Math.abs(Math.cos(zWorld * 14)) * 1.5 +
					Math.abs(Math.sin(zWorld * 18 + mountainX * 20)) * 1.2;
				height += spires * Math.exp(-mountainX * mountainX * 6) * nearnessFactor;
			}
			
			// Complex downslope with extreme variation
			if (mountainX >= 0.15 && mountainX < 0.9) {
				// Steep slope base
				const slopeBase = 9 * Math.exp(-mountainX * mountainX * 2);
				
				// Extreme bumps, ridges, and gullies
				const complexity = 
					Math.sin(xWorld * 8 + zWorld * 6) * 1.5 +
					Math.cos(xWorld * 12) * 1.2 +
					Math.sin(zWorld * 15) * 1.3 +
					Math.cos(xWorld * 5 + zWorld * 9) * 1.0 +
					Math.sin(xWorld * 18 + zWorld * 12) * 0.9 +
					Math.abs(Math.sin(zWorld * 20)) * 0.8;
				
				const complexityFactor = Math.max(0, (0.9 - mountainX) / 0.9);
				height += slopeBase + complexity * complexityFactor * (0.8 + nearnessFactor * 0.4);
			}
			
			// Overall slope toward plains
			const generalSlope = Math.max(0, 3 * (1 - (xWorld + 1) / 2));
			height += generalSlope;
			
			// Rolling plains on far right
			if (xWorld > 0.4) {
				const plainVariation = 
					Math.sin(xWorld * 7) * 0.5 +
					Math.cos(zWorld * 8) * 0.45 +
					Math.sin(xWorld * 4 + zWorld * 5) * 0.4;
				height += Math.abs(plainVariation) * 0.7;
			}				// Ensure minimum ground height
				height = Math.max(height, 0.1);
				
				matrix[i].push(height);
			}
		}
		
	// Visual mesh (wireframe) - massive landscape extending in all directions
	const geometry = new THREE.PlaneGeometry(400, 400, sizeX - 1, sizeY - 1);
		const visualVertices = geometry.attributes.position.array;
		
		for (let i = 0; i < sizeX; i++) {
			for (let j = 0; j < sizeY; j++) {
				const idx = (i * sizeY + j) * 3;
				if (idx + 2 < visualVertices.length) {
					visualVertices[idx + 2] = matrix[i][j];
				}
			}
		}
		
		geometry.computeVertexNormals();
		
		const material = new THREE.MeshBasicMaterial({
			color: 0xBF00FF,
			wireframe: true
		});
		hillMesh = new THREE.Mesh(geometry, material);
		hillMesh.rotation.x = -Math.PI / 2;
		hillMesh.rotation.z = 0;
		hillMesh.position.set(0, -3, 100);
		scene.add(hillMesh);
		
	// Physics body - Extract vertices and indices directly from geometry
	const positionAttr = geometry.attributes.position;
	const indexAttr = geometry.index;
	
	const physicsVertices: number[] = [];
	const physicsIndices: number[] = [];
	
	// Copy vertices from geometry (already has the height data)
	for (let i = 0; i < positionAttr.count; i++) {
		physicsVertices.push(
			positionAttr.getX(i),
			positionAttr.getY(i),
			positionAttr.getZ(i)
		);
	}
	
	// Copy indices from geometry
	if (indexAttr) {
		for (let i = 0; i < indexAttr.count; i++) {
			physicsIndices.push(indexAttr.getX(i));
		}
	}
	
	// Physics body with Trimesh
	const trimeshShape = new CANNON.Trimesh(physicsVertices, physicsIndices);
	
	hillBody = new CANNON.Body({ 
		mass: 0,
		material: (world as any).groundMaterial,
		type: CANNON.Body.STATIC
	});
	hillBody.addShape(trimeshShape);
	
	// Apply same transform as visual mesh
	hillBody.position.set(0, -3, 100);
	hillBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
	
	world.addBody(hillBody);
	}
	
	function createLegend() {
		// Grid helper at ground level
		gridHelper = new THREE.GridHelper(100, 50, 0x00ff88, 0x004433);
		gridHelper.position.y = -3;
		scene.add(gridHelper);
		
		// Axes helper (X=red, Y=green, Z=blue)
		axesHelper = new THREE.AxesHelper(10);
		axesHelper.position.set(0, -3, 0);
		scene.add(axesHelper);
		
		// Distance markers group
		distanceMarkers = new THREE.Group();
		
		// Create text sprites for distance markers
		const distances = [5, 10, 15, 20];
		const createTextSprite = (text: string, color: string = '#00ff88') => {
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');
			if (!context) return null;
			
			canvas.width = 256;
			canvas.height = 128;
			context.font = 'Bold 48px Arial';
			context.fillStyle = color;
			context.textAlign = 'center';
			context.textBaseline = 'middle';
			context.fillText(text, 128, 64);
			
			const texture = new THREE.CanvasTexture(canvas);
			const material = new THREE.SpriteMaterial({ 
				map: texture,
				transparent: true,
				opacity: 0.8
			});
			return new THREE.Sprite(material);
		};
		
		// X-axis markers (red)
		distances.forEach(d => {
			const sprite = createTextSprite(`${d}m`, '#ff4444');
			if (sprite) {
				sprite.position.set(d, -2.5, 0);
				sprite.scale.set(2, 1, 1);
				distanceMarkers.add(sprite);
			}
			
			const spriteNeg = createTextSprite(`-${d}m`, '#ff4444');
			if (spriteNeg) {
				spriteNeg.position.set(-d, -2.5, 0);
				spriteNeg.scale.set(2, 1, 1);
				distanceMarkers.add(spriteNeg);
			}
		});
		
		// Z-axis markers (blue)
		distances.forEach(d => {
			const sprite = createTextSprite(`${d}m`, '#4444ff');
			if (sprite) {
				sprite.position.set(0, -2.5, d);
				sprite.scale.set(2, 1, 1);
				distanceMarkers.add(sprite);
			}
			
			const spriteNeg = createTextSprite(`-${d}m`, '#4444ff');
			if (spriteNeg) {
				spriteNeg.position.set(0, -2.5, -d);
				spriteNeg.scale.set(2, 1, 1);
				distanceMarkers.add(spriteNeg);
			}
		});
		
		// Y-axis markers (green)
		[0, 5, 10, 15].forEach(d => {
			const sprite = createTextSprite(`${d}m`, '#44ff44');
			if (sprite) {
				sprite.position.set(0, d, 0);
				sprite.scale.set(2, 1, 1);
				distanceMarkers.add(sprite);
			}
		});
		
		// Axis labels at the ends of the axes
		const xLabel = createTextSprite('X', '#ff4444');
		if (xLabel) {
			xLabel.position.set(12, -2.5, 0);
			xLabel.scale.set(3, 1.5, 1);
			distanceMarkers.add(xLabel);
		}
		
		const yLabel = createTextSprite('Y', '#44ff44');
		if (yLabel) {
			yLabel.position.set(0, 17, 0);
			yLabel.scale.set(3, 1.5, 1);
			distanceMarkers.add(yLabel);
		}
		
		const zLabel = createTextSprite('Z', '#4444ff');
		if (zLabel) {
			zLabel.position.set(0, -2.5, 12);
			zLabel.scale.set(3, 1.5, 1);
			distanceMarkers.add(zLabel);
		}
		
		scene.add(distanceMarkers);
		
		// Update visibility based on initial state
		updateLegendVisibility();
	}
	
	function updateLegendVisibility() {
		if (gridHelper) gridHelper.visible = showLegend;
		if (axesHelper) axesHelper.visible = showLegend;
		if (distanceMarkers) distanceMarkers.visible = showLegend;
	}
	
	function toggleLegend() {
		showLegend = !showLegend;
		updateLegendVisibility();
	}
	
	async function toggleFullscreen() {
		if (!document.fullscreenElement) {
			try {
				await container.parentElement?.requestFullscreen();
				isFullscreen = true;
			} catch (err) {
				console.error('Error entering fullscreen:', err);
			}
		} else {
			await document.exitFullscreen();
			isFullscreen = false;
		}
	}
	
	function handleFullscreenChange() {
		isFullscreen = !!document.fullscreenElement;
		// Trigger resize to adjust renderer
		setTimeout(handleResize, 100);
	}

	function createObject() {
		if (bodies.length >= MAX_OBJECTS) {
			// Remove oldest object
			const oldBody = bodies.shift();
			const oldMesh = meshes.shift();
			if (oldBody) world.removeBody(oldBody);
			if (oldMesh) scene.remove(oldMesh);
		}
		
		// Pick one of the five Platonic solids at random
		const platonicType = Math.floor(Math.random() * 5);
		const size = (0.3 + Math.random() * 0.3) * 5;
		
		// Physics body
		let shape: CANNON.Shape;
		let geometry: THREE.BufferGeometry;
		
		switch (platonicType) {
			case 0: // Tetrahedron (4 faces)
				shape = new CANNON.Sphere(size); // Approximate with sphere for physics
				geometry = new THREE.TetrahedronGeometry(size);
				break;
			case 1: // Cube/Hexahedron (6 faces)
				shape = new CANNON.Box(new CANNON.Vec3(size * 0.7, size * 0.7, size * 0.7));
				geometry = new THREE.BoxGeometry(size * 1.4, size * 1.4, size * 1.4);
				break;
			case 2: // Octahedron (8 faces)
				shape = new CANNON.Sphere(size); // Approximate with sphere for physics
				geometry = new THREE.OctahedronGeometry(size);
				break;
			case 3: // Dodecahedron (12 faces)
				shape = new CANNON.Sphere(size); // Approximate with sphere for physics
				geometry = new THREE.DodecahedronGeometry(size);
				break;
			case 4: // Icosahedron (20 faces)
				shape = new CANNON.Sphere(size); // Approximate with sphere for physics
				geometry = new THREE.IcosahedronGeometry(size);
				break;
			default:
				shape = new CANNON.Sphere(size);
				geometry = new THREE.SphereGeometry(size, 8, 6);
		}
		
	const body = new CANNON.Body({
		mass: 1,
		shape: shape,
		position: new CANNON.Vec3(
			-25 + (Math.random() - 0.5) * 3,
			30,
			-10 + (Math.random() - 0.5) * 5
		),
		// CRITICAL: Lower damping allows physics solver to work better
		linearDamping: 0.1,
		angularDamping: 0.1,
		material: (world as any).objectMaterial,
		type: CANNON.Body.DYNAMIC,
		// CRITICAL: Enable CCD (Continuous Collision Detection) to prevent tunneling
		collisionResponse: true,
		fixedRotation: false,
		allowSleep: false // Force this body to NEVER sleep
	});
	
	// Set initial velocity: right (+X), up (+Y), away (+Z)
	body.velocity.set(
		8 + Math.random() * 2,  // Right (positive X)
		6 + Math.random() * 2,  // Up (positive Y)
		4 + Math.random() * 2   // Away (positive Z)
	);
	
	// CRITICAL: Store creation time for fall-through detection
	(body as any).creationTime = Date.now();
	
		// Add collision listener to this body
		body.addEventListener('collide', handleCollision);
		
		world.addBody(body);
		bodies.push(body);
		
		// Visual mesh (wireframe)
		const material = new THREE.MeshBasicMaterial({
			color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
			wireframe: true
		});
		
		const mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
		meshes.push(mesh);
	}
	
	function handleCollision(event: any) {
		if (isMuted || !audioContext || !masterGain) return;
		
		// event.body is what the object collided with
		const collidingBody = event.body;
		
		// Check if collision is with the terrain
		if (collidingBody === hillBody) {
			// event.target is the falling object
			const objectBody = event.target;
			const velocity = objectBody.velocity.length();
			
			// Only play sound for impacts above a minimum velocity threshold
			if (velocity < 2) return;
			
		// Use scale frequencies from Circle of Fifths if available
		let baseFrequency: number;
		if (scaleFrequencies.length > 0) {
			// Pick a random note from the scale
			const noteIndex = Math.floor(Math.random() * scaleFrequencies.length);
			baseFrequency = scaleFrequencies[noteIndex];
		} else {
			// Fallback to position-based frequency
			baseFrequency = 200 + (objectBody.position.x + 5) * 50 + velocity * 20;
			baseFrequency = Math.min(Math.max(baseFrequency, 100), 1000);
		}			// Play collision sound using Web Audio API (matching MusicGrid style)
			playCollisionSound(baseFrequency, velocity);
		}
	}
	
	function playCollisionSound(baseFrequency: number, velocity: number) {
		if (!audioContext || !masterGain) return;
		
		// Create gain node for this sound
		const soundGain = audioContext.createGain();
		const targetGain = Math.min(0.4 * (velocity / 10), 0.6); // Scale with velocity
		soundGain.gain.value = 0; // Start at 0 for attack
		
		// Create primary oscillator (sawtooth like MusicGrid)
		const primaryOsc = audioContext.createOscillator();
		const primaryFilter = audioContext.createBiquadFilter();
		
		primaryOsc.frequency.setValueAtTime(baseFrequency, audioContext.currentTime);
		primaryOsc.type = 'sawtooth';
		
		// Filter settings
		primaryFilter.type = 'lowpass';
		primaryFilter.frequency.setValueAtTime(800 + baseFrequency * 0.5, audioContext.currentTime);
		primaryFilter.Q.setValueAtTime(1.2, audioContext.currentTime);
		
		// Create LFO (Low Frequency Oscillator)
		const lfo = audioContext.createOscillator();
		const lfoGain = audioContext.createGain();
		
		lfo.frequency.setValueAtTime(0.2, audioContext.currentTime);
		lfo.type = 'sine';
		lfoGain.gain.value = 0; // Start at 0 for attack
		
		// Envelope settings
		const attackTime = 0.05;
		const decayTime = 0.5;
		const lfoDecayTime = 0.5;
		
		// Apply attack envelope to primary oscillator
		soundGain.gain.setValueAtTime(0, audioContext.currentTime);
		soundGain.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + attackTime);
		
		// Schedule decay after attack
		soundGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + attackTime + decayTime);
		
		// Connect audio nodes
		lfo.connect(lfoGain);
		lfoGain.connect(primaryOsc.frequency);
		
		primaryOsc.connect(primaryFilter);
		primaryFilter.connect(soundGain);
		soundGain.connect(masterGain);
		
		// Start oscillators
		primaryOsc.start();
		lfo.start();
		
		// Schedule automatic stop and cleanup after decay completes
		setTimeout(() => {
			try {
				primaryOsc.stop();
				lfo.stop();
			} catch {
				// Oscillator already stopped
			}
		}, (attackTime + decayTime) * 1000);
	}
	
	function animate() {
		animationId = requestAnimationFrame(animate);
		
		// Update controls
		if (controls) controls.update();
		
		// Update camera info for reactive display
		if (camera) {
			cameraPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
			cameraFov = camera.fov;
		}
		if (controls) {
			cameraTarget = { x: controls.target.x, y: controls.target.y, z: controls.target.z };
		}
		if (camera && controls) {
			// Calculate distance from camera to target
			const dx = camera.position.x - controls.target.x;
			const dy = camera.position.y - controls.target.y;
			const dz = camera.position.z - controls.target.z;
			cameraDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
		}
		
		// CRITICAL: Use smaller timestep with MORE substeps to prevent tunneling
		// This ensures fast-moving objects don't skip through geometry
		const fixedTimeStep = 1 / 120; // Smaller timestep (was 1/60)
		const maxSubSteps = 20; // More substeps (was 10)
		const scaledDeltaTime = fixedTimeStep * timeScale;
		world.step(fixedTimeStep, scaledDeltaTime, maxSubSteps);
		
		// CRITICAL: Clamp velocities to prevent extreme speeds that cause tunneling
		const maxVelocity = 40; // Reduced from 50 for safety
		const minTerrainY = -30; // Minimum Y position (well below terrain)
		
		bodies.forEach(body => {
			const speed = body.velocity.length();
			if (speed > maxVelocity) {
				body.velocity.scale(maxVelocity / speed, body.velocity);
			}
			
			// Also clamp angular velocity
			const angularSpeed = body.angularVelocity.length();
			const maxAngularVelocity = 25; // Reduced from 30
			if (angularSpeed > maxAngularVelocity) {
				body.angularVelocity.scale(maxAngularVelocity / angularSpeed, body.angularVelocity);
			}
			
			// CRITICAL: Fall-through detection and correction
			// If object falls below minimum terrain level, it MUST have tunneled through
			if (body.position.y < minTerrainY) {
				console.warn('FALL-THROUGH DETECTED - Repositioning object');
				
				// Teleport object back to safe spawn position
				body.position.set(
					-25 + (Math.random() - 0.5) * 3,
					35, // Higher spawn
					-10 + (Math.random() - 0.5) * 5
				);
				
				// Reset velocity to safe values
				body.velocity.set(
					8 + Math.random() * 2,
					6 + Math.random() * 2,
					4 + Math.random() * 2
				);
				
				// Reset angular velocity
				body.angularVelocity.set(0, 0, 0);
				
				// Reset orientation
				body.quaternion.set(0, 0, 0, 1);
			}
			
			// Additional safety: Check if object is falling too fast downward
			if (body.velocity.y < -50) {
				console.warn('EXCESSIVE DOWNWARD VELOCITY - Clamping');
				body.velocity.y = -50;
			}
		});
		
		// Sync meshes with physics bodies
		meshes.forEach((mesh, index) => {
			if (bodies[index]) {
				mesh.position.copy(bodies[index].position as any);
				mesh.quaternion.copy(bodies[index].quaternion as any);
			}
		});
		
		if (camera) renderer.render(scene, camera);
	}
	
	function startEmitter() {
		if (emitterInterval) return;
		
		emitterInterval = setInterval(() => {
			if (isPlaying) {
				createObject();
			}
		}, EMIT_INTERVAL);
	}
	
	function stopEmitter() {
		if (emitterInterval) {
			clearInterval(emitterInterval);
			emitterInterval = null;
		}
	}
	
	function togglePlay() {
		isPlaying = !isPlaying;
	}
	
	function toggleMute() {
		isMuted = !isMuted;
	}
	
	function resetCamera() {
		if (!camera || !controls) return;
		camera.position.set(DEFAULT_CAMERA_POSITION.x, DEFAULT_CAMERA_POSITION.y, DEFAULT_CAMERA_POSITION.z);
		controls.target.set(DEFAULT_CAMERA_TARGET.x, DEFAULT_CAMERA_TARGET.y, DEFAULT_CAMERA_TARGET.z);
		controls.update();
	}
	
	function handleResize() {
		if (!container || !camera || !renderer) return;
		
		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(container.clientWidth, container.clientHeight);
	}
	
	onMount(() => {
		initScene();
		animate();
		startEmitter();
		
		window.addEventListener('resize', handleResize);
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		
		return () => {
			window.removeEventListener('resize', handleResize);
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	});
	
	onDestroy(() => {
		stopEmitter();
		
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
		
	// Cleanup Three.js
	if (controls) {
		controls.dispose();
	}
	if (renderer) {
		renderer.dispose();
		container?.removeChild(renderer.domElement);
	}		// Cleanup physics
		bodies.forEach(body => world.removeBody(body));
		if (hillBody) world.removeBody(hillBody);
		
		// Cleanup audio
		if (audioContext) {
			audioContext.close();
			audioContext = null;
			masterGain = null;
		}
	});
</script>

<div class="physics-scene-container">
	<div bind:this={container} class="canvas-container"></div>
	
	<div class="controls">
		<button onclick={togglePlay} class="control-btn" aria-label={isPlaying ? 'Pause' : 'Play'}>
			{#if isPlaying}
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="6" y="4" width="4" height="16"></rect>
					<rect x="14" y="4" width="4" height="16"></rect>
				</svg>
			{:else}
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="5 3 19 12 5 21 5 3"></polygon>
				</svg>
			{/if}
		</button>
		
		<button onclick={toggleMute} class="control-btn" aria-label={isMuted ? 'Unmute' : 'Mute'}>
			{#if isMuted}
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
					<line x1="23" y1="9" x2="17" y2="15"></line>
					<line x1="17" y1="9" x2="23" y2="15"></line>
				</svg>
			{:else}
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
					<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
				</svg>
			{/if}
		</button>
		
		<button onclick={resetCamera} class="control-btn" aria-label="Reset Camera">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="10"></circle>
				<circle cx="12" cy="12" r="3"></circle>
			</svg>
		</button>
		
		<button onclick={toggleLegend} class="control-btn" aria-label={showLegend ? 'Hide Legend' : 'Show Legend'}>
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<rect x="3" y="3" width="7" height="7"></rect>
				<rect x="14" y="3" width="7" height="7"></rect>
				<rect x="14" y="14" width="7" height="7"></rect>
				<rect x="3" y="14" width="7" height="7"></rect>
				{#if !showLegend}
					<line x1="3" y1="21" x2="21" y2="3" stroke-width="2.5"></line>
				{/if}
			</svg>
		</button>
		
		<button onclick={toggleFullscreen} class="control-btn" aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}>
			{#if isFullscreen}
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
				</svg>
			{:else}
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
				</svg>
			{/if}
		</button>
	</div>
	
	{#if showLegend}
		<div class="legend-info">
			<div class="legend-title">3D Reference Guide</div>
			<div class="legend-item">
				<span class="axis-label x-axis">X-Axis</span>
				<span class="axis-color" style="background: #ff4444;"></span>
			</div>
			<div class="legend-item">
				<span class="axis-label y-axis">Y-Axis</span>
				<span class="axis-color" style="background: #44ff44;"></span>
			</div>
			<div class="legend-item">
				<span class="axis-label z-axis">Z-Axis</span>
				<span class="axis-color" style="background: #4444ff;"></span>
			</div>
			<div class="legend-note">Grid: 2m per square</div>
			
			<div class="legend-separator"></div>
			
			<div class="camera-section">
				<div class="camera-title">Camera Info</div>
				<div class="camera-item">
					<span class="camera-label">Position:</span>
				</div>
				<div class="camera-value">
					X: {cameraPos.x.toFixed(1)}<br/>
					Y: {cameraPos.y.toFixed(1)}<br/>
					Z: {cameraPos.z.toFixed(1)}
				</div>
				<div class="camera-item">
					<span class="camera-label">Target:</span>
				</div>
				<div class="camera-value">
					X: {cameraTarget.x.toFixed(1)}<br/>
					Y: {cameraTarget.y.toFixed(1)}<br/>
					Z: {cameraTarget.z.toFixed(1)}
				</div>
				<div class="camera-item">
					<span class="camera-label">Zoom:</span>
					<span class="camera-value-inline">{cameraDistance.toFixed(1)}m</span>
				</div>
				<div class="camera-fov-control">
					<label for="fov-slider" class="camera-label">FOV: {cameraFov.toFixed(0)}°</label>
					<input
						id="fov-slider"
						type="range"
						min="30"
						max="120"
						step="1"
						value={cameraFov}
						oninput={(e) => {
							if (camera) {
								camera.fov = Number((e.target as HTMLInputElement).value);
								camera.updateProjectionMatrix();
							}
						}}
						class="fov-slider"
					/>
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Speed Control Outside Viewport -->
<div class="speed-control-external">
	<div class="speed-header">
		<span class="speed-title">Simulation Speed</span>
		<label class="tempo-toggle">
			<input
				type="checkbox"
				bind:checked={useTempoCorrelation}
			/>
			<span>Correlate with Tempo</span>
		</label>
	</div>
	<div class="speed-slider-container">
		<input
			id="speed-slider"
			type="range"
			min="0.01"
			max="42"
			step="0.01"
			bind:value={speedMultiplier}
			class="speed-slider"
		/>
		<div class="speed-labels">
			<span class="speed-min">0.01x</span>
			<span class="speed-max">42x</span>
		</div>
	</div>
	<div class="speed-display">
		<div class="speed-current">
			<span class="speed-label">Current Speed:</span>
			<span class="speed-value">{timeScale.toFixed(2)}x</span>
		</div>
		{#if useTempoCorrelation}
			<div class="speed-breakdown">
				{tempo} BPM × {speedMultiplier.toFixed(2)}x = {timeScale.toFixed(2)}x
			</div>
		{:else}
			<div class="speed-breakdown">
				Direct multiplier: {speedMultiplier.toFixed(2)}x
			</div>
		{/if}
	</div>
</div>

<style>
	.physics-scene-container {
		position: relative;
		width: 100%;
		height: 600px;
		border: 2px solid #00ff88;
		border-radius: 8px;
		overflow: hidden;
		background: #0a0a0a;
	}
	
	.canvas-container {
		width: 100%;
		height: 100%;
	}
	
	.controls {
		position: absolute;
		bottom: 20px;
		right: 20px;
		display: flex;
		gap: 12px;
	}
	
	.control-btn {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: 2px solid #00ff88;
		background: rgba(0, 255, 136, 0.1);
		color: #00ff88;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		backdrop-filter: blur(10px);
	}
	
	.control-btn:hover {
		background: rgba(0, 255, 136, 0.2);
		transform: scale(1.05);
		box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
	}
	
	.control-btn:active {
		transform: scale(0.95);
	}
	
	.control-btn svg {
		width: 24px;
		height: 24px;
	}
	
	.legend-info {
		position: absolute;
		top: 20px;
		left: 20px;
		background: rgba(0, 255, 136, 0.1);
		border: 2px solid #00ff88;
		border-radius: 8px;
		padding: 16px;
		color: #00ff88;
		font-family: monospace;
		backdrop-filter: blur(10px);
		min-width: 200px;
	}
	
	.legend-title {
		font-size: 14px;
		font-weight: bold;
		margin-bottom: 12px;
		text-align: center;
		border-bottom: 1px solid #00ff88;
		padding-bottom: 8px;
	}
	
	.legend-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
		font-size: 12px;
	}
	
	.axis-label {
		font-weight: 500;
	}
	
	.axis-color {
		width: 40px;
		height: 4px;
		border-radius: 2px;
		box-shadow: 0 0 8px currentColor;
	}
	
	.legend-note {
		margin-top: 12px;
		padding-top: 8px;
		border-top: 1px solid rgba(0, 255, 136, 0.3);
		font-size: 11px;
		text-align: center;
		opacity: 0.8;
	}
	
	/* Speed Control - External to viewport */
	.speed-control-external {
		margin-top: 16px;
		background: rgba(0, 255, 136, 0.05);
		border: 2px solid #00ff88;
		border-radius: 8px;
		padding: 16px 20px;
		color: #00ff88;
		font-family: monospace;
	}
	
	.speed-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}
	
	.speed-title {
		font-size: 14px;
		font-weight: bold;
		color: #00ff88;
	}
	
	.tempo-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		cursor: pointer;
		color: rgba(0, 255, 136, 0.8);
	}
	
	.tempo-toggle input[type="checkbox"] {
		cursor: pointer;
		width: 16px;
		height: 16px;
		accent-color: #00ff88;
	}
	
	.speed-slider-container {
		margin-bottom: 8px;
	}
	
	.speed-slider {
		width: 100%;
		height: 8px;
		border-radius: 4px;
		background: rgba(0, 255, 136, 0.2);
		outline: none;
		-webkit-appearance: none;
		appearance: none;
		cursor: pointer;
	}
	
	.speed-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #00ff88;
		cursor: pointer;
		box-shadow: 0 0 12px rgba(0, 255, 136, 0.6);
		transition: transform 0.1s ease;
	}
	
	.speed-slider::-webkit-slider-thumb:hover {
		transform: scale(1.1);
	}
	
	.speed-slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #00ff88;
		cursor: pointer;
		border: none;
		box-shadow: 0 0 12px rgba(0, 255, 136, 0.6);
		transition: transform 0.1s ease;
	}
	
	.speed-slider::-moz-range-thumb:hover {
		transform: scale(1.1);
	}
	
	.speed-labels {
		display: flex;
		justify-content: space-between;
		font-size: 10px;
		color: rgba(0, 255, 136, 0.6);
		margin-top: 4px;
	}
	
	.speed-display {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid rgba(0, 255, 136, 0.2);
	}
	
	.speed-current {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.speed-label {
		font-size: 12px;
		color: rgba(0, 255, 136, 0.8);
	}
	
	.speed-value {
		font-size: 16px;
		font-weight: bold;
		color: #00ff88;
	}
	
	.speed-breakdown {
		font-size: 11px;
		color: rgba(0, 255, 136, 0.6);
		text-align: center;
	}
	
	.legend-separator {
		height: 1px;
		background: rgba(0, 255, 136, 0.3);
		margin: 12px 0;
	}
	
	.camera-section {
		margin-top: 8px;
	}
	
	.camera-title {
		font-size: 12px;
		font-weight: bold;
		text-align: center;
		border-bottom: 1px solid #00ff88;
		padding-bottom: 6px;
		margin-bottom: 8px;
	}
	
	.camera-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 6px;
	}
	
	.camera-label {
		font-weight: bold;
		font-size: 11px;
	}
	
	.camera-value {
		font-size: 10px;
		line-height: 1.4;
		margin-bottom: 4px;
	}
	
	.camera-value-inline {
		font-size: 11px;
	}
	
	.camera-fov-control {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid rgba(0, 255, 136, 0.3);
	}
	
	.fov-slider {
		width: 100%;
		height: 4px;
		border-radius: 2px;
		background: rgba(0, 255, 136, 0.2);
		outline: none;
		-webkit-appearance: none;
		appearance: none;
	}
	
	.fov-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #00ff88;
		cursor: pointer;
		box-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
	}
	
	.fov-slider::-moz-range-thumb {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #00ff88;
		cursor: pointer;
		border: none;
		box-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
	}
	
	/* Fullscreen styles */
	:global(.physics-scene-container:fullscreen) {
		height: 100vh !important;
	}
	
	:global(.physics-scene-container:-webkit-full-screen) {
		height: 100vh !important;
	}
	
	:global(.physics-scene-container:-moz-full-screen) {
		height: 100vh !important;
	}
</style>
