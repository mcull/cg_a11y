# Architecture

This document outlines the system design for the Creative Growth accessibility scanning pipeline and the hosted report website.

## System Overview

- Scanner (CLI): Discovers pages, renders them in Playwright, runs axe-core, and outputs normalized JSON (optionally upserts to Supabase).
- Data Layer: Local JSON files for the first milestone; optional Postgres (Supabase) schema for history/trends.
- Report Website (Next.js): Reads data to render an overview, per-page detail, and per-rule views with filtering and deep links.

## Core Technologies

- Next.js 14 (App Router) + TypeScript for the report site.
- Playwright for headless browser automation.
- axe-core (via @axe-core/playwright) for a11y rules and WCAG mapping.
- Optional Crawlee for robust crawling; initial milestone may use a simple BFS crawler.
- Optional Supabase (Postgres) for persistence and historical comparisons.

## Data Model

Baseline JSON schema (file-backed storage):

```json
// data/scans/<timestamp>/summary.json
{
  "scanId": "2025-01-15T12-00-00Z",
  "baseUrl": "https://creativegrowth.org",
  "startedAt": "2025-01-15T12:00:00.000Z",
  "finishedAt": "2025-01-15T12:23:45.000Z",
  "totals": { "pages": 128, "violations": 412, "incomplete": 53 },
  "pages": [
    { "url": "https://creativegrowth.org/", "status": 200, "slug": "index", "violationCount": 7 }
  ]
}
```

```json
// data/scans/<timestamp>/pages/<slug>.json
{
  "url": "https://creativegrowth.org/programs",
  "status": 200,
  "title": "Programs — Creative Growth",
  "timestamp": "2025-01-15T12:05:02.000Z",
  "metrics": { "violations": 10, "incomplete": 3, "passes": 142 },
  "issues": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "help": "Elements must have sufficient color contrast",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.9/color-contrast",
      "tags": ["wcag2aa", "wcag143"],
      "nodes": [
        {
          "html": "<a class=\"btn\">Learn more</a>",
          "target": [".btn"],
          "failureSummary": "Element has insufficient color contrast of 2.8:1",
          "any": [],
          "all": [],
          "none": []
        }
      ]
    }
  ]
}
```

Optional Supabase schema (Postgres):

- `scans(id uuid pk, base_url text, started_at timestamptz, finished_at timestamptz)`
- `pages(id uuid pk, scan_id uuid fk, url text, status int, title text, slug text)`
- `issues(id uuid pk, page_id uuid fk, rule_id text, impact text, help text, help_url text, tags text[])`
- `issue_nodes(id uuid pk, issue_id uuid fk, html text, target text[], failure_summary text)`

Notes:

- For M1 we do not need DB constraints beyond simple FKs; JSONB fields are acceptable for tags and raw node payloads.
- If performance is a concern, we can denormalize counts into `pages` for faster filtering.

## Scanner Pipeline

Steps:

1. Seed: `https://creativegrowth.org/`.
2. Discover links: Extract same-origin anchors, normalize paths, drop hashes, dedupe, and honor allow/deny lists.
3. Rate limiting: Concurrency 2–4, delay 300–800ms jitter; obey `robots.txt`.
4. Render with Playwright: Set desktop viewport, wait for network idle or DOMContentLoaded with max timeout.
5. Inject and run axe-core: Collect `violations`, `incomplete`, and `passes`. Capture page title and status code.
6. Normalize: Convert axe payloads to our `Issue` shape; slugify paths for file names.
7. Persist: Write JSON artifacts under `data/scans/<timestamp>/` and a `summary.json` index. Optionally upsert to Supabase.

Resilience:

- Track fetch/render errors with structured error records per URL.
- Skip large query param variants unless whitelisted (to avoid near-duplicates).
- Provide includes/excludes via CLI flags and a config file `scanner.config.json`.

Interactivity Coverage (later):

- Optional scripted steps (e.g., open menus, tabs, modals) to surface additional issues.
- Consent banners: auto-accept simple consent when safe to proceed.

## Report Website

Structure (Next.js App Router):

- `/` Overview: scan selector, coverage, top problematic rules, filters by impact, tag, rule.
- `/pages/[slug]` Page detail: list issues with node targets, code excerpts, WCAG references.
- `/rules/[ruleId]` Rule view: affected pages, examples, remediation tips.

Data access modes:

- Local mode (default): Read JSON from `data/scans/<timestamp>/` at build time. Use ISR to refresh when new scans are added.
- Supabase mode: Fetch via RPC or REST with RLS disabled for read-only public access token, or server-side via key.

UX and A11y for the Report Itself:

- Semantic HTML, keyboard navigation, focus outlines, skip links.
- Table views with proper headers and captions; visible filter controls; persistent deep links.

## Configuration

- CLI flags: `--base`, `--include`, `--exclude`, `--concurrency`, `--max-pages`, `--timeout`, `--output`.
- Environment: `REPORT_DATA_SOURCE=local|supabase`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- File: `scanner.config.json` merges with CLI flags.

## Performance and Scaling

- Parallelize scans within a safe concurrency window.
- Cache visited URLs; avoid recrawling in the same run.
- Consider per-domain throttling if future multi-domain scans are added.

## Deployment

- Host the report on Vercel. Local JSON can be committed to the repo for simple hosting, or fetched from Supabase at runtime.
- Protect admin routes if we add scan management; public report is read-only.

## Testing Strategy

- Unit: URL normalization, slugification, and JSON schema validation.
- Integration: Dry-run scan against a small fixture site.
- E2E (lightweight): Load the built report and verify core filters and routes render with a sample dataset.

## Milestones

- M1 (Now):
  - Implement crawler + axe scan script writing JSON.
  - Scaffold Next.js site reading local JSON with overview and per-page detail.
  - Deploy initial read-only report.

- M2 (Optional):
  - Add Supabase persistence and trend views.
  - Add rule-level pages and exports (CSV/JSON).

- M3 (Optional):
  - Add scripted interactions and selected screenshots.
  - Add annotations/ownership and issue status tracking.

