'use client';

import { useState } from 'react';
import { WorkspaceDialog } from './WorkspaceDialog';
import type { Partner } from '@/lib/types';

export function PartnerOwnerDialog({ partner, options, onClose, onSave }: {
  partner: Partner;
  options: { uid: string; displayName: string }[];
  onClose: () => void;
  onSave: (partnerId: string, ownerId: string, ownerName: string) => Promise<void>;
}) {
  const [ownerId, setOwnerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  function close() { if (!saving) onClose(); }

  return (
    <WorkspaceDialog label="Reassign portfolio owner" onDismiss={close}>
      <form className="w-full max-w-md space-y-4 p-6" aria-busy={saving} onSubmit={async (event) => {
        event.preventDefault();
        const owner = options.find((candidate) => candidate.uid === ownerId);
        if (!owner || saving) return;
        setSaving(true);
        setError('');
        try {
          await onSave(partner.partnerId, owner.uid, owner.displayName);
          onClose();
        } catch {
          setError('Could not reassign this partner. Confirm your access and try again.');
        } finally {
          setSaving(false);
        }
      }}>
        <h2 className="text-lg font-semibold">Reassign {partner.companyName}</h2>
        <p className="text-sm text-ha-secondary">The partner and its sourced leads will move to the new portfolio. Lead and Sales Owner assignments stay attached.</p>
        <label className="block text-sm font-medium">New portfolio owner
          <select className="mt-1 w-full rounded-lg border border-ha-line px-3 py-2" required
            value={ownerId} disabled={saving} onChange={(event) => setOwnerId(event.target.value)}>
            <option value="">Choose a portfolio owner</option>
            {options.filter(({ uid }) => uid !== partner.portfolioOwnerId).map(({ uid, displayName }) => (
              <option key={uid} value={uid}>{displayName}</option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" className="ha-secondary-action" onClick={close} disabled={saving}>Cancel</button>
          <button className="ha-primary-action disabled:opacity-50" type="submit" disabled={!ownerId || saving}>
            {saving ? 'Saving…' : 'Confirm reassignment'}
          </button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
