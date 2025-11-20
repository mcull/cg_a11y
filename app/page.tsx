import Link from 'next/link';
import { loadSummary } from '../lib/data';

export default function OverviewPage() {
  const summary = loadSummary();
  if (!summary) {
    return (
      <div>
        <h2>No scan data found</h2>
        <p>Run the scanner to generate data under <code>data/scans/&lt;timestamp&gt;</code>.</p>
      </div>
    );
  }
  const { totals, pages } = summary;
  return (
    <div>
      <h2>Overview</h2>
      <p>
        Base: <code>{summary.baseUrl}</code> — Scanned {totals.pages} pages; Violations: {totals.violations};
        Incomplete: {totals.incomplete}
      </p>
      <table>
        <caption>Pages scanned</caption>
        <thead>
          <tr>
            <th>Page</th>
            <th>HTTP</th>
            <th>Violations</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.slug}>
              <td>
                <Link href={`/pages/${p.slug}`}>{p.url}</Link>
              </td>
              <td>{p.status}</td>
              <td>{p.violationCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

