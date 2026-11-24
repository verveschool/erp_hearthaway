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
  const [pending, setPending] = useState(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function save(value: string) {
    if (busy.current) return;
    busy.current = true;
    clearTimeout(timer.current);
    setPending(true);
    setStatus('');
    timer.current = setTimeout(() => setStatus('Saving…'), 300);
    try {
      await onSave(value);
      clearTimeout(timer.current);
      setStatus('Saved');
      timer.current = setTimeout(() => setStatus(''), 1800);
    } catch {
      clearTimeout(timer.current);
      setStatus('Save failed. Retry.');
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return <span className="lead-field-control">
    <select {...props} aria-disabled={pending} onMouseDown={event => { if (pending) event.preventDefault(); }}
      onKeyDown={event => { if (pending && event.key !== 'Tab') event.preventDefault(); }}
      onChange={event => void save(event.target.value)} />
    <span role="status" className="lead-field-status">
      {status && <><span className="sr-only">{props['aria-label']}. </span>{status}</>}
    </span>
  </span>;
}
