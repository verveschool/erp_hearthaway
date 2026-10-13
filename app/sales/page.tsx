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
  Layers,
  ArrowUpDown,
  Building,
} from 'lucide-react';

export default function SalesPage() {
  const {
    students,
    partners,
    availableUsers,
    setSelectedStudentId,
    reassignLeadSalesOwner,
    submitPartnerLead,
    currentUser,
    hideTestRecords,
  } = useHearthAway();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('All');
  const [filterBookingStatus, setFilterBookingStatus] = useState<string>('All');
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
      newLeads: students.filter((s) => s.leadStatus === 'New').length,
      activeLeads: students.filter((s) => s.leadStatus === 'Contacted' || s.leadStatus === 'Qualified').length,
      followUpsToday: students.filter((s) => s.nextFollowUpAt?.toLowerCase().includes('today') || s.nextFollowUpAt?.toLowerCase().includes('2 hours')).length,
      processing: students.filter((s) => s.bookingStatus === 'Processing' || s.bookingStatus === 'Application Submitted').length,
      paymentPending: students.filter((s) => s.bookingStatus === 'Payment Pending').length,
      booked: students.filter((s) => s.bookingStatus === 'Booked' || s.bookingStatus === 'Move-in Confirmed').length,
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

      const matchStage = filterStage === 'All' || student.leadStatus === filterStage;
      const matchBooking = filterBookingStatus === 'All' || student.bookingStatus === filterBookingStatus;
      const matchOwner =
        filterSalesOwner === 'All' || student.assignedSalesExecutiveId === filterSalesOwner;
      const matchPriority = filterPriority === 'All' || student.priority === filterPriority;
      const matchDest = filterDestination === 'All' || student.destinationCity === filterDestination;

      return matchArchived && matchSearch && matchStage && matchBooking && matchOwner && matchPriority && matchDest;
    });
  }, [students, searchQuery, filterStage, filterBookingStatus, filterSalesOwner, filterPriority, filterDestination, hideTestRecords]);

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

  return (
    <div className="min-h-screen bg-[#F7F6F3] pb-16">
      {/* Top Header */}
      <div className="border-b border-[#E8E6E1] bg-[#FFFFFF] px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#00319D]/10 px-2.5 py-0.5 text-xs font-bold text-[#00319D] uppercase tracking-wider">
                  <Briefcase className="h-3.5 w-3.5" />
                  Module 3
                </span>
                <span className="text-xs text-[#6B6860]">• Sales &amp; Booking Pipeline</span>
              </div>
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

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-6">
            <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-3 text-left">
              <span className="text-[10px] font-bold uppercase text-[#6B6860] block">New Leads</span>
              <span className="text-lg font-extrabold text-[#00319D]">{stats.newLeads}</span>
            </div>
            <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-3 text-left">
              <span className="text-[10px] font-bold uppercase text-[#6B6860] block">Active In Sales</span>
              <span className="text-lg font-extrabold text-[#1A1A1A]">{stats.activeLeads}</span>
            </div>
            <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-3 text-left">
              <span className="text-[10px] font-bold uppercase text-[#6B6860] block">Follow-Ups Due</span>
              <span className="text-lg font-extrabold text-amber-700">{stats.followUpsToday}</span>
            </div>
            <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-3 text-left">
              <span className="text-[10px] font-bold uppercase text-[#6B6860] block">Processing</span>
              <span className="text-lg font-extrabold text-indigo-700">{stats.processing}</span>
            </div>
            <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-3 text-left">
              <span className="text-[10px] font-bold uppercase text-[#6B6860] block">Payment Pending</span>
              <span className="text-lg font-extrabold text-amber-600">{stats.paymentPending}</span>
            </div>
            <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-3 text-left">
              <span className="text-[10px] font-bold uppercase text-[#6B6860] block">Booked Tenancies</span>
              <span className="text-lg font-extrabold text-emerald-700">{stats.booked}</span>
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
                onChange={(e) => setFilterStage(e.target.value)}
                className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
              >
                <option value="All">All Lead Stages</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Lost">Lost</option>
              </select>

              {/* Booking Status Filter */}
              <select
                value={filterBookingStatus}
                onChange={(e) => setFilterBookingStatus(e.target.value)}
                className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
              >
                <option value="All">All Booking Statuses</option>
                <option value="Not Started">Not Started</option>
                <option value="Processing">Processing</option>
                <option value="Payment Pending">Payment Pending</option>
                <option value="Booked">Booked</option>
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
                  <th className="py-3 px-4 font-bold">Student Name &amp; ID</th>
                  <th className="py-3 px-4 font-bold">Sourcing Partner</th>
                  <th className="py-3 px-4 font-bold">Portfolio Owner (Derived)</th>
                  <th className="py-3 px-4 font-bold">Sales Owner</th>
                  <th className="py-3 px-4 font-bold">University &amp; City</th>
                  <th className="py-3 px-4 font-bold">Lead Status</th>
                  <th className="py-3 px-4 font-bold">Booking Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E1]">
                {filteredStudents.map((student) => {
                  const partner = partners.find((p) => p.partnerId === student.partnerId);
                  const portfolioOwnerName = partner?.portfolioOwnerName || 'Beatrice Vance';

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

                      {/* Derived Portfolio Owner */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 rounded bg-[#F7F6F3] px-2 py-0.5 text-[11px] font-semibold text-[#1A1A1A] border border-[#E8E6E1]">
                          <Layers className="h-3 w-3 text-[#00319D]" />
                          {portfolioOwnerName}
                        </span>
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

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            student.leadStatus === 'New'
                              ? 'bg-blue-100 text-blue-800'
                              : student.leadStatus === 'Qualified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : student.leadStatus === 'Contacted'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {student.leadStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            student.bookingStatus === 'Booked' || student.bookingStatus === 'Move-in Confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : student.bookingStatus === 'Payment Pending'
                              ? 'bg-amber-100 text-amber-800'
                              : student.bookingStatus === 'Processing'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          {student.bookingStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedStudentId(student.studentId)}
                          className="rounded-lg bg-[#F7F6F3] border border-[#E8E6E1] px-2.5 py-1 text-[11px] font-bold text-[#00319D] hover:bg-[#E8E6E1] transition-colors"
                        >
                          Open Lead →
                        </button>
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
