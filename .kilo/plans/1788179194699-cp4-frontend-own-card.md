# CP4 — Frontend: own card

## Goal

A logged-in user opens the web app and sees their real School21 data rendered as an RPG character sheet: Overview (level/XP, class, campus, status), Stats (skills), Achievements (badges grid), and a recent activity feed from `expHistory`.

**Done when:** a real login through the web UI lands on `/card` and every value shown matches what `GET /api/me/card` returns for that account.

## Current state (verified)

- `apps/api` (port 3001) is complete for CP1–CP3. Routes: `POST /auth/login`, `POST /sync/run` (dev-only), `GET /api/me/card`, `GET /api/participants/:login`, `GET /api/campuses`, `GET /api/campuses/:campusId/coalitions`, `GET /api/coalitions/:coalitionId/participants`. All `/api/*` routes sit behind `SessionGuard`; no cookie → `401 {"message":"Missing session cookie",...}`.
- `POST /auth/login` sets an httpOnly `session` cookie (`userId.HMAC`), `sameSite: 'lax'`, `secure` only in production, `path: '/'`, 7-day maxAge. Returns `{ success: true }` — no tokens reach the browser.
- `packages/shared-types` (name: `shared-types`, ESM, `exports` map, built to `dist/`) exports `CardResponse`, `CardProfile`, `CardSkill`, `CardBadge`, `CardPoints`, `CardFeedback`, `CardExpEntry`, plus browse/search contracts. `apps/api` already depends on it via `workspace:*`.
- `apps/web` is an untouched Next 16 / React 19 App Router skeleton: `src/app/{layout,page}.tsx`, `globals.css`, `page.module.css`, CSS Modules, `@/*` → `./src/*`, no dependencies beyond next/react, no test infrastructure.
- Real data available for verification (login `loraleet`): level 8, 5666 XP, 1333 to next level, 10 skills, 18 badges, points 13/5/31, feedback 3.88–3.91, 15 XP-history entries, `logtime: 0`, `campusId: bad03b39-...`.

## Decisions (settled with user)

| Topic | Decision |
|---|---|
| Frontend↔API | Next `rewrites` proxy in `next.config.ts`: `/auth/*` and `/api/*` → `http://localhost:3001`. Browser only ever talks to `:3000`. No CORS, **no changes to `apps/api`**. |
| Data fetching | Client Components + `fetch` against same-origin `/api/...`; cookie rides along automatically. No SSR for the card, no manual cookie forwarding. |
| Login UI | In scope: `/login` page (login + password → `POST /auth/login` → redirect to `/card`). |
| Screen layout | Single `/card` route, one fetch, client-side tabs: Overview / Stats / Achievements. Activity feed lives inside Overview. |
| Styling | CSS Modules + CSS custom properties for the dark-fantasy palette in `globals.css`, so CP6's visual pass only edits variables. No Tailwind, no UI library. |
| Skills viz | Hand-written SVG radar for the **top 8 skills by value**, normalized to the highest value, with the full skill list as CSS bars underneath. No chart dependency. |
| XP bar | Show real numbers only (`Level 8 · 5666 XP · 1333 XP to Level 9`). **No fabricated percentage** — the API exposes no intra-level threshold, so `expValue/(expValue+expToNextLevel)` would misinform. |
| Stale data | `stale === true` → informational banner with `lastSyncedAt`. No refresh button (refreshing is the cron's job; `POST /sync/run` is dev-only and would 403 in production). |
| Badge icons | `iconUrl` values are host-relative (`/global/...?path=...`, `/public_any/...?path=...`). Proxy them through Next rewrites; fall back to name-only badges if the host turns out to require auth. |
| Tests | No new test stack. Verification = `pnpm --filter web build` + `lint` clean, then real browser login. |

## Out of scope for CP4

- Logout (no `/auth/logout` endpoint exists; adding one is an API change).
- Search and browse screens (CP5).
- Error/loading polish and the full dark-fantasy visual pass (CP6) — CP4 ships functional states only.
- Any change to `apps/api` source or the Prisma schema.

## Tasks

### 1. Wire `apps/web` to the API and shared types

1. `apps/web/package.json`: add `"shared-types": "workspace:*"` to `dependencies`, then run `pnpm install` from the repo root.
2. `apps/web/next.config.ts`: add `async rewrites()` returning:
   - `{ source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' }`
   - `{ source: '/auth/:path*', destination: 'http://localhost:3001/auth/:path*' }`
   Read the API origin from `process.env.API_PROXY_ORIGIN ?? 'http://localhost:3001'` so deployment can override it.
3. Add `API_PROXY_ORIGIN=http://localhost:3001` to root `.env.example` (documented, optional) — do not touch existing entries.
4. Sanity check: `pnpm --filter web dev`, then `curl -i http://localhost:3000/api/me/card` must return the API's `401 Missing session cookie` (proves the proxy path, not a Next 404).

### 2. Design tokens and layout shell

5. `apps/web/src/app/globals.css`: replace the light/dark boilerplate with a dark-fantasy token set — e.g. `--bg-deep`, `--bg-panel`, `--border-ornate`, `--text-primary`, `--text-muted`, `--accent-gold`, `--accent-ember`, `--danger`. Keep the existing reset (`box-sizing`, margin/padding zeroing) and force `color-scheme: dark`. Remove `prefers-color-scheme` branching: the app is dark-only.
6. `apps/web/src/app/layout.tsx`: update `metadata` (title `S21 Stat Card`, real description). Keep the Geist fonts.
7. Delete the boilerplate `page.module.css` + `page.tsx` content and replace `/` with a redirect: if the `session` cookie exists → `/card`, else → `/login`.
8. Add `apps/web/src/middleware.ts` gating `/card`: **presence-only** cookie check (redirect to `/login` when absent). Do not attempt HMAC verification in middleware — the API stays the single source of truth, and a forged-but-present cookie will still be rejected with 401 by `SessionGuard`.

### 3. API client + shared UI primitives

9. `apps/web/src/lib/api.ts`: a tiny typed fetch wrapper.
   - `getOwnCard(): Promise<CardResponse>` → `fetch('/api/me/card')`.
   - `login(login: string, password: string): Promise<void>` → `POST /auth/login` with JSON body.
   - Throw a small `ApiError { status, message }`; map `401` to a dedicated sentinel so callers can redirect to `/login`, and `404` on the card route to "not synced yet" (the API returns `Card data has not been synced yet for this account`).
   - Import response types with `import type { CardResponse } from 'shared-types'`.
10. `apps/web/src/lib/format.ts`: `formatDate(iso)` (locale-stable, e.g. `dd.MM.yyyy`), `formatRelative(iso)` for the stale banner, `formatXp(n)` (thousand separators).

### 4. `/login` page

11. `apps/web/src/app/login/page.tsx` (`'use client'`): controlled login + password inputs, submit button with a pending state, inline error area.
    - On success → `router.replace('/card')`.
    - On `401` → "Login yoki parol xato" (the API already returns a normalized `UnauthorizedException`, no token/password leakage).
    - Accessibility: real `<label>` elements bound to inputs, `type="password"`, `autoComplete="username"` / `"current-password"`, error region with `role="alert"`.
    - Never store the password in state longer than the request; no `localStorage`.

### 5. `/card` page and tabs

12. `apps/web/src/app/card/page.tsx` (`'use client'`): fetch the card once on mount, hold `{ data, error, loading }`, render:
    - loading → simple skeleton/spinner,
    - `401` → `router.replace('/login')`,
    - `404` (not synced) → explanatory empty state,
    - other errors → retry affordance,
    - success → `<CardShell>` with tab state (`overview | stats | achievements`) held in the page.
13. `components/CardShell.tsx`: header (login, `className`, `parallelName`, `status`, `campusId`), the stale banner when `data.stale`, tab buttons (`role="tablist"`, `aria-selected`, keyboard arrow navigation), and the active panel.
14. `components/OverviewPanel.tsx`:
    - Level/XP block per the decision above (`Level {level}`, `{expValue} XP`, `{expToNextLevel} XP to level {level+1}`), a decorative bar with no fake fill percentage.
    - Class / parallel / campus / status rows; `logtime` shown as hours with a "no logged time this week" fallback when `0`/`null`.
    - `points` block (PRP / CRP / Coins) and `feedback` block, both handling `null` — the whole object can be `null`, and every feedback field is independently nullable (`Float?` in Prisma). Render `—` for missing values.
    - Activity feed: `expHistory` (already `date desc`, capped at 50 by the API) as `+{amount} XP · {formatDate(date)}`; empty-state text when the array is empty.
15. `components/StatsPanel.tsx`:
    - `components/SkillRadar.tsx`: pure SVG. Take `skills` sorted by `value` desc, slice to 8, normalize each to `max(value)`. Draw N axes at `2π·i/N`, the polygon path, grid rings at 25/50/75/100%, and axis labels. Guard the degenerate cases: fewer than 3 skills → skip the radar and render bars only; `max === 0` → all points at the centre.
    - Full skill list below as bars: `width: (value / max) * 100%`, value label on the right, sorted desc.
16. `components/AchievementsPanel.tsx`: responsive grid of badges sorted by `receiptDate` desc. Each tile: icon, name, formatted date. Duplicate badge names are legitimate (the same badge can be earned repeatedly) — do not deduplicate; use `index` in the key. Empty state when `badges` is empty.

### 6. Badge icon proxy (verify first)

17. **Verify the host before coding:** take a real `iconUrl` from `GET /api/me/card` and `curl -I` it against `https://platform.21-school.ru<iconUrl>`. Confirm a `200` and an image content-type.
    - If it works → add rewrites for `/global/:path*` and `/public_any/:path*` → `https://platform.21-school.ru/...` (query strings are forwarded by default), and render with a plain `<img>` (not `next/image`, to avoid the remote-pattern optimizer path for a proxied host).
    - If it requires auth or returns 403 → drop icons for CP4, render name + date only, and note it for CP6.
18. Every icon needs `alt={badge.name}`, a fixed box size, and an `onError` fallback to a neutral placeholder so a broken URL cannot break the grid.

## Risks / notes for the implementer

- **Icon host is unverified.** Task 17 is a gate, not an assumption. The relative paths were observed in live data; the serving host was not confirmed.
- **`logtime` is `0`** for the verification account, so the "no logged time" branch is the one you will actually see. Do not treat `0` as a missing value in the data layer — only in the copy.
- **`feedback` nullability is real.** The Prisma columns became `Float?` after the OpenAPI review; an account with no peer reviews returns `null` for all four fields. Render without crashing.
- **Do not add a sync trigger.** `POST /sync/run` returns 403 when `NODE_ENV=production`; wiring it into the card UI would ship a button that breaks in production.
- **Keep the API untouched.** If a screen seems to need a new field, stop and flag it — changing the `/api/me/card` contract is a CP3 revision, not a CP4 task.
- `pnpm dev` at the repo root already runs both apps in parallel (`web` on 3000, `api` on 3001); the proxy assumes that pairing.

## Validation

1. `pnpm --filter shared-types build` (ensures `dist/` is current for the new consumer).
2. `pnpm --filter web build` — clean.
3. `pnpm --filter web lint` — clean (this app has no pre-existing lint debt; keep it that way).
4. `pnpm --filter api build && pnpm --filter api test` — must stay at 54/54 green, proving CP4 touched nothing on the backend.
5. Manual browser run with `pnpm dev`:
   - `/` with no cookie → redirected to `/login`.
   - Real School21 credentials → redirect to `/card`; DevTools shows the `session` cookie on `localhost:3000` as httpOnly, and no School21 token anywhere in responses or storage.
   - Overview values match `curl -H "Cookie: session=..." http://localhost:3001/api/me/card` field by field (level 8, 5666 XP, 1333 to next, points 13/5/31, feedback 3.88/3.91/3.91/3.91).
   - Stats: radar shows 8 axes for the 10-skill account; bar list shows all 10, `C` (1790) longest.
   - Achievements: 18 tiles, newest first (`Tournament event [1 place]`, 2026-06-23).
   - Delete the cookie in DevTools, reload `/card` → redirected to `/login` (401 path).
6. Clean up any temporary files created while verifying the icon host.
