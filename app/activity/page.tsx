'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useHearthAway } from '@/lib/context';
import { WorkspaceMetric } from '@/components/WorkspaceMetric';
import { WorkspaceSearch } from '@/components/WorkspaceSearch';
import { SalesLeadWorkspace } from '@/components/SalesLeadWorkspace';

// Historic activity timestamps are formatted in en-GB, while newer records may use ISO.
function activityDate(value: string): Date | null {
  const match = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4}),? (\d{1,2}):(\d{2})$/.exec(value || '');
  const date = match ? new Date(`${match[2]} ${match[1]}, ${match[3]} ${match[4]}:${match[5]}:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function ActivityPage() {
  const { internalRole, activities, activityError, students, currentUser } = useHearthAway();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const leaveGuard = useRef<(() => boolean) | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const registerLeaveGuard = useCallback((guard: (() => boolean) | null) => { leaveGuard.current = guard; }, []);
  const types = useMemo(() => Array.from(new Set(activities.map(event => event.activityType))).filter(Boolean).sort(), [activities]);
  const metrics = useMemo(() => ({
    total: activities.length,
    owners: activities.filter(event => /reassigned|owner/i.test(event.activityType)).length,
    updates: activities.filter(event => /stage|status|lead/i.test(event.activityType)).length,
    payments: activities.filter(event => /payment/i.test(event.activityType)).length,
  }), [activities]);
  const hasFilters = Boolean(search.trim() || type || from || to);
  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const start = from ? new Date(`${from}T00:00:00`) : null;
    const end = to ? new Date(`${to}T00:00:00`) : null;
    if (end) end.setDate(end.getDate() + 1);
    const entries = activities.filter(event => (!type || event.activityType === type) && (!query || [event.activityType, event.studentId, event.performedBy?.name, internalRole === 'admin' ? event.description : ''].some(value => value?.toLowerCase().includes(query))))
      .map(event => ({ event, date: activityDate(event.timestamp) }))
      .filter(({ date }) => (!start || (date && date >= start)) && (!end || (date && date < end)))
      .sort((a, b) => (b.date?.getTime() ?? -Infinity) - (a.date?.getTime() ?? -Infinity));
    const grouped = new Map<string, typeof entries>();
    for (const entry of entries) {
      const day = entry.date ? entry.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date unavailable';
      grouped.set(day, [...(grouped.get(day) || []), entry]);
    }
    return { grouped: Array.from(grouped), count: entries.length };
  }, [activities, internalRole, search, type, from, to]);
  function openLead(id: string, element: HTMLButtonElement) {
    if (leaveGuard.current?.() === false) return;
    trigger.current = element;
    setSelectedId(id);
  }
  function closeLead() {
    setSelectedId(null);
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  }
  if (!internalRole) return null;
  return <section className="ha-workspace workspace-compact space-y-4">
    <div className="ha-page-header">
      <h1 className="ha-title">Activity</h1>
      <dl className="ha-metrics workspace-metrics mt-2">
        <WorkspaceMetric label="Total activity">{metrics.total}</WorkspaceMetric>
        <WorkspaceMetric label="Owner reassignments">{metrics.owners}</WorkspaceMetric>
        <WorkspaceMetric label="Lead and status updates">{metrics.updates}</WorkspaceMetric>
        <WorkspaceMetric label="Payment activity">{metrics.payments}</WorkspaceMetric>
      </dl>
    </div>
    <div className="workspace-toolbar">
      <div className="workspace-filter-bar">
        <WorkspaceSearch label="Search activity" placeholder="Search activity, record or person" value={search} onChange={setSearch} />
        <select aria-label="Filter by activity type" value={type} onChange={event => setType(event.target.value)}
          className="min-w-0 max-w-full rounded-lg border border-ha-line bg-white px-2.5 text-xs font-medium">
          <option value="">All activity types</option>
          {types.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1 text-xs text-ha-secondary">
            From
            <input type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)}
              className="min-w-0 rounded-lg border border-ha-line bg-white px-2 text-ha-ink" />
          </label>
          <label className="flex items-center gap-1 text-xs text-ha-secondary">
            To
            <input type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)}
              className="min-w-0 rounded-lg border border-ha-line bg-white px-2 text-ha-ink" />
          </label>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-ha-secondary">
        <span role="status">{groups.count} {groups.count === 1 ? 'event' : 'events'}</span>
        {hasFilters && <button type="button" className="ha-text-action" onClick={() => {
          setSearch('');
          setType('');
          setFrom('');
          setTo('');
        }}>Clear filters</button>}
      </div>
    </div>
    {activityError && <p role="alert" className="text-sm text-rose-700">Activity could not be loaded. Please try again or contact an administrator.</p>}
    <SalesLeadWorkspace studentId={selectedId} userId={currentUser.uid} onClose={closeLead} registerLeaveGuard={registerLeaveGuard}>
      <div className="overflow-hidden rounded-xl border border-ha-line bg-white">
        {groups.grouped.map(([day, entries]) => <div key={day}>
          <h2 className="border-b border-ha-line bg-ha-canvas px-4 py-2 text-xs font-semibold text-ha-secondary">{day}</h2>
          {entries.map(({ event, date }) => {
            const lead = students.find(student => student.studentId === event.studentId);
            return <div key={event.id} className="grid gap-1 border-b border-ha-line px-4 py-3 last:border-0 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:gap-4">
              <div className="min-w-0"><p className="font-medium text-ha-ink">{event.activityType}</p>{internalRole === 'admin' && event.description && <p className="break-words text-xs text-ha-secondary">{event.description}</p>}</div>
              {lead ? <button type="button" onClick={e => openLead(lead.studentId, e.currentTarget)} className="w-fit break-words text-left text-sm font-semibold text-ha-blue hover:underline">{lead.fullName || lead.studentId}</button> : <span className="break-words text-sm text-ha-secondary">{event.studentId || '—'}</span>}
              <span className="text-sm text-ha-secondary">{event.performedBy?.name || 'Unknown'}</span>
              {date ? <time className="text-sm text-ha-secondary" dateTime={date.toISOString()}>{date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time> : <span className="text-sm text-ha-secondary">Time unavailable</span>}
            </div>;
          })}
        </div>)}
        {!activityError && groups.count === 0 && <p className="px-5 py-10 text-center text-sm text-ha-secondary">{hasFilters ? 'No activity matches these filters.' : 'No activity to display yet.'}</p>}
      </div>
    </SalesLeadWorkspace>
  </section>;
}
