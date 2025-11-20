#!/usr/bin/env ts-node
import fs from 'node:fs';
import path from 'node:path';
import { chromium, Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import pLimit from 'p-limit';
import slugify from 'slugify';

type ScanSummary = {
  scanId: string;
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  totals: { pages: number; violations: number; incomplete: number };
  pages: { url: string; status: number; slug: string; violationCount: number }[];
};

type PageRecord = {
  url: string;
  status: number;
  title?: string;
  timestamp: string;
  metrics: { violations: number; incomplete: number; passes: number };
  issues: any[]; // includes both violations and (optionally) incomplete
};

//

function slugFromUrl(u: URL): string {
  const pathname = u.pathname === '/' ? 'index' : u.pathname.replace(/\/$/, '');
  const raw = pathname.replace(/[^a-zA-Z0-9/_-]/g, '-').replace(/^\/+/, '').replace(/\/+/, '/');
  return slugify(raw, { lower: true, strict: true });
}

//

async function scanPage(
  page: Page,
  url: string,
  opts: {
    tags: string[];
    rules: string[];
    disableRules: string[];
    includeIncomplete: boolean;
  }
) {
  const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  const status = res?.status() ?? 0;
  const title = await page.title();
  let builder = new AxeBuilder({ page });
  if (opts.tags.length) builder = builder.withTags(opts.tags);
  if (opts.rules.length) builder = builder.withRules(opts.rules);
  if (opts.disableRules.length) builder = builder.disableRules(opts.disableRules);
  builder = builder.options({ resultTypes: opts.includeIncomplete ? ['violations', 'incomplete'] : ['violations'] } as any);
  const results = await builder.analyze();
  return { status, title, results };
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('base', { type: 'string', demandOption: true, desc: 'Base URL to crawl (or a specific page)' })
    .option('max-pages', { type: 'number', default: 50, desc: 'Max pages to crawl' })
    .option('concurrency', { type: 'number', default: 2, desc: 'Concurrent page processing' })
    .option('output', { type: 'string', default: path.join('data', 'scans'), desc: 'Output directory' })
    .option('tags', { type: 'string', desc: 'Comma-separated axe tags (e.g., wcag2a,wcag2aa,best-practice)' })
    .option('rules', { type: 'string', desc: 'Comma-separated axe rule IDs to include' })
    .option('disable-rules', { type: 'string', desc: 'Comma-separated axe rule IDs to disable' })
    .option('best-practices', { type: 'boolean', default: false, desc: 'Include axe best-practice rules' })
    .option('include-incomplete', { type: 'boolean', default: true, desc: 'Include incomplete results (needs review)' })
    .option('headful', { type: 'boolean', default: false, desc: 'Run headed browser (debug)' })
    .strict()
    .parse();

  const baseUrl = new URL(argv.base);
  const startedAt = new Date();
  const scanId = startedAt.toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(argv.output, scanId);
  const pagesDir = path.join(outDir, 'pages');
  fs.mkdirSync(pagesDir, { recursive: true });

  const browser = await chromium.launch({ headless: !argv.headful });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 920 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();

  const visited = new Set<string>();
  const queue: string[] = [baseUrl.toString()];
  const pageSummaries: ScanSummary['pages'] = [];

  const limit = pLimit(argv.concurrency);

  async function processOne(target: string) {
    if (visited.size >= argv['max-pages']) return;
    if (visited.has(target)) return;
    visited.add(target);
    const u = new URL(target);
    const slug = slugFromUrl(u);
    try {
      const tags = argv.tags
        ? argv.tags.split(',').map((s) => s.trim()).filter(Boolean)
        : ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', ...(argv['best-practices'] ? ['best-practice'] : [])];
      const rules = argv.rules ? argv.rules.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const disableRules = argv['disable-rules'] ? argv['disable-rules'].split(',').map((s) => s.trim()).filter(Boolean) : [];
      const { status, title, results } = await scanPage(page, target, {
        tags,
        rules,
        disableRules,
        includeIncomplete: !!argv['include-incomplete'],
      });
      const pageRec: PageRecord = {
        url: target,
        status,
        title,
        timestamp: new Date().toISOString(),
        metrics: {
          violations: results.violations.length,
          incomplete: results.incomplete.length,
          passes: results.passes.length,
        },
        issues: [
          ...results.violations.map((v: any) => ({
            kind: 'violation',
            id: v.id,
            impact: v.impact,
            help: v.help,
            helpUrl: v.helpUrl,
            tags: v.tags,
            nodes: v.nodes.map((n: any) => ({ html: n.html, target: n.target, failureSummary: n.failureSummary })),
          })),
          ...(argv['include-incomplete']
            ? results.incomplete.map((v: any) => ({
                kind: 'incomplete',
                id: v.id,
                impact: v.impact,
                help: v.help,
                helpUrl: v.helpUrl,
                tags: v.tags,
                nodes: v.nodes.map((n: any) => ({ html: n.html, target: n.target, failureSummary: n.failureSummary })),
              }))
            : []),
        ],
      };
      fs.writeFileSync(path.join(pagesDir, `${slug}.json`), JSON.stringify(pageRec, null, 2));
      pageSummaries.push({ url: target, status, slug, violationCount: pageRec.metrics.violations });

  // Discover links from DOM after load
  const hrefs: string[] = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map((a) => (a as HTMLAnchorElement).href)
  );
  const links = Array.from(new Set(
    hrefs
      .map((h) => {
        try {
          const u = new URL(h);
          u.hash = '';
          return u.toString();
        } catch { return null; }
      })
      .filter((x): x is string => !!x)
      .filter((h) => h.startsWith(baseUrl.origin))
  ));
      for (const l of links) {
        if (visited.size + queue.length >= argv['max-pages']) break;
        if (!visited.has(l) && !queue.includes(l)) queue.push(l);
      }
    } catch (err) {
      console.error('Error processing', target, err);
    }
  }

  while (queue.length > 0 && visited.size < argv['max-pages']) {
    const batch = queue.splice(0, argv.concurrency);
    await Promise.all(batch.map((t) => limit(() => processOne(t))));
  }

  const totals = {
    pages: pageSummaries.length,
    violations: pageSummaries.reduce((a, p) => a + p.violationCount, 0),
    // We don’t aggregate incomplete in summary without reading each page file; leave 0 for now.
    incomplete: 0,
  };
  const finishedAt = new Date();
  const summary: ScanSummary = {
    scanId,
    baseUrl: baseUrl.toString(),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    totals,
    pages: pageSummaries.sort((a, b) => a.slug.localeCompare(b.slug)),
  };
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));

  await browser.close();
  console.log('Wrote scan to', outDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
