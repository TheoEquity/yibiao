'use client';

import { ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  summaryExtra?: ReactNode;
}

export function CollapsibleSection({ title, children, defaultOpen = false, summaryExtra }: CollapsibleSectionProps) {
  return (
    <details className="collapsible-section" open={defaultOpen}>
      <summary className="collapsible-summary">
        <span>{title}</span>
        {summaryExtra ? <span className="collapsible-summary-extra">{summaryExtra}</span> : null}
      </summary>
      <div className="collapsible-content">{children}</div>
    </details>
  );
}
