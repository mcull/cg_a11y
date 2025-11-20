import Link from 'next/link';
import { getLatestScanDir, loadSummary, loadPageBySlug } from '../../../lib/data';

export default function RuleView({ params }: { params: { ruleId: string } }) {
  const scanDir = getLatestScanDir();
  const summary = loadSummary(scanDir || undefined);
  if (!scanDir || !summary) return <div>No data found.</div>;
  const byPage = summary.pages
    .map((p) => ({ p, data: loadPageBySlug(p.slug, scanDir) }))
    .filter((x) => x.data)
    .map((x) => ({
      url: x.p.url,
      slug: x.p.slug,
      issues: (x.data as any).issues.filter((i: any) => i.id === params.ruleId)
    }))
    .filter((x) => x.issues.length > 0);

  return (
    <div>
      <p><Link href="/">← Back</Link></p>
      <h2>Rule: {params.ruleId}</h2>
      {byPage.length === 0 ? (
        <p>No pages affected.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Page</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            {byPage.map((r) => (
              <tr key={r.slug}>
                <td><Link href={`/pages/${r.slug}`}>{r.url}</Link></td>
                <td>{r.issues.reduce((acc: number, i: any) => acc + (i.nodes?.length || 0), 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
