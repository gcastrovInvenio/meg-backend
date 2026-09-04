# AGENTS.md

## Stack

Hono 4 + Zod-OpenAPI on Cloudflare Workers (Vite bundler). Prisma 7 ORM with SQLite (dev) / D1 (prod). TypeScript ESM. Biome for lint/format. Vitest for tests.

## Commands

```bash
npm run dev          # Vite dev server (Cloudflare Workers runtime)
npm run lint         # biome check .
npm test             # vitest run (all tests, single pass)
npm run test:watch   # vitest (watch mode)
npm run build        # vite build
npm run deploy       # vite build && wrangler deploy
```

Order matters: **lint -> typecheck (tsc) -> test** before committing. The CI only runs lint; tests are local-only.

## Database

```bash
npx prisma generate                              # regenerate client after schema changes
npx wrangler d1 migrations apply meg --local     # apply migrations to local SQLite
npx wrangler d1 migrations apply meg --remote    # apply to production D1
```

Schema lives at `prisma/schema.prisma`. All models map to UPPERCASE tables via `@@map`. After editing the schema you must run both `prisma generate` and the local migration command. The generated client outputs to `prisma/prisma/` — do not edit files there.

## Architecture

- **Entry point:** `src/index.ts` — OpenAPIHono app, mounts `/auth/*` and `/users/*`
- **Modules:** `src/auth/`, `src/users/`, `src/lib/`, `src/openapi/`
- **Path aliases:** `@/*`, `@auth/*`, `@lib/*`, `@users/*` (mapped in tsconfig.json)
- **Auth:** JWT HS256 access tokens (15min) + rotating refresh tokens (30d). PBKDF2-SHA256 passwords.
- **Middleware:** `requireAuth` and `requireAdmin` in `src/auth/middleware.ts`
- **Env:** `.dev.vars` for Wrangler secrets (JWT_SECRET), `wrangler.jsonc` for non-secret vars. `.env` for Prisma local (`DATABASE_URL`).

## Testing

Tests use Vitest with mocked Prisma clients (`vi.fn()`). Each module has its own `test-utils.ts` with `makeDb()`, `makeApp()` helpers. Tests hit routes via `app.request()` — no running server needed.

Run a single test file: `npx vitest run src/auth/router.test.ts`

## Conventions

- **Biome config:** tabs for indentation, double quotes, recommended lint rules. `biome check --write` to auto-fix.
- **OpenAPI:** All routes use `@hono/zod-openapi` route definitions with Zod schemas in `src/openapi/schemas.ts`.
- **Error responses:** Return `{ error: "message" }` — Spanish user-facing messages.
- **Prisma access:** Each request gets a fresh `PrismaClient` via `c.env.DB` binding. Never use a global Prisma instance.
- **ESM-only:** `"type": "module"` in package.json. No CommonJS.
- **Node.js 24+** required.
