# CRUSH.md - Trill Symbiont SvelteKit App

## Build & Development Commands

```bash
npm run dev              # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build
npm run check           # Type check with svelte-check
npm run check:watch     # Type check in watch mode
npm run lint            # Run prettier + eslint
npm run format          # Auto-format with prettier
npm run test:unit       # Run unit tests (vitest)
npm run test:unit -- --run src/demo.spec.ts  # Run single test file
npm run test:e2e        # Run e2e tests (playwright)
npm run test            # Run all tests (unit + e2e)
npm run deploy          # Build and deploy to Cloudflare Pages
```

## Code Style Guidelines

### Formatting & Linting
- **Tabs**: Use tabs (not spaces) - configured in `.prettierrc`
- **Line length**: 100 characters max
- **Quotes**: Single quotes
- **Trailing commas**: None
- **Prettier plugins**: svelte, tailwindcss
- **ESLint**: Extends @eslint/js, typescript-eslint, eslint-plugin-svelte, prettier

### TypeScript & Types
- **Strict mode**: Enabled (`strict: true`)
- **Module resolution**: bundler
- **Type checking**: Enabled for JS files (`checkJs: true`)
- **Path aliases**: Use `$lib` for `src/lib` imports
- Define types explicitly (e.g., `type Note = 'C' | 'C#' | ...`)

### Imports & Modules
- Use ES modules (`"type": "module"`)
- Import from `$lib` for library code: `import Component from '$lib/components/...'`
- Import Svelte utilities: `import { createEventDispatcher } from 'svelte'`
- Group imports: standard library, third-party, local

### Svelte Components
- Use `<script lang="ts">` for TypeScript
- Define types at top of script block
- Use `createEventDispatcher()` for component events
- Emit events with `dispatch('eventName', detail)`
- Use reactive declarations (`$:`) for computed values
- Bind state with `bind:` directive

### Naming Conventions
- **Components**: PascalCase (e.g., `CircleOfFifths.svelte`)
- **Variables/functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE (e.g., `CIRCLE_OF_FIFTHS`, `KEY_SIGNATURES`)
- **Type names**: PascalCase (e.g., `type Note = ...`)
- **Event handlers**: `handle*` prefix (e.g., `handleKeyChange`)

### Error Handling
- Use try-catch for async operations
- Log errors to console for debugging
- Validate user input before processing
- Type guard with TypeScript strict mode

### Testing
- **Unit tests**: Vitest with `describe` and `it` blocks
- **E2E tests**: Playwright
- **Test files**: `*.spec.ts` or `*.test.ts`
- Use `expect()` assertions from vitest

### Database & ORM
- **ORM**: Drizzle ORM with LibSQL
- **Migrations**: Use `npm run db:generate` and `npm run db:push`
- **Studio**: `npm run db:studio` for visual DB management

### Deployment
- **Adapter**: Cloudflare Pages (via `@sveltejs/adapter-cloudflare`)
- **Build output**: Optimized for Cloudflare Workers
- **Environment**: Use `.env.example` as template
