import type { ReactNode } from 'react';

export function WorkspaceMetric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ha-metric">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
