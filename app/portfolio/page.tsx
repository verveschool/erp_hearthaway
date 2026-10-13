'use client';

import React, { useState, useMemo } from 'react';
import { useHearthAway } from '@/lib/context';
import {
  Layers,
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Building,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  ChevronRight,
  TrendingUp,
  UserCheck,
  Briefcase,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

export default function PortfolioPage() {
  const {
    currentUser,
    partners,
    students,
    availableUsers,
    reassignPartnerPortfolioOwner,
    setSelectedStudentId,
  } = useHearthAway();

  const isManagement = currentUser.role === 'management' || currentUser.role === 'admin';

  // Get all known Portfolio Owners (from availableUsers or partners list)
  const portfolioOwners = useMemo(() => {
    const poUsers = availableUsers.filter((u) => u.role === 'portfolio_owner');
    // Also add any assigned managers from partners if not present
    const additionalIds = new Set(partners.map((p) => p.portfolioOwnerId));
    const list = [...poUsers];
    additionalIds.forEach((id) => {
      if (id && !list.some((u) => u.uid === id)) {
        const p = partners.find((part) => part.portfolioOwnerId === id);
        if (p) {
          list.push({
            uid: id,
            displayName: p.portfolioOwnerName || id,
            email: `${id.toLowerCase()}@hearthaway.com`,
            role: 'portfolio_owner',
          });
        }
      }
    });
    return list;
  }, [availableUsers, partners]);

  // Selected portfolio owner for inspection:
  // If user is a Portfolio Owner, they ONLY see their own portfolio!
  // If user is Management, they can pick a Portfolio Owner or view "all"
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(() => {
    if (currentUser.role === 'portfolio_owner') {
      return currentUser.uid;
    }
    return portfolioOwners[0]?.uid || 'user-po-001';
  });

  // Effective Owner ID: strictly enforce that portfolio_owner role cannot inspect others
  const effectiveOwnerId = currentUser.role === 'portfolio_owner' ? currentUser.uid : selectedOwnerId;
  const activeOwner = portfolioOwners.find((po) => po.uid === effectiveOwnerId) || {
    uid: effectiveOwnerId,
    displayName: currentUser.displayName,
    email: currentUser.email,
    role: 'portfolio_owner',
  };

  // State for search, filters, and active tab
  const [activeTab, setActiveTab] = useState<'leads' | 'partners'>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPartner, setFilterPartner] = useState('All');
  const [filterLeadStatus, setFilterLeadStatus] = useState('All');
  const [filterBookingStatus, setFilterBookingStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'budget'>('newest');

  // Reassignment Modal state for Management
  const [reassignModalPartnerId, setReassignModalPartnerId] = useState<string | null>(null);
  const [newOwnerTargetId, setNewOwnerTargetId] = useState<string>('');

  // 1. Partners onboarded by the active Portfolio Owner
  const onboardedPartners = useMemo(() => {
    return partners.filter((p) => p.portfolioOwnerId === effectiveOwnerId);
  }, [partners, effectiveOwnerId]);

  // 2. Leads dynamically derived from those onboarded partners
  const portfolioLeads = useMemo(() => {
    const partnerIds = new Set(onboardedPartners.map((p) => p.partnerId));
    return students.filter((s) => partnerIds.has(s.partnerId));
  }, [students, onboardedPartners]);

  // Portfolio level metrics
  const metrics = useMemo(() => {
    const totalLeads = portfolioLeads.length;
    const qualifiedLeads = portfolioLeads.filter((s) => s.leadStatus === 'Qualified').length;
    const bookedLeads = portfolioLeads.filter(
      (s) => s.bookingStatus === 'Booked' || s.bookingStatus === 'Move-in Confirmed'
    ).length;
    const pipelineValue = portfolioLeads.reduce((acc, s) => acc + (s.budget ? s.budget * 44 : 0), 0);
    const convRate = totalLeads > 0 ? ((bookedLeads / totalLeads) * 100).toFixed(1) : '0.0';

    return {
      totalPartners: onboardedPartners.length,
      totalLeads,
      qualifiedLeads,
      bookedLeads,
      pipelineValue,
      convRate,
    };
  }, [onboardedPartners, portfolioLeads]);

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    let result = portfolioLeads.filter((lead) => {
      const matchSearch =
        searchQuery === '' ||
        lead.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.destinationCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.partnerName && lead.partnerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        lead.assignedSalesExecutiveName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchPartner = filterPartner === 'All' || lead.partnerId === filterPartner;
      const matchLeadStatus = filterLeadStatus === 'All' || lead.leadStatus === filterLeadStatus;
      const matchBookingStatus =
        filterBookingStatus === 'All' || lead.bookingStatus === filterBookingStatus;

      return matchSearch && matchPartner && matchLeadStatus && matchBookingStatus;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
      if (sortBy === 'budget') return (b.budget || 0) - (a.budget || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [portfolioLeads, searchQuery, filterPartner, filterLeadStatus, filterBookingStatus, sortBy]);

  // Handle Reassign Portfolio Owner (Management action)
  const handleReassign = () => {
    if (!reassignModalPartnerId || !newOwnerTargetId) return;
    const targetOwner = portfolioOwners.find((u) => u.uid === newOwnerTargetId);
    if (!targetOwner) return;

    reassignPartnerPortfolioOwner(
      reassignModalPartnerId,
      targetOwner.uid,
      targetOwner.displayName
    );
    setReassignModalPartnerId(null);
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
                  <Layers className="h-3.5 w-3.5" />
                  Module 1
                </span>
                <span className="text-xs text-[#6B6860]">• Relational Partnership Rollup</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#1A1A1A] mt-1 tracking-tight">
                Portfolio
              </h1>
              <p className="text-xs text-[#6B6860] mt-0.5 max-w-2xl">
                Track business activity, education consultant partners onboarded, and lead rollups across the organization.
              </p>
            </div>

            {/* Management View Selector: Inspect different Portfolio Owners */}
            {isManagement && (
              <div className="flex items-center gap-2 bg-[#F7F6F3] p-1.5 rounded-xl border border-[#E8E6E1]">
                <span className="text-xs font-bold text-[#6B6860] pl-2 hidden sm:inline">
                  Portfolio Owner:
                </span>
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] focus:outline-none focus:border-[#00319D] cursor-pointer"
                >
                  {portfolioOwners.map((owner) => (
                    <option key={owner.uid} value={owner.uid}>
                      {owner.displayName} ({partners.filter((p) => p.portfolioOwnerId === owner.uid).length} partners)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Active Portfolio Owner Banner */}
          <div className="mt-6 rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-[#00319D] text-[#FFFFFF] flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                {activeOwner.displayName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#1A1A1A]">{activeOwner.displayName}</h2>
                  <span className="rounded bg-[#00319D]/10 px-2 py-0.5 text-[10px] font-bold text-[#00319D]">
                    Portfolio Owner
                  </span>
                </div>
                <p className="text-xs text-[#6B6860]">{activeOwner.email}</p>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="bg-[#FFFFFF] px-3 py-2 rounded-lg border border-[#E8E6E1]">
                <span className="text-[10px] uppercase font-bold text-[#6B6860] block">Onboarded Partners</span>
                <span className="text-base font-extrabold text-[#1A1A1A]">{metrics.totalPartners}</span>
              </div>
              <div className="bg-[#FFFFFF] px-3 py-2 rounded-lg border border-[#E8E6E1]">
                <span className="text-[10px] uppercase font-bold text-[#6B6860] block">Total Sourced Leads</span>
                <span className="text-base font-extrabold text-[#00319D]">{metrics.totalLeads}</span>
              </div>
              <div className="bg-[#FFFFFF] px-3 py-2 rounded-lg border border-[#E8E6E1]">
                <span className="text-[10px] uppercase font-bold text-[#6B6860] block">Booked Tenancies</span>
                <span className="text-base font-extrabold text-emerald-700">{metrics.bookedLeads}</span>
              </div>
              <div className="bg-[#FFFFFF] px-3 py-2 rounded-lg border border-[#E8E6E1]">
                <span className="text-[10px] uppercase font-bold text-[#6B6860] block">Conversion Rate</span>
                <span className="text-base font-extrabold text-[#1A1A1A]">{metrics.convRate}%</span>
              </div>
            </div>
          </div>

          {/* Sub-Tabs: Generated Leads vs Onboarded Partners */}
          <div className="mt-6 flex border-b border-[#E8E6E1] gap-6 text-xs font-bold">
            <button
              onClick={() => setActiveTab('leads')}
              className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'leads'
                  ? 'border-[#00319D] text-[#00319D]'
                  : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
              }`}
            >
              <Users className="h-4 w-4" />
              Generated Leads ({metrics.totalLeads})
            </button>
            <button
              onClick={() => setActiveTab('partners')}
              className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'partners'
                  ? 'border-[#00319D] text-[#00319D]'
                  : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
              }`}
            >
              <Building className="h-4 w-4" />
              Onboarded Partners ({metrics.totalPartners})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TAB 1: GENERATED LEADS */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Search & Filter Toolbar */}
            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6860]" />
                  <input
                    type="text"
                    placeholder="Search by student name, ID, university, city, partner, or sales owner..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Sourcing Partner Filter */}
                  <select
                    value={filterPartner}
                    onChange={(e) => setFilterPartner(e.target.value)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="All">All Partners ({onboardedPartners.length})</option>
                    {onboardedPartners.map((p) => (
                      <option key={p.partnerId} value={p.partnerId}>
                        {p.companyName}
                      </option>
                    ))}
                  </select>

                  {/* Lead Status Filter */}
                  <select
                    value={filterLeadStatus}
                    onChange={(e) => setFilterLeadStatus(e.target.value)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="All">All Lead Statuses</option>
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

                  {/* Sort Order */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="name">Sort: Name (A-Z)</option>
                    <option value="budget">Sort: Highest Budget</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6B6860] pt-1 border-t border-[#E8E6E1]">
                <span>
                  Showing <strong>{filteredLeads.length}</strong> of <strong>{portfolioLeads.length}</strong> leads rolled up into this portfolio
                </span>
                <span className="text-[11px] font-medium text-[#00319D]">
                  Attribution updates automatically when new partner leads arrive
                </span>
              </div>
            </div>

            {/* Leads Table */}
            {filteredLeads.length === 0 ? (
              <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-12 text-center space-y-3">
                <Users className="h-8 w-8 text-[#6B6860] mx-auto" />
                <h3 className="text-sm font-bold text-[#1A1A1A]">No Leads Found</h3>
                <p className="text-xs text-[#6B6860] max-w-md mx-auto">
                  {portfolioLeads.length === 0
                    ? `No leads have been received yet from the partners onboarded by ${activeOwner.displayName}.`
                    : 'No leads match your current search and filter criteria.'}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F6F3] text-[#6B6860] uppercase text-[10px] tracking-wider border-b border-[#E8E6E1]">
                      <tr>
                        <th className="py-3 px-4 font-bold">Student / Lead</th>
                        <th className="py-3 px-4 font-bold">Sourcing Partner</th>
                        <th className="py-3 px-4 font-bold">Assigned Sales Owner</th>
                        <th className="py-3 px-4 font-bold">University &amp; City</th>
                        <th className="py-3 px-4 font-bold">Lead Status</th>
                        <th className="py-3 px-4 font-bold">Booking Status</th>
                        <th className="py-3 px-4 font-bold">Intake</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E6E1]">
                      {filteredLeads.map((lead) => (
                        <tr
                          key={lead.id}
                          className="hover:bg-[#F7F6F3]/60 transition-colors cursor-pointer"
                          onClick={() => setSelectedStudentId(lead.studentId)}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-[#1A1A1A]">{lead.fullName}</div>
                            <div className="font-mono text-[11px] text-[#00319D]">{lead.studentId}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#1A1A1A]">
                              {lead.partnerName || lead.partnerId}
                            </div>
                            <div className="text-[10px] text-[#6B6860] font-mono">{lead.partnerId}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-[#00319D]" />
                              <span className="font-bold text-[#1A1A1A]">
                                {lead.assignedSalesExecutiveName}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#6B6860]">Sales Specialist</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-[#1A1A1A]">{lead.destinationCity}</div>
                            <div className="text-[11px] text-[#6B6860] truncate max-w-[140px]">
                              {lead.university}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                lead.leadStatus === 'New'
                                  ? 'bg-blue-100 text-blue-800'
                                  : lead.leadStatus === 'Qualified'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : lead.leadStatus === 'Contacted'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-zinc-100 text-zinc-700'
                              }`}
                            >
                              {lead.leadStatus}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                lead.bookingStatus === 'Booked' || lead.bookingStatus === 'Move-in Confirmed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : lead.bookingStatus === 'Payment Pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : lead.bookingStatus === 'Processing'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-zinc-100 text-zinc-600'
                              }`}
                            >
                              {lead.bookingStatus}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-[#6B6860]">{lead.intake}</td>

                          <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedStudentId(lead.studentId)}
                              className="rounded-lg bg-[#F7F6F3] border border-[#E8E6E1] px-2.5 py-1 text-[11px] font-bold text-[#00319D] hover:bg-[#E8E6E1] transition-colors"
                            >
                              Inspect →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ONBOARDED PARTNERS */}
        {activeTab === 'partners' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#6B6860]">
                Education consultants and corporate referral partners onboarded by <strong>{activeOwner.displayName}</strong>.
              </p>
            </div>

            {onboardedPartners.length === 0 ? (
              <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-12 text-center space-y-3">
                <Building className="h-8 w-8 text-[#6B6860] mx-auto" />
                <h3 className="text-sm font-bold text-[#1A1A1A]">No Partners Assigned</h3>
                <p className="text-xs text-[#6B6860]">
                  This portfolio owner currently does not have any education consultant partners associated.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onboardedPartners.map((partner) => {
                  const partnerLeadsCount = students.filter((s) => s.partnerId === partner.partnerId).length;
                  const partnerBookingsCount = students.filter(
                    (s) =>
                      s.partnerId === partner.partnerId &&
                      (s.bookingStatus === 'Booked' || s.bookingStatus === 'Move-in Confirmed')
                  ).length;

                  return (
                    <div
                      key={partner.id}
                      className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-5 shadow-2xs space-y-4 hover:border-[#00319D]/40 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-[#00319D] bg-[#F7F6F3] px-2 py-0.5 rounded border border-[#E8E6E1]">
                              {partner.partnerId}
                            </span>
                            <span className="text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2">
                              {partner.status}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-[#1A1A1A] mt-1.5">{partner.companyName}</h3>
                          <span className="text-xs text-[#6B6860]">{partner.type}</span>
                        </div>

                        {/* Management Reassign Button */}
                        {isManagement && (
                          <button
                            onClick={() => {
                              setReassignModalPartnerId(partner.partnerId);
                              setNewOwnerTargetId(activeOwner.uid);
                            }}
                            className="rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] px-2.5 py-1 text-[11px] font-bold text-[#00319D] hover:bg-[#E8E6E1] transition-colors"
                          >
                            Reassign Owner
                          </button>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-[#E8E6E1] pt-3 text-[#6B6860]">
                        <div>
                          <span className="text-[10px] uppercase font-bold block text-[#6B6860]">Contact Person</span>
                          <span className="font-semibold text-[#1A1A1A]">{partner.contactPerson}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold block text-[#6B6860]">Commission Rate</span>
                          <span className="font-bold text-[#00319D]">{partner.commissionRate}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold block text-[#6B6860]">Email</span>
                          <span className="text-[#1A1A1A] truncate block">{partner.email}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold block text-[#6B6860]">Onboarded Date</span>
                          <span className="text-[#1A1A1A]">{partner.onboardingDate}</span>
                        </div>
                      </div>

                      {/* Performance Rollup for this Partner */}
                      <div className="bg-[#F7F6F3] rounded-lg p-2.5 flex items-center justify-between text-xs">
                        <span className="text-[#6B6860]">Generated Leads:</span>
                        <strong className="text-[#00319D]">{partnerLeadsCount}</strong>
                        <span className="text-[#6B6860] ml-3">Bookings:</span>
                        <strong className="text-emerald-700">{partnerBookingsCount}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* REASSIGN PORTFOLIO OWNER MODAL (Management Only) */}
      {reassignModalPartnerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#1A1A1A]">Reassign Partner Portfolio Owner</h3>
            <p className="text-xs text-[#6B6860] leading-relaxed">
              When this partner is reassigned, portfolio attribution will automatically update across all leads sourced by this partner, while retaining each lead&apos;s original sales Owner.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#1A1A1A] mb-1">
                Select New Portfolio Owner:
              </label>
              <select
                value={newOwnerTargetId}
                onChange={(e) => setNewOwnerTargetId(e.target.value)}
                className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] p-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
              >
                {portfolioOwners.map((owner) => (
                  <option key={owner.uid} value={owner.uid}>
                    {owner.displayName} ({owner.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReassignModalPartnerId(null)}
                className="rounded-lg border border-[#E8E6E1] px-3 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3]"
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                className="rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A]"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
