# Milestones and Issues

This plan outlines GitHub milestones and the issues required to complete each. Use the included script (see Scripts section) to create these programmatically when ready.

## Milestone M0 — Project Setup

- Goal: Establish repo tooling, conventions, and baseline docs.
- Exit criteria:
  - Project bootstrapped with package manager, TypeScript, lint/format.
  - Basic CI and PR hygiene in place.
  - Clear contribution and run instructions.
- Issues:
  1. Repo tooling: initialize Node, TypeScript, ESLint, Prettier
     - Accept: `pnpm` configured or `npm` alternative, scripts for `build`, `lint`, `format`.
  2. CI: add GitHub Actions for lint and type-check
     - Accept: On push/PR to main, runs lint and `tsc --noEmit`.
  3. Docs: refine README usage and add CONTRIBUTING
     - Accept: README usage updated post-scaffold; add CONTRIBUTING with commands and branch/PR flow.
  4. Issue templates and labels
     - Accept: Feature/bug/chore templates; baseline labels (a11y, scanner, web, infra, docs, good-first-issue).

## Milestone M1 — JSON Scanner + Report (Local)

- Goal: Generate JSON scan data and render a hosted report from local files.
- Exit criteria:
  - Scanner crawls `creativegrowth.org`, runs axe-core via Playwright, and writes JSON to `data/scans/<timestamp>/`.
  - Next.js site renders overview, per-page view, and basic rule view from local JSON.
  - Initial deploy (e.g., Vercel) with a captured dataset.
- Issues:
  1. Scanner: basic crawler (same-origin, dedupe, limits)
     - Accept: BFS crawl with include/exclude, `robots.txt` respect, concurrency controls.
  2. Scanner: Playwright + axe-core integration
     - Accept: For each URL, run axe, collect violations/incomplete/passes, capture title/status.
  3. Scanner: normalize schema and write JSON artifacts
     - Accept: `summary.json`, `pages/<slug>.json`, optional `rules/index.json` per README.
  4. Scanner CLI and config file support
     - Accept: Flags `--base`, `--max-pages`, `--concurrency`, `--output`; `scanner.config.json` merge.
  5. Sample scan and fixture dataset
     - Accept: Committed small dataset from a real scan under `data/scans/<timestamp>/`.
  6. Next.js app scaffold (App Router) + layout and nav
     - Accept: Accessible layout, skip link, keyboard friendly nav.
  7. Data loader (local JSON mode)
     - Accept: Utility to discover latest scan dir and read summary/pages.
  8. Overview page `/`
     - Accept: Totals, list of pages with counts, filters by impact.
  9. Page detail `/pages/[slug]`
     - Accept: Issue list with targets, WCAG links, copyable selectors.
  10. Rule view `/rules/[ruleId]` (MVP)
      - Accept: Affected pages, short guidance, link to axe docs.
  11. Deploy initial site
      - Accept: Vercel (or similar) deploy instructions; environment set for local-data mode.

## Milestone M2 — Supabase Persistence + Trends

- Goal: Store scans in Supabase and enable historical comparisons.
- Exit criteria:
  - Supabase schema provisioned and populated via ingestion script.
  - Report site can read from Supabase or local JSON via env toggle.
  - Simple trends view across scans.
- Issues:
  1. Supabase schema and migration
     - Accept: `scans`, `pages`, `issues`, `issue_nodes` tables; indices; minimal FKs.
  2. Ingestion: push JSON artifacts to Supabase
     - Accept: Script maps JSON to tables; idempotent by `scanId+url+rule`.
  3. Data access layer (Supabase mode)
     - Accept: Server-side fetchers; env toggle `REPORT_DATA_SOURCE`.
  4. Overview view: scan selector and trends
     - Accept: Select scan by time; basic trend numbers (delta violations/pages).
  5. RLS/read-only policies
     - Accept: Public read of report data; sensitive keys remain server-only.

## Milestone M3 — Interactions + Screenshots

- Goal: Expand coverage via scripted interactions and add optional screenshots.
- Exit criteria:
  - Scanner supports simple scripted steps per route.
  - Optional screenshots stored and surfaced in UI.
- Issues:
  1. Interaction scripts support
     - Accept: Configurable actions (click, type, wait) per URL pattern.
  2. Axe rerun after interactions
     - Accept: Collect separate or merged results; denote interaction phase.
  3. Screenshot capture and storage
     - Accept: Save per-issue or per-state screenshots with stable filenames.
  4. UI: show screenshots where available
     - Accept: Toggle thumbnails on issue nodes; accessible image alternatives.

## Milestone M4 — Annotations + Ownership

- Goal: Enable collaboration and tracking remediation progress.
- Exit criteria:
  - Users can annotate issues, mark status, and assign owners.
  - Export filtered issues to CSV/JSON.
- Issues:
  1. DB: annotations and status fields
     - Accept: Tables/columns for `note`, `status` (open/ignored/fixed), `owner` tag.
  2. UI: add/edit annotations
     - Accept: Simple form with optimistic updates (server action/RPC).
  3. Filters: owner/status and exports
     - Accept: Filter chips; export current view to CSV/JSON.

## Labels

- Suggested: `a11y`, `scanner`, `web`, `infra`, `docs`, `good-first-issue`, `help-wanted`, `bug`, `feature`.

## Scripts

- Optional automation is provided in `scripts/create_github_items.js` and `github_plan.json` to create milestones/issues via GitHub API.
- Requirements: `node >= 18`, `GITHUB_TOKEN` with `repo` scope, `GITHUB_REPO` as `owner/repo`.

