# CRUSH.md - Trill Symbiont SvelteKit App

## Commands
```bash
npm run dev                                    # Start dev server
npm run build                                  # Build for production
npm run check                                  # Type check (run before committing)
npm run lint                                   # Lint with prettier + eslint (run before committing)
npm run format                                 # Auto-format code
npm run test:unit                              # Run unit tests (vitest)
npm run test:unit -- --run src/demo.spec.ts   # Run single test file
npm run test:e2e                               # Run e2e tests (playwright)
npm run test                                   # Run all tests
npm run deploy                                 # Deploy to Cloudflare Pages
```

## Code Style

### Formatting
- Tabs (not spaces), single quotes, no trailing commas, 100 char line length
- Run `npm run format` before committing

### TypeScript
- Strict mode enabled - define types explicitly
- Use `$lib` path alias: `import Component from '$lib/components/Component.svelte'`
- Type definitions at top of script blocks

### Svelte Components
- Use `<script lang="ts">` for all components
- Event handling: `createEventDispatcher()` and `dispatch('eventName', detail)`
- Reactive declarations: `$: computed = derived + value`
- Props: `export let propName = defaultValue`

### Naming
- Components: PascalCase (`CircleOfFifths.svelte`)
- Variables/functions: camelCase (`selectKey`, `hoveredKey`)
- Constants: UPPER_SNAKE_CASE (`CIRCLE_OF_FIFTHS`, `KEY_SIGNATURES`)
- Types: PascalCase (`type Note = ...`)
- Event handlers: `handle*` prefix or inline arrow functions

### Imports
- Group: standard library, third-party, local
- Svelte imports first: `import { createEventDispatcher } from 'svelte'`
- Use `$lib` for internal imports

### Testing
- Unit tests: Vitest with `describe` and `it` blocks
- E2E tests: Playwright
- Test files: `*.spec.ts` or `*.test.ts`

### Database
- Drizzle ORM with LibSQL
- Commands: `npm run db:push`, `npm run db:generate`, `npm run db:studio`
