# Creative Growth Accessibility Report

An end-to-end accessibility reporting project for https://creativegrowth.org. This repo contains:

- A Next.js website to host an accessible, filterable report of issues per page.
- A local scanning pipeline (script) that crawls the site and runs automated accessibility audits (axe-core via Playwright), producing structured results.
- An optional Supabase backend for storing scans over time; initial milestone works from local JSON so we can iterate quickly without infra.

## Goals

- Provide a clear, navigable report of accessibility warnings and errors for every page on creativegrowth.org.
- Group findings by page and by rule with links to WCAG criteria and remediation guidance.
- Make the output easy to share (hosted report site) and easy to regenerate (single CLI script).
- Keep the system simple to run locally, with an optional path to persistence (Supabase) for historical tracking.

## Scope

- Crawl only first-party pages under `creativegrowth.org` (no external domains). Respect `robots.txt` and add a polite crawl rate.
- Run automated checks using `axe-core` in a modern Chromium runtime (via Playwright). Capture metadata, URLs, HTTP status, and timestamps.
- Present the results in a Next.js site with:
  - Overview: coverage, counts by severity/rule, filters.
  - Per-page detail: list of issues with locations, selectors, and guidance.
  - Per-rule view: which pages are affected and suggested fixes.

Out of scope for the first milestone:

- Manual/assistive tech testing (screen reader walkthroughs). We may add notes later.
- Visual diffing or screenshots (we can add targeted screenshots if useful).
- Full historical trend charts (enabled later if we adopt Supabase persistence).

## High-Level Approach

1. Scanner script (Node/TypeScript):
   - Crawl site to discover internal pages (seed: home page; BFS with dedupe and sensible limits).
   - For each page, use Playwright to render, inject `axe-core`, and collect violations/incomplete/passes.
   - Normalize results to a stable schema (`Scan`, `Page`, `Issue`), write JSON artifacts to `data/scans/<timestamp>/`.
   - Optionally push results to Supabase for history and multi-run comparisons.

2. Report website (Next.js):
   - Read from local JSON (default) or fetch from Supabase (when configured via env vars).
   - Build an overview page, page-detail views, and rule-detail views with filtering and deep links.
   - Deploy to Vercel or any static-friendly host. ISR/SSG for fast loads.

## Why these tools?

- Playwright: reliable headless browsing, good page control, fast parallelism.
- axe-core: industry-standard automated a11y rules with WCAG mapping and actionable guidance.
- Crawlee (optional): robust crawling primitives; we may start with a simple custom crawler and graduate to Crawlee if needed.
- Supabase (optional): easy Postgres + API + auth if/when we want persistence and trend reporting.
- Next.js: ergonomic SSG/ISR for a fast, shareable report site.

## Deliverables (Milestone 1)

- `ARCHITECTURE.md` documenting the components, data model, and pipeline.
- A generator script that crawls and scans, outputting JSON to `data/scans/<timestamp>/`.
- A Next.js site that reads that JSON and renders the report pages.

## Usage

Developer setup:

1. Install Node 18+.
2. Install deps: `npm ci` (or `npm install` initially).
3. Lint and types: `npm run lint` and `npm run typecheck`.

Planned next commands (after M1 scaffolding):

- Run a scan: `npm run scan -- --base https://creativegrowth.org`
- Start report site: `npm run dev`
- Build and serve: `npm run build && npm start`

Optional Supabase:

- Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `.env.local`.
- Enable `REPORT_DATA_SOURCE=supabase`.

## Data Outputs (first pass)

- `data/scans/<timestamp>/summary.json`: site-level stats and index of pages.
- `data/scans/<timestamp>/pages/<slugified-path>.json`: page-level findings with issues.
- `data/scans/<timestamp>/rules/index.json`: optional denormalized index by rule.

## Methodology and Caveats

- Automated testing cannot catch all accessibility issues; it complements—but does not replace—manual testing with assistive tech.
- We will document crawl exclusions (e.g., logout/admin if any), treat 4xx/5xx pages explicitly, and cap concurrency to avoid load.
- Dynamic content behind interactions may be partially uncovered; we can add scripted interactions later where valuable.

## Roadmap

- M1: JSON-based pipeline + hosted report
- M2: Supabase persistence + trends over time
- M3: Targeted scripted interactions and screenshots
- M4: Editor notes for manual findings and ownership assignment

## Contributing

- Keep changes focused. Update docs when behavior or commands change.
- Prefer TypeScript. Keep components accessible (keyboard/screen reader friendly) in the report UI itself.
