'use client';

import { useState } from 'react';
import { WorkspaceDialog } from './WorkspaceDialog';
import { intakeKey } from '@/lib/lead-details';
import type { Partner, Student } from '@/lib/types';

export function PartnerLeadTargets({ partner, leads, canEdit, onSave }: {
  partner: Partner;
  leads: Student[];
  canEdit: boolean;
  onSave: (season: string, promised: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [season, setSeason] = useState('');
  const [existingTarget, setExistingTarget] = useState(false);
  const [promised, setPromised] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const targets = partner.leadTargets || [];
  const dismiss = () => { if (!saving) setOpen(false); };
  const edit = (existingSeason = '', amount = '') => {
    setSeason(existingSeason);
    setExistingTarget(!!existingSeason);
    setPromised(amount);
    setError('');
    setOpen(true);
  };

  return (
    <div className="min-w-0 text-xs">
      {targets.length === 0 && !canEdit && <span className="text-ha-secondary">No seasonal target</span>}
      {targets.length > 0 && (
        <ul className="space-y-1">
          {targets.map((target) => {
            const received = leads.filter((lead) => lead.intake && intakeKey(lead.intake) === intakeKey(target.season)).length;
            return (
              <li key={intakeKey(target.season)} className="flex items-baseline justify-between gap-3">
                {canEdit
                  ? <button type="button" className="min-w-0 break-words text-left text-ha-blue hover:underline" onClick={() => edit(target.season, String(target.promised))}>{target.season}</button>
                  : <span className="min-w-0 break-words">{target.season}</span>}
                <span className="whitespace-nowrap font-semibold tabular-nums" aria-label={`${received} received of ${target.promised} promised`}>{received} / {target.promised}</span>
              </li>
            );
          })}
        </ul>
      )}
      {canEdit && <button type="button" className="ha-text-action partner-target-action" onClick={() => edit()}>Set seasonal target</button>}
      {open && (
        <WorkspaceDialog label="Seasonal lead target" onDismiss={dismiss}>
          <form className="w-full max-w-md space-y-4 p-5" onSubmit={async (event) => {
            event.preventDefault();
            if (saving) return;
            setSaving(true);
            setError('');
            try {
              await onSave(season, Number(promised));
              setOpen(false);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : 'Could not save the target.');
            } finally {
              setSaving(false);
            }
          }}>
            <h2 className="text-lg font-semibold">Seasonal lead target</h2>
            <p className="text-sm text-ha-secondary">{partner.companyName}</p>
            {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
            <label className="block text-sm">Intake or season
              <input className="mt-1 w-full rounded-lg border border-ha-line px-3 py-2" value={season} onChange={(event) => setSeason(event.target.value)} required readOnly={existingTarget} maxLength={80} placeholder="e.g. September 2027" />
            </label>
            <label className="block text-sm">Promised leads
              <input className="mt-1 w-full rounded-lg border border-ha-line px-3 py-2" type="number" min="0" step="1" value={promised} onChange={(event) => setPromised(event.target.value)} required />
            </label>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={dismiss} disabled={saving} className="ha-secondary-action">Cancel</button>
              <button type="submit" disabled={saving} className="ha-primary-action">{saving ? 'Saving…' : 'Save target'}</button>
            </div>
          </form>
        </WorkspaceDialog>
      )}
    </div>
  );
}
