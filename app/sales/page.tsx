'use client';

import { LeadDetailsDialog } from '@/components/LeadDetailsDialog';
import { getLeadOwner } from '@/lib/lead-details';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useHearthAway } from '@/lib/context';
import { ArrowUpDown, Download, Plus, Search } from 'lucide-react';
import { SalesLeadWorkspace } from '@/components/SalesLeadWorkspace';
import { useIsMobile } from '@/hooks/use-mobile';
import { exportToCSV } from '@/lib/export-csv';
import type { PipelineStage } from '@/lib/types';

const PIPELINE_STAGES = [
  { key: 'New', label: 'New', hint: 'Lead enters CRM' },
  { key: 'Active', label: 'Active', hint: 'First contact made' },
  { key: 'Qualified', label: 'Qualified', hint: 'Details confirmed' },
  { key: 'Option Shared', label: 'Option shared', hint: 'Options sent' },
  { key: 'Payment', label: 'Payment', hint: 'Holding / service fee' },
  { key: 'Fulfilment', label: 'Fulfilment', hint: 'Docs and tenancy' },
  { key: 'Closed Won', label: 'Closed won', hint: 'Student moved in' },
] as const;

type PipelineFilter = PipelineStage | 'All';

const NON_QUALIFYING_ACTIVITY = /(status|stage|priority|owner reassigned|lead updated)/i;

function formatLeadDate(value?: string, includeTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', includeTime ? {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  } : {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function SalesPage() {
  const {
    students,
    partners,
    activities,
    availableUsers,
    leadOwnerOptions,
    currentUser,
    leadOperationsRole,
    reassignLeadOwner,
    assignSalesOwner,
    submitPartnerLead,
    updateStudentDecoupledStatus,
    hideTestRecords,
  } = useHearthAway();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<PipelineFilter>('All');
  const [filterLeadOwner, setFilterLeadOwner] = useState('All');
  const [filterSalesOwner, setFilterSalesOwner] = useState('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterDestination, setFilterDestination] = useState<string>('All');
  const [sortColumn, setSortColumn] = useState<'createdAt' | 'lastActivity'>('lastActivity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [ownerError, setOwnerError] = useState('');
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const leaveGuard = useRef<(() => boolean) | null>(null);
  const registerLeaveGuard = useCallback((guard: (() => boolean) | null) => { leaveGuard.current = guard; }, []);
  const selectedTrigger = useRef<HTMLButtonElement | null>(null);
  const isMobile = useIsMobile();
  const openStudentId = students.some((student) => student.studentId === selectedStudentId) ? selectedStudentId : null;

  function openStudent(id: string, trigger: HTMLButtonElement | null) {
    if (id === openStudentId || leaveGuard.current?.() === false) return;
    selectedTrigger.current = trigger;
    setSelectedStudentId(id);
  }

  function closeStudent() {
    setSelectedStudentId(null);
    requestAnimationFrame(() => selectedTrigger.current?.focus({ preventScroll: true }));
  }

  const salesUsers = useMemo(() => {
    return leadOwnerOptions.length ? leadOwnerOptions : availableUsers.filter((u) => u.role === 'sales');
  }, [availableUsers, leadOwnerOptions]);

  const visibleStudents = useMemo(() => students.filter((student) => (
    !hideTestRecords || (!student.isTestRecord && student.archivalStatus !== 'Flagged For Archival')
  )), [hideTestRecords, students]);

  const filteredStudents = useMemo(() => {
    const matchingStudents = visibleStudents.filter((student) => {
      const matchSearch =
        searchQuery === '' ||
        student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.destinationCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.partnerName && student.partnerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        getLeadOwner(student).name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.salesOwnerName || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchStage = filterStage === 'All' || (student.pipelineStage || 'New') === filterStage;
      const leadOwnerId = getLeadOwner(student).id;
      const salesOwnerId = student.salesOwnerId || '';
      const matchLeadOwner = filterLeadOwner === 'All' || leadOwnerId === filterLeadOwner;
      const matchSalesOwner = filterSalesOwner === 'All' || salesOwnerId === filterSalesOwner;
      const matchPriority = filterPriority === 'All' || student.priority === filterPriority;
      const matchDest = filterDestination === 'All' || student.destinationCity === filterDestination;

      return matchSearch && matchStage && matchLeadOwner && matchSalesOwner && matchPriority && matchDest;
    });

    return matchingStudents.sort((a, b) => {
      const createdA = new Date(a.createdAt).getTime();
      const createdB = new Date(b.createdAt).getTime();
      const activityA = a.lastActivityAt
        ? new Date(a.lastActivityAt).getTime()
        : activities
            .filter((activity) => activity.studentId === a.studentId && !NON_QUALIFYING_ACTIVITY.test(activity.activityType))
            .reduce((latest, activity) => Math.max(latest, new Date(activity.timestamp).getTime()), 0);
      const activityB = b.lastActivityAt
        ? new Date(b.lastActivityAt).getTime()
        : activities
            .filter((activity) => activity.studentId === b.studentId && !NON_QUALIFYING_ACTIVITY.test(activity.activityType))
            .reduce((latest, activity) => Math.max(latest, new Date(activity.timestamp).getTime()), 0);

      if (sortColumn === 'lastActivity') {
        if (activityA === 0 && activityB !== 0) return 1;
        if (activityB === 0 && activityA !== 0) return -1;
      }

      const primaryA = sortColumn === 'createdAt' ? createdA : activityA;
      const primaryB = sortColumn === 'createdAt' ? createdB : activityB;
      const primaryDifference = primaryA - primaryB;
      if (primaryDifference !== 0) return sortDirection === 'asc' ? primaryDifference : -primaryDifference;

      return createdB - createdA;
    });
  }, [visibleStudents, activities, searchQuery, filterStage, filterLeadOwner, filterSalesOwner, filterPriority, filterDestination, sortColumn, sortDirection]);

  const toggleSort = (column: 'createdAt' | 'lastActivity') => {
    if (sortColumn === column) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleExportSalesLeadsCSV = () => {
    exportToCSV(
      `hearthaway-sales-leads-${new Date().toISOString().split('T')[0]}`,
      [
        { header: 'Student ID', accessor: (s) => s.studentId },
        { header: 'Full Name', accessor: (s) => s.fullName },
        { header: 'Email', accessor: (s) => s.email },
        { header: 'Phone', accessor: (s) => s.phone },
        { header: 'Sourcing Partner', accessor: (s) => s.partnerName || s.partnerId },
        { header: 'Partner ID', accessor: (s) => s.partnerId },
        { header: 'Lead Owner', accessor: (s) => getLeadOwner(s).name },
        { header: 'Sales Owner', accessor: (s) => s.salesOwnerName || 'Unassigned' },
        { header: 'University', accessor: (s) => s.university },
        { header: 'Destination City', accessor: (s) => s.destinationCity },
        { header: 'Destination Country', accessor: (s) => s.destinationCountry },
        { header: 'Intake', accessor: (s) => s.intake },
        { header: 'Pipeline', accessor: (s) => s.pipelineStage || 'New' },
        { header: 'Priority', accessor: (s) => s.priority || 'Medium' },
        { header: 'Budget', accessor: (s) => `${s.currency || 'GBP'} ${s.budget}` },
        { header: 'Next Follow Up', accessor: (s) => s.nextFollowUpAt || '' },
        { header: 'Created Date', accessor: (s) => s.createdAt },
      ],
      filteredStudents
    );
  };

  return (
    <div className="ha-workspace">
      {/* Top Header */}
      <div className="ha-page-header">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>

              <h1 className="ha-title">
                Sales
              </h1>
              <p className="ha-summary">
                Manage student leads, assign internal lead owners, coordinate booking progression, and record payments.
              </p>
            </div>

            <button
              onClick={() => setShowAddLeadModal(true)}
              className="ha-primary-action"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Sales Lead
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ha-secondary">Lead-to-booking pipeline</h2>
              <span className="rounded-full border border-ha-line bg-white px-2 py-1 text-xs font-bold text-ha-secondary">{visibleStudents.length} leads</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {PIPELINE_STAGES.map((stage) => {
                const count = visibleStudents.filter((student) => (student.pipelineStage || 'New') === stage.key).length;
                const isActive = filterStage === stage.key;
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => setFilterStage(isActive ? 'All' : stage.key)}
                    className={`min-h-19 rounded-lg border px-3 py-2 text-left transition-colors ${isActive ? 'border-ha-blue/50 bg-ha-blue/5' : 'border-ha-line bg-white hover:border-ha-blue/40'}`}
                    aria-pressed={isActive}
                  >
                    <span className="block text-lg font-semibold tabular-nums text-ha-blue">{count}</span>
                    <span className="block text-xs font-semibold">{stage.label}</span>
                    <span className="mt-0.5 block text-xs text-ha-secondary">{stage.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 pt-5 space-y-4">
        {ownerError && <p role="alert" className="text-sm text-rose-700">{ownerError}</p>}
        {/* Search & Filter Toolbar */}
        <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 shadow-2xs space-y-3">
          <div className="sales-lead-filters">
            <div className="sales-lead-search relative min-w-0">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6860]" />
              <input
                aria-label="Search sales leads"
                type="text"
                placeholder="Search leads"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-full w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-none"
              />
            </div>

            {[
              { label: 'lead owner', value: filterLeadOwner, setValue: setFilterLeadOwner },
              { label: 'sales owner', value: filterSalesOwner, setValue: setFilterSalesOwner },
            ].map(({ label, value, setValue }) => (
              <select
                key={label}
                aria-label={`Filter by ${label}`}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="rounded-lg border border-ha-line bg-white px-2.5 text-xs font-medium text-ha-ink focus:border-ha-blue"
              >
                <option value="All">All {label}s</option>
                <option value="">Unassigned</option>
                {salesUsers.map((user) => <option key={user.uid} value={user.uid}>{user.displayName}</option>)}
              </select>
            ))}

            {/* Lead Stage Filter */}
            <select
              aria-label="Filter by pipeline stage"
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value as PipelineFilter)}
              className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
            >
              <option value="All">{isMobile ? 'All stages' : 'All pipeline stages'}</option>
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage.key} value={stage.key}>{stage.label}</option>
              ))}
              <option value="Disqualified">Disqualified</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            {/* Priority Filter */}
            <select
              aria-label="Filter by priority"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
            >
              <option value="All">All priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <button
              onClick={handleExportSalesLeadsCSV}
              disabled={filteredStudents.length === 0}
              className="sales-lead-export flex items-center justify-center gap-1.5 rounded-lg border border-[#00319D] bg-[#00319D]/5 px-3 py-2 text-xs font-bold text-[#00319D] hover:bg-[#00319D]/15 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              title="Download current leads table as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <p role="status" className={filteredStudents.length === visibleStudents.length ? 'sr-only' : 'border-t border-ha-line pt-2 text-xs text-ha-secondary'}>
            {filteredStudents.length === visibleStudents.length
              ? `${visibleStudents.length} leads`
              : `${filteredStudents.length} of ${visibleStudents.length} leads`}
          </p>
        </div>

        <SalesLeadWorkspace key={currentUser.uid} studentId={openStudentId} userId={currentUser.uid} onClose={closeStudent} registerLeaveGuard={registerLeaveGuard}>
          <div className="ha-table-scroll sales-lead-scroll" tabIndex={0} role="region" aria-label="Sales leads table">
            <table className="ha-table sales-leads-table">
              <thead>
                <tr>
                  <th data-column="student" scope="col" className="py-3 px-4 font-bold">Student Name & ID</th>
                  <th data-column="partner" scope="col" className="py-3 px-4 font-bold">Sourcing Partner</th>
                  <th data-column="lead-owner" scope="col" className="py-3 px-4 font-bold">Lead Owner</th>
                  <th data-column="sales-owner" scope="col" className="py-3 px-4 font-bold">Sales Owner</th>
                  <th data-column="city" scope="col" className="py-3 px-4 font-bold"><span className="sales-city-label">City</span><span className="sales-university">University & City</span></th>
                  <th data-column="pipeline" scope="col" className="py-3 px-4 font-bold">Pipeline</th>
                  <th data-column="priority" scope="col" className="py-3 px-4 font-bold">Priority</th>
                  <th data-column="created" scope="col" className="py-3 px-4 font-bold">
                    <button type="button" onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1 hover:text-[#00319D]">
                      Created On
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">{sortColumn === 'createdAt' ? `sorted ${sortDirection === 'asc' ? 'ascending' : 'descending'}` : 'sort'}</span>
                    </button>
                  </th>
                  <th data-column="activity" scope="col" className="py-3 px-4 font-bold">
                    <button type="button" onClick={() => toggleSort('lastActivity')} className="inline-flex items-center gap-1 hover:text-[#00319D]">
                      Last Activity
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">{sortColumn === 'lastActivity' ? `sorted ${sortDirection === 'asc' ? 'ascending' : 'descending'}` : 'sort'}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1]">
                {filteredStudents.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-ha-secondary">No leads match this view.</td></tr>}
                {filteredStudents.map((student) => {
                  const leadActivities = activities
                    .filter((activity) => activity.studentId === student.studentId && !NON_QUALIFYING_ACTIVITY.test(activity.activityType))
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                  const lastActivity = student.lastActivityAt || leadActivities[0]?.timestamp;

                  return (
                    <tr
                      key={student.id}
                      data-selected={openStudentId === student.studentId || undefined}
                      className="cursor-pointer transition-colors hover:bg-ha-canvas/60"
                      onClick={(event) => openStudent(student.studentId, event.currentTarget.querySelector('button'))}
                    >
                      <td data-column="student" className="py-3.5 px-4">
                        <button type="button" title={student.fullName} aria-expanded={openStudentId === student.studentId}
                          className="text-left font-semibold text-ha-blue hover:underline [overflow-wrap:anywhere]"
                          onClick={(event) => { event.stopPropagation(); openStudent(student.studentId, event.currentTarget); }}>
                          <span className="line-clamp-2">{student.fullName}</span>
                        </button>
                        <div className="font-mono text-xs text-[#00319D]">{student.studentId}</div>
                      </td>

                      <td data-column="partner" className="py-3.5 px-4">
                        <div className="font-semibold text-[#1A1A1A]">
                          {student.partnerName || student.partnerId}
                        </div>
                        <div className="font-mono text-xs text-[#6B6860]">{student.partnerId}</div>
                      </td>

                      {/* Lead Owner with inline reassignment */}
                      <td data-column="lead-owner" className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          aria-label={`Lead owner for ${student.fullName}`}
                          value={getLeadOwner(student).id}
                          onChange={(e) => {
                            const newRep = salesUsers.find((su) => su.uid === e.target.value);
                            setOwnerError('');
                            void reassignLeadOwner(student.studentId, newRep?.uid || '', newRep?.displayName || '').catch(() => setOwnerError('Could not update the lead owner. Open the lead to try again.'));
                          }}
                          className="rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-2 py-1 text-xs font-bold text-[#00319D] focus:outline-none focus:border-[#00319D] cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {!!getLeadOwner(student).id && !salesUsers.some((user) => user.uid === getLeadOwner(student).id) && <option value={getLeadOwner(student).id}>{getLeadOwner(student).name}</option>}
                          {salesUsers.map((su) => (
                            <option key={su.uid} value={su.uid}>
                              {su.displayName}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td data-column="sales-owner" className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        {['admin', 'management', 'sales'].includes(currentUser.role) && ['management', 'sales'].includes(leadOperationsRole) ? (
                          <select
                            aria-label={`Sales owner for ${student.fullName}`}
                            value={student.salesOwnerId || ''}
                            onChange={(e) => {
                              const newOwner = leadOwnerOptions.find((user) => user.uid === e.target.value);
                              setOwnerError('');
                              void assignSalesOwner(student.studentId, newOwner?.uid || '', newOwner?.displayName || '').catch(() => setOwnerError('Could not update the sales owner. Open the lead to try again.'));
                            }}
                            className="rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-2 py-1 text-xs font-bold text-[#00319D] focus:outline-none focus:border-[#00319D] cursor-pointer"
                          >
                            <option value="">Unassigned</option>
                            {!!student.salesOwnerId && !leadOwnerOptions.some((user) => user.uid === student.salesOwnerId) && <option value={student.salesOwnerId}>{student.salesOwnerName || 'Unknown owner'}</option>}
                            {leadOwnerOptions.map((user) => <option key={user.uid} value={user.uid}>{user.displayName}</option>)}
                          </select>
                        ) : student.salesOwnerName || 'Unassigned'}
                      </td>

                      <td data-column="city" className="py-3.5 px-4 align-top">
                        <div className="text-[#1A1A1A] font-medium whitespace-normal break-words">{student.destinationCity}</div>
                        <div title={student.university} className="sales-university line-clamp-3 text-xs text-[#6B6860] whitespace-normal break-words">{student.university}</div>
                      </td>

                      <td data-column="pipeline" className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          aria-label={`Pipeline stage for ${student.fullName}`}
                          value={student.pipelineStage || 'New'}
                          onChange={(e) => updateStudentDecoupledStatus(student.studentId, { pipelineStage: e.target.value as PipelineStage })}
                          className="rounded-md border border-[#E8E6E1] bg-white px-2 py-1 text-xs font-bold text-[#00319D] focus:border-[#00319D] focus:outline-none"
                        >
                          {PIPELINE_STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
                          <option value="Disqualified">Disqualified</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td data-column="priority" className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          aria-label={`Priority for ${student.fullName}`}
                          value={student.priority || 'Medium'}
                          onChange={(e) => updateStudentDecoupledStatus(student.studentId, { priority: e.target.value as 'Low' | 'Medium' | 'High' | 'Urgent' })}
                          className="rounded-md border border-[#E8E6E1] bg-white px-2 py-1 text-xs font-bold text-[#1A1A1A] focus:border-[#00319D] focus:outline-none"
                        >
                          <option>Urgent</option><option>High</option><option>Medium</option><option>Low</option>
                        </select>
                      </td>

                      <td data-column="created" className="py-3.5 px-4 whitespace-normal text-[#1A1A1A]">
                        {formatLeadDate(student.createdAt)}
                      </td>

                      <td data-column="activity" className="py-3.5 px-4 whitespace-normal text-[#6B6860]">
                        {formatLeadDate(lastActivity, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SalesLeadWorkspace>
      </div>

      {/* ADD LEAD MODAL */}
      {showAddLeadModal && (
        <LeadDetailsDialog title="Add sales lead" partners={partners} onClose={() => setShowAddLeadModal(false)}
          onSave={async (lead, partnerId) => { await submitPartnerLead(lead, partnerId); }} />
      )}
    </div>
  );
}
