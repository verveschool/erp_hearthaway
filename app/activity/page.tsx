'use client';

import { useMemo, useState } from 'react';
import { useHearthAway } from '@/lib/context';
import { WorkspaceSearch } from '@/components/WorkspaceSearch';

export default function ActivityPage() {
  const { internalRole, activities, activityError } = useHearthAway();
  const [search, setSearch] = useState('');
  const events = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activities
      .filter(event => [event.activityType, event.studentId, event.performedBy?.name, internalRole === 'admin' ? event.description : ''].some(value => value?.toLowerCase().includes(query)))
      .slice().sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }, [activities, internalRole, search]);
  return <section className="ha-workspace workspace-compact space-y-4">
    <div className="ha-page-header"><h1 className="ha-title">Activity</h1><p className="text-sm text-ha-secondary">Recent workspace activity</p></div>
    <div className="workspace-toolbar flex flex-wrap items-center justify-between gap-3">
      <WorkspaceSearch label="Search activity" placeholder="Search activity, record or person" value={search} onChange={setSearch} />
      <span role="status" className="text-sm text-ha-secondary">{events.length} {events.length === 1 ? 'event' : 'events'}</span>
    </div>
    {activityError && <p role="alert" className="text-sm text-rose-700">Activity could not be loaded. Please try again or contact an administrator.</p>}
    <div className="overflow-hidden rounded-xl border border-ha-line bg-white">
      <div className="hidden md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-ha-line bg-ha-canvas px-4 py-2.5 text-xs font-semibold text-ha-secondary"><span>Activity</span><span>Record</span><span>By</span><span>When</span></div>
      {events.map(event => <div key={event.id} className="grid grid-cols-1 gap-1 border-b border-ha-line px-4 py-3 last:border-0 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] md:gap-4">
        <div className="min-w-0"><p className="font-medium text-ha-ink">{event.activityType}</p>{internalRole === 'admin' && event.description && <p className="break-words text-xs text-ha-secondary">{event.description}</p>}</div>
        <span className="break-words text-sm text-ha-secondary">{event.studentId || '—'}</span><span className="text-sm text-ha-secondary">{event.performedBy?.name || 'Unknown'}</span><time className="text-sm text-ha-secondary" dateTime={event.timestamp}>{event.timestamp && !Number.isNaN(Date.parse(event.timestamp)) ? new Date(event.timestamp).toLocaleString('en-GB') : '—'}</time>
      </div>)}
      {!activityError && events.length === 0 && <p className="px-5 py-10 text-center text-sm text-ha-secondary">{search ? 'No activity matches this search.' : 'No activity to display yet.'}</p>}
    </div>
  </section>;
}
