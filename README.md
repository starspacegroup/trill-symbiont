# Trill Symbiont

A shared generative ambient music experience with real-time synchronization across all users. Built with SvelteKit and Cloudflare Durable Objects.

## Features

- **Real-time Synchronization**: All users see and hear the exact same state simultaneously
- **Circle of Fifths**: Interactive music theory visualization for key and scale selection
- **8x8 Music Grid**: Generative ambient sound creation with customizable oscillators
- **Sequencer**: Step sequencer with tempo control
- **Evolution Mode**: Automatic pattern generation using cellular automaton rules

## How Real-time Sync Works

Every interaction - from adjusting the master volume to activating a grid square - is synchronized across all connected users in real-time. This creates a collaborative musical experience where everyone shares the same canvas.

**What gets synchronized:**

- Master volume and tempo
- Sequencer state (play/pause/stop) and current step
- Selected musical key, scale, and chord
- Music grid active squares and their states
- Evolution mode settings
- UI visibility settings (help, circle of fifths)

**Architecture:**

- **Cloudflare Durable Objects** maintain a single source of truth for application state
- **WebSocket connections** enable real-time bidirectional communication
- **Client-side stores** manage local state and handle updates from remote clients
- **Feedback loop prevention** ensures state changes don't cause infinite update cycles

## Developing

Once you've installed dependencies with `npm install`, start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

The build process includes a post-build step that bundles the Durable Object into the Cloudflare Pages worker.

You can preview the production build with `npm run preview`.

## Deploying

Deploy to Cloudflare Pages:

```sh
npm run deploy
```

**Note:** Make sure you have configured your Cloudflare account and Durable Objects are enabled for your project.

## Project Structure

- `src/lib/components/` - Svelte components (MusicGrid, CircleOfFifths)
- `src/lib/stores/` - Client-side state management and sync service
- `src/lib/server/` - Server-side code (Durable Objects, database schema)
- `src/routes/` - SvelteKit routes and pages
- `scripts/` - Build and deployment scripts
