# S21 RPG Stat Card — Technical Specification

Web app for School 21 students: log in with your school account, see your academic progress rendered as an RPG character card. Dark fantasy visual direction (Elden Ring / BG3 / Witcher 3).

## Stack

| Layer | Tech |
|---|---|
| Backend | NestJS |
| Frontend | Next.js |
| DB | PostgreSQL + Prisma |
| Auth | Keycloak (`grant_type=password`, `scope=openid offline_access`) |
| Data source | School21 Open API (`platform.21-school.ru/services/21-school/api/v1`) |
| Monorepo | pnpm workspace |

## Repo structure

```
s21-stat-card/
├── apps/
│   ├── api/              # NestJS backend, includes cron sync (no separate worker app)
│   └── web/               # Next.js frontend
├── packages/
│   ├── database/            # Prisma schema, client, migrations
│   └── shared-types/         # TS interfaces shared between web and api
├── docker-compose.yml        # postgres only, api/web run via `pnpm dev`
└── pnpm-workspace.yaml
```

## Architecture

Browser → `apps/web` → `apps/api` → Postgres (via Prisma).

`apps/api` is the only layer that talks to the outside world:
- Keycloak — token exchange and refresh.
- School21 Open API — data fetch.

The frontend and School21 never see each other directly. The school password is never persisted, not even in logs — it exists only for the duration of the token-exchange request.

## Auth flow

1. User submits school login + password on the frontend.
2. `apps/api` sends `grant_type=password`, `scope=openid offline_access` to Keycloak (`auth.21-school.ru`).
3. Response returns `access_token` (24h) and `refresh_token` (offline — governed by Keycloak's offline session idle setting, not `refresh_expires_in`, which is `0` for offline tokens).
4. `apps/api` stores the refresh token **encrypted at rest**, tied to internal `User.id`. Password is discarded immediately after step 2.
5. Frontend receives its own httpOnly session cookie — the School21 token never reaches the browser.
6. Cron job refreshes tokens and re-syncs data on a schedule (must run at least once within Keycloak's offline session idle window, or the offline session expires).
7. If refresh fails (revoked, idle timeout, password changed) — session ends, user re-authenticates. No special handling beyond that.

## School21 API endpoints used

| Endpoint | Response shape | Purpose |
|---|---|---|
| `GET /participants/{login}` | object: login, className, parallelName, expValue, level, expToNextLevel, campus, status | core profile |
| `GET /participants/{login}/skills` | `{ skills: [...] }` array | skill values (40+ categories) |
| `GET /participants/{login}/badges` | `{ badges: [...] }` array (name, receiptDate) | achievements |
| `GET /participants/{login}/points` | flat object (3 fields: PRP, CRP, Coins) | points |
| `GET /participants/{login}/feedback` | flat object (4 fields: punctuality, interest, thoroughness, friendliness) | peer feedback |
| `GET /participants/{login}/logtime` | **raw float scalar**, not an object | weekly log time |
| `GET /participants/{login}/experience-history` | `{ expHistory: [...] }` array | XP timeline for activity feed |
| `GET /campuses` | array | campus list |
| `GET /campuses/{campusId}/participants` | array | browse: participants by campus |
| `GET /campuses/{campusId}/coalitions` | array | browse: coalitions by campus |
| `GET /coalitions/{coalitionId}/participants` | array | browse: participants by coalition |
| `GET /clusters/{clusterId}/map` | seat map | out of scope for v1, revisit later |

Note: no public directory of all logins exists (Ecole-style system). Search works by exact login only; discovery works via campus → coalition → participants browse.

## Data model (Prisma, draft)

```prisma
model Participant {
  login           String   @id
  className       String
  parallelName    String
  expValue        Int
  level           Int
  expToNextLevel  Int
  campusId        String
  status          String
  logtime         Float?

  skills          Skill[]
  badges          Badge[]
  points          Points?
  feedback        Feedback?
  expHistory      ExpEntry[]
}

model Skill {
  id                String  @id @default(cuid())
  name              String
  value             Int
  participantLogin  String
  participant       Participant @relation(fields: [participantLogin], references: [login])
}

model Badge {
  id                String   @id @default(cuid())
  name              String
  receiptDate       DateTime
  participantLogin  String
  participant       Participant @relation(fields: [participantLogin], references: [login])
}

model Points {
  participantLogin  String @id
  prp               Int
  crp               Int
  coins             Int
  participant       Participant @relation(fields: [participantLogin], references: [login])
}

model Feedback {
  participantLogin  String @id
  punctuality       Float
  interest          Float
  thoroughness      Float
  friendliness      Float
  participant       Participant @relation(fields: [participantLogin], references: [login])
}

model ExpEntry {
  id                String   @id @default(cuid())
  amount            Int
  date              DateTime
  participantLogin  String
  participant       Participant @relation(fields: [participantLogin], references: [login])
}
```

## In scope (v1)

- Login via school credentials → Keycloak token exchange.
- Own profile: Overview + Stats + Achievements, built from real endpoints above.
- Cached card data (Postgres), refreshed on a TTL via cron.
- Search another student's card by exact login (live proxy, no persistent cache).
- Browse: campus → coalition → participant list.

## Out of scope (v1)

Reason: no supporting endpoint in School21 Open API.

- Ranked league / global rank ("Gold III" style tier)
- Weekly leaderboard (no public cross-user aggregation endpoint)
- In-app currency store / cosmetic purchases with real money
- Manual "stat points" allocation mechanic
- Match history (no equivalent concept in School 21)
- Cluster seat map ("who's sitting where" live view) — revisit later, privacy implications need thought first

## Domain + Rank system (derived, not chosen)

Instead of a single generic level, the card shows a **Domain** (e.g. Systems, Web, Mobile) and a **Rank** within it (Rookie → Legendary), both computed from `/skills` — the user never picks these manually.

Source of truth: only `/participants/{login}/skills`. Not `/projects` or `/courses` — their titles/IDs carry no reliable stack signal (verified: `courseId` and generic titles like "APP1 Bootcamp. Day00" don't map to a stack without guessing).

Pipeline:
1. **Domain mapping** — static lookup table, maintained by us, mapping each known skill name to a domain (e.g. `C` → Systems, `TypeScript` → Web). Skills with no mapping are ignored for domain purposes.
2. **Dominant domain** — sum skill points per domain, highest total wins. Ties broken by single highest individual skill.
3. **Rank within domain** — thresholds on the summed domain points (or a chosen formula — TBD when we have point distributions from more than one real account, since we've only seen one account's `/skills` data so far).
4. **Title generation** — separate, later feature. Rule engine matching skill combinations (e.g. C + Linux + Assembly above thresholds → "Kernel Walker") to a curated title list with rarity tags (Common → Mythic). Not blocking v1 card rendering — ships as its own checkpoint once the domain/rank base is live and we've seen skill data from a handful of different accounts to calibrate thresholds against.

**Explicitly not building:** semantic XP-event categories ("+750 XP Designed System Architecture" style). `/experience-history` only gives `{ expValue, accrualDateTime }` — School21 doesn't tag *why* XP was granted, so inventing named categories for it would be fabricating data, same category of problem as the fake currency/rank we already cut. If we want flavor text tied to a big XP jump later, it has to be an approximate correlation with a project's `completionDateTime`, clearly presented as an approximation — not a manufactured fact.

## Open questions (non-blocking, resolve during build)

- Domain mapping table (skill name → domain) needs to be written by hand — start with the ~10 categories seen so far, extend as more accounts get synced.
- Rank thresholds within a domain — need skill data from more than one account before picking real numbers.
- Title rule engine scope (how many titles for v1 vs. later) — separate checkpoint, not sized yet.
- Bulk browse (coalition → all participants) needs request pacing to avoid rate-limiting on the school's API — sync one at a time, not parallel.

---

## Checkpoints

### CP0 — Repo & infra bootstrap
- [x] pnpm workspace set up (`apps/api`, `apps/web`, `packages/database`, `packages/shared-types`)
- [x] `docker-compose.yml` with Postgres only
- [x] Prisma schema above committed to `packages/database`, initial migration run
- **Done when:** `pnpm dev` boots api + web against local Postgres with no errors.

### CP1 — Auth module
- [x] Keycloak client config (`client_id=s21-open-api`, `scope=openid offline_access`)
- [x] `POST /auth/login` endpoint: accepts login/password, exchanges for tokens, discards password
- [x] Refresh token encrypted at rest, linked to internal `User`
- [x] httpOnly session cookie issued to frontend
- [x] Refresh endpoint/service for token renewal
- **Done when:** a real School21 login successfully produces a session cookie, and the raw School21 tokens never appear in any HTTP response to the frontend or in logs.

### CP2 — Sync service
- [x] School21 API client (typed, one method per endpoint from the table above)
- [x] Cron job (`@nestjs/schedule`) — refreshes token, pulls own profile data, writes to Postgres
- [x] TTL-based cache invalidation logic
- [x] Correct handling of `/logtime` as a raw scalar, not an object
- **Done when:** running the sync job for a real account populates all Prisma tables correctly, verified against raw `curl` output.

### CP3 — Backend API for frontend
- [x] `GET /api/me/card` — full own-card payload from cache
- [x] `GET /api/participants/:login` — live proxy for another student's card (no cache, short TTL if any)
- [x] `GET /api/campuses`, `GET /api/campuses/:id/coalitions`, `GET /api/coalitions/:id/participants` — browse endpoints
- **Done when:** all endpoints return typed responses matching `packages/shared-types`, tested with a real logged-in session.

### CP4 — Domain + Rank derivation
- [x] Domain mapping table (skill name → domain) authored from real `/skills` data seen so far
- [x] Dominant-domain calculation (sum points per domain, highest wins)
- [x] Rank thresholds within a domain (placeholder values, revisit once more accounts are synced)
- [x] Backend endpoint or field exposing computed `{ domain, rank }` alongside the raw skill list
- **Done when:** `GET /api/me/card` returns a computed domain+rank that matches manual calculation from the same account's raw `/skills` output. Current synced fixture: Systems `4,947` → provisional Legendary.

### CP5 — Frontend: own card
- [x] Overview screen (School21 level/XP bar, class, campus, status — official numbers, unchanged)
- [x] Domain + Rank display (from CP4), clearly a separate thing from the official level, not a replacement — header identity line `Domain // Rank: {domain} · {rank}`; `Unclassified` when null. Verified against the real synced account (Systems · Legendary) field-by-field with `GET /api/me/card`.
- [x] Stats screen (skills — radar or bars, decision pending from open questions)
- [x] Achievements screen (badges grid)
- [x] Recent activity feed (from expHistory, no invented event categories)
- **Done when:** a logged-in user sees their real data rendered, matching what `curl` returns for their account.

### CP6 — Frontend: search & browse
- [x] Search by exact login → renders another student's card (read-only view) — top-nav exact-login search + `/participant/[login]` guest card (CardShell `guest` variant: `LIVE SCHOOL21 DATA · READ-ONLY` banner, no stale banner). Verified field-by-field against `GET /api/participants/adamshee` (level 5, 2,567 XP, Systems · Rookie); unknown login → 404 not-found state.
- [x] Browse flow: campus list → coalition list → participant list — nested routes `/browse` → `/browse/[campusId]` → `/browse/[campusId]/[coalitionId]` with linked breadcrumbs; verified live: 55 campuses → 21 Tashkent (14 coalitions) → Dragon (50 participants) → rendered card.
- **Done when:** searching a known login and browsing via campus/coalition both resolve to a rendered card. Both paths verified live with a minted dev session. Also fixed a CP2/CP3 contract bug discovered here: School21 `campus` is an object (`ParticipantCampusV1DTO {id, shortName}`), not a string — the sync cron had been failing on every run (`Expected String, provided Object`); after the fix `POST /sync/run` succeeds and `stale: false` returns.

### CP7 — Polish pass
- [x] Error states (invalid login, School21 API down, expired session) — invalid login keeps the inline `Login yoki parol xato` alert; network failures and 5xx map to friendly copy via `describeError` with the raw message as secondary detail on every data screen; API 401 redirects to `/login?expired=1`, which shows a "Your session has expired" notice.
- [x] Loading states for sync-in-progress — not-synced 404 renders "Your card is being prepared" with a Check-again button (re-reads the cache; no sync trigger, which 403s in production); skeletons gained shimmer bars; the stale banner now says "refreshes automatically".
- [x] Visual pass matching the agreed dark-fantasy direction, cutting anything from the out-of-scope list that leaked into the UI — typography per the design skill: Chakra Petch (display/numbers/labels) + Manrope (body) via next/font; global `:focus-visible` gold outline, hover transitions, clip-path on all state boxes; campusId resolved to the real campus shortName. Honesty audit: no leaderboard/gems/store/stat-points/match-history anywhere; "Coins" only as the real `points.coins` field; rank only as the CP4-derived Domain + Rank; prestige stars only for level 21+ per the design system.
- **Done when:** no fantasy UI elements (currency, rank, leaderboard, stat points) remain anywhere in the app — audited by grep + render checks; every displayed value traces to a School21 API field or a documented CP4/design-system derivation.
