# CP5 — Frontend: Own Card

## Goal

Complete the technical specification's CP5 frontend checkpoint: a logged-in School 21 user can open `/card` and see the real cached card data, including the derived Domain + Rank from CP4, without confusing derived rank with the official School21 level.

The existing frontend already implements most CP5 screens. This plan is an implementation-ready completion/audit plan, not a greenfield rebuild.

## Current State

- `apps/web` is a Next.js 16 / React 19 App Router app using CSS Modules and dark-fantasy CSS variables.
- `/login` submits credentials to the same-origin `/auth/login` rewrite and redirects to `/card`.
- `src/proxy.ts` performs a presence-only session-cookie gate for `/card`; the API remains the source of truth for cookie validity.
- `src/app/card/page.tsx` fetches `GET /api/me/card`, handles loading, unauthorized, not-synced, retry, and successful states.
- `CardShell` already renders official login, class, parallel, level, level-tier styling, stale state, and Overview/Stats/Achievements tabs.
- `OverviewPanel` already renders official level/XP, class/parallel/campus/status/logtime, points, nullable feedback, and `expHistory` activity.
- `StatsPanel`/`SkillRadar` already render the full sorted skill list and a top-eight SVG radar with degenerate guards.
- `AchievementsPanel` already renders the badge grid sorted newest-first, preserves duplicate badges, and currently uses name/date-only fallback because the verified icon host returned HTML rather than image content.
- CP4 already added `domainRank: { domain: string | null; rank: string | null }` to the shared/API card contracts and both cached and live backend responses.
- No frontend test framework exists and the settled project decision is to use build/lint plus manual browser validation rather than add a test stack.

## Settled Decisions

- Render Domain + Rank in the header identity area, near the login/class/parallel information.
- Keep Domain + Rank visibly separate from official School21 `level`; do not replace the level label, level number, or level-tier frame.
- When `domainRank.domain` or `domainRank.rank` is null, render a visible `Unclassified` state rather than hiding the line, using an em dash, or inventing Rookie.
- Use the exact API values. Do not recompute, normalize, or infer domain/rank in the browser.
- Keep the current nested contract: `data.domainRank.domain` and `data.domainRank.rank`.
- Preserve the existing no-test-stack decision.
- Keep CP6 search/browse, logout, icon retrieval, title generation, rarity, leaderboard, and other fantasy classifications out of scope.

## Implementation Tasks

### 1. Audit the shared frontend contract

- Confirm `apps/web` imports the rebuilt `shared-types` declarations and `CardResponse` includes `domainRank`.
- Confirm no frontend fixture, mock, or manually constructed `CardResponse` omits the new required field. If any exists, update it with an explicit derived result; do not make the contract field optional merely to hide incomplete data.
- Keep the backend untouched unless validation reveals a real contract mismatch. CP5 should consume the CP4 response, not duplicate the derivation algorithm.

### 2. Add the Domain + Rank header identity line

Update `apps/web/src/components/CardShell.tsx` and its CSS module:

- Add a semantic identity block below the login/class/parallel line, for example:
  - label: `DOMAIN // RANK`;
  - value: `{domain} · {rank}` when both values exist;
  - value: `Unclassified` when either value is null.
- Use `data.domainRank` directly.
- Ensure the line is structurally distinct from the official level block, which remains the separate `LEVEL`/tier area on the opposite side of the header.
- Use the existing dark-fantasy variables and angled structural language. Do not add rounded containers, fabricated icons, progress values, or rank points.
- Add an accessible text label or visually clear grouping so screen-reader users can distinguish `Domain + Rank` from `Level`.
- Keep the identity line usable for long/unknown domain strings on narrow screens with wrapping or safe overflow handling.
- Preserve the current responsive header behavior; on mobile, the level block may remain below/right while the identity line stays with the login metadata.

### 3. Review existing CP5 data rendering against the contract

Audit and make only necessary corrections in the existing components:

- Overview:
  - official `level`, `expValue`, and `expToNextLevel` remain unchanged and are formatted only for display;
  - no fake XP percentage or fill ratio is introduced;
  - `logtime` value `0` uses the existing “No logged time this week” copy but remains a real numeric value in the data layer;
  - null points, null feedback object, and independently null feedback fields render safely;
  - activity uses only `expHistory` amount/date and never invents event categories.
- Stats:
  - all raw skills remain represented in bars sorted descending;
  - radar uses at most the top eight skills, normalizes to the highest value, and skips when fewer than three skills exist;
  - zero maximum values render a center/empty radar safely;
  - no domain/rank value is derived from visual bar or radar values.
- Achievements:
  - sort by `receiptDate` descending;
  - preserve duplicate badge names with index-safe keys;
  - render real badge name/date data;
  - keep the documented name/date-only fallback while icon host access remains unresolved.
- Session/error behavior:
  - API 401 redirects to `/login`;
  - API not-synced 404 shows the explanatory empty state;
  - other failures retain a retry affordance;
  - no School21 access token or password is written to browser storage, response UI, or client logs.

### 4. Accessibility and interaction audit

- Verify tabs retain `role="tablist"`, `role="tab"`, `aria-selected`, `tabIndex`, and `role="tabpanel"` relationships.
- Verify left/right arrow navigation changes the active tab and moves focus to the corresponding tab.
- Ensure the Domain + Rank line is text content, not color-only information.
- Check keyboard focus visibility for login controls, tabs, and retry.
- Check heading hierarchy and meaningful labels for the level block, identity block, points, feedback, activity, skills, and achievements.
- Confirm mobile layouts do not create horizontal scrolling except intentional tab overflow.

### 5. Manual real-data acceptance verification

With Postgres, API, and web running:

1. Open `/` without a session cookie and verify redirect to `/login`.
2. Submit valid School21 credentials through `/login`.
3. Verify redirect to `/card` and confirm the browser receives only the httpOnly local `session` cookie; no School21 token appears in Network responses, storage, or URL data.
4. Compare the rendered card against `GET /api/me/card` for the same session:
   - login, class, parallel, campus, status;
   - official level, XP, and XP-to-next-level;
   - `domainRank.domain` and `domainRank.rank` in the separate header identity line;
   - logtime including the zero fallback;
   - points and all feedback values/nulls;
   - activity entries and dates;
   - all skill values;
   - badge count, names, dates, order, and duplicates.
5. For the current synced account, manually verify the CP4 result remains `Systems · Legendary` from the mapped Systems total `4,947`; this must be displayed separately from the official level.
6. Switch through Overview, Stats, and Achievements and verify each panel renders without a second card fetch.
7. Delete the local session cookie and reload `/card`; verify redirect to `/login`.
8. If a no-mapped-skills response can be safely produced in a test fixture or account, verify the header displays `Unclassified` without crashing. Otherwise cover this branch through the CP4 contract/unit behavior and a local component inspection.
9. Check desktop and narrow/mobile viewport layouts, including long badge names and long identity strings.

## Validation Commands

Run in this order:

1. `pnpm --filter shared-types build`
2. `pnpm --filter api build`
3. `pnpm --filter api test -- --runInBand`
4. `pnpm --filter web build`
5. `pnpm --filter web lint`
6. `git diff --check`

The API suite must remain fully green. The frontend build must typecheck the `domainRank` contract. No new frontend test dependencies are required.

## Acceptance Criteria

- The CP5 header visibly shows `Domain · Rank` from the API response.
- Domain + Rank is clearly separate from official School21 level and level-tier styling.
- Null derived values display `Unclassified` and never fabricate a domain/rank.
- Overview, Stats, Achievements, and activity feed match `GET /api/me/card` field-by-field.
- Tabs, retry, loading, not-synced, and unauthorized behavior remain functional.
- Desktop and mobile layouts are usable and keyboard navigation works.
- `shared-types` build, API build/tests, web build, web lint, and diff checks pass.
- A real browser session verifies the end-to-end CP5 done condition.

## Risks and Follow-ups

- CP4 rank thresholds are provisional and may be recalibrated later. The frontend must display the API result without embedding threshold logic.
- The current live fixture has one observed account; manual verification must record the actual API payload used rather than treating `Systems · Legendary` as universal.
- Badge icons remain unavailable through the tested platform asset URLs; do not reintroduce broken image rewrites in CP5. Revisit with a supported authenticated asset mechanism during a later polish pass.
- The technical specification's CP5 Domain + Rank item can be marked complete after the header implementation and contract/manual checks pass. CP6 and CP7 checklist items remain unchanged.
