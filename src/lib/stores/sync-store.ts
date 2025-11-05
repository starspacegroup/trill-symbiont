import { writable, get } from 'svelte/store';
import type { AppState } from '$lib/server/sync-durable-object';

// Create a store for the synchronized state
export const syncedState = writable<AppState | null>(null);
export const isConnected = writable(false);
export const connectionError = writable<string | null>(null);

// Configuration
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

function getWebSocketUrl(): string {
	// Use wss:// for production (https), ws:// for development (http)
	const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
	return `${protocol}//${window.location.host}/api/sync`;
}

class SyncService {
	private ws: WebSocket | null = null;
	private reconnectTimeout: number | null = null;
	private reconnectDelay = INITIAL_RECONNECT_DELAY;
	private maxReconnectDelay = MAX_RECONNECT_DELAY;

	connect() {
		if (this.ws?.readyState === WebSocket.OPEN) {
			return;
		}

		try {
			const wsUrl = getWebSocketUrl();
			this.ws = new WebSocket(wsUrl);

			this.ws.onopen = () => {
				console.log('WebSocket connected');
				isConnected.set(true);
				connectionError.set(null);
				this.reconnectDelay = INITIAL_RECONNECT_DELAY; // Reset reconnect delay
			};

			this.ws.onmessage = (event) => {
				try {
					const message = JSON.parse(event.data);

					if (message.type === 'init') {
						// Initial state from server
						syncedState.set(message.state);
					} else if (message.type === 'state-update') {
						// State update from another client
						syncedState.set(message.state);
					}
				} catch (err) {
					console.error('Error parsing WebSocket message:', err);
				}
			};

			this.ws.onclose = () => {
				console.log('WebSocket disconnected');
				isConnected.set(false);
				this.scheduleReconnect();
			};

			this.ws.onerror = (error) => {
				console.error('WebSocket error:', error);
				connectionError.set('Connection error');
			};
		} catch (err) {
			console.error('Error creating WebSocket:', err);
			connectionError.set('Failed to connect');
			this.scheduleReconnect();
		}
	}

	disconnect() {
		if (this.reconnectTimeout !== null) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		isConnected.set(false);
	}

	private scheduleReconnect() {
		if (this.reconnectTimeout !== null) {
			return;
		}

		this.reconnectTimeout = window.setTimeout(() => {
			this.reconnectTimeout = null;
			console.log('Attempting to reconnect...');
			this.connect();

			// Exponential backoff
			this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
		}, this.reconnectDelay);
	}

	sendUpdate(partialState: Partial<AppState>) {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(
				JSON.stringify({
					type: 'update',
					payload: partialState
				})
			);
		} else {
			console.warn('WebSocket not connected, cannot send update');
		}
	}
}

export const syncService = new SyncService();
