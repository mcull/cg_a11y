import Link from 'next/link';
import { loadPageBySlug } from '../../../lib/data';

export default function PageDetail({ params }: { params: { slug: string } }) {
  const page = loadPageBySlug(params.slug);
  if (!page) return <div>Page data not found.</div>;
  return (
    <div>
      <p><Link href="/">← Back</Link></p>
      <h2>{page.title || page.url}</h2>
      <p>
        URL: <a href={page.url}>{page.url}</a> · Status: {page.status} · Violations: {page.metrics.violations}
      </p>
      {page.issues.length === 0 ? (
        <p>No violations found.</p>
      ) : (
        <table>
          <caption>Issues</caption>
          <thead>
            <tr>
              <th>Rule</th>
              <th>Impact</th>
              <th>Help</th>
              <th>Examples</th>
            </tr>
          </thead>
          <tbody>
            {page.issues.map((i) => (
              <tr key={i.id}>
                <td><code>{i.id}</code></td>
                <td className={`impact-${i.impact || 'minor'}`}>{i.impact || 'n/a'}</td>
                <td>
                  <a href={i.helpUrl} target="_blank" rel="noreferrer">{i.help}</a>
                </td>
                <td>
                  <ul>
                    {i.nodes.slice(0, 3).map((n, idx) => (
                      <li key={idx}>
                        <code>{n.target.join(' ')}</code>
                      </li>
                    ))}
                    {i.nodes.length > 3 ? <li>…and {i.nodes.length - 3} more</li> : null}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

