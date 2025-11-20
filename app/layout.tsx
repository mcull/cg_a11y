import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Creative Growth A11y Report',
  description: 'Automated accessibility findings for creativegrowth.org'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">Skip to content</a>
        <header className="site-header">
          <h1>Creative Growth Accessibility Report</h1>
          <nav aria-label="Primary">
            <a href="/">Overview</a>
          </nav>
        </header>
        <main id="main" className="container">
          {children}
        </main>
      </body>
    </html>
  );
}

