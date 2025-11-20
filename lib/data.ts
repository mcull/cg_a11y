import fs from 'node:fs';
import path from 'node:path';

export type PageIssueNode = {
  html: string;
  target: string[];
  failureSummary?: string;
};

export type PageIssue = {
  kind?: 'violation' | 'incomplete';
  id: string; // axe rule id
  impact?: 'minor' | 'moderate' | 'serious' | 'critical';
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: PageIssueNode[];
};

export type PageData = {
  url: string;
  status: number;
  title?: string;
  timestamp: string;
  metrics: { violations: number; incomplete: number; passes: number };
  issues: PageIssue[];
};

export type SummaryPage = {
  url: string;
  status: number;
  slug: string;
  violationCount: number;
};

export type Summary = {
  scanId: string;
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  totals: { pages: number; violations: number; incomplete: number };
  pages: SummaryPage[];
};

export function getLatestScanDir(base = path.join(process.cwd(), 'data', 'scans')): string | null {
  if (!fs.existsSync(base)) return null;
  const dirs = fs
    .readdirSync(base)
    .filter((d) => fs.statSync(path.join(base, d)).isDirectory())
    .sort();
  return dirs.at(-1) ? path.join(base, dirs.at(-1) as string) : null;
}

export function loadSummary(scanDir?: string): Summary | null {
  const dir = scanDir ?? getLatestScanDir();
  if (!dir) return null;
  const p = path.join(dir, 'summary.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as Summary;
}

export function loadPageBySlug(slug: string, scanDir?: string): PageData | null {
  const dir = scanDir ?? getLatestScanDir();
  if (!dir) return null;
  const p = path.join(dir, 'pages', `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as PageData;
}

export function listRuleIds(scanDir?: string): string[] {
  const dir = scanDir ?? getLatestScanDir();
  if (!dir) return [];
  const p = path.join(dir, 'rules', 'index.json');
  if (!fs.existsSync(p)) return [];
  const data = JSON.parse(fs.readFileSync(p, 'utf-8')) as Record<string, unknown>;
  return Object.keys(data);
}
