'use client';

import { useEffect, useRef, useState, type SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  'aria-label': string;
  onSave: (value: string) => Promise<void>;
};

export function LeadFieldSelect({ onSave, ...props }: Props) {
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [status, setStatus] = useState('');
  const [pendingValue, setPendingValue] = useState<string | null>(null);
  const pending = pendingValue !== null;
  useEffect(() => () => clearTimeout(timer.current), []);

  async function save(value: string) {
    if (busy.current) return;
    busy.current = true;
    clearTimeout(timer.current);
    setPendingValue(value);
    setStatus('Saving…');
    try {
      await onSave(value);
      clearTimeout(timer.current);
      setStatus('Saved');
      timer.current = setTimeout(() => setStatus(''), 1800);
    } catch {
      clearTimeout(timer.current);
      setStatus('Not saved. Select again.');
    } finally {
      busy.current = false;
      setPendingValue(null);
    }
  }

  return <span className="lead-field-control" data-pending={pending}>
    <select {...props} value={pendingValue ?? props.value} aria-busy={pending} aria-disabled={pending || props.disabled} onMouseDown={event => { if (pending) event.preventDefault(); }}
      onKeyDown={event => { if (pending && event.key !== 'Tab') event.preventDefault(); }}
      onChange={event => void save(event.target.value)} />
    <span role="status" className="lead-field-status" data-error={status.startsWith('Not saved')}>
      {status && <><span className="sr-only">{props['aria-label']}. </span>{status}</>}
    </span>
  </span>;
}
