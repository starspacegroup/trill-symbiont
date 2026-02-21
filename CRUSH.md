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
npm run db:generate                            # Generate migration SQL from schema changes
npm run db:migrate:local                       # Apply migrations to local D1
npm run db:migrate                             # Apply migrations to remote/production D1
npm run db:migrate:list                        # List migration status
npm run db:studio                              # Open Drizzle Studio
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

- Drizzle ORM with Cloudflare D1 (SQLite)
- Schema: `src/lib/server/db/schema.ts`
- Migrations output: `migrations/` (used by both Drizzle Kit and Wrangler)

### Database Migration Workflow

1. Edit the schema in `src/lib/server/db/schema.ts`
2. Run `npm run db:generate` to create a new migration SQL file in `migrations/`
3. Run `npm run db:migrate:local` to apply to local D1
4. Test locally, then commit the migration file
5. Run `npm run db:migrate` to apply to production D1

### Migration Rules (CRITICAL — AI agents must follow)

- **NEVER modify or delete an existing migration file in `migrations/`** — these are append-only. Once a migration has been pushed to `main`, it has been applied to production. Editing it will cause drift between the schema and the actual database.
- **NEVER rename migration files** — Wrangler tracks them by filename in the `d1_migrations` table.
- **NEVER reorder migrations** — the `migrations/meta/_journal.json` records the sequence.
- **Only create NEW migration files** by running `npm run db:generate` after changing the schema. Do not hand-write migration SQL unless absolutely necessary.
- **The `drizzle/` directory is deprecated** — do not use it. All migrations go to `migrations/`.
