'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock, Download, ListFilter, User } from 'lucide-react';
import type { Activity } from '@/lib/types';
import { exportToCSV } from '@/lib/export-csv';
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [type, setType] = useState('');
  const [actorRole, setActorRole] = useState('');
  const [sort, setSort] = useState('newest');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const leaveGuard = useRef<(() => boolean) | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const registerLeaveGuard = useCallback((guard: (() => boolean) | null) => { leaveGuard.current = guard; }, []);
  const types = useMemo(() => Array.from(new Set(activities.map(event => event.activityType))).filter(Boolean).sort(), [activities]);
  const roles = useMemo(() => Array.from(new Set(activities.flatMap(event =>
    event.performedBy?.role ? [event.performedBy.role] : []
  ))).sort(), [activities]);
  const metrics = useMemo(() => ({
    total: activities.length,
    owners: activities.filter(event => /reassigned|owner/i.test(event.activityType)).length,
    updates: activities.filter(event => /stage|status|lead/i.test(event.activityType)).length,
    payments: activities.filter(event => /payment/i.test(event.activityType)).length,
  }), [activities]);
  const hasFilters = Boolean(search.trim() || type || actorRole || from || to || sort !== 'newest');
  const entries = useMemo(() => {
    const query = search.trim().toLowerCase();
    const start = from ? new Date(`${from}T00:00:00`) : null;
    const end = to ? new Date(`${to}T00:00:00`) : null;
    if (end) end.setDate(end.getDate() + 1);
    return activities.filter(event => (!type || event.activityType === type) && (!actorRole || event.performedBy?.role === actorRole) && (!query || [event.activityType, event.studentId, event.performedBy?.name, internalRole === 'admin' ? event.description : ''].some(value => value?.toLowerCase().includes(query))))
      .map(event => ({ event, date: activityDate(event.timestamp) }))
      .filter(({ date }) => (!start || (date && date >= start)) && (!end || (date && date < end)))
      .sort((a, b) => {
        if (!a.date || !b.date) return Number(Boolean(b.date)) - Number(Boolean(a.date));
        const difference = b.date.getTime() - a.date.getTime();
        return sort === 'oldest' ? -difference : difference;
      });
  }, [activities, internalRole, search, type, actorRole, sort, from, to]);

  const isAdmin = internalRole === 'admin';
  const studentsById = useMemo(() => new Map(students.map(student => [student.studentId, student])), [students]);
  function exportActivity() {
    exportToCSV<Activity>('hearthaway-activity', [
      { header: 'Event ID', accessor: event => event.id },
      { header: 'Timestamp', accessor: event => event.timestamp },
      { header: 'Action category', accessor: event => event.activityType },
      { header: 'Performed by', accessor: event => event.performedBy?.name },
      { header: 'Actor role', accessor: event => event.performedBy?.role },
      { header: 'Target entity', accessor: event => event.studentId },
      ...(!isAdmin ? [] : [
        { header: 'Audit description', accessor: (event: Activity) => event.description },
        { header: 'Previous value', accessor: (event: Activity) => event.oldValue },
        { header: 'New value', accessor: (event: Activity) => event.newValue },
      ]),
    ], entries.map(({ event }) => event));
  }
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
  return <section className="ha-workspace workspace-compact activity-workspace space-y-4">
    <div className="ha-page-header">
      <h1 className="ha-title">Activity</h1>
      <dl className="ha-metrics workspace-metrics mt-2">
        <WorkspaceMetric label="Total audit entries">{metrics.total}</WorkspaceMetric>
        <WorkspaceMetric label="Owner reassignments">{metrics.owners}</WorkspaceMetric>
        <WorkspaceMetric label="Lead and status updates">{metrics.updates}</WorkspaceMetric>
        <WorkspaceMetric label="Payment activity">{metrics.payments}</WorkspaceMetric>
      </dl>
    </div>
    <div className="workspace-toolbar">
      <div className="workspace-filter-bar">
        <WorkspaceSearch label="Search activity" placeholder="Search activity, record or person" value={search} onChange={setSearch} />
        <button type="button" className="workspace-icon-button" title="Activity filters" aria-label="Activity filters"
          aria-controls="activity-filters" aria-expanded={filtersOpen} data-active={Boolean(type || actorRole || from || to || sort !== 'newest')}
          onClick={() => setFiltersOpen(!filtersOpen)}><ListFilter size={20} aria-hidden="true" /></button>
        <button type="button" className="workspace-icon-button" aria-label="Export activity CSV" title="Export activity CSV"
          onClick={exportActivity} disabled={entries.length === 0}><Download size={20} aria-hidden="true" /></button>
      </div>
      <div id="activity-filters" hidden={!filtersOpen}>
        <div className="workspace-filter-bar">
        <select aria-label="Filter by activity type" value={type} onChange={event => setType(event.target.value)}
          className="min-w-0 max-w-full rounded-lg border border-ha-line bg-white px-2.5 text-xs font-medium">
          <option value="">All activity types</option>
          {types.map(value => <option key={value} value={value}>{value}</option>)}
        </select>
        <select aria-label="Filter by actor role" value={actorRole} onChange={event => setActorRole(event.target.value)}
          className="min-w-0 max-w-full rounded-lg border border-ha-line bg-white px-2.5 text-xs font-medium">
          <option value="">All actor roles</option>
          {roles.map(role => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}
        </select>
        <select aria-label="Sort activity" value={sort} onChange={event => setSort(event.target.value)}
          className="min-w-0 max-w-full rounded-lg border border-ha-line bg-white px-2.5 text-xs font-medium">
          <option value="newest">Most recent first</option>
          <option value="oldest">Oldest first</option>
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
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-ha-line pt-2 text-xs text-ha-secondary">
        <span role="status">Showing {entries.length} of {metrics.total} events</span>
        {hasFilters && <button type="button" className="ha-text-action" onClick={() => {
          setSearch('');
          setType('');
          setActorRole('');
          setSort('newest');
          setFrom('');
          setTo('');
        }}>Clear filters</button>}
      </div>
    </div>
    {activityError && <p role="alert" className="text-sm text-rose-700">Activity could not be loaded. Please try again or contact an administrator.</p>}
    <SalesLeadWorkspace studentId={selectedId} userId={currentUser.uid} onClose={closeLead} registerLeaveGuard={registerLeaveGuard}>
      <div className="overflow-hidden rounded-xl border border-ha-line bg-white">
        <div className="ha-table-scroll">
          <table className="ha-table responsive-records activity-table" role="table">
            <thead>
              <tr>
                <th scope="col">Timestamp and event ID</th>
                <th scope="col">Action category</th>
                <th scope="col">Performed by</th>
                <th scope="col">Target entity</th>
                {isAdmin && <><th scope="col">Audit description</th><th scope="col">State transition</th></>}
              </tr>
            </thead>
            <tbody>
              {entries.map(({ event, date }) => {
                const lead = studentsById.get(event.studentId);
                const tone = /reassign|owner/i.test(event.activityType) ? 'owner'
                  : /payment/i.test(event.activityType) ? 'payment'
                  : /stage|status/i.test(event.activityType) ? 'stage' : 'default';
                return <tr key={event.id}>
                  <td data-label="Timestamp and event ID">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Clock size={14} className="shrink-0 text-ha-secondary" aria-hidden="true" />
                      {date ? <time dateTime={date.toISOString()}>{event.timestamp}</time> : 'Time unavailable'}
                    </div>
                    <div className="break-words text-xs text-ha-secondary">{event.id}</div>
                  </td>
                  <td data-label="Action category"><span className="activity-badge" data-tone={tone}>{event.activityType}</span></td>
                  <td data-label="Performed by">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <User size={14} className="shrink-0 text-ha-blue" aria-hidden="true" />
                      {event.performedBy?.name || 'Unknown'}
                    </div>
                    {event.performedBy?.role && <span className="text-xs capitalize text-ha-secondary">{event.performedBy.role.replaceAll('_', ' ')}</span>}
                  </td>
                  <td data-label="Target entity">
                    {lead ? <button type="button" onClick={event => openLead(lead.studentId, event.currentTarget)}
                      className="ha-text-action break-words text-left">{lead.studentId}</button>
                      : <span className="break-words">{event.studentId || '—'}</span>}
                  </td>
                  {isAdmin && <>
                    <td data-label="Audit description" className="break-words">{event.description || '—'}</td>
                    <td data-label="State transition">
                      {event.oldValue || event.newValue ? <span className="inline-flex flex-wrap items-center gap-1.5">
                        {event.oldValue && <del className="text-ha-secondary">{event.oldValue}</del>}
                        {event.oldValue && event.newValue && <ArrowRight size={14} aria-hidden="true" />}
                        {event.newValue && <strong className="text-emerald-700">{event.newValue}</strong>}
                      </span> : <span className="text-ha-secondary">Recorded event</span>}
                    </td>
                  </>}
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        {!activityError && entries.length === 0 && <p className="px-5 py-10 text-center text-sm text-ha-secondary">{hasFilters ? 'No activity matches these filters.' : 'No activity to display yet.'}</p>}
      </div>
    </SalesLeadWorkspace>
  </section>;
}
