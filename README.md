# Trill Symbiont

Trill Symbiont is a collaborative music-making app built with SvelteKit. It combines
interactive Tone.js instruments with a Three.js physics scene, Discord authentication, and
shared sessions stored in Cloudflare D1 through Drizzle ORM.

## Setup

This project uses npm.

```bash
npm install
cp .dev.vars.example .dev.vars
npm run dev
```

The development server listens on `http://localhost:2600`. Add Discord OAuth credentials to
`.dev.vars` when working on authentication. Plain Vite development can run without D1; database
features require Wrangler and the configured `DB` binding.

## Verification

```bash
npm run lint
npm run check
npm run test:unit -- --run
npm run test:e2e
npm run build
```

## Database migrations

The schema is in `src/lib/server/db/schema.ts`. Existing files in `migrations/` are immutable
because Wrangler tracks applied D1 migrations by filename. After changing the schema, generate
and test a new migration:

```bash
npm run db:generate
npm run db:migrate:local
```

Production migrations are applied separately with `npm run db:migrate` after review. Do not use
the deprecated `drizzle/` directory.

## Deployment

`npm run build` produces the Cloudflare Pages bundle. Use `npm run preview` to run that bundle
locally and `npm run deploy` to deploy it with Wrangler.
