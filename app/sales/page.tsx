'use client';

import { WorkspaceSearch } from '@/components/WorkspaceSearch';
import { matchesSearch } from '@/lib/utils';

import { useWorkspaceView } from '@/hooks/use-workspace-view';

import { LeadFieldSelect } from '@/components/LeadFieldSelect';
import { LeadDetailsDialog } from '@/components/LeadDetailsDialog';
import { getLeadOwner } from '@/lib/lead-details';

import { useCallback, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useHearthAway } from '@/lib/context';
import { ArrowUpDown, Download, ListFilter, Plus, Search } from 'lucide-react';
import { SalesLeadWorkspace } from '@/components/SalesLeadWorkspace';
import { useIsMobile } from '@/hooks/use-mobile';
import { parseLeadPhone, leadPhoneCsv } from '@/lib/lead-phone';
import { exportToCSV } from '@/lib/export-csv';
import { PIPELINE_FLOW_STAGES, PIPELINE_STAGES, type PipelineStage } from '@/lib/types';
import { MetricsToggle } from '@/components/WorkspaceMetrics';

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
    leadOwnerOptions,
    currentUser,
    leadOperationsRole,
    reassignLeadOwner,
    assignSalesOwner,
    submitPartnerLead,
    updateStudentDecoupledStatus,
    hideTestRecords,
  } = useHearthAway();

  const [searchQuery, setSearchQuery] = useWorkspaceView<string>(currentUser.uid, 'searchQuery', '');
  const [filterStage, setFilterStage] = useWorkspaceView<PipelineFilter>(currentUser.uid, 'filterStage', 'All');
  const [filterLeadOwner, setFilterLeadOwner] = useWorkspaceView<string>(currentUser.uid, 'filterLeadOwner', 'All');
  const [filterSalesOwner, setFilterSalesOwner] = useWorkspaceView<string>(currentUser.uid, 'filterSalesOwner', 'All');
  const [filterPriority, setFilterPriority] = useWorkspaceView<string>(currentUser.uid, 'filterPriority', 'All');
  const [filterDestination, setFilterDestination] = useWorkspaceView<string>(currentUser.uid, 'filterDestination', 'All');
  const [filterPartner, setFilterPartner] = useWorkspaceView<string>(currentUser.uid, 'filterPartner', 'All');
  const [sortColumn, setSortColumn] = useWorkspaceView<'createdAt' | 'lastActivity'>(currentUser.uid, 'sortColumn', 'lastActivity');
  const [sortDirection, setSortDirection] = useWorkspaceView<'asc' | 'desc'>(currentUser.uid, 'sortDirection', 'desc');
  const [metricsOpen, setMetricsOpen] = useState(false);
  const metricsToggle = useRef<HTMLButtonElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sourceFiltersOpen, setSourceFiltersOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchToggle = useRef<HTMLButtonElement>(null);
  const filterToggle = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const stageControl = useRef<HTMLSelectElement>(null);
  const activeFilters = [filterLeadOwner, filterSalesOwner, filterStage, filterPriority, filterDestination, filterPartner].filter(value => value !== 'All').length;
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
    requestAnimationFrame(() => {
      const fallback = search.current?.offsetWidth ? search.current : searchToggle.current;
      (selectedTrigger.current?.isConnected ? selectedTrigger.current : fallback)?.focus({ preventScroll: true });
    });
  }

  function toggleMobileSearch() {
    if (searchOpen) {
      setSearchOpen(false);
      searchToggle.current?.focus();
    } else {
      // Reveal and focus the input during the same tap so mobile browsers can open the keyboard.
      flushSync(() => {
        setFiltersOpen(false);
        setSearchOpen(true);
      });
      search.current?.focus();
    }
  }

  function clearStage() {
    setFilterStage('All');
    stageControl.current?.focus();
  }

  const salesUsers = useMemo(() => {
    return leadOwnerOptions;
  }, [leadOwnerOptions]);

  const visibleStudents = useMemo(() => students.filter((student) => (
    !hideTestRecords || (!student.isTestRecord && student.archivalStatus !== 'Flagged For Archival')
  )), [hideTestRecords, students]);

  const destinationOptions = Array.from(new Set(visibleStudents.map(student => student.destinationCity?.trim()).filter(Boolean))).sort();
  const partnerOptions = new Map(visibleStudents.filter(student => student.partnerId).map(student =>
    [student.partnerId!, student.partnerName || student.partnerId!] as const
  ));
  partners.forEach(partner => partnerOptions.set(partner.partnerId, partner.companyName));

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const phoneDigits = parseLeadPhone(query)?.digits;
    const matchingStudents = visibleStudents.filter((student) => {
      const matchSearch =
        matchesSearch(query, [student.fullName, student.studentId, student.destinationCity, student.university, student.partnerName, getLeadOwner(student).name, student.salesOwnerName]) ||
        (phoneDigits !== undefined && parseLeadPhone(student.phone)?.digits.includes(phoneDigits));

      const matchStage = filterStage === 'All' || (student.pipelineStage || 'New') === filterStage;
      const leadOwnerId = getLeadOwner(student).id;
      const salesOwnerId = student.salesOwnerId || '';
      const matchLeadOwner = filterLeadOwner === 'All' || leadOwnerId === filterLeadOwner;
      const matchSalesOwner = filterSalesOwner === 'All' || salesOwnerId === filterSalesOwner;
      const matchPriority = filterPriority === 'All' || student.priority === filterPriority;
      const matchDest = filterDestination === 'All' || student.destinationCity?.trim() === filterDestination;
      const matchPartner = filterPartner === 'All' || (student.partnerId || '') === filterPartner;

      return matchSearch && matchStage && matchLeadOwner && matchSalesOwner && matchPriority && matchDest && matchPartner;
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
  }, [visibleStudents, activities, searchQuery, filterStage, filterLeadOwner, filterSalesOwner, filterPriority, filterDestination, filterPartner, sortColumn, sortDirection]);

  const toggleSort = (column: 'createdAt' | 'lastActivity') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
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
        { header: 'Phone', accessor: (s) => leadPhoneCsv(s.phone) },
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

  const leadCount = filteredStudents.length === visibleStudents.length
    ? `${visibleStudents.length} ${visibleStudents.length === 1 ? 'lead' : 'leads'}`
    : `${filteredStudents.length} of ${visibleStudents.length} leads`;

  return (
    <div className="ha-workspace sales-page">
      {/* Top Header */}
      <div className="ha-page-header sales-page-header" onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        if (searchOpen && searchToggle.current?.offsetWidth) {
          setSearchOpen(false);
          searchToggle.current.focus();
        } else if (filtersOpen && filterToggle.current?.offsetWidth) {
          setFiltersOpen(false);
          filterToggle.current.focus();
        } else if (metricsOpen && metricsToggle.current?.offsetWidth) {
          setMetricsOpen(false);
          metricsToggle.current.focus();
        }
      }}>
        <div className="sales-overview">
          <div className="sales-overview-title flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="ha-title">Sales</h1>
              <p role="status" className="sales-mobile-lead-count text-ha-secondary">{leadCount}</p>
            </div>

            <div className="sales-toolbar-actions">
              <MetricsToggle buttonRef={metricsToggle} label="Pipeline metrics" controls="sales-pipeline-metrics"
                expanded={metricsOpen} onClick={() => {
                  setSearchOpen(false);
                  setFiltersOpen(false);
                  setMetricsOpen(open => !open);
                }} />
              <button ref={searchToggle} type="button" aria-label={searchQuery.trim() ? 'Search leads (active)' : 'Search leads'}
                aria-expanded={searchOpen} aria-controls="sales-search-field" data-active={Boolean(searchQuery.trim())}
                onClick={() => { setMetricsOpen(false); toggleMobileSearch(); }}>
                <Search size={22} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Add Sales Lead" onClick={() => setShowAddLeadModal(true)}>
                <Plus size={22} aria-hidden="true" />
              </button>
              <button ref={filterToggle} type="button"
                aria-label={`Filter leads (${activeFilters} active)`} aria-expanded={filtersOpen} aria-controls="sales-filter-fields"
                onClick={() => {
                  setSearchOpen(false);
                  setMetricsOpen(false);
                  setFiltersOpen(!filtersOpen);
                }}>
                <ListFilter size={22} aria-hidden="true" />
                {activeFilters > 0 && <span aria-hidden="true">{activeFilters}</span>}
              </button>
              <button type="button" aria-label="Export CSV" onClick={handleExportSalesLeadsCSV} disabled={filteredStudents.length === 0}>
                <Download size={22} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div id="sales-pipeline-metrics" className="sales-pipeline-cards workspace-metrics-panel"
            data-open={metricsOpen} role="group" aria-label="Pipeline stage counts">
            {PIPELINE_FLOW_STAGES.map((stage) => {
              const count = visibleStudents.filter(student => (student.pipelineStage || 'New') === stage).length;
              const isActive = filterStage === stage;
              return (
                <button key={stage} type="button" onClick={() => {
                  setFilterStage(isActive ? 'All' : stage);
                }} aria-pressed={isActive}>
                  <span className="block text-base font-bold tabular-nums">{count}</span>
                  <span className="block text-xs font-semibold">{stage}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="sales-filter-bar">
          <div className="sales-toolbar-fields">
            <div id="sales-search-field" className="sales-search-field" data-open={searchOpen}>
              <WorkspaceSearch inputRef={search} label="Search sales leads" placeholder="Search leads by name or phone" value={searchQuery} onChange={setSearchQuery} />
            </div>
            <button type="button" aria-label="Add Sales Lead" title="Add Sales Lead" onClick={() => setShowAddLeadModal(true)}
              className="sales-desktop-add items-center justify-center rounded-lg">
              <Plus size={20} aria-hidden="true" />
            </button>

            <div id="sales-filter-fields" data-open={filtersOpen} className="sales-filter-fields">
              {[
                { label: 'lead owner', value: filterLeadOwner, setValue: setFilterLeadOwner },
                { label: 'sales owner', value: filterSalesOwner, setValue: setFilterSalesOwner },
              ].map(({ label, value, setValue }) => (
                <select
                  key={label}
                  aria-label={`Filter by ${label}`}
                  data-active={value !== 'All'}
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
                ref={stageControl} aria-label="Filter by pipeline stage"
                data-active={filterStage !== 'All'}
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value as PipelineFilter)}
                className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
              >
                <option value="All">{isMobile ? 'All stages' : 'All pipeline stages'}</option>
                {PIPELINE_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
              </select>

              {/* Priority Filter */}
              <select
                aria-label="Filter by priority"
                data-active={filterPriority !== 'All'}
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
              <button type="button" aria-label="City and partner filters" title="City and partner filters" aria-expanded={sourceFiltersOpen}
                aria-controls="sales-source-filters" className="sales-source-toggle workspace-icon-button"
                data-active={filterDestination !== 'All' || filterPartner !== 'All'} onClick={() => setSourceFiltersOpen(!sourceFiltersOpen)}>
                <ListFilter size={20} aria-hidden="true" />
              </button>
              <div id="sales-source-filters" className="sales-source-filters" data-open={sourceFiltersOpen}>
              <select aria-label="Filter by destination city" value={filterDestination}
                data-active={filterDestination !== 'All'} onChange={event => setFilterDestination(event.target.value)}
                className="rounded-lg border border-ha-line bg-white px-2.5 text-xs font-medium">
                <option value="All">All cities</option>
                {destinationOptions.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
              <select aria-label="Filter by partner" value={filterPartner}
                data-active={filterPartner !== 'All'} onChange={event => setFilterPartner(event.target.value)}
                className="rounded-lg border border-ha-line bg-white px-2.5 text-xs font-medium">
                <option value="All">All partners</option>
                <option value="">No partner assigned</option>
                {Array.from(partnerOptions).sort(([, a], [, b]) => a.localeCompare(b)).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              </div>
              {filterStage !== 'All' && <button type="button" className="sales-mobile-clear-stage" onClick={clearStage}>Clear stage</button>}
            </div>
            <button type="button" aria-label="Export CSV" title="Export CSV" onClick={handleExportSalesLeadsCSV} disabled={filteredStudents.length === 0}
              className="sales-desktop-export items-center justify-center rounded-lg disabled:opacity-40">
              <Download size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="sales-results">
            <button type="button" style={{ visibility: filterStage === 'All' ? 'hidden' : 'visible' }} onClick={clearStage}>Clear stage</button>
            <p role="status" className="sales-lead-count text-xs text-ha-secondary">{leadCount}</p>
          </div>
        </div>
      </div>

      <div className="sales-page-content">
        <SalesLeadWorkspace key={currentUser.uid} studentId={openStudentId} userId={currentUser.uid} onClose={closeStudent} registerLeaveGuard={registerLeaveGuard}>
          <div className="ha-table-scroll sales-lead-scroll" tabIndex={0} role="region" aria-label="Sales leads table">
            <table className="ha-table sales-leads-table">
              <thead>
                <tr>
                  <th data-column="student" scope="col" className="py-3 font-bold">Student Name & ID</th>
                  <th data-column="partner" scope="col" className="py-3 font-bold">Sourcing Partner</th>
                  <th data-column="lead-owner" scope="col" className="py-3 font-bold">Lead Owner</th>
                  <th data-column="sales-owner" scope="col" className="py-3 font-bold">Sales Owner</th>
                  <th data-column="city" scope="col" className="py-3 font-bold">City</th>
                  <th data-column="pipeline" scope="col" className="py-3 font-bold">Pipeline</th>
                  <th data-column="priority" scope="col" className="py-3 font-bold">Priority</th>
                  <th data-column="created" scope="col" className="py-3 font-bold">
                    <button type="button" onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1 hover:text-[#00319D]">
                      Created On
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">{sortColumn === 'createdAt' ? `sorted ${sortDirection === 'asc' ? 'ascending' : 'descending'}` : 'sort'}</span>
                    </button>
                  </th>
                  <th data-column="activity" scope="col" className="py-3 font-bold">
                    <button type="button" onClick={() => toggleSort('lastActivity')} className="inline-flex items-center gap-1 hover:text-[#00319D]">
                      Last Activity
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">{sortColumn === 'lastActivity' ? `sorted ${sortDirection === 'asc' ? 'ascending' : 'descending'}` : 'sort'}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1]">
                {filteredStudents.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-ha-secondary">No leads match this view.</td></tr>}
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
                      <td data-column="student" className="py-3.5">
                        <button type="button" title={student.fullName} aria-expanded={openStudentId === student.studentId}
                          className="text-left font-semibold text-ha-blue hover:underline [overflow-wrap:anywhere]"
                          onClick={(event) => { event.stopPropagation(); openStudent(student.studentId, event.currentTarget); }}>
                          <span className="line-clamp-2">{student.fullName}</span>
                        </button>
                        <div className="font-mono text-xs text-[#00319D]">{student.studentId}</div>
                      </td>

                      <td data-column="partner" className="py-3.5">
                        <div className="font-semibold text-[#1A1A1A]">
                          {student.partnerName || student.partnerId}
                        </div>
                        <div className="font-mono text-xs text-[#6B6860]">{student.partnerId}</div>
                      </td>

                      {/* Lead Owner with inline reassignment */}
                      <td data-column="lead-owner" className="py-3.5" onClick={(e) => e.stopPropagation()}>
                        <LeadFieldSelect
                          aria-label={`Lead owner for ${student.fullName}`}
                          value={getLeadOwner(student).id}
                          onSave={(value) => {
                            const newRep = salesUsers.find((su) => su.uid === value);
                            return reassignLeadOwner(student.studentId, newRep?.uid || '', newRep?.displayName || '');
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
                        </LeadFieldSelect>
                      </td>

                      <td data-column="sales-owner" className="py-3.5" onClick={(e) => e.stopPropagation()}>
                        {['admin', 'management', 'sales'].includes(currentUser.role) && ['management', 'sales'].includes(leadOperationsRole) ? (
                          <LeadFieldSelect
                            aria-label={`Sales owner for ${student.fullName}`}
                            value={student.salesOwnerId || ''}
                            onSave={(value) => {
                              const newOwner = leadOwnerOptions.find((user) => user.uid === value);
                              return assignSalesOwner(student.studentId, newOwner?.uid || '', newOwner?.displayName || '');
                            }}
                            className="rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-2 py-1 text-xs font-bold text-[#00319D] focus:outline-none focus:border-[#00319D] cursor-pointer"
                          >
                            <option value="">Unassigned</option>
                            {!!student.salesOwnerId && !leadOwnerOptions.some((user) => user.uid === student.salesOwnerId) && <option value={student.salesOwnerId}>{student.salesOwnerName || 'Unknown owner'}</option>}
                            {leadOwnerOptions.map((user) => <option key={user.uid} value={user.uid}>{user.displayName}</option>)}
                          </LeadFieldSelect>
                        ) : student.salesOwnerName || 'Unassigned'}
                      </td>

                      <td data-column="city" className="py-3.5 align-top font-medium text-ha-ink">
                        {student.destinationCity}
                      </td>

                      <td data-column="pipeline" className="py-3.5" onClick={(e) => e.stopPropagation()}>
                        <LeadFieldSelect
                          aria-label={`Pipeline stage for ${student.fullName}`}
                          value={student.pipelineStage || 'New'}
                          onSave={(value) => updateStudentDecoupledStatus(student.studentId, { pipelineStage: value as PipelineStage })}
                          className="rounded-md border border-[#E8E6E1] bg-white px-2 py-1 text-xs font-bold text-[#00319D] focus:border-[#00319D] focus:outline-none"
                        >
                          {PIPELINE_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                        </LeadFieldSelect>
                      </td>

                      <td data-column="priority" className="py-3.5" onClick={(e) => e.stopPropagation()}>
                        <LeadFieldSelect
                          aria-label={`Priority for ${student.fullName}`}
                          value={student.priority || 'Medium'}
                          onSave={(value) => updateStudentDecoupledStatus(student.studentId, { priority: value as 'Low' | 'Medium' | 'High' | 'Urgent' })}
                          className="rounded-md border border-[#E8E6E1] bg-white px-2 py-1 text-xs font-bold text-[#1A1A1A] focus:border-[#00319D] focus:outline-none"
                        >
                          <option>Urgent</option><option>High</option><option>Medium</option><option>Low</option>
                        </LeadFieldSelect>
                      </td>

                      <td data-column="created" className="py-3.5 whitespace-normal text-[#1A1A1A]">
                        {formatLeadDate(student.createdAt)}
                      </td>

                      <td data-column="activity" className="py-3.5 whitespace-normal text-[#6B6860]">
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
