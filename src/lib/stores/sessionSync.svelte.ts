/**
 * Session sync store — real-time shared state via polling + BroadcastChannel.
 *
 * Usage:
 *   import { sessionSync } from '$lib/stores/sessionSync.svelte';
 *
 *   sessionSync.join('ABC123');         // join a session
 *   sessionSync.leave();                // leave
 *   sessionSync.updateState({ tempo: 120 }); // push partial update
 *
 *   // Read reactive state:
 *   sessionSync.sessionId        — current session ID or null
 *   sessionSync.sessionName      — current session name
 *   sessionSync.members          — array of members
 *   sessionSync.sharedState      — the shared control state object
 *   sessionSync.connected        — whether we're actively in a session
 */

import { SvelteSet } from 'svelte/reactivity';
import { addToast } from './toastStore.svelte';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionMember {
  userId: string;
  username: string;
  avatar: string | null;
}

export interface SharedState {
  selectedKey?: string;
  selectedScale?: string;
  selectedChord?: string;
  masterVolume?: number;
  tempo?: number;
  isSequencerRunning?: boolean;
  [key: string]: unknown; // allow extensibility
}

interface PollResponse {
  id: string;
  name: string;
  state: SharedState;
  stateVersion: number;
  members: SessionMember[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATE_POLL_MS = 500;      // poll state every 500 ms
const HEARTBEAT_MS = 5_000;     // heartbeat every 5 s
const LOCAL_LOCK_MS = 1_200;    // ignore server values for a field we just changed

// ---------------------------------------------------------------------------
// Reactive state (module-level runes)
// ---------------------------------------------------------------------------

let _sessionId = $state<string | null>(null);
let _sessionName = $state<string>('');
let _members = $state<SessionMember[]>([]);
let _sharedState = $state<SharedState>({});
let _stateVersion = $state(0);
let _connected = $state(false);

// Internal bookkeeping
let _pollTimer: ReturnType<typeof setInterval> | null = null;
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _localLocks: Record<string, number> = {}; // field → unlock-timestamp
let _broadcastChannel: BroadcastChannel | null = null;
let _previousMemberIds: Set<string> = new SvelteSet();
let _sendQueue: Partial<SharedState> = {};
let _sendScheduled = false;

// ---------------------------------------------------------------------------
// BroadcastChannel (instant same-origin tab sync)
// ---------------------------------------------------------------------------

function initBroadcast(sessionId: string) {
  closeBroadcast();
  try {
    _broadcastChannel = new BroadcastChannel(`trill-session-${sessionId}`);
    _broadcastChannel.onmessage = (ev: MessageEvent) => {
      if (ev.data?.type === 'state-update' && ev.data.state) {
        applyRemoteState(ev.data.state, ev.data.version ?? _stateVersion + 1);
      }
    };
  } catch {
    // BroadcastChannel not supported — no-op
  }
}

function closeBroadcast() {
  _broadcastChannel?.close();
  _broadcastChannel = null;
}

function broadcastState(state: Partial<SharedState>, version: number) {
  try {
    _broadcastChannel?.postMessage({ type: 'state-update', state, version });
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Remote state application (with local-lock protection)
// ---------------------------------------------------------------------------

function applyRemoteState(remote: SharedState, version: number) {
  if (version <= _stateVersion) return; // stale

  const now = Date.now();
  const merged: SharedState = { ..._sharedState };

  for (const [key, value] of Object.entries(remote)) {
    // Skip fields the local user recently changed (prevents jitter)
    if (_localLocks[key] && now < _localLocks[key]) continue;
    (merged as Record<string, unknown>)[key] = value;
  }

  _sharedState = merged;
  _stateVersion = version;
}

// ---------------------------------------------------------------------------
// Member diff → toasts
// ---------------------------------------------------------------------------

function diffMembers(newMembers: SessionMember[]) {
  const newIds = new Set(newMembers.map((m) => m.userId));

  // Find joins
  for (const m of newMembers) {
    if (!_previousMemberIds.has(m.userId)) {
      addToast(`${m.username} joined the session`, 'info', 3000);
    }
  }

  // Find leaves
  for (const oldId of _previousMemberIds) {
    if (!newIds.has(oldId)) {
      const oldMember = _members.find((m) => m.userId === oldId);
      addToast(`${oldMember?.username ?? 'Someone'} left the session`, 'warning', 3000);
    }
  }

  _previousMemberIds = newIds;
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

async function pollState() {
  if (!_sessionId) return;

  try {
    const res = await fetch(`/api/sessions/${_sessionId}/state`);
    if (!res.ok) return;

    const data: PollResponse = await res.json();
    if (data.error) return;

    _sessionName = data.name;

    // Diff members for toasts (skip the very first poll — we don't want "you joined" spam)
    if (_previousMemberIds.size > 0 || _members.length > 0) {
      diffMembers(data.members);
    } else {
      _previousMemberIds = new Set(data.members.map((m) => m.userId));
    }

    _members = data.members;
    applyRemoteState(data.state, data.stateVersion);
  } catch {
    // network error — silently retry on next tick
  }
}

async function sendHeartbeat() {
  if (!_sessionId) return;
  try {
    await fetch(`/api/sessions/${_sessionId}/heartbeat`, { method: 'POST' });
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Debounced state push
// ---------------------------------------------------------------------------

function scheduleSend() {
  if (_sendScheduled) return;
  _sendScheduled = true;

  // Batch rapid-fire changes into a single request (every 150ms max)
  setTimeout(async () => {
    _sendScheduled = false;
    const payload = { ..._sendQueue };
    _sendQueue = {};

    if (!_sessionId || Object.keys(payload).length === 0) return;

    try {
      const res = await fetch(`/api/sessions/${_sessionId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: payload })
      });

      if (res.ok) {
        const data = await res.json() as { stateVersion: number; state: SharedState; };
        _stateVersion = data.stateVersion;

        // Broadcast to same-origin tabs
        broadcastState(payload, data.stateVersion);
      }
    } catch {
      // ignore — will be reconciled on next poll
    }
  }, 150);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const sessionSync = {
  // Reactive getters
  get sessionId() { return _sessionId; },
  get sessionName() { return _sessionName; },
  get members() { return _members; },
  get sharedState() { return _sharedState; },
  get stateVersion() { return _stateVersion; },
  get connected() { return _connected; },
  get memberCount() { return _members.length; },

  /** Join a session and start syncing */
  async join(sessionId: string) {
    // Leave any existing session first
    if (_sessionId) {
      await this.leave();
    }

    _sessionId = sessionId;
    _connected = true;
    _previousMemberIds = new SvelteSet();
    _members = [];
    _sharedState = {};
    _stateVersion = 0;
    _localLocks = {};

    initBroadcast(sessionId);

    // Initial heartbeat + poll
    await sendHeartbeat();
    await pollState();

    // Start timers
    _pollTimer = setInterval(pollState, STATE_POLL_MS);
    _heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS);

    addToast(`Joined session "${_sessionName || sessionId}"`, 'success', 3000);
  },

  /** Leave the current session */
  async leave() {
    if (!_sessionId) return;

    const name = _sessionName || _sessionId;

    // Tell server we're leaving
    try {
      await fetch(`/api/sessions/${_sessionId}/heartbeat`, { method: 'DELETE' });
    } catch {
      // ignore
    }

    // Clean up
    if (_pollTimer) clearInterval(_pollTimer);
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    _pollTimer = null;
    _heartbeatTimer = null;

    closeBroadcast();

    _sessionId = null;
    _sessionName = '';
    _members = [];
    _sharedState = {};
    _stateVersion = 0;
    _connected = false;
    _previousMemberIds = new SvelteSet();
    _localLocks = {};
    _sendQueue = {};

    addToast(`Left session "${name}"`, 'info', 3000);
  },

  /**
   * Push a partial state update. Applies locally immediately
   * and sends to server (debounced).
   */
  updateState(partial: Partial<SharedState>) {
    if (!_sessionId) return;

    const now = Date.now();

    // Apply locally
    _sharedState = { ..._sharedState, ...partial };

    // Lock these fields from being overwritten by server for a short window
    for (const key of Object.keys(partial)) {
      _localLocks[key] = now + LOCAL_LOCK_MS;
    }

    // Queue for sending
    Object.assign(_sendQueue, partial);
    scheduleSend();
  },

  /** Convenience: check if we're in a specific session */
  isInSession(id: string) {
    return _sessionId === id;
  }
};
