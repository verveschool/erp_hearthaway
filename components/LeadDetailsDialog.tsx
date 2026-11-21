'use client';

import { useState, useRef, type FormEvent } from 'react';
import { WorkspaceDialog } from './WorkspaceDialog';
import { leadDetailsSchema, leadEditSchema, type LeadDetails } from '@/lib/lead-details';
import { SupportedCurrencies, type Partner, type Student } from '@/lib/types';

const coreFields = [
  ['fullName', 'Full name', 'text'], ['email', 'Email', 'email'], ['phone', 'Phone', 'tel'],
  ['university', 'University', 'text'], ['destinationCity', 'Destination city', 'text'],
  ['destinationCountry', 'Destination country', 'text'], ['intake', 'Intake or season', 'text'],
  ['moveInDate', 'Move-in date', 'text'], ['budget', 'Weekly budget', 'number'],
] as const;

const extraFields = [
  ['whatsApp', 'WhatsApp', 'tel'], ['course', 'Course', 'text'], ['nationality', 'Nationality', 'text'],
  ['currentCountry', 'Current country', 'text'], ['moveOutDate', 'Move-out date', 'text'],
  ['preferredRoom', 'Preferred room', 'text'], ['accommodationPreference', 'Accommodation preferences', 'text'],
  ['occupants', 'Occupants', 'number'], ['passportStatus', 'Passport status', 'text'],
  ['nextFollowUpAt', 'Next follow-up', 'text'], ['leadSource', 'Lead source', 'text'],
] as const;

const fieldStyle = 'mt-1 w-full rounded-lg border border-ha-line px-3 py-2 text-sm';

export function LeadDetailsDialog({ title, lead, partners, onClose, onSave }: {
  title: string;
  lead?: Student;
  partners?: Partner[];
  onClose: () => void;
  onSave: (details: LeadDetails, partnerId?: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const running = useRef(false);
  const [error, setError] = useState('');
  const dismiss = () => { if (!running.current) onClose(); };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current) return;
    const data = new FormData(event.currentTarget);
    const read = (name: string) => String(data.get(name) ?? '').trim();
    const fields = Object.fromEntries([...coreFields, ...extraFields].map(([key]) => [key, read(key)]));
    const result = (lead ? leadEditSchema : leadDetailsSchema).safeParse({
      ...fields, email: read('email').toLowerCase(), notes: read('notes'), currency: read('currency'),
      budget: read('budget') ? Number(read('budget')) : undefined,
      occupants: read('occupants') ? Number(read('occupants')) : undefined,
    });
    if (!result.success || (!lead && result.data.budget === undefined)) {
      setError('Enter a name, valid email and phone, university, destination, intake, move-in date and budget.');
      return;
    }
    running.current = true;
    setSaving(true);
    setError('');
    try {
      await onSave({ ...result.data, budget: result.data.budget ?? lead?.budget ?? 0 }, read('partnerId') || undefined);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the lead.');
    } finally {
      running.current = false;
      setSaving(false);
    }
  }

  return (
    <WorkspaceDialog label={title} onDismiss={dismiss}>
      <form onSubmit={submit} className="w-full max-w-2xl space-y-4 p-5 sm:p-6" aria-busy={saving}>
        <h2 className="text-lg font-semibold">{title}</h2>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <fieldset disabled={saving} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {coreFields.map(([name, label, type]) => (
              <label key={name} className="text-sm font-medium">
                {label}
                <input className={fieldStyle} name={name} type={lead && name === 'email' ? 'text' : type} defaultValue={lead?.[name] ?? ''}
                  required={!lead || name === 'fullName'} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined}
                  placeholder={name === 'intake' ? 'e.g. September 2027' : name === 'moveInDate' ? 'YYYY-MM-DD' : undefined} />
              </label>
            ))}
            <label className="text-sm font-medium">Budget currency
              <select name="currency" defaultValue={lead?.currency?.toUpperCase() || 'GBP'} className={fieldStyle}>
                {SupportedCurrencies.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            {partners && (
              <label className="text-sm font-medium">Sourcing partner
                <select name="partnerId" className={fieldStyle} defaultValue="direct">
                  <option value="direct">Direct lead</option>
                  {partners.map((partner) => <option key={partner.id} value={partner.partnerId}>{partner.companyName}</option>)}
                </select>
              </label>
            )}
          </div>
          <label className="block text-sm font-medium">Notes
            <textarea className={fieldStyle} name="notes" rows={3} defaultValue={lead?.notes || ''} />
          </label>
          <details open={!!lead} className="rounded-lg border border-ha-line p-3">
            <summary className="cursor-pointer text-sm font-semibold">Additional lead details</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {extraFields.map(([name, label, type]) => (
                <label key={name} className="text-sm font-medium">{label}
                  <input className={fieldStyle} name={name} type={type} min={type === 'number' ? 1 : undefined} defaultValue={lead?.[name] ?? ''} />
                </label>
              ))}
            </div>
          </details>
        </fieldset>
        <div className="flex justify-end gap-3">
          <button type="button" className="px-3 py-2 text-sm" onClick={dismiss} disabled={saving}>Cancel</button>
          <button className="ha-primary-action disabled:opacity-50" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save lead'}</button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
