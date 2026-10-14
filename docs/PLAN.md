# AI Build Log: Plan

**Status:** v0.3 (2026-10-14), build in progress (see §2.8). v0.2 (2026-10-14): v0.2: per-model stats, paste-anything bulk entry, no login (fully public), estimated costs, Sonnet 5.5 High builds, second project (DEUS HCS Website) added to the seed data.

This is a light version of the new-app playbook: one plan instead of separate product, design and implementation documents, no design directions, and the whole build done in one go by one model.

---

## Part 1: Product

### 1.1 What it is
A small, professional-looking website that documents my AI projects. Each **project** (for example "Wedding Plan Redesign", "DEUS HCS Website") is a list of **steps** in order. For each step it shows which model(s) ran it, the tokens (input, output, cache read, cache write), the cost, and the time taken when I have it. Each project shows totals and **stats per model**, and the home page shows the same across all projects.

**Basic principles**
- **Fully public, no login.** Anyone with the link can read *and* add or edit. Kept out of search engines (`noindex`), so in practice only people I send the link to will find it. Deletes can be undone (see 1.3), so a mistake or a stranger can't lose data for good.
- **How data gets in:** I copy-paste my notes exactly as I write them today, as much or as little as I want at once, and the site turns them into steps automatically. Nothing to fill in by hand unless I want to.
- **Starting data:** both projects I have so far are loaded on day one from `docs/seed-data/` (Wedding Plan Redesign: 14 steps; DEUS HCS Website: 7 steps).

### 1.2 Jobs

| Job | How often | Notes |
|---|---|---|
| Add steps to a project by pasting my notes | Several times a week | The most frequent job, so it must be the fastest: paste, check, one click |
| Look at a project: steps, costs, per-model stats, where the money went | Weekly | The main reading screen |
| Compare projects and models across everything | Occasionally | The home page |
| Create a project | Rare | Can be done by pasting too |
| Fix, reorder or delete a step | Rare | |

### 1.3 Features

**Home page (`/`)**
- A totals strip: total cost (recorded + estimated), total tokens, total steps, total API time / wall time, across all projects.
- A card per project: name, one-line description, status (In progress / Done), number of steps, total cost, total output tokens, last updated.
- **All projects, by model:** the same per-model table as on a project page (below), summed across every project.
- **New project** button. Empty state (no projects yet): one line and the button.

**Project page (`/p/[slug]`)**
- Header: name, description, status, date range, **Paste steps** button (always visible, top right; on phone a fixed button at the bottom).
- **Summary tiles:** total cost, total input, total output, total cache read, total cache write, total API time, total wall time, number of steps.
- **Stats per model** (the table the owner asked for). One row per model + effort (e.g. "Opus 5.5 · High", "Opus 5.5 · Medium", "Opus 5.5" when no effort was written, "Sonnet 5.5 · High", "Haiku 5.5 · Max"), with columns:
  - Steps (how many steps used it)
  - Total input, total output, total cache read, total cache write
  - Total cost (recorded + estimated, with the estimated part marked "est.")
  - Share of the project's cost (a small inline bar)
  - Total API time, total wall time
  - Average cost per step
  - A **Total** row at the bottom. A toggle groups rows by model only (Opus / Sonnet / Haiku) instead of model + effort.
- **Cost by step:** a horizontal bar per step in step order, so the expensive steps stand out. Estimated costs are drawn hatched/lighter with "est.".
- **Steps**, grouped by **phase** (e.g. "Planning & design", "Implementation") and, where I wrote one, a **sub-group** (e.g. "Phase 0"). Each step is a row (desktop) or card (phone):
  - Step number and title
  - One line per model: model badge + effort, input, output, cache read, cache write, cost ("est." if estimated)
  - API duration and wall duration if recorded
  - Optional short notes
  - A "⋯" menu: edit, move up, move down, delete
- Missing values show as "—", never as 0.

**Paste steps** (the fast path, a panel that slides over the project page)
1. Paste anything: one line, one step, or my whole running notes for the project.
2. Underneath, live, a **preview** of what was understood: each step with its phase / sub-group, title, models, numbers, cost (recorded, or estimated and marked), durations. Steps that are **already in the project** (same title and same numbers) are shown greyed out as "already added" and skipped. So I can keep one running doc per project and just re-paste the whole thing each time: only the new steps get added.
3. Anything it couldn't read is listed as a warning with the line it came from. Every previewed field can be edited before saving.
4. **Add N steps** (one click, `Cmd/Ctrl+Enter` works too). The panel closes, the new steps are highlighted briefly, and a toast says "Added N steps".

**New project (`/new`):** name (slug made from it), optional description, and the same paste box. If I paste notes whose first line is a project name followed by a colon (like "Wedding Plan Redesign:"), the name is filled in from it.

**Edit step:** the same fields as the preview, for one step: title, phase, sub-group, notes, each model line, durations. "Re-paste" box to replace the numbers from a new paste.

**Delete:** step and project deletes show an **Undo** toast for 10 seconds and go to a soft-deleted state (`deleted_at`). A small "Recently deleted" link at the bottom of the project page lists them with Restore, for 30 days. A project with steps can be deleted the same way (its steps go with it and come back with it).

### 1.4 What the paste understands
Taken from my two notes files in `docs/seed-data/`. Line by line:

| Line looks like | Means |
|---|---|
| `Capability Inventory Mapping` or `Second Leak Review:` (text, no numbers) | The title of the next step |
| `Claude-opus-5-5 Medium:  29.8k input, 78.4k output, 4.7m cache read, 536.3k cache write ($5.68)` | One model line for the current step |
| A second model line right after it (see "Inventory Notes") | Another model in the same step |
| `Money Model:  Claude-opus-5-5 Medium:  44 input, … ($1.65).  Total duration (API):  3m 56s. Total duration (wall): 8m 54s` | Title and model line on one line, with durations. Titles may contain commas, "…" and colons |
| `IMPLEMENTATION:` (all capitals) | Starts a new **phase** ("Implementation"). Steps before the first phase line go to "Planning & design" |
| `Phase 0:` (starts with "Phase") | Starts a **sub-group** inside the current phase |
| `Wedding Plan Redesign:` as the very first line, followed by another title line | The project name (used by New project; ignored when pasting into a project) |
| Blank lines | Ignored |

Details:
- Model names are case-insensitive (`Claude-opus-5-5`, `claude-opus-5-5`); effort (`Low`, `Medium`, `High`, `xHigh`, `Max`, any case) is optional.
- Numbers: plain (`534`), `k` (×1,000) and `m` (×1,000,000), stored as whole tokens.
- Cost `($x.xx)` is optional; any number of decimals (`$0.4368`) is kept exactly. Missing → estimated (1.5).
- Durations `Total duration (API)` / `Total duration (wall)` are optional, formats `45s`, `3m 56s`, `2h 14m 22s`, and may sit on the model line or the line after it.
- A title with no model line under it before the next title is a warning ("no usage found for …"), never silently dropped.

### 1.5 Estimated costs
When a model line has no cost, the site estimates it from the token counts and the model's price, and always labels it **est.** (never mixed in silently). Totals show both: e.g. "$95.40 · incl. $0.39 est.".

Official prices per million tokens (Anthropic, as of 2026-10):

| Model | Input | Output | Cache read | Cache write 5m / 1h |
|---|---|---|---|---|
| Opus 5.5 | $4.00 | $20.00 | $0.20 | $5.00 / $8.00 |
| Sonnet 5.5 | $2.00 | $10.00 | $0.10 | $2.50 / $4.00 |
| Haiku 5.5 (prompts up to 100K) | $0.10 | $0.50 | $0.01 | $0.125 / $0.20 |
| Haiku 5.5 (prompts over 100K) | $0.50 | $2.50 | $0.05 | $0.625 / $1.00 |

(Checked against Anthropic's pricing page on 2026-10-14 at build time. v0.2 had Sonnet cache reads at $0.20 and Haiku's unknown; the page says $0.10 and $0.01.)

Two things the token totals alone can't tell: whether cache writes were 5-minute or 1-hour, and whether Haiku requests were in the over-100K price tier. So **the options are calibrated against my own recorded costs**: `npm run calibrate` tries each option per model against every recorded usage line in the seed data and prints the error of each. Result on 2026-10-14 (21 recorded lines): Opus 5.5 and Sonnet 5.5 match 1-hour cache writes (median error 0.2%), Haiku 5.5 matches the over-100K tier with 5-minute writes (median error 5.3%, only 2 lines). The page shows a footnote: "Estimates use rates calibrated on 21 recorded steps, typically within ±5%". Prices live in one file (`src/lib/pricing.ts`) so they're easy to update.

### 1.6 Look and feel (decided here, no design directions)
- **Personality:** calm, precise, editorial-meets-dashboard. Think Linear / Vercel docs: white space, crisp numbers, one accent colour.
- **Type:** Inter for text, JetBrains Mono with tabular figures for every token count, cost and duration, right-aligned in tables.
- **Colour:** neutral greys (zinc), one accent (indigo) for links, buttons and bars. Model badges in three muted hues: Opus violet, Sonnet sky, Haiku emerald. Estimated values in the muted text colour with a dotted underline. Light and dark mode (follows the system, with a toggle).
- **Density:** medium. Tables scroll sideways on phone inside their card only (the page itself never scrolls sideways); the first column (model / step) stays pinned.
- **Voice:** plain and brief. Numbers formatted like my notes: `29.8k`, `4.7M`, `$5.68`, `2h 14m`. Exact values on hover / tap.
- **Identity:** wordmark "AI Build Log" in Inter semibold; favicon a small indigo square with a mono "›_" mark. Page titles: `<Project> · AI Build Log`.

### 1.7 Out of scope (for now)
Login and roles, comments, file uploads, automatic import from Claude Code session files, charts beyond the simple bars, exporting.

### 1.8 Open questions (each with a default)

| Question | Default if unanswered |
|---|---|
| Custom domain? | No, the `*.vercel.app` URL |
| Show time-per-model for steps that used two models? | Yes, split by each model's share of the step's output tokens, marked "≈" |

---

## Part 2: Technical implementation

### 2.1 Stack (the playbook's default stack, trimmed)

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript, current Node.js LTS | Default stack |
| Database | Neon Postgres: `production` branch for real data, `test` branch for tests | Default stack; lets me add steps from any browser |
| Data access | Drizzle ORM + Neon serverless driver, drizzle-kit SQL migrations in the repo | Default stack |
| Writes | Server Actions + Zod; the server re-parses the pasted text itself instead of trusting the browser's preview | Default stack; one source of truth for parsing |
| Styling | Tailwind CSS + a few shadcn/ui components (Button, Input, Textarea, Sheet, Dialog, DropdownMenu, Tooltip, Toast/Sonner, Switch), restyled to the tokens | Default stack, kept small |
| Fonts / icons | `next/font` (Inter, JetBrains Mono), `lucide-react` | Default stack |
| Auth | None (public, by choice). Basic abuse guard: request-size limit on paste (100 KB) and Zod limits on every field | Owner decision 2026-10-14 |
| Tests | Vitest (parser, pricing, formatters, stats; DB tests on `test`) + Playwright (smoke + paste flow) | Default stack, minimal set |
| Hosting | GitHub `main` → Vercel, every push deploys to production | Default stack |

Versions pinned to the latest stable at setup, checked against the installed packages' docs (Next.js changes between versions).

### 2.2 Environments and secrets

| Environment | Neon branch | Env vars in |
|---|---|---|
| Local dev | `production` | `.env.local` |
| Tests | `test` | `.env.test` |
| Vercel Preview | `test` | Vercel → Preview |
| Vercel Production | `production` | Vercel → Production |

Variables: `DATABASE_URL` (direct, migrations), `DATABASE_URL_POOLED` (app). `.env.example` lists names only. Never printed or committed. Migrations run on `test` first (`npm run db:migrate:test`), production (`npm run db:migrate`) only with my approval.

### 2.3 Data

```
projects
  id            uuid pk default gen_random_uuid()
  slug          text unique not null
  name          text not null
  description   text
  status        text not null default 'in_progress'   -- 'in_progress' | 'done'
  created_at, updated_at  timestamptz not null default now()
  deleted_at    timestamptz                            -- soft delete

steps
  id               uuid pk
  project_id       uuid not null references projects(id) on delete cascade
  position         integer not null                   -- order within the project
  phase            text not null default 'Planning & design'
  sub_group        text                               -- e.g. 'Phase 0'
  title            text not null
  notes            text
  api_duration_s   integer                            -- null = not recorded
  wall_duration_s  integer
  fingerprint      text not null                      -- hash of normalised title + usage numbers, for "already added"
  source_text      text                               -- the pasted lines this step came from
  created_at, updated_at  timestamptz
  deleted_at       timestamptz
  index (project_id, position)
  index (project_id, fingerprint)

step_usages                -- one row per model line in a step
  id             uuid pk
  step_id        uuid not null references steps(id) on delete cascade
  position       integer not null
  model          text not null      -- normalised: 'claude-opus-5-5'
  effort         text               -- 'low'|'medium'|'high'|'xhigh'|'max'|null
  input_tokens   bigint not null default 0
  output_tokens  bigint not null default 0
  cache_read     bigint not null default 0
  cache_write    bigint not null default 0
  cost_usd       numeric(12,4)      -- recorded cost; null = not recorded
  index (step_id)
```
- **Estimated cost is computed, not stored**, from `pricing.ts` at read time, so updating prices updates every estimate.
- **Stats per model** come from one SQL query grouped by `(model, effort)` over non-deleted steps (sums of the four token columns, sum of recorded cost, count of distinct steps), with estimates and duration splits added in `src/lib/stats.ts`. The home page runs the same query without the project filter.
- Soft-deleted rows are excluded everywhere except "Recently deleted"; a daily purge isn't needed at this size (the list just hides items older than 30 days).
- **Seed:** `scripts/seed.ts` reads `docs/seed-data/*.txt` and runs them through the real parser and the real save action, so the parser is tested on real data. Runs on `test` for tests; on `production` once, with my OK.

### 2.4 Pages and routes

| Route | Purpose |
|---|---|
| `/` | Totals, project cards, all-projects stats per model |
| `/p/[slug]` | Project page: tiles, stats per model, cost by step, steps by phase, Paste steps panel, recently deleted |
| `/p/[slug]/steps/[id]` | Edit a step |
| `/p/[slug]/settings` | Edit project name, description, status; delete project |
| `/new` | New project (name + optional paste) |
| `not-found`, `error` | Styled 404 and error pages |

Reading pages are Server Components that query Neon directly; every Server Action calls `revalidatePath` for the pages it changes.

### 2.5 Key pieces
- **`src/lib/parse-notes.ts`**: pure function `parseNotes(text) → { projectName?, steps: ParsedStep[], warnings: {line, message}[] }`. Line classifier, in order:
  1. A **model match** anywhere in the line: `/(claude-[a-z0-9-]+)(?:\s+(low|medium|high|xhigh|max))?\s*:\s*/i` followed by at least one `<number><k|m>? input|output|cache read|cache write`. Text before the match (minus the trailing `:`) is a title for a new step; without it, the line is another model line for the current step.
  2. Inside a model line: each `([\d.]+)\s*([km])?\s+(input|output|cache read|cache write)`, cost `\(\$([\d.]+)\)`, durations `Total duration \((API|wall)\):\s*((?:\d+\s*[hms]\s*)+)`.
  3. A durations-only line attaches to the current step.
  4. `^phase\b.*:?$` (case-insensitive) → sub-group. A line whose letters are all capitals → new phase (title-cased: "Implementation"), resetting the sub-group.
  5. Any other text → pending title. Two pending titles in a row: the first is the project name if it's line 1, otherwise a warning.
- **`src/lib/pricing.ts`**: the price table from 1.5, the calibrated cache-write multiplier and Haiku tier per model, and `estimateCost(usage)`. `scripts/calibrate-pricing.ts` prints, per model, the error of each option against all recorded costs, and the chosen one; its result is pasted into `pricing.ts` with the date.
- **`src/lib/stats.ts`**: `statsByModel(rows, {groupBy: 'model' | 'model+effort'})`: sums, recorded vs estimated cost, share, average per step, durations (single-model steps count fully; multi-model steps split by output-token share and flagged "≈").
- **`src/lib/format.ts`**: `formatTokens` (29.8k, 4.7M), `formatCost` ($5.68, "est." variant, "—"), `formatDuration` (2h 14m).
- **Paste panel** (client component): textarea → `parseNotes` on input (debounced) → preview list with inline edits and "already added" detection against the project's fingerprints (sent with the page) → Server Action `addSteps(projectId, text, edits)` re-parses, validates with Zod, skips existing fingerprints, inserts all steps + usages in one transaction at the end of the project, returns the new step ids for highlighting.
- **Undo:** delete actions set `deleted_at` and return an id; the toast's Undo calls `restore(id)`.
- **Cost bars / share bars:** plain divs, width as a % of the max. No chart library.
- **Theme:** CSS variables in `src/styles/tokens.css` (light + dark), Tailwind theme mapped to them, choice kept in a cookie so there's no flash.

### 2.6 Design tokens (copied into `src/styles/tokens.css`)
```css
:root {
  --bg: #fafafa; --surface: #ffffff; --border: #e4e4e7;
  --text: #18181b; --text-muted: #71717a;
  --accent: #4f46e5; --accent-soft: #eef2ff; --on-accent: #ffffff;
  --opus: #7c3aed; --sonnet: #0284c7; --haiku: #059669;
  --danger: #dc2626; --success: #16a34a;
  --radius: 10px;
}
.dark {
  --bg: #09090b; --surface: #18181b; --border: #27272a;
  --text: #fafafa; --text-muted: #a1a1aa;
  --accent: #818cf8; --accent-soft: #1e1b4b; --on-accent: #09090b;
  --opus: #a78bfa; --sonnet: #38bdf8; --haiku: #34d399;
  --danger: #f87171; --success: #4ade80;
}
```
No raw hex values outside this file. Max content width 1120px; 16px base; spacing on a 4px scale.

### 2.7 Project structure
```
src/
  app/            routes above, layout.tsx, not-found.tsx, error.tsx, robots.ts
  actions/        steps.ts, projects.ts   (Server Actions)
  components/     AppShell, PageHeader, StatTile, ModelStatsTable, CostBars, ModelBadge,
                  StepRow, PastePanel, ParsedPreview, UndoToast, ThemeToggle, ui/*
  db/             schema.ts, client.ts, queries.ts
  lib/            parse-notes.ts, pricing.ts, stats.ts, format.ts, fingerprint.ts
  styles/         tokens.css
drizzle/          SQL migrations
scripts/          seed.ts, calibrate-pricing.ts
docs/             PLAN.md, seed-data/*.txt
tests/            unit/*.test.ts, e2e/smoke.spec.ts, e2e/paste.spec.ts
```

### 2.8 Build (one model, one go)
Built in one session by **Sonnet 5.5 High** (owner's choice). Order, committing and pushing after each item:

- [x] 1. (Done 2026-10-14, except the Neon `test` branch: tests still use local Postgres.) Connect GitHub (repo URL from me), Neon (`production` + `test` branch, `! neon login`), Vercel (`! vercel login`, link, env vars)
- [x] 2. Scaffold Next.js + Tailwind + shadcn + Drizzle + Vitest + Playwright, with npm scripts `typecheck`, `lint`, `build`, `test`, `test:e2e`, `db:generate`, `db:migrate:test`, `db:migrate`, `db:seed`, `calibrate`
- [x] 3. Schema + first migration (local `test` and local dev DB; Neon `production` still waits for my approval)
- [x] 4. `parse-notes.ts` with unit tests covering **every line of both seed files** (21 steps, phases, "Phase 0", multi-model step, missing cost, one-line titles with commas and "…", durations, lowercase effort)
- [x] 5. `pricing.ts` + `calibrate-pricing.ts` (Haiku cache-read price checked against Anthropic's pricing page), `stats.ts`, `format.ts`, with unit tests
- [x] 6. Server Actions (add steps with duplicate skipping, edit, reorder, soft delete, restore, projects) + seed script; seeded on `test` (and `production` with my OK)
- [x] 7. Tokens, AppShell, PageHeader, theme toggle, fonts, favicon, 404/error, `noindex` + `robots.txt`
- [x] 8. Home page `/`
- [x] 9. Project page `/p/[slug]` incl. stats per model and cost bars
- [x] 10. Paste panel, edit step, project settings, new project, undo / recently deleted
- [x] 11. Playwright: smoke (home + project page read the DB) and paste flow (paste the DEUS notes into an empty project → 7 steps; re-paste → 0 added, 7 "already added"); screenshots at 390 and 1280, light and dark, checked by eye
- [ ] 12. Deploy check: live URL loads (done 2026-10-14), Vercel spend limit set, Neon usage limit set
- **Done when:** the live site shows both projects with correct totals and per-model stats matching a hand check of the seed files, and I can add a new step from my phone by pasting one line.

### 2.9 Running the live app
- **Backups:** Neon's restore window on my plan (point-in-time restore of `production`), plus soft deletes.
- **Errors:** Vercel logs / observability; I look when something breaks.
- **Spending:** Vercel spend management on; Neon usage limits.
- **Rollback:** Vercel instant rollback; migrations stay backward compatible for one release.
- **Search engines:** `noindex` + `robots.txt` disallow all.
- **Public editing risk:** anyone with the link can edit. Accepted; undo + Neon restore cover mistakes. If it ever becomes a problem, add a single password (small change, noted here so it isn't forgotten).

### 2.10 Things I need to do myself
| When | Action |
|---|---|
| Before build step 1 | Create an empty GitHub repo and send the URL; create the Neon project and the Vercel project (or let Claude create Vercel) |
| Build step 1 | `! neon login`, `! vercel login`; paste the Neon connection strings into `.env.local` |
| Build steps 3 / 6 | Approve the production migration and the production seed |
| End | Try pasting a new step from my phone |

---

## Decisions so far
- 2026-10-14: Light playbook. One plan document, no design directions, one model builds everything in one session. Default stack kept (Next.js, Neon, GitHub, Vercel).
- 2026-10-14 (v0.2): No login; the whole site is public, read and write, `noindex`. Soft deletes with undo instead.
- 2026-10-14 (v0.2): Data enters by pasting notes in my existing format, any amount at once; steps already in the project are skipped.
- 2026-10-14 (v0.2): Missing costs are estimated from Anthropic prices, calibrated on my recorded costs, always labelled "est.".
- 2026-10-14 (v0.2): Stats per model (and model + effort) on every project and across all projects.
- 2026-10-14 (v0.2): Build model is Sonnet 5.5 High (owner's choice).
- 2026-10-14 (v0.3): Build locally first; GitHub, Neon and Vercel are linked afterwards (checklist item 1 postponed). Until then Postgres 17 runs locally (Homebrew `postgresql@17`, databases `ai_build_log` for dev and `ai_build_log_test` for tests, connection strings in `.env.local` / `.env.test`). `src/db/client.ts` picks the driver from the URL: `*.neon.tech` uses the Neon serverless driver, anything else uses `pg`, so nothing changes when Neon is linked.
- 2026-10-14 (v0.3): "Already added" detection compares against every step in the project including soft-deleted ones, so re-pasting my whole running notes doesn't bring back a step I deleted (restore it from "Recently deleted" instead). Steps with identical title and numbers within one paste count once.
- 2026-10-14 (v0.3): Costs are stored with 4 decimals (`numeric(12,4)`); more decimals in a paste are rounded. Writes are validated by Zod on the server (`src/lib/schemas.ts`): paste ≤ 100,000 characters, title ≤ 300, notes ≤ 2,000, ≤ 10 model lines per step.
- 2026-10-14 (v0.3): GitHub and Neon linked (checklist item 1, partly). `.env.local` now points at Neon `production`; tests stay on the local `ai_build_log_test` database until a Neon `test` branch exists. Vercel not linked yet.
- 2026-10-14 (v0.3): e2e tests run their own server on port 3187 (not 3100: other projects on this machine use it) against the test database, and start from a reset + seeded test DB (`tests/e2e/global-setup.ts`). Unit tests and e2e both empty the test DB, so run them one after the other, never together.
- 2026-10-14 (v0.3): "Already added" also matches a step's original pasted text (`source_text`), not only its stored fingerprint, so a step edited after adding is still recognised when the whole running notes are re-pasted. A model line may hold several `claude-…:` models (each followed by its own numbers). One step that breaks a field limit is skipped with a warning and never blocks the rest of a paste. New project creates the project and its steps in one transaction. Preview edits are kept per step (by its original fingerprint) while more text is pasted.
- 2026-10-14 (v0.3): Known gaps from the end-of-build review, not fixed yet: simultaneous pastes from two tabs can insert duplicates (no row lock); moving a step across a phase boundary splits the phase heading; a usage with an unknown model and no cost is left out of totals without a marker; token kinds missing from a model line are stored as 0 (conflicts with "missing shows —"); `1.2.3k`, `3m 56.4s` and `350ms` are misread without a warning; non-UUID ids in a hand-made request give a 500; `formatTokens(999_950)` shows "1000.0k"; the project page reads the whole `step_usages` table.
- 2026-10-14 (v0.3): Live on Vercel. The Vercel project's Framework Preset had to be set to Next.js by hand (it was imported while the repo was empty). The database client connects on first query, so builds don't need `DATABASE_URL`. The team is on Hobby, whose 100 deployments/day are shared by all my projects; a push can come back "rate limited" and needs a redeploy later.
- 2026-10-14 (v0.3): The scaffold's `cacheComponents` / `partialPrefetching` flags are off: pages read the database on every request (dynamic), which is what this app wants. Radix primitives (`radix-ui`) are used directly with our tokens instead of the shadcn CLI, to avoid the default shadcn look.

## Project details
| | |
|---|---|
| App name | AI Build Log |
| Folder | `~/projects/projects-steps-documentation` |
| GitHub repo | https://github.com/gregorykurnia/projects-steps-documentation |
| Neon project ID | (not known yet; endpoint `ep-silent-queen-b3yeost6`, region `ap-southeast-1`, database `neondb`) |
| Vercel project | `projects-steps-documentation` (team `gregorykurnia-8729s-projects`, Hobby) |
| Live URL | https://projects-steps-documentation.vercel.app |
