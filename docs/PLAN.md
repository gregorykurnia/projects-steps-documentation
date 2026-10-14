# AI Build Log: Plan

**Status:** Draft v0.1 (2026-10-14). Light version of the new-app playbook: one plan instead of separate product, design and implementation documents, no design directions, and the whole build done in one go by one model.

---

## Part 1: Product

### 1.1 What it is
A small, professional-looking website that documents my AI projects. Each **project** (for example "Wedding Plan Redesign") is a list of **steps** in order. For each step it shows which model(s) ran it, the tokens (input, output, cache read, cache write), the cost, and the time taken when I have it. Each project and the whole site show totals.

**Basic principles**
- **Readers:** anyone with the link can read (public, read-only). Kept out of search engines (`noindex`).
- **Editor:** only me, behind one admin password.
- **How data gets in:** I paste the usage text exactly as I write it today (the `/cost`-style lines) and the app parses it. I can correct any parsed field before saving. The existing Wedding Plan Redesign notes are seeded on day one.

### 1.2 Jobs

| Job | How often | Notes |
|---|---|---|
| Add a step to a project (paste usage text) | Several times a week | The most frequent job, so it must be the fastest |
| Look at a project: steps, costs, where the money went | Weekly | The main reading screen |
| Compare projects: total cost, tokens, time | Occasionally | The home page |
| Create a project | Rare | |
| Edit, reorder or delete a step | Rare | |

### 1.3 Features

**Projects overview (`/`)**
- A card per project: name, one-line description, status (In progress / Done), number of steps, total cost, total tokens, last updated.
- A totals strip at the top: all projects' cost, tokens and steps.
- Empty state (no projects yet): a short line and, when signed in, a "New project" button.

**Project page (`/p/[slug]`)**
- Header: name, description, status, date range.
- Summary tiles: total cost, total output tokens, total cache read, total API time / wall time (only when any step has durations), number of steps.
- **Cost by step:** a simple horizontal bar per step (sorted in step order), so the expensive steps stand out. Steps with no cost recorded are shown as "no cost recorded", not as zero.
- **Cost by model:** a small breakdown (for example Opus 5.5 High vs Sonnet 5.5 High vs Haiku), with share of cost.
- **Steps**, grouped by **phase** (for example "Planning & design" and "Implementation"), each step as a row/card:
  - Step number and title
  - One line per model used: model badge + effort, input, output, cache read, cache write, cost
  - API duration and wall duration if recorded
  - Optional notes (plain text, short)
- Missing values show as "—", never as 0.

**Admin (`/admin`)**, password protected:
- **Add step** (the fast path): pick project (defaults to the last one used), title, phase (defaults to the last used phase in that project), then one big **"Paste usage"** box. The parsed result appears live underneath as an editable table (model, effort, tokens, cost, durations). Save. Then the form clears and keeps the project and phase, ready for the next step. 3 steps: open, paste + title, save.
- Edit and delete a step (delete confirmed), move a step up/down.
- New / edit project: name, slug (auto), description, status.
- Delete a project only when it has no steps, otherwise blocked with a reason.

### 1.4 The paste parser (what it must understand)
From my existing notes:
```
Claude-opus-5-5 Medium:  29.8k input, 78.4k output, 4.7m cache read, 536.3k cache write ($5.68)
claude-haiku-5-5:  1.4k input, 141.3k output, 5.2m cache read, 231.7k cache write ($0.72)
Claude-opus-5-5 High:  606 input, 3.6k output, 100.1k cache read, 37.6k cache write
... ($0.4368). Total duration (API):  19m 52s. Total duration (wall): 2h 14m 22s
```
- One usage line per model; a step can have several (see "Inventory Notes").
- Model name is case-insensitive; effort (Low/Medium/High/xHigh/Max) is optional.
- Numbers: plain, `k` (×1,000) and `m` (×1,000,000), stored as whole tokens.
- Cost in `($x.xx)` is optional (missing → "not recorded").
- Durations `Total duration (API)` and `Total duration (wall)` are optional, formats like `3m 56s`, `2h 14m 22s`, `45s`.
- Anything it can't read is shown as a warning, and the fields stay editable. It never silently drops text.

### 1.5 Look and feel (no design directions, decided here)
- **Personality:** calm, precise, editorial-meets-dashboard. Think Linear / Vercel docs: lots of white space, crisp numbers, one accent colour.
- **Type:** Inter for text, JetBrains Mono (tabular numbers) for every token count, cost and duration.
- **Colour:** neutral greys (zinc), one accent (indigo) for links and the bars; model badges use three muted hues (Opus = violet, Sonnet = sky, Haiku = emerald). Light and dark mode (follows the system, with a toggle).
- **Density:** medium. Steps are compact rows on desktop and stacked cards on phone.
- **Voice:** plain and brief. Numbers formatted like the notes: `29.8k`, `4.7M`, `$5.68`, `2h 14m`.
- **Identity:** wordmark "AI Build Log" in Inter semibold; favicon a small indigo square with a mono "›_" mark. Page titles: `<Project> · AI Build Log`.

### 1.6 Out of scope (for now)
Multiple users or roles, comments, file uploads, automatic import from the Claude Code session files, charts beyond the simple bars, estimating cost from pricing when it wasn't recorded (see Open questions).

### 1.7 Open questions (each with a default)

| Question | Default if unanswered |
|---|---|
| Should steps without a recorded cost get an *estimated* cost from model pricing? | No. Show "not recorded"; can be added later |
| Public read-only, or everything behind the password? | Public read-only, `noindex` |
| Custom domain? | No, use the `*.vercel.app` URL |

---

## Part 2: Technical implementation

### 2.1 Stack (default playbook stack, trimmed)

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript, current Node.js LTS | Default stack |
| Database | Neon Postgres: `production` branch for real data, `test` branch for tests | Default stack; lets me add steps from the browser |
| Data access | Drizzle ORM + Neon serverless driver, drizzle-kit SQL migrations in the repo | Default stack |
| Writes | Server Actions + Zod (same validation on the server) | Default stack |
| Styling | Tailwind CSS + a few shadcn/ui components (Button, Input, Textarea, Select, Dialog, Badge), restyled to the tokens below | Default stack, kept small |
| Fonts / icons | `next/font` (Inter, JetBrains Mono), `lucide-react` | Default stack |
| Auth | Single `ADMIN_PASSWORD` env var → signed, httpOnly session cookie (`jose`, HS256 with `SESSION_SECRET`), checked in `proxy.ts` for `/admin/*` and in every Server Action | One editor, no need for an auth service |
| Tests | Vitest (parser + formatters, DB tests on `test`) + Playwright (one smoke spec, one add-step spec) | Default stack, minimal set |
| Hosting | GitHub `main` → Vercel, every push deploys to production | Default stack |

Versions pinned to the latest stable at setup, checked against the installed packages' docs (Next.js changes between versions, e.g. `proxy.ts` vs `middleware.ts`).

### 2.2 Environments and secrets

| Environment | Neon branch | Env vars in |
|---|---|---|
| Local dev | `production` | `.env.local` |
| Tests | `test` | `.env.test` |
| Vercel Preview | `test` | Vercel → Preview |
| Vercel Production | `production` | Vercel → Production |

Variables: `DATABASE_URL` (direct, migrations), `DATABASE_URL_POOLED` (app), `ADMIN_PASSWORD`, `SESSION_SECRET`. `.env.example` lists names only. Never printed or committed. Migrations run on `test` first (`npm run db:migrate:test`), production (`npm run db:migrate`) only with my approval.

### 2.3 Data

```
projects
  id            uuid pk default gen_random_uuid()
  slug          text unique not null
  name          text not null
  description   text
  status        text not null default 'in_progress'   -- 'in_progress' | 'done'
  created_at    timestamptz not null default now()
  updated_at    timestamptz not null default now()

steps
  id               uuid pk
  project_id       uuid not null references projects(id) on delete restrict
  position         integer not null                -- order within the project
  phase            text not null default 'Planning & design'
  title            text not null
  notes            text
  api_duration_s   integer                          -- null = not recorded
  wall_duration_s  integer
  created_at, updated_at timestamptz
  unique (project_id, position)  -- deferrable, so reorders can swap
  index (project_id, position)

step_usages               -- one row per model line in a step
  id             uuid pk
  step_id        uuid not null references steps(id) on delete cascade
  position       integer not null
  model          text not null      -- normalised, e.g. 'claude-opus-5-5'
  effort         text               -- 'low'|'medium'|'high'|'xhigh'|'max'|null
  input_tokens   bigint not null default 0
  output_tokens  bigint not null default 0
  cache_read     bigint not null default 0
  cache_write    bigint not null default 0
  cost_cents     numeric(12,4)      -- null = not recorded (keeps $0.4368 exact)
  index (step_id)
```
- Totals are computed in SQL (sum per project / per model); a project's total cost is shown with a "+ N steps without cost" note when any are null.
- Deleting a project with steps is blocked (`restrict`) with a plain message.
- **Seed:** `scripts/seed.ts` loads the Wedding Plan Redesign notes (all 14 steps; phases "Planning & design" for the first 11 and "Implementation" for the last 3) by running them through the real parser, so the parser is tested on real data. Runs on `test` for tests; on `production` once, with my OK.

### 2.4 Pages and routes

| Route | Purpose |
|---|---|
| `/` | Projects overview + all-time totals |
| `/p/[slug]` | Project page (summary tiles, cost by step, cost by model, steps by phase) |
| `/admin/login` | Password form |
| `/admin` | Add step (fast path), list of projects with edit links |
| `/admin/projects/new`, `/admin/projects/[id]` | Create / edit project, list its steps with edit, reorder, delete |
| `/admin/steps/[id]` | Edit a step (same form as add) |
| `not-found`, `error` | Styled 404 and error pages |

Reading pages are Server Components that query Neon directly; they revalidate on every write (`revalidatePath` in the Server Actions).

### 2.5 Key pieces
- **`src/lib/parse-usage.ts`**: pure function `parseUsage(text) → { usages[], apiDurationS?, wallDurationS?, warnings[] }`. Regex per usage line: `^(?<model>[a-z0-9.\-]+)(?:\s+(?<effort>low|medium|high|xhigh|max))?:\s*(?<rest>.+)$` (case-insensitive), then each `<num><k|m>? <field>` pair inside `rest`, cost from `\(\$([\d.]+)\)`, durations from `Total duration \((API|wall)\):\s*([\dhms ]+)`. Handles the "Title: model ...: numbers" one-line form used in the Implementation notes by splitting on the first model name. Heavily unit-tested with every line from the notes.
- **`src/lib/format.ts`**: `formatTokens` (29.8k, 4.7M), `formatCost` ($5.68, "—"), `formatDuration` (2h 14m). Tabular mono everywhere.
- **Add-step form** (client component): textarea → `parseUsage` on change → editable usage table → Server Action re-parses/validates with Zod and saves step + usages in one transaction. Remembers last project and phase in `localStorage`.
- **Cost bars**: plain divs with widths as a % of the max step cost. No chart library.
- **Theme**: CSS variables in `src/styles/tokens.css` (light + dark), Tailwind theme mapped to them, toggle stored in a cookie to avoid a flash.

### 2.6 Design tokens (starting point, copied into `src/styles/tokens.css`)
```css
:root {
  --bg: #fafafa; --surface: #ffffff; --border: #e4e4e7;
  --text: #18181b; --text-muted: #71717a;
  --accent: #4f46e5; --accent-soft: #eef2ff; --on-accent: #ffffff;
  --opus: #7c3aed; --sonnet: #0284c7; --haiku: #059669;
  --danger: #dc2626;
  --radius: 10px;
}
.dark {
  --bg: #09090b; --surface: #18181b; --border: #27272a;
  --text: #fafafa; --text-muted: #a1a1aa;
  --accent: #818cf8; --accent-soft: #1e1b4b; --on-accent: #09090b;
  --opus: #a78bfa; --sonnet: #38bdf8; --haiku: #34d399;
  --danger: #f87171;
}
```
No raw hex values outside this file. Max content width 1080px; 16px base; spacing on a 4px scale.

### 2.7 Project structure
```
src/
  app/            (routes above, layout.tsx, not-found.tsx, error.tsx)
  components/     AppShell, PageHeader, StatTile, CostBars, ModelBadge, StepRow, UsageTable, ui/*
  db/             schema.ts, client.ts, queries.ts
  lib/            parse-usage.ts, format.ts, auth.ts
  styles/         tokens.css
  proxy.ts
drizzle/          SQL migrations
scripts/          seed.ts, seed-data/wedding-plan-redesign.txt
tests/            unit/*.test.ts, e2e/smoke.spec.ts, e2e/add-step.spec.ts
```

### 2.8 Build (one model, one go)
Per my choice, the whole build is done in one session by one model: **Opus 5.5 High** (it's mostly visual work that has to look professional, and the global model table ranks Opus 5.5 High best for presentation; the rest is small). Order, committing and pushing after each item:

- [ ] 1. Connect GitHub (repo URL from me), Neon (`production` + `test` branch, `! neon login`), Vercel (`! vercel login`, link, env vars)
- [ ] 2. Scaffold Next.js + Tailwind + shadcn + Drizzle + Vitest + Playwright, npm scripts: `typecheck`, `lint`, `build`, `test`, `test:e2e`, `db:generate`, `db:migrate:test`, `db:migrate`, `db:seed`
- [ ] 3. Schema + first migration (`test`, then `production` with my approval)
- [ ] 4. `parse-usage.ts` + `format.ts` with unit tests on every line of the Wedding notes
- [ ] 5. Seed script, seeded on `test` (and `production` with my OK)
- [ ] 6. Tokens, AppShell, PageHeader, theme toggle, fonts, favicon, 404/error, `noindex` + `robots.txt`
- [ ] 7. Projects overview `/`
- [ ] 8. Project page `/p/[slug]`
- [ ] 9. Admin auth (`proxy.ts`, login, session cookie)
- [ ] 10. Add step with live paste parsing; edit / reorder / delete step; create / edit project
- [ ] 11. Playwright: smoke (home + project page load and read the DB) and add-step flow; screenshots at 390 and 1280, light and dark, checked by eye
- [ ] 12. Deploy check: live URL loads, Vercel spend limit set, Neon usage limit set
- **Done when:** the live site shows Wedding Plan Redesign with all 14 steps and correct totals, and I can add a new step by pasting usage text on my phone.

### 2.9 Running the live app
- **Backups:** Neon's restore window on my plan (point-in-time restore of `production`).
- **Errors:** Vercel logs / observability; I look when something breaks.
- **Spending:** Vercel spend management on; Neon free/Launch plan usage limits.
- **Rollback:** Vercel instant rollback; migrations stay backward compatible for one release.
- **Search engines:** `noindex` + `robots.txt` disallow all.

### 2.10 Things I need to do myself
| When | Action |
|---|---|
| Before build step 1 | Create an empty GitHub repo and send the URL |
| Build step 1 | `! neon login`, `! vercel login`; pick the admin password and put it in `.env.local` myself |
| Build step 3 / 5 | Approve the production migration and the production seed |
| End | Try adding a step from my phone |

---

## Decisions so far
- 2026-10-14: Light playbook. One plan document, no design directions, one model (Opus 5.5 High) builds everything in one session. Default stack kept (Next.js, Neon, GitHub, Vercel).
- 2026-10-14: Data enters by pasting usage text into an admin form; public read-only site, `noindex`.

## Project details
| | |
|---|---|
| App name | AI Build Log |
| Folder | `~/projects/projects-steps-documentation` |
| GitHub repo | (pending) |
| Neon project ID | (pending) |
| Vercel project | (pending) |
| Live URL | (pending) |
