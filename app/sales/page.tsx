'use client';

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
    setSelectedStudentId,
    reassignLeadSalesOwner,
    submitPartnerLead,
    updateStudentDecoupledStatus,
    currentUser,
    hideTestRecords,
  } = useHearthAway();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<PipelineFilter>('All');
  const [filterSalesOwner, setFilterSalesOwner] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterDestination, setFilterDestination] = useState<string>('All');
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  // New Lead Modal state
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadUni, setNewLeadUni] = useState('');
  const [newLeadCity, setNewLeadCity] = useState('London');
  const [newLeadPartnerId, setNewLeadPartnerId] = useState(partners[0]?.partnerId || 'PART-00482');
  const [newLeadBudget, setNewLeadBudget] = useState('350');

  const salesUsers = useMemo(() => {
    return availableUsers.filter((u) => u.role === 'sales');
  }, [availableUsers]);

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
    return students.filter((student) => {
      const matchArchived = !hideTestRecords || (!student.isTestRecord && student.archivalStatus !== 'Flagged For Archival');
      const matchSearch =
        searchQuery === '' ||
        student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.destinationCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.partnerName && student.partnerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        student.assignedSalesExecutiveName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStage = filterStage === 'All' || (student.pipelineStage || 'New') === filterStage;
      const matchOwner =
        filterSalesOwner === 'All' || student.assignedSalesExecutiveId === filterSalesOwner;
      const matchPriority = filterPriority === 'All' || student.priority === filterPriority;
      const matchDest = filterDestination === 'All' || student.destinationCity === filterDestination;

      return matchArchived && matchSearch && matchStage && matchOwner && matchPriority && matchDest;
    });
  }, [students, searchQuery, filterStage, filterSalesOwner, filterPriority, filterDestination, hideTestRecords]);

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName || !newLeadEmail || !newLeadUni) return;

    submitPartnerLead({
      fullName: newLeadName,
      email: newLeadEmail,
      phone: newLeadPhone || '+44 7700 900123',
      university: newLeadUni,
      destinationCountry: 'United Kingdom',
      destinationCity: newLeadCity,
      intake: 'Sep 2026',
      moveInDate: '2026-09-15',
      budget: Number(newLeadBudget) || 350,
      notes: 'Added directly via Sales Workspace.',
    });

    setShowAddLeadModal(false);
    setNewLeadName('');
    setNewLeadEmail('');
    setNewLeadPhone('');
    setNewLeadUni('');
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
        { header: 'Sales Owner', accessor: (s) => s.assignedSalesExecutiveName },
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
    <div className="min-h-screen bg-[#FFFFFF] pb-16">
      {/* Top Header */}
      <div className="border-b border-[#E8E6E1] bg-[#FFFFFF] px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>

              <h1 className="text-2xl font-extrabold text-[#1A1A1A] mt-1 tracking-tight">
                Sales
              </h1>
              <p className="text-xs text-[#6B6860] mt-0.5 max-w-2xl">
                Manage student leads, assign internal sales owners, coordinate booking progression, and record payments.
              </p>
            </div>

            <button
              onClick={() => setShowAddLeadModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[#00319D] px-3.5 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Sales Lead
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B6860]">Lead-to-booking pipeline</p>
                <p className="mt-0.5 text-[11px] text-[#6B6860]">Click a stage to focus the lead queue.</p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-[#6B6860] border border-[#E8E6E1]">{students.length} total leads</span>
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
                    <span className={`block text-lg font-extrabold ${isActive ? 'text-white' : 'text-[#00319D]'}`}>{count}</span>
                    <span className="block truncate text-[10px] font-bold uppercase tracking-wide">{stage.label}</span>
                    <span className={`mt-0.5 block truncate text-[10px] ${isActive ? 'text-white/75' : 'text-[#6B6860]'}`}>{stage.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6860]" />
              <input
                type="text"
                placeholder="Search leads by student name, ID, university, partner, or sales owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Sales Owner Filter */}
              <select
                value={filterSalesOwner}
                onChange={(e) => setFilterSalesOwner(e.target.value)}
                className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
              >
                <option value="All">All Sales Owners</option>
                {salesUsers.map((su) => (
                  <option key={su.uid} value={su.uid}>
                    {su.displayName}
                  </option>
                ))}
              </select>

              {/* Lead Stage Filter */}
              <select
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

          <div className="flex items-center justify-between text-xs text-[#6B6860] pt-1 border-t border-[#E8E6E1]">
            <span>Showing <strong>{filteredStudents.length}</strong> of <strong>{students.length}</strong> active sales leads</span>
            <span className="text-[11px] text-[#00319D] font-medium">Click any row to open lead inspection drawer</span>
          </div>
        </div>

        {/* Leads Table */}
        <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F3] text-[#6B6860] uppercase text-[10px] tracking-wider border-b border-[#E8E6E1]">
                <tr>
                  <th className="py-3 px-4 font-bold">Student Name & ID</th>
                  <th className="py-3 px-4 font-bold">Sourcing Partner</th>
                  <th className="py-3 px-4 font-bold">Sales Owner</th>
                  <th className="py-3 px-4 font-bold">University & City</th>
                  <th className="py-3 px-4 font-bold">Pipeline</th>
                  <th className="py-3 px-4 font-bold">Priority</th>
                  <th className="py-3 px-4 font-bold">Created On</th>
                  <th className="py-3 px-4 font-bold">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1]">
                {filteredStudents.map((student) => {
                  const leadActivities = activities
                    .filter((activity) => activity.studentId === student.studentId && !NON_QUALIFYING_ACTIVITY.test(activity.activityType))
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                  const lastActivity = leadActivities[0]?.timestamp;

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-[#F7F6F3]/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedStudentId(student.studentId)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#1A1A1A]">{student.fullName}</div>
                        <div className="font-mono text-[11px] text-[#00319D]">{student.studentId}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1A1A1A]">
                          {student.partnerName || student.partnerId}
                        </div>
                        <div className="font-mono text-[10px] text-[#6B6860]">{student.partnerId}</div>
                      </td>

                      {/* Sales Owner with inline reassignment */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={student.assignedSalesExecutiveId}
                          onChange={(e) => {
                            const newRep = salesUsers.find((su) => su.uid === e.target.value);
                            if (newRep) {
                              reassignLeadSalesOwner(student.studentId, newRep.uid, newRep.displayName);
                            }
                          }}
                          className="rounded-md border border-[#E8E6E1] bg-[#FFFFFF] px-2 py-1 text-xs font-bold text-[#00319D] focus:outline-none focus:border-[#00319D] cursor-pointer"
                        >
                          {salesUsers.map((su) => (
                            <option key={su.uid} value={su.uid}>
                              {su.displayName}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[#1A1A1A] font-medium">{student.destinationCity}</div>
                        <div className="text-[11px] text-[#6B6860] truncate max-w-[130px]">{student.university}</div>
                      </td>

                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={student.pipelineStage || 'New'}
                          onChange={(e) => updateStudentDecoupledStatus(student.studentId, { pipelineStage: e.target.value as PipelineStage })}
                          className="rounded-md border border-[#E8E6E1] bg-white px-2 py-1 text-[10px] font-bold text-[#00319D] focus:border-[#00319D] focus:outline-none"
                        >
                          {PIPELINE_STAGES.map((stage) => <option key={stage.key} value={stage.key}>{stage.label}</option>)}
                          <option value="Disqualified">Disqualified</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={student.priority || 'Medium'}
                          onChange={(e) => updateStudentDecoupledStatus(student.studentId, { priority: e.target.value as 'Low' | 'Medium' | 'High' | 'Urgent' })}
                          className="rounded-md border border-[#E8E6E1] bg-white px-2 py-1 text-[10px] font-bold text-[#1A1A1A] focus:border-[#00319D] focus:outline-none"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A]">Add New Sales Lead</h3>
            <form onSubmit={handleCreateLead} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Taylor"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="liam@example.com"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+44 7700 900123"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Sourcing Partner</label>
                <select
                  value={newLeadPartnerId}
                  onChange={(e) => setNewLeadPartnerId(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                >
                  {partners.map((p) => (
                    <option key={p.partnerId} value={p.partnerId}>
                      {p.companyName} (PO: {p.portfolioOwnerName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">Target University</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. King’s College London"
                  value={newLeadUni}
                  onChange={(e) => setNewLeadUni(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] p-2 text-xs focus:border-[#00319D] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="rounded-lg border border-[#E8E6E1] px-3.5 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A]"
                >
                  Add Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
