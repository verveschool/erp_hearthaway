'use client';

import { useRef, useState } from 'react';
import { WorkspaceDialog } from './WorkspaceDialog';

export function ConfirmActionDialog({ title, description, action, onConfirm, onClose }: {
  title: string;
  description: string;
  action: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function dismiss() { if (!inFlight.current) onClose(); }
  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError('');
    try { await onConfirm(); onClose(); }
    catch { setError('This change could not be saved. Nothing was confirmed. Try again.'); }
    finally { inFlight.current = false; setSaving(false); }
  }
  return <WorkspaceDialog label={title} onDismiss={dismiss}>
    <div className="w-full max-w-md space-y-4 p-5 sm:p-6" aria-busy={saving}>
      <h2 className="text-lg font-semibold break-words">{title}</h2>
      <p className="text-sm text-ha-secondary leading-relaxed">{description}</p>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" autoFocus disabled={saving} className="ha-secondary-action" onClick={dismiss}>Cancel</button>
        <button type="button" disabled={saving} onClick={confirm} className="ha-primary-action ha-destructive-action disabled:opacity-50">{saving ? 'Saving…' : action}</button>
      </div>
    </div>
  </WorkspaceDialog>;
}
