# Real-time Synchronization Architecture

This document explains how the real-time synchronization feature works in Trill Symbiont.

## Overview

Trill Symbiont synchronizes all user interactions across all connected clients in real-time. Every setting, every knob, everything that every user does is stored in a Durable Object and synchronized across all users, so everybody sees the exact same screen all the time.

## Architecture Components

### 1. Cloudflare Durable Objects

The heart of the synchronization system is a Cloudflare Durable Object (`SyncDurableObject`) that:

- Maintains a single, authoritative copy of the application state
- Manages WebSocket connections from all clients
- Broadcasts state changes to all connected clients
- Handles client connect/disconnect events

**Location:** `src/lib/server/sync-durable-object.ts`

### 2. WebSocket Communication

Each client establishes a WebSocket connection to the Durable Object through the `/api/sync` endpoint.

**Message Types:**

- `init`: Sent from server to newly connected client with current state
- `update`: Sent from client when local state changes
- `state-update`: Broadcast from server to all clients (except sender) with updated state

**API Endpoint:** `src/routes/api/sync/+server.ts`

### 3. Client-Side Sync Service

The `syncService` manages the client-side WebSocket connection:

- Automatically connects on page load
- Handles reconnection with exponential backoff
- Provides methods to send state updates
- Manages connection state and errors

**Location:** `src/lib/stores/sync-store.ts`

### 4. State Stores

Svelte stores manage the synchronized state:

- `syncedState`: Contains the current synchronized application state
- `isConnected`: Boolean indicating WebSocket connection status
- `connectionError`: Error messages if connection fails

### 5. Feedback Loop Prevention

To prevent infinite update loops, each component tracks whether it's updating from a remote source:

```typescript
let isUpdatingFromRemote = false;

// When receiving remote updates
isUpdatingFromRemote = true;
// ... apply updates ...
setTimeout(() => {
	isUpdatingFromRemote = false;
}, 0);

// When sending updates
if (!isUpdatingFromRemote) {
	sendStateUpdate(changes);
}
```

## State Structure

The synchronized state includes:

```typescript
interface AppState {
	// Circle of Fifths
	selectedKey: string;
	selectedScale: string;
	selectedChord: string;
	isSynchronized: boolean;

	// UI State
	showHelp: boolean;
	showCircleOfFifths: boolean;

	// Audio Controls
	masterVolume: number;
	tempo: number;

	// Sequencer
	isSequencerRunning: boolean;
	currentSequenceStep: number;

	// Music Grid
	musicGrid: MusicGridSquare[];

	// Evolution
	evolution: {
		isEvolving: boolean;
		evolutionSpeed: number;
		currentStep: number;
		maxSteps: number;
	};
}
```

## Data Flow

### User Makes a Change

1. User interacts with UI (e.g., changes volume slider)
2. Event handler updates local state
3. Event handler calls `sendStateUpdate()` with changed values
4. `syncService` sends update message over WebSocket to Durable Object
5. Durable Object updates its state and broadcasts to all other clients

### Receiving Remote Updates

1. Client receives `state-update` message from Durable Object
2. `syncedState` store is updated
3. Component reactive statements detect state change
4. Component updates local variables (with `isUpdatingFromRemote = true`)
5. UI updates to reflect new state

### New User Joins

1. User loads page and establishes WebSocket connection
2. Durable Object sends `init` message with current state
3. Client initializes all state from received data
4. User sees the same state as all other connected users

## Component Integration

### Main Page Component

The main page (`src/routes/+page.svelte`) coordinates synchronization:

- Subscribes to `syncedState` store
- Updates local state when remote changes occur
- Sends updates when local interactions occur
- Passes synced state to child components

### MusicGrid Component

The MusicGrid component (`src/lib/components/MusicGrid.svelte`):

- Accepts `syncedActiveSquares` and `syncedEvolutionState` props
- Emits `gridStateChange` and `evolutionStateChange` events
- Uses reactive statements to apply remote changes
- Prevents feedback loops with `isUpdatingFromRemote` flag

## Build Process

The Durable Object class must be exported from the Cloudflare Pages worker. A post-build script (`scripts/add-durable-object-export.js`) inlines the Durable Object class into the generated `_worker.js` file.

**Build command:** `npm run build`

This runs:

1. `vite build` - Builds the SvelteKit application
2. `node scripts/add-durable-object-export.js` - Adds Durable Object export

## Deployment

Deploy to Cloudflare Pages with:

```bash
npm run deploy
```

**Requirements:**

- Cloudflare account with Pages enabled
- Durable Objects enabled for your account
- Proper configuration in `wrangler.jsonc`

## Configuration

The Durable Object is configured in `wrangler.jsonc`:

```jsonc
{
	"durable_objects": {
		"bindings": [
			{
				"name": "SYNC",
				"class_name": "SyncDurableObject",
				"script_name": "trill-symbiont-sveltekit-app"
			}
		]
	},
	"migrations": [
		{
			"tag": "v1",
			"new_classes": ["SyncDurableObject"]
		}
	]
}
```

## Development Testing

To test synchronization locally:

1. Start the dev server: `npm run dev`
2. Open multiple browser tabs/windows to `http://localhost:5173`
3. Interact with controls in one tab
4. Observe that changes appear in all tabs simultaneously

**Note:** Local development uses the local WebSocket connection. For full testing, deploy to Cloudflare Pages.

## Troubleshooting

### WebSocket Connection Issues

**Problem:** Connection indicator shows red/disconnected

**Solutions:**

- Check browser console for WebSocket errors
- Verify Durable Objects are enabled in Cloudflare
- Check wrangler configuration
- Ensure the `/api/sync` endpoint is accessible

### State Not Syncing

**Problem:** Changes in one tab don't appear in other tabs

**Solutions:**

- Check that WebSocket connection is established (green indicator)
- Verify event handlers are calling `sendStateUpdate()`
- Check browser console for JavaScript errors
- Ensure feedback loop prevention isn't blocking updates

### Deployment Errors

**Problem:** Build or deployment fails

**Solutions:**

- Verify `scripts/add-durable-object-export.js` runs successfully
- Check that the Durable Object class is present in `_worker.js`
- Ensure all required npm packages are installed
- Review Cloudflare deployment logs

## Future Enhancements

Potential improvements to the synchronization system:

1. **Persistence**: Save state to Durable Object storage for recovery after restart
2. **User Awareness**: Show which users are currently connected
3. **Conflict Resolution**: Handle conflicting simultaneous updates
4. **State History**: Track and allow replay of state changes
5. **Rooms/Channels**: Allow multiple independent synchronized sessions
6. **Latency Compensation**: Predict and smooth state changes for better UX
