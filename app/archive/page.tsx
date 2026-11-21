'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useHearthAway } from '@/lib/context';
import { db } from '@/lib/firebase';
import type { Student } from '@/lib/types';

type ArchivedStudent = Student & { archivedAt: string; archivedBy: string };

export default function ArchivePage() {
  const { leadOperationsRole } = useHearthAway();
  if (leadOperationsRole !== 'management') {
    return <section className="ha-page-header"><h1 className="ha-title">Data archive</h1><p className="ha-summary">Management access is required.</p></section>;
  }
  return <ArchivedLeads />;
}

function ArchivedLeads() {
  const [rows, setRows] = useState<ArchivedStudent[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  useEffect(() => onSnapshot(query(collection(db, 'archivedStudents'), orderBy('archivedAt', 'desc')), (snapshot) => {
    setRows(snapshot.docs.map((row) => row.data() as ArchivedStudent));
    setError('');
  }, () => {
    setRows(null);
    setError('The archive could not be loaded.');
  }), []);
  const term = search.trim().toLowerCase();
  const visible = rows?.filter((lead) => [lead.fullName, lead.studentId, lead.email, lead.phone, lead.partnerName, lead.archivalReason]
    .some((value) => value?.toLowerCase().includes(term)));

  return (
    <section className="ha-workspace">
      <header className="ha-page-header">
        <h1 className="ha-title">Data archive</h1>
        <p className="ha-summary">Inactive leads and their archival reasons.</p>
      </header>
      <label className="mt-5 block max-w-md text-sm font-medium">Search archived leads
        <input type="search" className="mt-1 w-full rounded-lg border border-ha-line bg-white px-3 py-2" value={search} onChange={(event) => setSearch(event.target.value)} />
      </label>
      {error ? <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p> :
        !visible ? <p role="status" className="mt-4 text-sm">Loading archive…</p> :
        visible.length === 0 ? <p className="mt-4 text-sm text-ha-secondary">No archived leads match this search.</p> :
        <ul className="mt-4 space-y-2">
          {visible.map((lead) => (
            <li key={lead.id} className="rounded-lg border border-ha-line bg-white p-3">
              <details>
                <summary className="cursor-pointer font-semibold">{lead.fullName} <span className="ml-2 text-xs font-normal text-ha-secondary">{lead.studentId} · Inactive</span></summary>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 [&_dt]:font-semibold [&_dd]:break-words">
                  <div><dt>Email</dt><dd>{lead.email}</dd></div>
                  <div><dt>Phone</dt><dd>{lead.phone}</dd></div>
                  <div><dt>Source partner</dt><dd>{lead.partnerName || lead.partnerId}</dd></div>
                  <div><dt>Intake</dt><dd>{lead.intake}</dd></div>
                  <div><dt>Archived</dt><dd>{new Date(lead.archivedAt).toLocaleDateString()}</dd></div>
                  <div><dt>Archived by</dt><dd>{lead.archivedBy}</dd></div>
                  <div className="sm:col-span-2"><dt>Reason</dt><dd className="whitespace-pre-wrap">{lead.archivalReason}</dd></div>
                  <div className="sm:col-span-2"><dt>Lead notes</dt><dd className="whitespace-pre-wrap">{lead.notes || '—'}</dd></div>
                </dl>
              </details>
            </li>
          ))}
        </ul>}
    </section>
  );
}
