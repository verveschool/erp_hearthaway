'use client';

import { LeadDetailsDialog } from '@/components/LeadDetailsDialog';
import { getLeadOwner } from '@/lib/lead-details';

import React, { useState, useMemo } from 'react';
import { useHearthAway } from '@/lib/context';
import {
  Briefcase,
  Users,
  Search,
  Filter,
  Phone,
  MessageSquare,
  Clock,
  CheckCircle2,
  Calendar,
  MapPin,
  ChevronRight,
  CreditCard,
  Plus,
  ArrowUpDown,
  Building,
  Download,
} from 'lucide-react';
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
    setSelectedStudentId,
    reassignLeadOwner,
    submitPartnerLead,
    updateStudentDecoupledStatus,
    currentUser,
    hideTestRecords,
  } = useHearthAway();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<PipelineFilter>('All');
  const [filterSalesOwner, setFilterSalesOwner] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterDestination, setFilterDestination] = useState<string>('All');
  const [sortColumn, setSortColumn] = useState<'createdAt' | 'lastActivity'>('lastActivity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [ownerError, setOwnerError] = useState('');
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const effectiveSalesOwnerFilter = filterSalesOwner ?? (currentUser?.role === 'sales' ? currentUser.uid : 'All');

  const salesUsers = useMemo(() => {
    return leadOwnerOptions.length ? leadOwnerOptions : availableUsers.filter((u) => u.role === 'sales');
  }, [availableUsers, leadOwnerOptions]);

  const stats = useMemo(() => {
    return {
      newLeads: students.filter((s) => (s.pipelineStage || 'New') === 'New').length,
      activeLeads: students.filter((s) => ['Active', 'Qualified'].includes(s.pipelineStage || 'New')).length,
      followUpsToday: students.filter((s) => s.nextFollowUpAt?.toLowerCase().includes('today') || s.nextFollowUpAt?.toLowerCase().includes('2 hours')).length,
      processing: students.filter((s) => (s.pipelineStage || 'New') === 'Fulfilment').length,
      paymentPending: students.filter((s) => (s.pipelineStage || 'New') === 'Payment').length,
      booked: students.filter((s) => (s.pipelineStage || 'New') === 'Closed Won').length,
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    const matchingStudents = students.filter((student) => {
      const matchArchived = !hideTestRecords || (!student.isTestRecord && student.archivalStatus !== 'Flagged For Archival');
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
      const matchOwner = effectiveSalesOwnerFilter === 'All' ||
        (effectiveSalesOwnerFilter === 'Unassigned' && !getLeadOwner(student).id) ||
        getLeadOwner(student).id === effectiveSalesOwnerFilter || student.salesOwnerId === effectiveSalesOwnerFilter;
      const matchPriority = filterPriority === 'All' || student.priority === filterPriority;
      const matchDest = filterDestination === 'All' || student.destinationCity === filterDestination;

      return matchArchived && matchSearch && matchStage && matchOwner && matchPriority && matchDest;
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
  }, [students, activities, searchQuery, filterStage, effectiveSalesOwnerFilter, filterPriority, filterDestination, hideTestRecords, sortColumn, sortDirection]);

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
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#6B6860]">Lead-to-booking pipeline</p>
                <p className="mt-0.5 text-xs text-[#6B6860]">Click a stage to focus the lead queue.</p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-[#6B6860] border border-[#E8E6E1]">{students.length} total leads</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {PIPELINE_STAGES.map((stage) => {
                const count = students.filter((student) => (student.pipelineStage || 'New') === stage.key).length;
                const isActive = filterStage === stage.key;
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onClick={() => setFilterStage(isActive ? 'All' : stage.key)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${isActive ? 'border-[#00319D] bg-[#00319D] text-white' : 'border-[#E8E6E1] bg-white text-[#1A1A1A] hover:border-[#00319D]/40'}`}
                    aria-pressed={isActive}
                  >
                    <span className={`block text-lg font-semibold tabular-nums ${isActive ? 'text-white' : 'text-[#00319D]'}`}>{count}</span>
                    <span className="block text-xs font-semibold">{stage.label}</span>
                    <span className={`mt-0.5 block text-xs ${isActive ? 'text-white/75' : 'text-[#6B6860]'}`}>{stage.hint}</span>
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
          <div className="flex flex-col xl:flex-row gap-3">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6860]" />
              <input
                aria-label="Search sales leads"
                type="text"
                placeholder="Search leads by student name, ID, university, partner, or lead owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-none"
              />
            </div>

            <div className="flex max-w-full flex-wrap items-center gap-2">
              {/* Lead Owner Filter */}
              <select
                aria-label="Filter by owner"
                value={effectiveSalesOwnerFilter}
                onChange={(e) => setFilterSalesOwner(e.target.value)}
                className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
              >
                <option value="All">All owners</option>
                <option value="Unassigned">Unassigned leads</option>
                {salesUsers.map((su) => (
                  <option key={su.uid} value={su.uid}>
                    {su.displayName}
                  </option>
                ))}
              </select>

              {/* Lead Stage Filter */}
              <select
                aria-label="Filter by pipeline stage"
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value as PipelineFilter)}
                className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
              >
                <option value="All">All Pipeline Stages</option>
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
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <button
                onClick={handleExportSalesLeadsCSV}
                disabled={filteredStudents.length === 0}
                className="flex items-center gap-1.5 rounded-lg border border-[#00319D] bg-[#00319D]/5 px-3 py-2 text-xs font-bold text-[#00319D] hover:bg-[#00319D]/15 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                title="Download current leads table as CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV ({filteredStudents.length})</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B6860] pt-1 border-t border-[#E8E6E1]">
            <span>Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> active sales leads</span>
            <span className="text-xs text-[#00319D] font-medium">Select a student to view their record.</span>
          </div>
        </div>

        {/* Leads Table */}
        <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
          <div className="ha-table-scroll">
            <table className="ha-table">
              <thead>
                <tr>
                  <th scope="col" className="py-3 px-4 font-bold">Student Name & ID</th>
                  <th scope="col" className="py-3 px-4 font-bold">Sourcing Partner</th>
                  <th scope="col" className="py-3 px-4 font-bold">Lead Owner</th>
                  <th scope="col" className="py-3 px-4 font-bold">Sales Owner</th>
                  <th scope="col" className="py-3 px-4 font-bold">University & City</th>
                  <th scope="col" className="py-3 px-4 font-bold">Pipeline</th>
                  <th scope="col" className="py-3 px-4 font-bold">Priority</th>
                  <th scope="col" className="py-3 px-4 font-bold">
                    <button type="button" onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1 hover:text-[#00319D]">
                      Created On
                      <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                      <span className="sr-only">{sortColumn === 'createdAt' ? `sorted ${sortDirection === 'asc' ? 'ascending' : 'descending'}` : 'sort'}</span>
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-4 font-bold">
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
                      className="hover:bg-[#F7F6F3]/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedStudentId(student.studentId)}
                    >
                      <td className="py-3.5 px-4">
                        <button type="button" className="text-left font-semibold text-ha-blue hover:underline" onClick={(event) => { event.stopPropagation(); setSelectedStudentId(student.studentId); }}>{student.fullName}</button>
                        <div className="font-mono text-xs text-[#00319D]">{student.studentId}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1A1A1A]">
                          {student.partnerName || student.partnerId}
                        </div>
                        <div className="font-mono text-xs text-[#6B6860]">{student.partnerId}</div>
                      </td>

                      {/* Lead Owner with inline reassignment */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
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

                      <td className="py-3.5 px-4">{student.salesOwnerName || 'Unassigned'}</td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="text-[#1A1A1A] font-medium whitespace-normal break-words">{student.destinationCity}</div>
                        <div className="text-xs text-[#6B6860] whitespace-normal break-words">{student.university}</div>
                      </td>

                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
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

                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          aria-label={`Priority for ${student.fullName}`}
                          value={student.priority || 'Medium'}
                          onChange={(e) => updateStudentDecoupledStatus(student.studentId, { priority: e.target.value as 'Low' | 'Medium' | 'High' | 'Urgent' })}
                          className="rounded-md border border-[#E8E6E1] bg-white px-2 py-1 text-xs font-bold text-[#1A1A1A] focus:border-[#00319D] focus:outline-none"
                        >
                          <option>Urgent</option><option>High</option><option>Medium</option><option>Low</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-[#1A1A1A]">
                        {formatLeadDate(student.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-[#6B6860]">
                        {formatLeadDate(lastActivity, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD LEAD MODAL */}
      {showAddLeadModal && (
        <LeadDetailsDialog title="Add sales lead" partners={partners} onClose={() => setShowAddLeadModal(false)}
          onSave={async (lead, partnerId) => { await submitPartnerLead(lead, partnerId); }} />
      )}
    </div>
  );
}
