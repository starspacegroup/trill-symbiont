#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Path to the generated worker file
const workerPath = join(process.cwd(), '.svelte-kit', 'cloudflare', '_worker.js');

// Read the existing worker
let workerContent = readFileSync(workerPath, 'utf-8');

// Inline the Durable Object class definition
const doClass = `
// Durable Object for real-time state synchronization across all users
export class SyncDurableObject {
	constructor(state) {
		this.state = state;
		this.sessions = new Set();
		// Initialize with default state
		this.currentState = {
			selectedKey: 'C',
			selectedScale: 'major',
			selectedChord: 'I',
			isSynchronized: true,
			showHelp: false,
			showCircleOfFifths: false,
			masterVolume: 1.0,
			tempo: 99,
			isSequencerRunning: false,
			currentSequenceStep: -1,
			musicGrid: Array(64)
				.fill(null)
				.map((_, index) => ({
					squareIndex: index,
					isActive: false,
					isExpanded: false,
					primaryFreq: 1.0,
					primaryWave: 'sawtooth',
					primaryGain: 1.5,
					primaryDecay: 0.5,
					lfoFreq: 0.2,
					lfoWave: 'sine',
					lfoGain: 0,
					lfoDecay: 0.5
				})),
			evolution: {
				isEvolving: false,
				evolutionSpeed: 500,
				currentStep: 0,
				maxSteps: 16
			}
		};
	}

	async fetch(request) {
		// Handle WebSocket upgrade
		const upgradeHeader = request.headers.get('Upgrade');
		if (upgradeHeader !== 'websocket') {
			return new Response('Expected WebSocket', { status: 426 });
		}

		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);

		this.handleSession(server);

		return new Response(null, {
			status: 101,
			webSocket: client
		});
	}

	async handleSession(webSocket) {
		webSocket.accept();
		this.sessions.add(webSocket);

		// Send current state to newly connected client
		webSocket.send(
			JSON.stringify({
				type: 'init',
				state: this.currentState
			})
		);

		webSocket.addEventListener('message', async (msg) => {
			try {
				const data = JSON.parse(msg.data);

				if (data.type === 'update') {
					// Update the current state
					this.currentState = {
						...this.currentState,
						...data.payload
					};

					// Broadcast to all other clients
					this.broadcast(
						JSON.stringify({
							type: 'state-update',
							state: this.currentState
						}),
						webSocket
					);
				}
			} catch (err) {
				console.error('Error handling message:', err);
			}
		});

		webSocket.addEventListener('close', () => {
			this.sessions.delete(webSocket);
		});

		webSocket.addEventListener('error', (err) => {
			console.error('WebSocket error:', err);
			this.sessions.delete(webSocket);
		});
	}

	broadcast(message, exclude) {
		for (const session of this.sessions) {
			if (session !== exclude) {
				try {
					session.send(message);
				} catch (err) {
					// Remove dead connections
					this.sessions.delete(session);
				}
			}
		}
	}
}
`;

// Append the Durable Object class
workerContent += '\n' + doClass;

// Write back
writeFileSync(workerPath, workerContent);

console.log('✓ Added Durable Object export to _worker.js');
