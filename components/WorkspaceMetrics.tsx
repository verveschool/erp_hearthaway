'use client';

import { ChartNoAxesColumn } from 'lucide-react';
import { useId, useState, type ReactNode, type Ref } from 'react';

export function MetricsToggle({ controls, expanded, onClick, label = 'Metrics', buttonRef }: {
  controls: string;
  expanded: boolean;
  onClick: () => void;
  label?: string;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <button ref={buttonRef} type="button" className="workspace-metrics-toggle"
      aria-label={label} title={label} aria-expanded={expanded} aria-controls={controls} onClick={onClick}>
      <ChartNoAxesColumn size={19} aria-hidden="true" />
    </button>
  );
}

export function WorkspaceMetrics({ children, heading, label, controls }: {
  children: ReactNode;
  heading: ReactNode;
  label: string;
  controls?: ReactNode;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="workspace-metrics-heading">
        {heading}
        <MetricsToggle controls={id} expanded={expanded} onClick={() => setExpanded(open => !open)} />
      </div>
      <div id={id} className="workspace-metrics-panel" data-open={expanded}>
        {controls}
        <dl aria-label={label} className="ha-metrics workspace-metrics">
          {children}
        </dl>
      </div>
    </>
  );
}
