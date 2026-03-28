# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── dtf-quote/          # DTF Quote App (React + Vite, frontend-only)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/dtf-quote` (`@workspace/dtf-quote`)

DTF (Direct to Film) printing quote calculator — React + Vite app with backend auth and subscription system.

**Key Features:**
- Quote calculator with multiple stamp types (width, height, quantity)
- Skyline 2D strip packing algorithm for optimal stamp placement on a fixed-width roll
- User profile page (`/profile`) with personal info editing, password change, subscription status, and logout
- Roll visualizer (SVG) showing stamps packed with absolute positions
- Cost calculation: linear meters × price per meter (default $10,000 CLP)
- Quote history with detail view and roll visualization
- Settings: configurable price per meter and roll width
- Server-side auth (JWT via httpOnly cookies) with register/login/guest modes
- Subscription system with usage tracking (quotes, mockups, PDFs per month)
- Upgrade prompt when usage limits are reached

**Key Files:**
- `src/lib/skyline.ts` — Skyline 2D strip packing algorithm
- `src/lib/api.ts` — API fetch helper with credentials support
- `src/components/roll-visualizer.tsx` — SVG roll preview component
- `src/components/upgrade-prompt.tsx` — Upgrade plan modal (fetches plans from API)
- `src/components/plan-guard.tsx` — Route-level plan guard (subscription/limit check)
- `src/pages/landing.tsx` — Public landing page (hero, tools, pricing, footer)
- `src/pages/calculator.tsx` — Main quote calculator page (with usage tracking)
- `src/pages/mockups.tsx` — Mockup generator (dual Konva canvas front+back, real garment PNGs, layer system, drag/resize/rotate, combined PNG export with branding)
- `src/lib/garment-templates.ts` — Garment template definitions (tshirt white/black, hoodie black) with front/back image pairs and print area coordinates
- `public/garments/` — Real garment photo PNGs (tshirt-white-front/back, tshirt-black-front/back, hoodie-black-front/back)
- `src/pages/history.tsx` — Saved quotes history
- `src/pages/settings.tsx` — App settings (price, roll width)
- `src/pages/auth.tsx` — Login/register page (async API calls)
- `src/hooks/use-auth.tsx` — Auth context (API-backed, JWT sessions, refreshSession)
- `src/hooks/use-usage.tsx` — Usage tracking context (limits, remaining, increment)
- `src/hooks/use-usage-events.ts` — Fetches usage events from API for dashboard activity chart/feed
- `src/hooks/use-dtf-store.ts` — localStorage hooks for settings and quotes
- `src/lib/storage.ts` — localStorage utility functions

**Routing (wouter):**
- `/` — Landing page (accessible to both auth and unauth users, uses AppShell with Navbar)
- `/auth` — Login/register page; supports `?next=/path` param for deep linking after auth (uses AppShell, no navbar)
- `/dashboard` — Dashboard home (authenticated, default post-login destination, uses DashboardLayout)
- `/app` — Calculator page (authenticated, wrapped in PlanGuard for dtf_quotes, uses DashboardLayout)
- `/mockups` — Mockup generator (authenticated, wrapped in PlanGuard for mockup_pngs, uses DashboardLayout)
- `/history` — Quote history (authenticated, uses DashboardLayout)
- `/settings` — App settings (authenticated, master only, uses DashboardLayout)
- `/profile` — User profile (authenticated, uses DashboardLayout)
- Unauthenticated access to protected routes redirects to `/auth?next=<path>` preserving intent

**Navigation — Dual Layout Architecture:**
- **AppShell** (public): Used for landing (`/`) and auth (`/auth`). Contains background blobs+noise, top Navbar with desktop horizontal nav + Planes/Nosotros (landing), and login/register buttons. No bottom mobile nav.
- **DashboardLayout** (authenticated): Used for all authenticated routes. Contains background blobs+noise, persistent left sidebar (desktop 240px, mobile slide-in drawer), top header bar with breadcrumb/search/notifications/avatar, and scrollable content area.
- **Sidebar** sections: Principal (Dashboard, Pedidos, Clientes, Proveedores), Herramientas (Cotizador DTF, Mockups, Quita Fondos, Blog), Finanzas (Ingresos/Gastos, Reportes, Cuentas Corrientes), Comunidad (Telegram link), bottom: Configuración (master only), Mi Perfil, Cerrar Sesión.
- Items marked "Pronto" are disabled (not yet built).

**Key Files (layout):**
- `src/components/app-shell.tsx` — Public shell with background, navbar (landing/auth only)
- `src/components/navbar.tsx` — Public navbar (desktop top bar, used on landing page)
- `src/components/sidebar.tsx` — Dashboard sidebar with nav sections, active states, mobile drawer
- `src/components/dashboard-layout.tsx` — Dashboard layout wrapper (sidebar + header + content)
- `src/pages/dashboard.tsx` — Dashboard home page (greeting, plan badge, 4 metric cards, weekly activity chart via Recharts with quotes+mockups from API events, activity feed, plan usage bars, quick actions, coming soon section)

**Design:** Dark mode only (forced via `<html class="dark">`), orange primary (#F97316), Outfit + DM Sans fonts, mobile-first responsive design. No theme toggle.

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express, seeds plans & master account on startup
- App setup: `src/app.ts` — mounts CORS (credentials), cookie-parser, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers (health, settings, auth, subscription)
- Auth middleware: `src/middleware/auth.ts` — JWT sign/verify, `requireAuth` middleware
- Auth routes: `src/routes/auth.ts` — POST `/api/auth/register`, POST `/api/auth/login`, GET `/api/auth/me`, POST `/api/auth/logout`
- Subscription routes: `src/routes/subscription.ts` — GET `/api/subscription`, GET `/api/subscription/plans`, POST `/api/subscription/upgrade`, GET `/api/usage`, POST `/api/usage/increment` (also logs to usage_events), GET `/api/usage/events?days=7` (returns last N days of events)
- Depends on: `@workspace/db`, `@workspace/api-zod`, bcryptjs, jsonwebtoken
- JWT stored in httpOnly cookie named `token` (30-day expiry)
- Master account: `yaguarestudio@gmail.com` / role `master` — auto-seeded on startup

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- Schema tables:
  - `settings.ts` — `dtf_global_settings` (price per meter, roll width)
  - `users.ts` — `users` (email, name, passwordHash, role)
  - `plans.ts` — `subscription_plans` (name, slug, limits as JSONB, price)
  - `subscriptions.ts` — `user_subscriptions` (userId, planId, status, period dates)
  - `usage.ts` — `usage_counters` (userId, counterType, count, periodStart — auto-resets monthly) + `usage_events` (userId, eventType, metadata JSONB, createdAt — individual event log for activity history)
- `src/seed-plans.ts` — Seeds 3 plans: Gratis (10/5/3), Estándar (40/30/25), Premium (unlimited)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only), `./seed-plans` (seed function)
- Subscription plans use `-1` in limits to indicate unlimited

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
