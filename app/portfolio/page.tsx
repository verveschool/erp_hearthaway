'use client';

import { WorkspaceSearch } from '@/components/WorkspaceSearch';
import { matchesSearch } from '@/lib/utils';

import { useWorkspaceView } from '@/hooks/use-workspace-view';

import { WorkspaceMetric } from '@/components/WorkspaceMetric';
import { getLeadOwner } from '@/lib/lead-details';
import { PartnerOwnerDialog } from '@/components/PartnerOwnerDialog';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useHearthAway } from '@/lib/context';
import { AppUser, Student } from '@/lib/types';
import { leadPhoneCsv, parseLeadPhone } from '@/lib/lead-phone';
import { exportToCSV } from '@/lib/export-csv';
import {
  Layers,
  Users,
  Search,
  ArrowUpDown,
  Building,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  ChevronRight,
  TrendingUp,
  Briefcase,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Download,
  ShieldCheck,
  History,
  ArrowRight,
  ArrowRightLeft,
  FileSpreadsheet,
  CreditCard,
  User,
  BarChart3,
  Calendar,
  Zap,
  Globe,
  X,
  LayoutList,
  LayoutGrid,
  Flame,
  Sparkles,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface CustomTrendTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTrendTooltip = ({ active, payload, label }: CustomTrendTooltipProps) => {
  if (active && payload && payload.length) {
    const leadVolume = payload.find((p: any) => p.dataKey === 'leads')?.value || 0;
    const conversions = payload.find((p: any) => p.dataKey === 'conversions')?.value || 0;
    const rate = leadVolume > 0 ? ((conversions / leadVolume) * 100).toFixed(1) : '0.0';

    return (
      <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-3.5 shadow-xl text-xs space-y-2 min-w-[210px]">
        <div className="border-b border-[#E8E6E1] pb-1.5 flex items-center justify-between">
          <span className="font-bold text-[#1A1A1A]">{label}</span>
          <span className="text-xs uppercase font-bold text-[#6B6860]">6M Velocity</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[#6B6860]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00319D]" />
              Lead Generation Volume:
            </span>
            <span className="font-bold text-[#00319D]">{leadVolume}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[#6B6860]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Tenancy Conversions:
            </span>
            <span className="font-bold text-emerald-700">{conversions}</span>
          </div>
          <div className="pt-1.5 border-t border-[#E8E6E1] flex items-center justify-between text-xs">
            <span className="text-[#6B6860]">Conversion Efficiency:</span>
            <span className="font-bold text-[#1A1A1A] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">
              {rate}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function PortfolioPage() {
  const {
    currentUser,
    partners,
    students,
    activities,
    availableUsers,
    portfolioOwnerOptions,
    removeAllAccounts,
    reassignPartnerPortfolioOwner,
    setSelectedStudentId,
  } = useHearthAway();

  const isManagement = currentUser.role === 'management' || currentUser.role === 'admin';

  // Only current Firestore users can be selected as portfolio owners.
  // Partner records may contain historical names, so they must not manufacture users.
  const portfolioOwners = useMemo(() => {
    if (portfolioOwnerOptions.length) {
      return portfolioOwnerOptions.map((owner) => ({ ...owner, role: 'portfolio_owner', email: '' } as AppUser));
    }
    return availableUsers.filter((user) => user.uid && user.displayName?.trim() && user.role === 'portfolio_owner' &&
      user.status !== 'rejected' && user.status !== 'pending' && user.isApproved !== false)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [availableUsers, portfolioOwnerOptions]);

  // Selected portfolio owner for inspection:
  // If user is a Portfolio Owner, they ONLY see their own portfolio!
  // If user is Management, they can pick a Portfolio Owner or view "all"
  const [selectedOwnerId, setSelectedOwnerId] = useWorkspaceView<string>(currentUser.uid, 'selectedOwnerId', currentUser.role === 'portfolio_owner' ? currentUser.uid : 'all');

  // Effective Owner ID: strictly enforce that portfolio_owner role cannot inspect others
  const effectiveOwnerId = currentUser.role === 'portfolio_owner' ? currentUser.uid : selectedOwnerId;
  const activeOwner =
    effectiveOwnerId === 'all'
      ? {
          uid: 'all',
          displayName: 'All portfolios',
          role: 'management',
        }
      : portfolioOwners.find((po) => po.uid === effectiveOwnerId) || {
          uid: effectiveOwnerId,
          displayName: currentUser.displayName,
          email: currentUser.email,
          role: 'portfolio_owner',
        };

  // State for search, filters, and active tab
  const [leadFiltersOpen, setLeadFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useWorkspaceView<'leads' | 'partners' | 'audit'>(currentUser.uid, 'activeTab', 'leads');
  const [searchQuery, setSearchQuery] = useWorkspaceView<string>(currentUser.uid, 'searchQuery', '');
  const [filterPartner, setFilterPartner] = useWorkspaceView<string>(currentUser.uid, 'filterPartner', 'All');
  const [filterLeadStatus, setFilterLeadStatus] = useWorkspaceView<string>(currentUser.uid, 'filterLeadStatus', 'All');
  const [filterBookingStatus, setFilterBookingStatus] = useWorkspaceView<string>(currentUser.uid, 'filterBookingStatus', 'All');
  const [sortBy, setSortBy] = useWorkspaceView<'newest' | 'name' | 'budget'>(currentUser.uid, 'sortBy', 'newest');

  // Audit Trail filtering state
  const [auditSearchQuery, setAuditSearchQuery] = useWorkspaceView<string>(currentUser.uid, 'auditSearchQuery', '');
  const [auditFilterType, setAuditFilterType] = useWorkspaceView<string>(currentUser.uid, 'auditFilterType', 'All');
  const [auditFilterRole, setAuditFilterRole] = useWorkspaceView<string>(currentUser.uid, 'auditFilterRole', 'All');
  const [auditSortBy, setAuditSortBy] = useWorkspaceView<'newest' | 'oldest'>(currentUser.uid, 'auditSortBy', 'newest');

  // Reassignment Modal state for Management
  const [reassignModalPartnerId, setReassignModalPartnerId] = useState<string | null>(null);

  // Global Lead Search across all portfolios (independent of active owner)
  const [globalSearchQuery, setGlobalSearchQuery] = useWorkspaceView<string>(currentUser.uid, 'globalSearch', '');
  const [isGlobalSearchFocused, setIsGlobalSearchFocused] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(() => Boolean(globalSearchQuery));
  const globalSearchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (globalSearchOpen) globalSearchInput.current?.focus();
  }, [globalSearchOpen]);
  const globalSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (globalSearchRef.current && !globalSearchRef.current.contains(event.target as Node)) {
        setIsGlobalSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to look up student attribution (sourcing partner and portfolio owner)
  const getStudentAttribution = (student: Student) => {
    const partner = partners.find((p) => p.partnerId === student.partnerId);
    return {
      partnerName: partner?.companyName || student.partnerName || student.partnerId || 'Direct / Platform',
      ownerName: partner?.portfolioOwnerName || 'Unassigned Portfolio Owner',
      ownerId: partner?.portfolioOwnerId || '',
    };
  };

  // Matching leads across ALL portfolios (searching entire students list by name or student ID)
  const globalMatchingLeads = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return students.filter(s => matchesSearch(q, [s.fullName, s.studentId, s.email]));
  }, [students, globalSearchQuery]);

  // View mode for leads listing: 'table' or 'cards' (toggle in Portfolio header)
  const [leadViewMode, setLeadViewMode] = useWorkspaceView<'table' | 'cards'>(currentUser.uid, 'leadViewMode', 'table');

  // Quick filter chip selection for Generated Leads
  const [quickFilter, setQuickFilter] = useWorkspaceView<'all' | 'high_priority' | 'due_today' | 'awaiting_payment' | 'qualified' | 'booked'>(currentUser.uid, 'quickFilter', 'all');

  // Helper to determine if a student lead has follow-up SLA / tasks due today or urgent
  const isDueToday = (s: Student) => {
    if (!s.nextFollowUpAt) {
      return s.priority === 'Urgent';
    }
    const str = s.nextFollowUpAt.toLowerCase();
    const todayStr = new Date().toISOString().split('T')[0];
    return str.includes('today') || str.includes('hour') || str.includes(todayStr) || str.includes('immediate');
  };

  // 1. Partners onboarded by the active Portfolio Owner (or all partners if viewing 'all')
  const onboardedPartners = useMemo(() => {
    if (effectiveOwnerId === 'all') {
      return partners;
    }
    const matching = partners.filter((p) => p.portfolioOwnerId === effectiveOwnerId);
    if (matching.length === 0 && isManagement) {
      return partners;
    }
    return matching;
  }, [partners, effectiveOwnerId, isManagement]);

  // 2. Leads dynamically derived from those onboarded partners
  const portfolioLeads = useMemo(() => {
    if (effectiveOwnerId === 'all' || (isManagement && onboardedPartners.length === partners.length)) {
      return students;
    }
    const partnerIds = new Set(onboardedPartners.map((p) => p.partnerId));
    return students.filter((s) => partnerIds.has(s.partnerId));
  }, [students, onboardedPartners, effectiveOwnerId, isManagement, partners.length]);

  // Quick filter count rollups for the quick filter chips
  const quickFilterCounts = useMemo(() => {
    const list = globalSearchQuery.trim() !== '' ? students : portfolioLeads;
    return {
      all: list.length,
      high_priority: list.filter((s) => s.priority === 'High' || s.priority === 'Urgent').length,
      due_today: list.filter(isDueToday).length,
      awaiting_payment: list.filter((s) => s.bookingStatus === 'Payment Pending').length,
      qualified: list.filter((s) => s.leadStatus === 'Qualified').length,
      booked: list.filter((s) => s.bookingStatus === 'Booked' || s.bookingStatus === 'Move-in Confirmed').length,
    };
  }, [students, portfolioLeads, globalSearchQuery]);

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

  // Chart visual mode & controls for 6-Month Growth Trend
  const [chartType, setChartType] = useWorkspaceView<'area' | 'bar'>(currentUser.uid, 'chartType', 'area');
  const [isChartExpanded, setIsChartExpanded] = useWorkspaceView<boolean>(currentUser.uid, 'isChartExpanded', false);
  const [useBenchmarkModel, setUseBenchmarkModel] = useWorkspaceView<boolean>(currentUser.uid, 'useBenchmarkModel', false);
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // 6-Month Trend Data: 'Lead Generation Volume' vs 'Tenancy Conversions'
  const trendData = useMemo(() => {
    const now = new Date();
    const result: Array<{
      key: string;
      month: string;
      shortMonth: string;
      leads: number;
      conversions: number;
      conversionRate: number;
    }> = [];

    // Calibrated baseline benchmark scales for growth tracking demonstration
    const benchmarkScales = [
      { leads: 26, conversions: 6 },
      { leads: 34, conversions: 9 },
      { leads: 48, conversions: 15 },
      { leads: 62, conversions: 21 },
      { leads: 85, conversions: 32 },
      { leads: 112, conversions: 46 },
    ];

    // Generate chronological last 6 calendar months (oldest to newest)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const shortMonth = d.toLocaleString('en-US', { month: 'short' });
      const fullMonth = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      // Match leads created in this month
      const matchingLeads = portfolioLeads.filter((s) => {
        const rawDate = s.createdAt || s.updatedAt;
        if (!rawDate) return false;
        const leadDate = new Date(rawDate);
        if (isNaN(leadDate.getTime())) return false;
        return leadDate.getFullYear() === year && leadDate.getMonth() === monthIndex;
      });

      let leadCount = matchingLeads.length;
      let convCount = matchingLeads.filter(
        (s) => s.bookingStatus === 'Booked' || s.bookingStatus === 'Move-in Confirmed'
      ).length;

      // If user toggled benchmark model
      if (useBenchmarkModel) {
        const bm = benchmarkScales[5 - i];
        leadCount += bm.leads;
        convCount += bm.conversions;
      }

      const rate = leadCount > 0 ? Number(((convCount / leadCount) * 100).toFixed(1)) : 0;

      result.push({
        key: monthKey,
        month: fullMonth,
        shortMonth,
        leads: leadCount,
        conversions: convCount,
        conversionRate: rate,
      });
    }

    return result;
  }, [portfolioLeads, useBenchmarkModel]);

  // Aggregate stats across the 6-month timeline
  const chartAggregates = useMemo(() => {
    const total6mLeads = trendData.reduce((acc, m) => acc + m.leads, 0);
    const total6mConversions = trendData.reduce((acc, m) => acc + m.conversions, 0);
    const overallRate = total6mLeads > 0 ? ((total6mConversions / total6mLeads) * 100).toFixed(1) : '0.0';

    const currentMonthLeads = trendData[5]?.leads || 0;
    const prevMonthLeads = trendData[4]?.leads || 0;
    let momGrowth: number | null = null;
    if (prevMonthLeads > 0) {
      momGrowth = Math.round(((currentMonthLeads - prevMonthLeads) / prevMonthLeads) * 100);
    }

    const avgMonthlyLeads = Math.round(total6mLeads / 6);

    return {
      total6mLeads,
      total6mConversions,
      overallRate,
      momGrowth,
      avgMonthlyLeads,
    };
  }, [trendData]);

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    // If a global lead search query is active, search across ALL students without needing to switch owners
    const sourceLeads = globalSearchQuery.trim() !== '' ? students : portfolioLeads;

    const result = sourceLeads.filter((lead) => {
      // Global Search Filter (by student name or student ID)
      if (globalSearchQuery.trim() !== '') {
        const gq = globalSearchQuery.trim().toLowerCase();
        if (!matchesSearch(gq, [lead.fullName, lead.studentId, lead.email])) return false;
      }

      const matchSearch = matchesSearch(searchQuery, [lead.fullName, lead.studentId, lead.university, lead.destinationCity, lead.partnerName, getLeadOwner(lead).name, lead.salesOwnerName]);

      const matchPartner = filterPartner === 'All' || lead.partnerId === filterPartner;
      const matchLeadStatus = filterLeadStatus === 'All' || lead.leadStatus === filterLeadStatus;
      const matchBookingStatus =
        filterBookingStatus === 'All' || lead.bookingStatus === filterBookingStatus;

      // Quick filter chips check (High Priority, Due Today, Awaiting Payment, etc.)
      let matchQuickFilter = true;
      if (quickFilter === 'high_priority') {
        matchQuickFilter = lead.priority === 'High' || lead.priority === 'Urgent';
      } else if (quickFilter === 'due_today') {
        matchQuickFilter = isDueToday(lead);
      } else if (quickFilter === 'awaiting_payment') {
        matchQuickFilter = lead.bookingStatus === 'Payment Pending';
      } else if (quickFilter === 'qualified') {
        matchQuickFilter = lead.leadStatus === 'Qualified';
      } else if (quickFilter === 'booked') {
        matchQuickFilter = lead.bookingStatus === 'Booked' || lead.bookingStatus === 'Move-in Confirmed';
      }

      return matchSearch && matchPartner && matchLeadStatus && matchBookingStatus && matchQuickFilter;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
      if (sortBy === 'budget') return (b.budget || 0) - (a.budget || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [students, portfolioLeads, globalSearchQuery, searchQuery, filterPartner, filterLeadStatus, filterBookingStatus, sortBy, quickFilter]);

  // Filtered & Sorted Activities for Audit Trail
  const filteredActivities = useMemo(() => {
    const result = activities.filter((act) => {
      const q = auditSearchQuery.trim().toLowerCase();
      const matchSearch = matchesSearch(q, [act.description, act.activityType, act.performedBy?.name, act.studentId, act.activityId]);

      let matchType = true;
      if (auditFilterType !== 'All') {
        if (auditFilterType === 'reassignments') {
          matchType =
            act.activityType.includes('Reassigned') ||
            act.activityType.includes('Owner');
        } else if (auditFilterType === 'lead_status') {
          matchType =
            act.activityType.includes('Stage') ||
            act.activityType.includes('Status') ||
            act.activityType.includes('Lead');
        } else if (auditFilterType === 'payments') {
          matchType = act.activityType.includes('Payment');
        } else if (auditFilterType === 'partners') {
          matchType = act.activityType.includes('Partner');
        } else {
          matchType = act.activityType === auditFilterType;
        }
      }

      const matchRole =
        auditFilterRole === 'All' || act.performedBy?.role === auditFilterRole;

      return matchSearch && matchType && matchRole;
    });

    result.sort((a, b) => {
      if (auditSortBy === 'oldest') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return result;
  }, [activities, auditSearchQuery, auditFilterType, auditFilterRole, auditSortBy]);

  // Audit Trail summary metrics
  const auditMetrics = useMemo(() => {
    const total = activities.length;
    const reassignments = activities.filter(
      (a) => a.activityType.includes('Reassigned') || a.activityType.includes('Owner')
    ).length;
    const statusUpdates = activities.filter(
      (a) =>
        a.activityType.includes('Stage') ||
        a.activityType.includes('Status') ||
        a.activityType.includes('Lead')
    ).length;
    const paymentVerifications = activities.filter((a) => a.activityType.includes('Payment')).length;

    return {
      total,
      reassignments,
      statusUpdates,
      paymentVerifications,
    };
  }, [activities]);

  // Handle CSV Exports
  const handleExportLeadsCSV = () => {
    exportToCSV(
      `hearthaway-leads-${new Date().toISOString().split('T')[0]}`,
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
        { header: 'Lead Status', accessor: (s) => s.leadStatus },
        { header: 'Booking Status', accessor: (s) => s.bookingStatus },
        { header: 'Accommodation Status', accessor: (s) => s.accommodationStatus },
        { header: 'Budget', accessor: (s) => `${s.currency || 'GBP'} ${s.budget}` },
        { header: 'Created Date', accessor: (s) => s.createdAt },
      ],
      filteredLeads
    );
  };

  const handleExportPartnersCSV = () => {
    exportToCSV(
      `hearthaway-partners-${new Date().toISOString().split('T')[0]}`,
      [
        { header: 'Partner ID', accessor: (p) => p.partnerId },
        { header: 'Company Name', accessor: (p) => p.companyName },
        { header: 'Partner Type', accessor: (p) => p.type },
        { header: 'Contact Person', accessor: (p) => p.contactPerson },
        { header: 'Email Address', accessor: (p) => p.email },
        { header: 'Phone Number', accessor: (p) => p.phone },
        { header: 'City', accessor: (p) => p.city },
        { header: 'State', accessor: (p) => p.state },
        { header: 'Country', accessor: (p) => p.country },
        { header: 'Portfolio Owner', accessor: (p) => p.portfolioOwnerName },
        { header: 'Agreement Status', accessor: (p) => p.agreementStatus },
        { header: 'Agreement Type', accessor: (p) => p.agreementType },
        { header: 'Commission Rate (%)', accessor: (p) => `${p.commissionRate}%` },
        { header: 'Agreement Terms', accessor: (p) => p.agreementTerms || '' },
        { header: 'Onboarding Date', accessor: (p) => p.onboardingDate },
        { header: 'Partner Status', accessor: (p) => p.status },
      ],
      onboardedPartners
    );
  };

  const handleExportAuditCSV = () => {
    exportToCSV(
      `hearthaway-audit-trail-${new Date().toISOString().split('T')[0]}`,
      [
        { header: 'Activity ID', accessor: (a) => a.activityId },
        { header: 'Timestamp', accessor: (a) => a.timestamp },
        { header: 'Action Type', accessor: (a) => a.activityType },
        { header: 'Actor Name', accessor: (a) => a.performedBy?.name || 'System' },
        { header: 'Actor Role', accessor: (a) => a.performedBy?.role || '' },
        { header: 'Related Entity ID', accessor: (a) => a.studentId },
        { header: 'Description', accessor: (a) => a.description },
        { header: 'Previous Value', accessor: (a) => a.oldValue || '' },
        { header: 'New Value', accessor: (a) => a.newValue || '' },
      ],
      filteredActivities
    );
  };

  const reassignPartner = partners.find((partner) => partner.partnerId === reassignModalPartnerId);

  return (
    <div className="ha-workspace workspace-compact portfolio-workspace">
      {/* Top Header */}
      <div className="ha-page-header">
        <div>
          <div className="workspace-heading">
            <h1 className="ha-title">Portfolio</h1>
            <div className="workspace-heading-actions">
              <button type="button" className="workspace-icon-button" aria-expanded={globalSearchOpen}
                aria-controls="portfolio-global-search" aria-label="Search across portfolios" title="Search across portfolios"
                data-active={Boolean(globalSearchQuery.trim())}
                onClick={() => {
                  if (globalSearchOpen) {
                    setGlobalSearchQuery('');
                    setIsGlobalSearchFocused(false);
                  }
                  setGlobalSearchOpen(!globalSearchOpen);
                }}>
                <Search size={21} aria-hidden="true" />
              </button>
              <button type="button" className="workspace-icon-button" aria-expanded={isChartExpanded}
                aria-controls="portfolio-growth" aria-label="Portfolio growth" title="Portfolio growth"
                onClick={() => setIsChartExpanded(!isChartExpanded)}>
                <TrendingUp size={21} aria-hidden="true" />
              </button>

            {/* Management View Selector: Inspect different Portfolio Owners */}
            {isManagement && (
              <div className="workspace-scope">
                <select
                  aria-label="Portfolio scope"
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] focus:outline-none focus:border-[#00319D] cursor-pointer"
                >
                  <option value="all">All portfolios</option>
                  {portfolioOwners.map((owner) => (
                    <option key={owner.uid} value={owner.uid}>
                      {owner.displayName} ({partners.filter((p) => p.portfolioOwnerId === owner.uid).length} partners)
                    </option>
                  ))}
                </select>
              </div>
            )}
            </div>
          </div>

          {/* DEDICATED GLOBAL LEAD SEARCH INPUT IN HEADER (Cross-Portfolio) */}
          <div className="relative mt-2 z-20" id="portfolio-global-search" hidden={!globalSearchOpen} ref={globalSearchRef} onKeyDown={event => { if (event.key === 'Escape' && isGlobalSearchFocused) { event.preventDefault(); setIsGlobalSearchFocused(false); } }}>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="h-4 w-4 text-[#00319D]" />
                </div>
                <input
                  ref={globalSearchInput}
                  aria-label="Search all portfolios"
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setIsGlobalSearchFocused(true);
                  }}
                  onFocus={() => setIsGlobalSearchFocused(true)}
                  placeholder="Search all portfolios"
                  className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-9 py-2 text-xs font-medium text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-none transition-all"
                />
                {globalSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setGlobalSearchQuery('');
                      setIsGlobalSearchFocused(false);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B6860] hover:text-[#1A1A1A] cursor-pointer"
                    title="Clear cross-portfolio search"
                    aria-label="Clear global search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

            </div>

            {/* Instant Global Search Results Dropdown */}
            {isGlobalSearchFocused && globalSearchQuery.trim() !== '' && (
              <div className="absolute left-0 right-0 mt-2 max-h-96 overflow-y-auto rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xl z-50 divide-y divide-[#E8E6E1]">
                <div className="bg-[#F7F6F3] px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-10 border-b border-[#E8E6E1]">
                  <span className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-[#00319D]" />
                    {globalMatchingLeads.length} {globalMatchingLeads.length === 1 ? 'match' : 'matches'} across portfolios
                  </span>
                </div>

                {globalMatchingLeads.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Search className="h-7 w-7 text-[#6B6860] mx-auto opacity-50" />
                    <p className="text-xs font-bold text-[#1A1A1A]">No leads found across any portfolio</p>
                    <p className="text-xs text-[#6B6860]">
                      No student matches &ldquo;{globalSearchQuery}&rdquo; by name, ID, or email.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E8E6E1]">
                    {globalMatchingLeads.slice(0, 10).map((lead) => {
                      const attr = getStudentAttribution(lead);
                      return (
                        <div
                          key={lead.id}
                          className="p-3 sm:px-4 hover:bg-[#F7F6F3]/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                          onClick={() => {
                            setSelectedStudentId(lead.studentId);
                            setIsGlobalSearchFocused(false);
                          }}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#1A1A1A] hover:text-[#00319D]">
                                {lead.fullName}
                              </span>
                              <span className="font-mono text-xs font-bold bg-[#00319D]/10 text-[#00319D] px-1.5 py-0.5 rounded border border-[#00319D]/20">
                                {lead.studentId}
                              </span>
                              <span
                                className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                  lead.bookingStatus === 'Booked' || lead.bookingStatus === 'Move-in Confirmed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : lead.bookingStatus === 'Payment Pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-zinc-100 text-zinc-700'
                                }`}
                              >
                                {lead.bookingStatus}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6B6860]">
                              <span>
                                Portfolio Owner: <strong className="text-[#00319D]">{attr.ownerName}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Partner: <strong className="text-[#1A1A1A]">{attr.partnerName}</strong>
                              </span>
                              <span>•</span>
                              <span>{lead.destinationCity || 'UK'} • {lead.university}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentId(lead.studentId);
                                setIsGlobalSearchFocused(false);
                              }}
                              className="rounded-lg bg-[#00319D] text-[#FFFFFF] px-3 py-1.5 text-xs font-bold hover:bg-[#00257A] transition-colors cursor-pointer shadow-2xs"
                            >
                              Inspect Dossier
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('leads');
                                setSearchQuery(lead.studentId);
                                setIsGlobalSearchFocused(false);
                              }}
                              className="rounded-lg bg-[#FFFFFF] border border-[#E8E6E1] text-[#1A1A1A] px-2.5 py-1.5 text-xs font-medium hover:bg-[#F7F6F3] transition-colors cursor-pointer"
                              title="Focus in Generated Leads Table"
                            >
                              View in leads
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {globalMatchingLeads.length > 10 && (
                      <div className="bg-[#F7F6F3]/50 px-4 py-2 text-center text-xs text-[#6B6860]">
                        Showing top 10 of <strong>{globalMatchingLeads.length}</strong> matches. Filter further in table or scroll table view.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

            {/* Key Metrics */}
            <dl className="ha-metrics workspace-metrics mt-2">
              <WorkspaceMetric label="Partners">{metrics.totalPartners}</WorkspaceMetric>
              <WorkspaceMetric label="Leads">{metrics.totalLeads}</WorkspaceMetric>
              <WorkspaceMetric label="Tenancies">{metrics.bookedLeads}</WorkspaceMetric>
              <WorkspaceMetric label="Activity">{auditMetrics.total}</WorkspaceMetric>
            </dl>

          {/* Recharts-based 6-Month Growth Trend: Lead Generation Volume vs Tenancy Conversions */}
          <div className="portfolio-growth" id="portfolio-growth" hidden={!isChartExpanded}>
            {/* Header with Title, Stats & View Controls */}
            <div className="flex flex-col gap-3 border-b border-[#E8E6E1] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00319D]/10 text-[#00319D]">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-bold text-[#1A1A1A] tracking-tight">
                    Portfolio growth
                  </h3>
                </div>
              </div>

              {/* Badges & Controls */}
              <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2.5">
                {/* 6M Summary Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums sm:mr-auto">
                  <div className="px-2 py-1 flex items-center gap-1.5 font-bold text-[#00319D]">
                    <span className="h-2 w-2 rounded-full bg-[#00319D]" />
                    <span>6M Leads: <strong>{chartAggregates.total6mLeads}</strong></span>
                  </div>
                  <div className="h-3.5 w-px bg-[#E8E6E1]" />
                  <div className="px-2 py-1 flex items-center gap-1.5 font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    <span>Conversions: <strong>{chartAggregates.total6mConversions}</strong></span>
                  </div>
                  <div className="h-3.5 w-px bg-[#E8E6E1]" />
                  <div className="px-2 py-1 flex items-center gap-1.5 font-bold text-[#1A1A1A]">
                    <span>Rate: <strong>{chartAggregates.overallRate}%</strong></span>
                  </div>
                </div>

                {isChartExpanded && <>
                {/* Benchmark Mode Toggle */}
                <button
                  type="button"
                  aria-pressed={useBenchmarkModel}
                  onClick={() => setUseBenchmarkModel(!useBenchmarkModel)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    useBenchmarkModel
                      ? 'border-[#00319D] bg-[#00319D] text-[#FFFFFF] shadow-2xs'
                      : 'border-[#E8E6E1] bg-[#FFFFFF] text-[#6B6860] hover:bg-[#F7F6F3] hover:text-[#1A1A1A]'
                  }`}
                  title="Toggle 6-month growth benchmark model projection"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>{useBenchmarkModel ? 'Benchmark: ON' : 'Benchmark Mode'}</span>
                </button>

                {/* Chart Type Toggle: Area vs Bar */}
                <div className="flex items-center rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] p-0.5">
                  <button
                    aria-pressed={chartType === 'area'}
                    type="button"
                    onClick={() => setChartType('area')}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      chartType === 'area'
                        ? 'bg-[#FFFFFF] text-[#00319D] shadow-2xs'
                        : 'text-[#6B6860] hover:text-[#1A1A1A]'
                    }`}
                    title="Continuous Area Trend"
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Trend</span>
                  </button>
                  <button
                    aria-pressed={chartType === 'bar'}
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      chartType === 'bar'
                        ? 'bg-[#FFFFFF] text-[#00319D] shadow-2xs'
                        : 'text-[#6B6860] hover:text-[#1A1A1A]'
                    }`}
                    title="Side-by-Side Comparison Bars"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Bars</span>
                  </button>
                </div>

                </>}
              </div>
            </div>

            {/* Expandable Chart Canvas */}
            {isChartExpanded && (
              <div className="space-y-4">
                {/* Recharts Canvas */}
                <div className="h-72 w-full pt-2">
                  {!isMounted ? (
                    <div className="h-full w-full flex items-center justify-center bg-[#F7F6F3]/50 rounded-xl animate-pulse">
                      <span className="text-xs text-[#6B6860] font-medium">Loading growth trend analytics...</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'area' ? (
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="leadVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00319D" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="#00319D" stopOpacity={0.0} />
                            </linearGradient>
                            <linearGradient id="conversionGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#059669" stopOpacity={0.45} />
                              <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
                          <XAxis
                            dataKey="shortMonth"
                            stroke="#6B6860"
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: '#E8E6E1' }}
                          />
                          <YAxis
                            stroke="#6B6860"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomTrendTooltip />} />
                          <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                            formatter={(value) => (
                              <span className="text-[#1A1A1A] font-semibold text-xs ml-1">
                                {value === 'leads' ? 'Lead Generation Volume' : 'Tenancy Conversions'}
                              </span>
                            )}
                          />
                          <Area
                            isAnimationActive={false}
                            type="monotone"
                            dataKey="leads"
                            name="leads"
                            stroke="#00319D"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#leadVolumeGrad)"
                            dot={{ r: 4, fill: '#00319D', strokeWidth: 1, stroke: '#FFFFFF' }}
                            activeDot={{ r: 6, stroke: '#00319D', strokeWidth: 2, fill: '#FFFFFF' }}
                          />
                          <Area
                            isAnimationActive={false}
                            type="monotone"
                            dataKey="conversions"
                            name="conversions"
                            stroke="#059669"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#conversionGrad)"
                            dot={{ r: 4, fill: '#059669', strokeWidth: 1, stroke: '#FFFFFF' }}
                            activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2, fill: '#FFFFFF' }}
                          />
                        </AreaChart>
                      ) : (
                        <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E8E6E1" vertical={false} />
                          <XAxis
                            dataKey="shortMonth"
                            stroke="#6B6860"
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: '#E8E6E1' }}
                          />
                          <YAxis
                            stroke="#6B6860"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomTrendTooltip />} />
                          <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="square"
                            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 600 }}
                            formatter={(value) => (
                              <span className="text-[#1A1A1A] font-semibold text-xs ml-1">
                                {value === 'leads' ? 'Lead Generation Volume' : 'Tenancy Conversions'}
                              </span>
                            )}
                          />
                          <Bar
                            isAnimationActive={false}
                            dataKey="leads"
                            name="leads"
                            fill="#00319D"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                          <Bar
                            isAnimationActive={false}
                            dataKey="conversions"
                            name="conversions"
                            fill="#059669"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>

                {/* 6-Month Velocity Pills Breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-[#E8E6E1]">
                  {trendData.map((m) => (
                    <div
                      key={m.key}
                      className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-2.5 text-center transition-all hover:bg-[#FFFFFF] hover:border-[#00319D]/30 shadow-2xs"
                    >
                      <span className="text-xs font-bold text-[#6B6860] uppercase block">
                        {m.month}
                      </span>
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-xs">
                        <span className="font-bold text-[#00319D]" title="Lead Generation Volume">
                          {m.leads} <span className="text-xs font-normal text-[#6B6860]">vol</span>
                        </span>
                        <span className="text-[#6B6860] text-xs">→</span>
                        <span className="font-bold text-emerald-700" title="Tenancy Conversions">
                          {m.conversions} <span className="text-xs font-normal text-[#6B6860]">conv</span>
                        </span>
                      </div>
                      <span className="inline-block mt-1 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded">
                        {m.conversionRate}% conv
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sub-Tabs: Generated Leads, Onboarded Partners, and Audit Trail */}
          <div className="workspace-subnav">
            <div className="ha-tabs workspace-tabs text-sm font-semibold">
              <button
                aria-pressed={activeTab === 'leads'}
                onClick={() => setActiveTab('leads')}
                className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'leads'
                    ? 'border-[#00319D] text-[#00319D]'
                    : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
                }`}
              >
                Leads
              </button>
              <button
                aria-pressed={activeTab === 'partners'}
                onClick={() => setActiveTab('partners')}
                className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'partners'
                    ? 'border-[#00319D] text-[#00319D]'
                    : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
                }`}
              >
                Partners
              </button>
              <button
                aria-pressed={activeTab === 'audit'}
                onClick={() => setActiveTab('audit')}
                className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'audit'
                    ? 'border-[#00319D] text-[#00319D]'
                    : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
                }`}
              >
                Activity log
              </button>
            </div>

            {/* Toggle switch between Card View and Table View for lead listings */}
            {activeTab === 'leads' && (
              <div className="workspace-view-switch">
                <div className="flex items-center rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] p-0.5 shadow-2xs">
                  <button
                    aria-pressed={leadViewMode === 'table'}
                    type="button"
                    onClick={() => setLeadViewMode('table')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      leadViewMode === 'table'
                        ? 'bg-[#FFFFFF] text-[#00319D] shadow-2xs'
                        : 'text-[#6B6860] hover:text-[#1A1A1A]'
                    }`}
                    title="Table view" aria-label="Table view"
                  >
                    <LayoutList size={19} aria-hidden="true" />
                  </button>
                  <button
                    aria-pressed={leadViewMode === 'cards'}
                    type="button"
                    onClick={() => setLeadViewMode('cards')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      leadViewMode === 'cards'
                        ? 'bg-[#FFFFFF] text-[#00319D] shadow-2xs'
                        : 'text-[#6B6860] hover:text-[#1A1A1A]'
                    }`}
                    title="Card view" aria-label="Card view"
                  >
                    <LayoutGrid size={19} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="workspace-content">
        {/* TAB 1: GENERATED LEADS */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Search, Filter & CSV Export Toolbar */}
            <div className="workspace-toolbar">
              <div className="workspace-filter-bar">
                <WorkspaceSearch label="Search portfolio leads" placeholder="Search leads" value={searchQuery} onChange={setSearchQuery} />

                <button type="button" className="workspace-icon-button workspace-filter-toggle"
                  aria-label="Lead filters" title="Lead filters" aria-expanded={leadFiltersOpen} aria-controls="portfolio-filters"
                  data-active={filterPartner !== 'All' || filterLeadStatus !== 'All' || filterBookingStatus !== 'All' || sortBy !== 'newest' || quickFilter !== 'all'}
                  onClick={() => setLeadFiltersOpen(!leadFiltersOpen)}>
                  <SlidersHorizontal size={20} aria-hidden="true" />
                </button>
                <div id="portfolio-filters" className="workspace-filter-fields" data-open={leadFiltersOpen}>
                  {/* Sourcing Partner Filter */}
                  <select
                    aria-label="Filter by partner"
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
                    aria-label="Filter by lead status"
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
                    aria-label="Filter by booking status"
                    value={filterBookingStatus}
                    onChange={(e) => setFilterBookingStatus(e.target.value)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="All">All Booking Statuses</option>
                    <option value="Not Started">Not Started</option>
                    <option value="Processing">Processing</option>
                    <option value="Payment Pending">Payment Pending</option>
                    <option value="Booked">Booked</option>
                    <option value="Move-in Confirmed">Move-in Confirmed</option>
                  </select>

                  {/* Sort Order */}
                  <select
                    aria-label="Sort leads"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="name">Sort: Name (A-Z)</option>
                    <option value="budget">Sort: Highest Budget</option>
                  </select>

                  {/* CSV Export Button */}
                  <button
                    onClick={handleExportLeadsCSV}
                    disabled={filteredLeads.length === 0}
                    className="workspace-icon-button"
                    title="Export leads CSV" aria-label="Export leads CSV"
                  >
                    <Download size={20} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="portfolio-quick-filters" data-open={leadFiltersOpen} aria-label="Quick filters">
                {/* All Leads Chip */}
                <button
                  type="button"
                  aria-pressed={quickFilter === 'all'}
                  onClick={() => setQuickFilter('all')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    quickFilter === 'all'
                      ? 'bg-[#00319D] text-[#FFFFFF] shadow-2xs'
                      : 'bg-[#F7F6F3] text-[#6B6860] border border-[#E8E6E1] hover:bg-[#FFFFFF] hover:text-[#1A1A1A]'
                  }`}
                >
                  <span>All Leads</span>
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full ${
                      quickFilter === 'all'
                        ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                        : 'bg-[#E8E6E1] text-[#6B6860]'
                    }`}
                  >
                    {quickFilterCounts.all}
                  </span>
                </button>

                {/* High Priority Chip */}
                <button
                  type="button"
                  aria-pressed={quickFilter === 'high_priority'}
                  onClick={() => setQuickFilter(quickFilter === 'high_priority' ? 'all' : 'high_priority')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    quickFilter === 'high_priority'
                      ? 'bg-rose-700 text-[#FFFFFF] shadow-2xs'
                      : 'bg-[#F7F6F3] text-rose-800 border border-rose-200/80 hover:bg-rose-50'
                  }`}
                  title="Filter leads with High or Urgent priority"
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>High Priority</span>
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full ${
                      quickFilter === 'high_priority'
                        ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                        : 'bg-rose-100 text-rose-800 font-bold'
                    }`}
                  >
                    {quickFilterCounts.high_priority}
                  </span>
                </button>

                {/* Due Today Chip */}
                <button
                  type="button"
                  aria-pressed={quickFilter === 'due_today'}
                  onClick={() => setQuickFilter(quickFilter === 'due_today' ? 'all' : 'due_today')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    quickFilter === 'due_today'
                      ? 'bg-amber-600 text-[#FFFFFF] shadow-2xs'
                      : 'bg-[#F7F6F3] text-amber-900 border border-amber-200/80 hover:bg-amber-50'
                  }`}
                  title="Filter leads with follow-up SLA or tasks due today"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Due Today</span>
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full ${
                      quickFilter === 'due_today'
                        ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                        : 'bg-amber-100 text-amber-900 font-bold'
                    }`}
                  >
                    {quickFilterCounts.due_today}
                  </span>
                </button>

                {/* Awaiting Payment Chip */}
                <button
                  type="button"
                  aria-pressed={quickFilter === 'awaiting_payment'}
                  onClick={() =>
                    setQuickFilter(quickFilter === 'awaiting_payment' ? 'all' : 'awaiting_payment')
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    quickFilter === 'awaiting_payment'
                      ? 'bg-purple-700 text-[#FFFFFF] shadow-2xs'
                      : 'bg-[#F7F6F3] text-purple-900 border border-purple-200/80 hover:bg-purple-50'
                  }`}
                  title="Filter leads awaiting deposit or rent payment verification"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Awaiting Payment</span>
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full ${
                      quickFilter === 'awaiting_payment'
                        ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                        : 'bg-purple-100 text-purple-900 font-bold'
                    }`}
                  >
                    {quickFilterCounts.awaiting_payment}
                  </span>
                </button>

                {/* Qualified Leads Chip */}
                <button
                  type="button"
                  aria-pressed={quickFilter === 'qualified'}
                  onClick={() => setQuickFilter(quickFilter === 'qualified' ? 'all' : 'qualified')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    quickFilter === 'qualified'
                      ? 'bg-blue-700 text-[#FFFFFF] shadow-2xs'
                      : 'bg-[#F7F6F3] text-blue-900 border border-blue-200/80 hover:bg-blue-50'
                  }`}
                  title="Filter qualified leads ready for accommodation booking"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Qualified</span>
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full ${
                      quickFilter === 'qualified'
                        ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                        : 'bg-blue-100 text-blue-900 font-bold'
                    }`}
                  >
                    {quickFilterCounts.qualified}
                  </span>
                </button>

                {/* Booked Tenancies Chip */}
                <button
                  type="button"
                  aria-pressed={quickFilter === 'booked'}
                  onClick={() => setQuickFilter(quickFilter === 'booked' ? 'all' : 'booked')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    quickFilter === 'booked'
                      ? 'bg-emerald-700 text-[#FFFFFF] shadow-2xs'
                      : 'bg-[#F7F6F3] text-emerald-900 border border-emerald-200/80 hover:bg-emerald-50'
                  }`}
                  title="Filter confirmed tenancies and move-in ready leads"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Booked Tenancies</span>
                  <span
                    className={`text-xs px-1.5 py-0.2 rounded-full ${
                      quickFilter === 'booked'
                        ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                        : 'bg-emerald-100 text-emerald-900 font-bold'
                    }`}
                  >
                    {quickFilterCounts.booked}
                  </span>
                </button>
              </div>

              <p className="workspace-result-count" role="status">
                {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
                {globalSearchQuery.trim() ? ' across all portfolios' : ''}
              </p>
            </div>

            {/* Leads Listing: Card View or Table View based on leadViewMode */}
            {filteredLeads.length === 0 ? (
              <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-12 text-center space-y-3">
                <Users className="h-8 w-8 text-[#6B6860] mx-auto" />
                <h3 className="text-sm font-bold text-[#1A1A1A]">No Leads Found</h3>
                <p className="text-xs text-[#6B6860] max-w-md mx-auto">
                  {portfolioLeads.length === 0
                    ? `No leads have been received yet from the partners onboarded by ${activeOwner.displayName}.`
                    : 'No leads match your current search and filter criteria.'}
                </p>
                {quickFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setQuickFilter('all')}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#00319D] bg-[#00319D]/5 px-3 py-1.5 text-xs font-bold text-[#00319D] hover:bg-[#00319D]/15 transition-all cursor-pointer shadow-2xs"
                  >
                    Reset Quick Filters
                  </button>
                )}
              </div>
            ) : leadViewMode === 'cards' ? (
              /* CARD VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredLeads.map((lead) => {
                  const attr = getStudentAttribution(lead);
                  const isUrgent = lead.priority === 'Urgent';
                  const isHigh = lead.priority === 'High';
                  const dueToday = isDueToday(lead);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedStudentId(lead.studentId)}
                      className="group rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 shadow-2xs hover:shadow-md hover:border-[#00319D]/40 transition-all cursor-pointer flex flex-col justify-between space-y-3.5"
                    >
                      {/* Card Top: Student Name, ID & Priority */}
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-sm text-[#1A1A1A] group-hover:text-[#00319D] transition-colors leading-tight">
                              {lead.fullName}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="font-mono text-xs font-bold text-[#00319D] bg-[#00319D]/10 px-1.5 py-0.2 rounded border border-[#00319D]/20">
                                {lead.studentId}
                              </span>
                              {dueToday && (
                                <span className="inline-flex items-center gap-1 font-bold text-xs text-amber-900 bg-amber-50 border border-amber-200/90 px-1.5 py-0.2 rounded">
                                  <Clock className="h-3 w-3 text-amber-600" />
                                  Due Today
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Priority Badge */}
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                              isUrgent
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : isHigh
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : lead.priority === 'Medium'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                            }`}
                          >
                            {lead.priority}
                          </span>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              lead.leadStatus === 'New'
                                ? 'bg-blue-100 text-blue-800'
                                : lead.leadStatus === 'Qualified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : lead.leadStatus === 'Contacted'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            Lead: {lead.leadStatus}
                          </span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                              lead.bookingStatus === 'Booked' || lead.bookingStatus === 'Move-in Confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : lead.bookingStatus === 'Payment Pending'
                                ? 'bg-purple-100 text-purple-800'
                                : lead.bookingStatus === 'Processing'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            Booking: {lead.bookingStatus}
                          </span>
                        </div>
                      </div>

                      {/* Card Middle: University, City, Partner, Owner */}
                      <div className="space-y-1.5 text-xs text-[#6B6860] border-t border-[#E8E6E1]/80 pt-2.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building className="h-3.5 w-3.5 text-[#6B6860] shrink-0" />
                          <span className="truncate">
                            <strong className="text-[#1A1A1A]">{lead.university}</strong> • {lead.destinationCity}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 truncate">
                          <Users className="h-3.5 w-3.5 text-[#00319D] shrink-0" />
                          <span className="truncate">
                            Partner: <strong className="text-[#1A1A1A]">{attr.partnerName}</strong>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 text-[#6B6860]">
                          <span>
                            Owner: <strong className="text-[#00319D]">{attr.ownerName}</strong>
                          </span>
                          <span>
                            Intake: <strong className="text-[#1A1A1A]">{lead.intake}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Quick Actions */}
                      <div
                        className="flex items-center justify-between pt-2.5 border-t border-[#E8E6E1]/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          {parseLeadPhone(lead.phone) && (
                            <a
                              href={leadPhoneCsv(lead.phone)}
                              className="p-1.5 rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] text-[#6B6860] hover:text-[#00319D] hover:bg-[#FFFFFF] transition-colors"
                              title={`Call ${lead.phone}`}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="p-1.5 rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] text-[#6B6860] hover:text-[#00319D] hover:bg-[#FFFFFF] transition-colors"
                              title={`Email ${lead.email}`}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {lead.budget && (
                            <span className="text-xs font-bold text-[#1A1A1A] bg-[#F7F6F3] px-2 py-1 rounded-md border border-[#E8E6E1]">
                              £{lead.budget}/wk
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(lead.studentId)}
                          className="ha-primary-action"
                        >
                          Open lead
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
                <div className="ha-table-scroll">
                  <table className="ha-table portfolio-leads-table">
                    <thead>
                      <tr>
                        <th scope="col" className="py-3 px-4 font-bold">Student</th>
                        <th scope="col" className="py-3 px-4 font-bold">Sourcing Partner</th>
                        <th scope="col" className="py-3 px-4 font-bold">Lead Owner</th>
                        <th scope="col" className="py-3 px-4 font-bold"><span className="hidden md:inline">University &amp; </span>City</th>
                        <th scope="col" className="py-3 px-4 font-bold">Lead Status</th>
                        <th scope="col" className="py-3 px-4 font-bold">Booking Status</th>
                        <th scope="col" className="py-3 px-4 font-bold">Intake</th>
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
                            <button type="button" className="workspace-record-link" onClick={(event) => {
                              event.stopPropagation();
                              setSelectedStudentId(lead.studentId);
                            }}>{lead.fullName}</button>
                            <div className="font-mono text-xs text-[#00319D]">{lead.studentId}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#1A1A1A]">
                              {lead.partnerName || lead.partnerId}
                            </div>
                            <div className="text-xs text-[#6B6860] font-mono flex items-center gap-1.5 flex-wrap">
                              <span>{lead.partnerId}</span>
                              {globalSearchQuery.trim() !== '' && (
                                <span className="font-sans font-bold text-[#00319D] bg-[#00319D]/10 px-1 py-0.2 rounded border border-[#00319D]/20">
                                  Owner: {getStudentAttribution(lead).ownerName}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-[#00319D]" />
                              <span className="font-bold text-[#1A1A1A]">
                                {getLeadOwner(lead).name}
                              </span>
                            </div>
                            <span className="text-xs text-[#6B6860]">Sales owner: {lead.salesOwnerName || 'Unassigned'}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-[#1A1A1A]">{lead.destinationCity}</div>
                            <div className="text-xs text-[#6B6860] truncate max-w-[140px]">
                              {lead.university}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
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
                              className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
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
            <div className="flex justify-end">
              {/* CSV Export Button */}
              <button
                onClick={handleExportPartnersCSV}
                disabled={onboardedPartners.length === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#00319D] bg-[#00319D]/5 px-3 py-1.5 text-xs font-bold text-[#00319D] hover:bg-[#00319D]/15 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs self-start sm:self-auto"
                title="Download partner list as CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export Partner List (CSV)</span>
              </button>
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
                            <span className="font-mono text-xs font-bold text-[#00319D] bg-[#F7F6F3] px-2 py-0.5 rounded border border-[#E8E6E1]">
                              {partner.partnerId}
                            </span>
                            <span className="text-xs font-bold uppercase rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2">
                              {partner.status}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-[#1A1A1A] mt-1.5">{partner.companyName}</h3>
                          <span className="text-xs text-[#6B6860]">{partner.type}</span>
                        </div>

                        {/* Management Reassign Button */}
                        {isManagement && (
                          <button
                            onClick={() => {
                              setReassignModalPartnerId(partner.partnerId);
                            }}
                            className="rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] px-2.5 py-1 text-xs font-bold text-[#00319D] hover:bg-[#E8E6E1] transition-colors cursor-pointer"
                          >
                            Reassign Owner
                          </button>
                        )}
                      </div>

                      {/* Contact Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs border-t border-[#E8E6E1] pt-3 text-[#6B6860]">
                        <div>
                          <span className="text-xs uppercase font-bold block text-[#6B6860]">Contact Person</span>
                          <span className="font-semibold text-[#1A1A1A]">{partner.contactPerson}</span>
                        </div>
                        <div>
                          <span className="text-xs uppercase font-bold block text-[#6B6860]">Commission Rate</span>
                          <span className="font-bold text-[#00319D]">{partner.commissionRate}%</span>
                        </div>
                        <div>
                          <span className="text-xs uppercase font-bold block text-[#6B6860]">Email</span>
                          <span className="text-[#1A1A1A] truncate block">{partner.email}</span>
                        </div>
                        <div>
                          <span className="text-xs uppercase font-bold block text-[#6B6860]">Onboarded Date</span>
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

        {/* TAB 3: PLATFORM AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            {/* Audit KPI Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E8E6E1] shadow-2xs">
                <span className="text-xs uppercase font-bold text-[#6B6860] block">Total Audit Entries</span>
                <span className="text-xl font-bold text-[#1A1A1A] mt-0.5 block">{auditMetrics.total}</span>
              </div>
              <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E8E6E1] shadow-2xs">
                <span className="text-xs uppercase font-bold text-[#6B6860] block">Partner Reassignments</span>
                <span className="text-xl font-bold text-[#00319D] mt-0.5 block">{auditMetrics.reassignments}</span>
              </div>
              <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E8E6E1] shadow-2xs">
                <span className="text-xs uppercase font-bold text-[#6B6860] block">Lead Stage Changes</span>
                <span className="text-xl font-bold text-blue-700 mt-0.5 block">{auditMetrics.statusUpdates}</span>
              </div>
              <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E8E6E1] shadow-2xs">
                <span className="text-xs uppercase font-bold text-[#6B6860] block">Payment Verifications</span>
                <span className="text-xl font-bold text-emerald-700 mt-0.5 block">{auditMetrics.paymentVerifications}</span>
              </div>
            </div>

            {/* Audit Search, Filter & CSV Export Toolbar */}
            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 shadow-2xs space-y-3">
              <div className="flex flex-col xl:flex-row gap-3">
                <WorkspaceSearch label="Search audit trail" value={auditSearchQuery} onChange={setAuditSearchQuery} />

                <div className="flex max-w-full flex-wrap items-center gap-2">
                  {/* Category Filter */}
                  <select
                    aria-label="Filter audit event type"
                    value={auditFilterType}
                    onChange={(e) => setAuditFilterType(e.target.value)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="All">All Action Types</option>
                    <option value="reassignments">Partner &amp; Sales Reassignments</option>
                    <option value="lead_status">Lead &amp; Booking Status Changes</option>
                    <option value="payments">Payment Verifications &amp; Proofs</option>
                    <option value="partners">Partner Onboarding &amp; Updates</option>
                  </select>

                  {/* Actor Role Filter */}
                  <select
                    aria-label="Filter audit role"
                    value={auditFilterRole}
                    onChange={(e) => setAuditFilterRole(e.target.value)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="All">All Actor Roles</option>
                    <option value="management">Management</option>
                    <option value="admin">Admin</option>
                    <option value="portfolio_owner">Portfolio Owner</option>
                    <option value="sales">Sales</option>
                    <option value="finance">Finance</option>
                    <option value="partner">Partner</option>
                  </select>

                  {/* Sort Order */}
                  <select
                    aria-label="Sort audit events"
                    value={auditSortBy}
                    onChange={(e) => setAuditSortBy(e.target.value as any)}
                    className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-2.5 py-2 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#00319D]"
                  >
                    <option value="newest">Sort: Most Recent First</option>
                    <option value="oldest">Sort: Oldest First</option>
                  </select>

                  {/* CSV Export Button */}
                  <button
                    onClick={handleExportAuditCSV}
                    disabled={filteredActivities.length === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-[#00319D] bg-[#00319D]/5 px-3 py-2 text-xs font-bold text-[#00319D] hover:bg-[#00319D]/15 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                    title="Export Audit Trail to CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export Audit Trail (CSV)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6B6860] pt-1 border-t border-[#E8E6E1]">
                <span>
                  Showing <strong>{filteredActivities.length}</strong> of <strong>{activities.length}</strong> logged platform events
                </span>
                <span className="text-xs font-medium text-[#00319D] flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Tamper-evident audit log synced via Firebase Firestore
                </span>
              </div>
            </div>

            {/* Audit Trail Table */}
            {filteredActivities.length === 0 ? (
              <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-12 text-center space-y-3">
                <History className="h-8 w-8 text-[#6B6860] mx-auto" />
                <h3 className="text-sm font-bold text-[#1A1A1A]">No Audit Records Found</h3>
                <p className="text-xs text-[#6B6860] max-w-md mx-auto">
                  {activities.length === 0
                    ? 'No significant platform actions have been logged yet. Future partner reassignments, lead status transitions, and payment verifications will appear here in real time.'
                    : 'No audit records match your current search and filter criteria.'}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xs overflow-hidden">
                <div className="ha-table-scroll">
                  <table className="ha-table responsive-records" role="table">
                    <thead>
                      <tr>
                        <th scope="col" className="py-3 px-4 font-bold">Timestamp &amp; Event ID</th>
                        <th scope="col" className="py-3 px-4 font-bold">Action Category</th>
                        <th scope="col" className="py-3 px-4 font-bold">Performed By</th>
                        <th scope="col" className="py-3 px-4 font-bold">Target Entity</th>
                        <th scope="col" className="py-3 px-4 font-bold">Audit Description</th>
                        <th scope="col" className="py-3 px-4 font-bold">State Transition</th>
                      </tr>
                    </thead>
                    <tbody role="rowgroup" className="divide-y divide-[#E8E6E1]">
                      {filteredActivities.map((act) => {
                        const isReassignment =
                          act.activityType.includes('Reassigned') || act.activityType.includes('Owner');
                        const isPayment = act.activityType.includes('Payment');
                        const isPartner = act.activityType.includes('Partner');
                        const isStatusChange =
                          act.activityType.includes('Status') ||
                          act.activityType.includes('Stage') ||
                          act.activityType.includes('Lead');

                        return (
                          <tr role="row" key={act.id} className="hover:bg-[#F7F6F3]/50 transition-colors">
                            <td role="cell" data-label="Time and event" className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-[#6B6860]" />
                                <span>{act.timestamp}</span>
                              </div>
                              <span className="font-mono text-xs text-[#6B6860]">{act.activityId}</span>
                            </td>

                            <td role="cell" data-label="Action" className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                                  isReassignment
                                    ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                    : isPayment
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                    : isPartner
                                    ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                    : isStatusChange
                                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                    : 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                                }`}
                              >
                                {isReassignment && <ArrowRightLeft className="h-3 w-3" />}
                                {isPayment && <CreditCard className="h-3 w-3" />}
                                {isPartner && <Building className="h-3 w-3" />}
                                {isStatusChange && <CheckCircle2 className="h-3 w-3" />}
                                <span>{act.activityType}</span>
                              </span>
                            </td>

                            <td role="cell" data-label="Performed by" className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-[#00319D]" />
                                <span>{act.performedBy?.name || 'System Operator'}</span>
                              </div>
                              <span className="text-xs uppercase font-bold text-[#6B6860] bg-[#F7F6F3] px-1.5 py-0.5 rounded border border-[#E8E6E1]">
                                {act.performedBy?.role || 'Staff'}
                              </span>
                            </td>

                            <td role="cell" data-label="Record" className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-mono font-bold text-xs text-[#00319D] bg-[#00319D]/5 px-2 py-1 rounded border border-[#00319D]/20">
                                {act.studentId || 'N/A'}
                              </span>
                            </td>

                            <td role="cell" data-label="Description" className="py-3.5 px-4 max-w-md">
                              <p className="text-xs text-[#1A1A1A] leading-relaxed font-medium">
                                {act.description}
                              </p>
                            </td>

                            <td role="cell" data-label="Change" className="py-3.5 px-4 whitespace-nowrap">
                              {act.oldValue || act.newValue ? (
                                <div className="inline-flex items-center gap-1 text-xs bg-[#F7F6F3] p-1.5 rounded-lg border border-[#E8E6E1]">
                                  {act.oldValue && (
                                    <span className="text-[#6B6860] line-through px-1">
                                      {act.oldValue}
                                    </span>
                                  )}
                                  <ArrowRight className="h-3 w-3 text-[#6B6860]" />
                                  <span className="font-bold text-emerald-700 px-1">
                                    {act.newValue || 'Updated'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-[#6B6860] italic">Recorded event</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* REASSIGN PORTFOLIO OWNER MODAL (Management Only) */}
      {reassignPartner && (
        <PartnerOwnerDialog partner={reassignPartner} options={portfolioOwners}
          onClose={() => setReassignModalPartnerId(null)} onSave={reassignPartnerPortfolioOwner} />
      )}
    </div>
  );
}
