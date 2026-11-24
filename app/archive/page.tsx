'use client';

import { WorkspaceSearch } from '@/components/WorkspaceSearch';
import { Archive, ChevronDown } from 'lucide-react';

import { useWorkspaceView } from '@/hooks/use-workspace-view';
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
  const { currentUser } = useHearthAway();
  const [search, setSearch] = useWorkspaceView<string>(currentUser.uid, 'search', '');
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
    .some((value) => String(value ?? '').toLowerCase().includes(term)));

  return (
    <section className="ha-workspace workspace-compact archive-workspace">
      <header className="ha-page-header">
        <h1 className="ha-title">Data archive</h1>
      </header>
      <div className="workspace-toolbar"><WorkspaceSearch label="Search archived leads" value={search} onChange={setSearch} /></div>
      {error ? <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p> :
        !visible ? <p role="status" className="mt-4 text-sm">Loading archive…</p> :
        visible.length === 0 ? <div className="ha-empty-state mt-4"><Archive size={24} aria-hidden="true" /><strong>{term ? 'No matching leads' : 'No archived leads'}</strong>{term && <p>Try another name or clear your search.</p>}{term && <button className="ha-text-action" onClick={() => setSearch('')}>Clear search</button>}</div> :
        <ul className="archive-list mt-4">
          {visible.map((lead) => (
            <li key={lead.id} className="rounded-lg border border-ha-line bg-white p-3">
              <details>
                <summary className="ha-disclosure"><span className="min-w-0 break-words font-semibold">{lead.fullName} <span className="ml-2 text-xs font-normal text-ha-secondary">{lead.studentId}</span></span><ChevronDown size={16} aria-hidden="true" className="ha-disclosure-chevron" /></summary>
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
