# AI Build Log

A small website documenting my AI projects step by step: models used, tokens, cost and time per step. Read `docs/PLAN.md` before doing any work: it is the product plan, the look and feel, and the technical implementation in one file, and its build checklist (§2.8) shows where things stand.

## Non-negotiables
- Follow `docs/PLAN.md`. Don't add features beyond it without asking; ideas go to me first. When the code needs something the plan doesn't answer, update the plan first.
- All styling uses the tokens in `src/styles/tokens.css` (from `docs/PLAN.md` §2.6). No raw hex values in components. No default shadcn look.
- Missing values (cost, durations) show as "—" / "not recorded", never as 0.
- Tests run against the Neon `test` branch, never `production`.
- Secrets live in `.env.local` / `.env.test` (gitignored). Never print, commit or copy connection strings or passwords into docs.

## Commit and push after every change (always automatic)
Commit and push to `main` after every change, without asking first, and say what changed in the final message. This includes edits to this file and to the plan. Pushes to `main` deploy to production (once Vercel is connected). Until `origin` exists, commit locally; the first push sends every commit. Every change goes through these steps before the turn ends:

1. Once the app is scaffolded, run `npm run typecheck`, `npm run lint`, `npm run build` and `npm test`. Run `npx playwright test tests/e2e/smoke.spec.ts` too when the change touches pages or the database. If a check fails because of the change, fix it first. Never commit or push a change that breaks a check. A failure from the environment in a flow the change doesn't touch (a dropped connection, a timeout) is not a blocker: name it in the commit message and the report.
2. Check `git status`. Stage only the files you changed, with `git add <paths>`. Never stage `.env*`, `screenshots/`, `.vercel/`, `node_modules/` or `test-results/`.
3. Commit to `main` with a message saying what changed and why, ending with the `Co-Authored-By` line for the model that did the work.
4. Check `git log origin/main..main`, then push with `git push origin main`.
5. Tell me what changed: the files, what each change does, the commit hash, and the Vercel deployment status.

- Stop and ask before pushing a change that needs a production migration or a production seed. Run `npm run db:migrate` (production) only when I approve, and hold the push until it has run. Migrations go to `test` first (`npm run db:migrate:test`).
- Never force-push and never rewrite published history.
