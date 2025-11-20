#!/usr/bin/env node
/**
 * Create milestones, labels, and issues from github_plan.json
 *
 * Env:
 * - GITHUB_TOKEN: GitHub PAT with repo scope
 * - GITHUB_REPO:  owner/repo
 *
 * Usage:
 *   node scripts/create_github_items.js
 */

const fs = require('fs');

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPO; // e.g., "owner/repo"

if (!token || !repo) {
  console.error('Missing env: GITHUB_TOKEN and GITHUB_REPO (owner/repo) are required');
  process.exit(1);
}

const [owner, name] = repo.split('/');
if (!owner || !name) {
  console.error('GITHUB_REPO must be in the form owner/repo');
  process.exit(1);
}

const API = 'https://api.github.com';

async function gh(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

async function listAll(path) {
  let page = 1; const out = [];
  // Paginate up to a reasonable limit
  while (page < 10) {
    const data = await gh(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(data) || data.length === 0) break;
    out.push(...data);
    page++;
  }
  return out;
}

async function ensureLabels(desired) {
  const existing = await listAll(`/repos/${owner}/${name}/labels`);
  const existingNames = new Set(existing.map(l => l.name));
  for (const lbl of desired) {
    if (!existingNames.has(lbl.name)) {
      await gh(`/repos/${owner}/${name}/labels`, {
        method: 'POST',
        body: JSON.stringify({ name: lbl.name, color: lbl.color || 'ededed', description: lbl.description || '' })
      });
      console.log(`Created label: ${lbl.name}`);
    }
  }
}

async function ensureMilestones(milestones) {
  const existing = await listAll(`/repos/${owner}/${name}/milestones?state=all`);
  const map = new Map(existing.map(m => [m.title, m]));
  const result = new Map();
  for (const m of milestones) {
    if (map.has(m.title)) {
      result.set(m.title, map.get(m.title));
      continue;
    }
    const created = await gh(`/repos/${owner}/${name}/milestones`, {
      method: 'POST',
      body: JSON.stringify({ title: m.title, description: m.description || '' })
    });
    console.log(`Created milestone: ${m.title}`);
    result.set(m.title, created);
  }
  return result; // title -> milestone object (with number)
}

async function ensureIssues(plan, milestoneMap) {
  const existing = await listAll(`/repos/${owner}/${name}/issues?state=all`);
  const existingTitles = new Set(existing.map(i => i.title));
  for (const m of plan.milestones) {
    const milestone = milestoneMap.get(m.title);
    for (const issue of m.issues) {
      if (existingTitles.has(issue.title)) {
        console.log(`Skip existing issue: ${issue.title}`);
        continue;
      }
      await gh(`/repos/${owner}/${name}/issues`, {
        method: 'POST',
        body: JSON.stringify({
          title: issue.title,
          body: issue.body || '',
          labels: issue.labels || [],
          milestone: milestone.number,
          assignees: issue.assignees || []
        })
      });
      console.log(`Created issue: ${issue.title}`);
    }
  }
}

async function main() {
  const plan = JSON.parse(fs.readFileSync('github_plan.json', 'utf8'));
  await ensureLabels(plan.labels || []);
  const milestoneMap = await ensureMilestones(plan.milestones || []);
  await ensureIssues(plan, milestoneMap);
  console.log('Done.');
}

main().catch(err => { console.error(err.message || err); process.exit(1); });

