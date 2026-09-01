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
| `GET /participants/{login}/skills` | `{ skills: [...] }` array | skill values: name + points (40+ categories) |
| `GET /participants/{login}/badges` | `{ badges: [...] }` array (name, receiptDateTime, iconUrl) | achievements |
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

## Open questions (non-blocking, resolve during build)

- Mapping formula from raw `/skills` (40+ categories) into a smaller set of card attributes, or ship the full radar as-is.
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
- [ ] `GET /api/me/card` — full own-card payload from cache
- [ ] `GET /api/participants/:login` — live proxy for another student's card (no cache, short TTL if any)
- [ ] `GET /api/campuses`, `GET /api/campuses/:id/coalitions`, `GET /api/coalitions/:id/participants` — browse endpoints
- **Done when:** all endpoints return typed responses matching `packages/shared-types`, tested with a real logged-in session.

### CP4 — Frontend: own card
- [ ] Overview screen (level/XP bar, class, campus, status)
- [ ] Stats screen (skills — radar or bars, decision pending from open questions)
- [ ] Achievements screen (badges grid)
- [ ] Recent activity feed (from expHistory)
- **Done when:** a logged-in user sees their real data rendered, matching what `curl` returns for their account.

### CP5 — Frontend: search & browse
- [ ] Search by exact login → renders another student's card (read-only view)
- [ ] Browse flow: campus list → coalition list → participant list
- **Done when:** searching a known login and browsing via campus/coalition both resolve to a rendered card.

### CP6 — Polish pass
- [ ] Error states (invalid login, School21 API down, expired session)
- [ ] Loading states for sync-in-progress
- [ ] Visual pass matching the agreed dark-fantasy direction, cutting anything from the out-of-scope list that leaked into the UI
- **Done when:** no fantasy UI elements (currency, rank, leaderboard, stat points) remain anywhere in the app.
