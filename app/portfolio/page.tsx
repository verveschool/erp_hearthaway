'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useHearthAway } from '@/lib/context';
import { Student } from '@/lib/types';
import { exportToCSV } from '@/lib/export-csv';
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
  Download,
  ShieldCheck,
  History,
  ArrowRight,
  ArrowRightLeft,
  FileSpreadsheet,
  CreditCard,
  User,
  Check,
  BarChart3,
  ChevronDown,
  ChevronUp,
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
          <span className="text-[10px] uppercase font-bold text-[#6B6860]">6M Velocity</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[#6B6860]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#00319D]" />
              Lead Generation Volume:
            </span>
            <span className="font-extrabold text-[#00319D]">{leadVolume}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-[#6B6860]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Tenancy Conversions:
            </span>
            <span className="font-extrabold text-emerald-700">{conversions}</span>
          </div>
          <div className="pt-1.5 border-t border-[#E8E6E1] flex items-center justify-between text-[11px]">
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
    approveUser,
    removeAllAccounts,
    reassignPartnerPortfolioOwner,
    setSelectedStudentId,
  } = useHearthAway();

  const isManagement = currentUser.role === 'management' || currentUser.role === 'admin';

  const pendingUsers = useMemo(() => {
    return availableUsers.filter((u) => u.isApproved === false && u.email !== 'tribeverve@gmail.com');
  }, [availableUsers]);

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
    return 'all';
  });

  // Effective Owner ID: strictly enforce that portfolio_owner role cannot inspect others
  const effectiveOwnerId = currentUser.role === 'portfolio_owner' ? currentUser.uid : selectedOwnerId;
  const activeOwner =
    effectiveOwnerId === 'all'
      ? {
          uid: 'all',
          displayName: 'All Portfolio Owners (Organization Wide)',
          email: 'Organization-wide partner & lead rollups',
          role: 'management',
        }
      : portfolioOwners.find((po) => po.uid === effectiveOwnerId) || {
          uid: effectiveOwnerId,
          displayName: currentUser.displayName,
          email: currentUser.email,
          role: 'portfolio_owner',
        };

  // State for search, filters, and active tab
  const [activeTab, setActiveTab] = useState<'leads' | 'partners' | 'audit'>('leads');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPartner, setFilterPartner] = useState('All');
  const [filterLeadStatus, setFilterLeadStatus] = useState('All');
  const [filterBookingStatus, setFilterBookingStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'budget'>('newest');

  // Audit Trail filtering state
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditFilterType, setAuditFilterType] = useState('All');
  const [auditFilterRole, setAuditFilterRole] = useState('All');
  const [auditSortBy, setAuditSortBy] = useState<'newest' | 'oldest'>('newest');

  // Reassignment Modal state for Management
  const [reassignModalPartnerId, setReassignModalPartnerId] = useState<string | null>(null);
  const [newOwnerTargetId, setNewOwnerTargetId] = useState<string>('');

  // Global Lead Search across all portfolios (independent of active owner)
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isGlobalSearchFocused, setIsGlobalSearchFocused] = useState(false);
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
    return students.filter((s) => {
      const matchName = s.fullName && s.fullName.toLowerCase().includes(q);
      const matchId = s.studentId && s.studentId.toLowerCase().includes(q);
      const matchEmail = s.email && s.email.toLowerCase().includes(q);
      return matchName || matchId || matchEmail;
    });
  }, [students, globalSearchQuery]);

  // View mode for leads listing: 'table' or 'cards' (toggle in Portfolio header)
  const [leadViewMode, setLeadViewMode] = useState<'table' | 'cards'>('table');

  // Quick filter chip selection for Generated Leads
  const [quickFilter, setQuickFilter] = useState<'all' | 'high_priority' | 'due_today' | 'awaiting_payment' | 'qualified' | 'booked'>('all');

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
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [isChartExpanded, setIsChartExpanded] = useState<boolean>(true);
  const [useBenchmarkModel, setUseBenchmarkModel] = useState<boolean>(false);
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
        const matchName = lead.fullName && lead.fullName.toLowerCase().includes(gq);
        const matchId = lead.studentId && lead.studentId.toLowerCase().includes(gq);
        const matchEmail = lead.email && lead.email.toLowerCase().includes(gq);
        if (!matchName && !matchId && !matchEmail) return false;
      }

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
      const matchSearch =
        q === '' ||
        act.description.toLowerCase().includes(q) ||
        act.activityType.toLowerCase().includes(q) ||
        (act.performedBy?.name && act.performedBy.name.toLowerCase().includes(q)) ||
        (act.studentId && act.studentId.toLowerCase().includes(q)) ||
        (act.activityId && act.activityId.toLowerCase().includes(q));

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
        { header: 'Phone', accessor: (s) => s.phone },
        { header: 'Sourcing Partner', accessor: (s) => s.partnerName || s.partnerId },
        { header: 'Partner ID', accessor: (s) => s.partnerId },
        { header: 'Assigned Sales Owner', accessor: (s) => s.assignedSalesExecutiveName },
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
                  Management &amp; Portfolio
                </span>
                <span className="text-xs text-[#6B6860]">• Organization-Wide Control &amp; Audit</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#1A1A1A] mt-1 tracking-tight">
                Management Dashboard
              </h1>
              <p className="text-xs text-[#6B6860] mt-0.5 max-w-2xl">
                Track partner relationships, lead rollups, and system-wide audit activity with live data synchronization and reporting.
              </p>
            </div>

            {/* Management View Selector: Inspect different Portfolio Owners */}
            {isManagement && (
              <div className="flex items-center gap-2 bg-[#F7F6F3] p-1.5 rounded-xl border border-[#E8E6E1]">
                <span className="text-xs font-bold text-[#6B6860] pl-2 hidden sm:inline">
                  Portfolio Scope:
                </span>
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#1A1A1A] focus:outline-none focus:border-[#00319D] cursor-pointer"
                >
                  <option value="all">All Portfolios ({partners.length} partners)</option>
                  {portfolioOwners.map((owner) => (
                    <option key={owner.uid} value={owner.uid}>
                      {owner.displayName} ({partners.filter((p) => p.portfolioOwnerId === owner.uid).length} partners)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* DEDICATED GLOBAL LEAD SEARCH INPUT IN HEADER (Cross-Portfolio) */}
          <div className="mt-5 relative z-40" ref={globalSearchRef}>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-[#F7F6F3] p-2 sm:p-2.5 rounded-xl border border-[#E8E6E1] shadow-2xs">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Globe className="h-4 w-4 text-[#00319D]" />
                </div>
                <input
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    setIsGlobalSearchFocused(true);
                  }}
                  onFocus={() => setIsGlobalSearchFocused(true)}
                  placeholder="Global Lead Search — Search across all portfolios by student name or student ID (e.g. HA-2026-001245)..."
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
                    title="Clear global search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 px-1">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFFFFF] border border-[#E8E6E1] px-2.5 py-1.5 text-[11px] font-bold text-[#6B6860]">
                  <Users className="h-3.5 w-3.5 text-[#00319D]" />
                  <span>
                    Scope: <strong className="text-[#1A1A1A]">Cross-Portfolio ({students.length} Total Leads)</strong>
                  </span>
                </span>
                {globalSearchQuery.trim() !== '' && (
                  <span className="rounded-lg bg-[#00319D] px-2.5 py-1.5 text-[11px] font-bold text-[#FFFFFF] shadow-2xs whitespace-nowrap">
                    {globalMatchingLeads.length} {globalMatchingLeads.length === 1 ? 'Match' : 'Matches'}
                  </span>
                )}
              </div>
            </div>

            {/* Instant Global Search Results Dropdown */}
            {isGlobalSearchFocused && globalSearchQuery.trim() !== '' && (
              <div className="absolute left-0 right-0 mt-2 max-h-96 overflow-y-auto rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] shadow-2xl z-50 divide-y divide-[#E8E6E1]">
                <div className="bg-[#F7F6F3] px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-10 border-b border-[#E8E6E1]">
                  <span className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-[#00319D]" />
                    Global Search Results ({globalMatchingLeads.length})
                  </span>
                  <span className="text-[11px] text-[#6B6860]">
                    Searching across all portfolios without switching owners
                  </span>
                </div>

                {globalMatchingLeads.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Search className="h-7 w-7 text-[#6B6860] mx-auto opacity-50" />
                    <p className="text-xs font-bold text-[#1A1A1A]">No leads found across any portfolio</p>
                    <p className="text-[11px] text-[#6B6860]">
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
                              <span className="font-mono text-[10px] font-bold bg-[#00319D]/10 text-[#00319D] px-1.5 py-0.5 rounded border border-[#00319D]/20">
                                {lead.studentId}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
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

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B6860]">
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
                              View in Table →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {globalMatchingLeads.length > 10 && (
                      <div className="bg-[#F7F6F3]/50 px-4 py-2 text-center text-[11px] text-[#6B6860]">
                        Showing top 10 of <strong>{globalMatchingLeads.length}</strong> matches. Filter further in table or scroll table view.
                      </div>
                    )}
                  </div>
                )}
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
                    {effectiveOwnerId === 'all' ? 'System Scope' : 'Portfolio Owner'}
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
                <span className="text-[10px] uppercase font-bold text-[#6B6860] block">Audit Events Logged</span>
                <span className="text-base font-extrabold text-[#FCC20A] bg-amber-950/80 px-1.5 py-0.5 rounded">
                  {auditMetrics.total}
                </span>
              </div>
            </div>
          </div>

          {/* Recharts-based 6-Month Growth Trend: Lead Generation Volume vs Tenancy Conversions */}
          <div className="mt-6 rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-5 shadow-2xs space-y-4">
            {/* Header with Title, Stats & View Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E8E6E1] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#00319D]/10 text-[#00319D]">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-extrabold text-[#1A1A1A] tracking-tight">
                    Portfolio Growth Velocity (Last 6 Months)
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Metrics
                  </span>
                </div>
                <p className="text-xs text-[#6B6860] mt-1">
                  Tracking <strong>Lead Generation Volume</strong> vs. <strong>Tenancy Conversions</strong> across the last 6 months to evaluate portfolio velocity.
                </p>
              </div>

              {/* Badges & Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 6M Summary Badges */}
                <div className="hidden sm:flex items-center gap-2 bg-[#F7F6F3] p-1 rounded-xl border border-[#E8E6E1] text-[11px]">
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

                {/* Benchmark Mode Toggle */}
                <button
                  type="button"
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

                {/* Collapse / Expand Toggle */}
                <button
                  type="button"
                  onClick={() => setIsChartExpanded(!isChartExpanded)}
                  className="rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] p-1.5 text-[#6B6860] hover:bg-[#F7F6F3] hover:text-[#1A1A1A] cursor-pointer"
                  title={isChartExpanded ? 'Collapse Growth Chart' : 'Expand Growth Chart'}
                >
                  {isChartExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
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
                            dataKey="leads"
                            name="leads"
                            fill="#00319D"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={40}
                          />
                          <Bar
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
                      <span className="text-[10px] font-bold text-[#6B6860] uppercase block">
                        {m.month}
                      </span>
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-xs">
                        <span className="font-extrabold text-[#00319D]" title="Lead Generation Volume">
                          {m.leads} <span className="text-[9px] font-normal text-[#6B6860]">vol</span>
                        </span>
                        <span className="text-[#6B6860] text-[10px]">→</span>
                        <span className="font-extrabold text-emerald-700" title="Tenancy Conversions">
                          {m.conversions} <span className="text-[9px] font-normal text-[#6B6860]">conv</span>
                        </span>
                      </div>
                      <span className="inline-block mt-1 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded">
                        {m.conversionRate}% conv
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Admin User Approval Queue Banner */}
          {isManagement && pendingUsers.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-800 flex items-center justify-center font-bold">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-950 flex items-center gap-2">
                      User Account Approval Queue
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[10px] font-extrabold text-amber-900">
                        {pendingUsers.length} Pending
                      </span>
                    </h3>
                    <p className="text-[11px] text-amber-800/80">
                      New sign-ups require administrator approval before workspace access is granted.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to remove all user accounts except Super Admin?')) {
                        removeAllAccounts();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-[#FFFFFF] px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    Remove All Accounts
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      pendingUsers.forEach((u) => approveUser(u.uid, true));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-[#FFFFFF] px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve All ({pendingUsers.length})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {pendingUsers.map((u) => (
                  <div
                    key={u.uid}
                    className="rounded-xl border border-amber-200/80 bg-[#FFFFFF] p-3 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[#1A1A1A] truncate">{u.displayName || 'Unnamed User'}</span>
                        <span className="rounded bg-[#00319D]/10 text-[#00319D] px-1.5 py-0.2 text-[9px] font-bold uppercase shrink-0">
                          {u.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#6B6860] truncate">{u.email}</div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => approveUser(u.uid, true)}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-[#FFFFFF] px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Approve access"
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Tabs: Generated Leads, Onboarded Partners, and Audit Trail */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E8E6E1] gap-3">
            <div className="flex gap-6 text-xs font-bold overflow-x-auto">
              <button
                onClick={() => setActiveTab('leads')}
                className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
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
                className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'partners'
                    ? 'border-[#00319D] text-[#00319D]'
                    : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
                }`}
              >
                <Building className="h-4 w-4" />
                Onboarded Partners ({metrics.totalPartners})
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'audit'
                    ? 'border-[#00319D] text-[#00319D]'
                    : 'border-transparent text-[#6B6860] hover:text-[#1A1A1A]'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Platform Audit Trail ({auditMetrics.total})
              </button>
            </div>

            {/* Toggle switch between Card View and Table View for lead listings */}
            {activeTab === 'leads' && (
              <div className="flex items-center gap-2 pb-2.5 sm:pb-3 self-end sm:self-auto shrink-0">
                <span className="text-[11px] font-bold text-[#6B6860] hidden md:inline">Layout:</span>
                <div className="flex items-center rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setLeadViewMode('table')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      leadViewMode === 'table'
                        ? 'bg-[#FFFFFF] text-[#00319D] shadow-2xs'
                        : 'text-[#6B6860] hover:text-[#1A1A1A]'
                    }`}
                    title="Table View (compact high-density rows)"
                  >
                    <LayoutList className="h-3.5 w-3.5" />
                    <span>Table View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeadViewMode('cards')}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                      leadViewMode === 'cards'
                        ? 'bg-[#FFFFFF] text-[#00319D] shadow-2xs'
                        : 'text-[#6B6860] hover:text-[#1A1A1A]'
                    }`}
                    title="Card View (optimized visual cards)"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Card View</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TAB 1: GENERATED LEADS */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Global Lead Search active banner */}
            {globalSearchQuery.trim() !== '' && (
              <div className="rounded-xl border border-[#00319D]/30 bg-[#00319D]/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#00319D] text-[#FFFFFF] shrink-0">
                    <Globe className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <span className="font-bold text-[#1A1A1A]">
                      Global Lead Search Active:
                    </span>{' '}
                    <span className="text-[#6B6860]">
                      Showing {filteredLeads.length} matching {filteredLeads.length === 1 ? 'lead' : 'leads'} across <strong>all portfolios</strong> for &ldquo;
                      <strong className="text-[#00319D]">{globalSearchQuery}</strong>
                      &rdquo; without needing to switch owners.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setGlobalSearchQuery('')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#00319D]/30 bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#00319D] hover:bg-[#00319D]/10 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear Global Search &amp; Return to Scoped View
                </button>
              </div>
            )}

            {/* Search, Filter & CSV Export Toolbar */}
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
                    <option value="Move-in Confirmed">Move-in Confirmed</option>
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

                  {/* CSV Export Button */}
                  <button
                    onClick={handleExportLeadsCSV}
                    disabled={filteredLeads.length === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-[#00319D] bg-[#00319D]/5 px-3 py-2 text-xs font-bold text-[#00319D] hover:bg-[#00319D]/15 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                    title="Download current leads table as CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Export CSV ({filteredLeads.length})</span>
                  </button>
                </div>
              </div>

              {/* Horizontal scrollable row of quick filter chips below the main search bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1.5 scrollbar-thin border-t border-[#E8E6E1]/70">
                <span className="text-[11px] font-bold text-[#6B6860] uppercase tracking-wider shrink-0 flex items-center gap-1 pl-0.5">
                  <Filter className="h-3 w-3 text-[#00319D]" />
                  Quick Filters:
                </span>

                {/* All Leads Chip */}
                <button
                  type="button"
                  onClick={() => setQuickFilter('all')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    quickFilter === 'all'
                      ? 'bg-[#00319D] text-[#FFFFFF] shadow-2xs'
                      : 'bg-[#F7F6F3] text-[#6B6860] border border-[#E8E6E1] hover:bg-[#FFFFFF] hover:text-[#1A1A1A]'
                  }`}
                >
                  <span>All Leads</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
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
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
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
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
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
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
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
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
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
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      quickFilter === 'booked'
                        ? 'bg-[#FFFFFF]/25 text-[#FFFFFF]'
                        : 'bg-emerald-100 text-emerald-900 font-bold'
                    }`}
                  >
                    {quickFilterCounts.booked}
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6B6860] pt-1 border-t border-[#E8E6E1]">
                <span>
                  {globalSearchQuery.trim() !== '' ? (
                    <>
                      Showing <strong>{filteredLeads.length}</strong> matching leads from <strong>all {students.length} company-wide leads</strong> (Global Lead Search)
                    </>
                  ) : (
                    <>
                      Showing <strong>{filteredLeads.length}</strong> of <strong>{portfolioLeads.length}</strong> leads rolled up into this portfolio
                    </>
                  )}
                </span>
                <span className="text-[11px] font-medium text-[#00319D]">
                  Attribution updates automatically across live devices
                </span>
              </div>
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
                              <span className="font-mono text-[10px] font-bold text-[#00319D] bg-[#00319D]/10 px-1.5 py-0.2 rounded border border-[#00319D]/20">
                                {lead.studentId}
                              </span>
                              {dueToday && (
                                <span className="inline-flex items-center gap-1 font-bold text-[10px] text-amber-900 bg-amber-50 border border-amber-200/90 px-1.5 py-0.2 rounded">
                                  <Clock className="h-3 w-3 text-amber-600" />
                                  Due Today
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Priority Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
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
                            Lead: {lead.leadStatus}
                          </span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
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

                        <div className="flex items-center justify-between text-[11px] pt-1 text-[#6B6860]">
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
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
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
                            <span className="text-[11px] font-bold text-[#1A1A1A] bg-[#F7F6F3] px-2 py-1 rounded-md border border-[#E8E6E1]">
                              £{lead.budget}/wk
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedStudentId(lead.studentId)}
                          className="rounded-lg bg-[#00319D] text-[#FFFFFF] px-3 py-1.5 text-xs font-bold hover:bg-[#00257A] transition-colors shadow-2xs cursor-pointer"
                        >
                          Inspect Dossier →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW */
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
                            <div className="text-[10px] text-[#6B6860] font-mono flex items-center gap-1.5 flex-wrap">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-[#6B6860]">
                Education consultants and corporate referral partners onboarded under <strong>{activeOwner.displayName}</strong>.
              </p>

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
                            className="rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] px-2.5 py-1 text-[11px] font-bold text-[#00319D] hover:bg-[#E8E6E1] transition-colors cursor-pointer"
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

        {/* TAB 3: PLATFORM AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            {/* Audit KPI Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E8E6E1] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#6B6860] block">Total Audit Entries</span>
                <span className="text-xl font-extrabold text-[#1A1A1A] mt-0.5 block">{auditMetrics.total}</span>
                <span className="text-[11px] text-[#6B6860] mt-0.5 block">Synced live from Firestore</span>
              </div>
              <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E8E6E1] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#6B6860] block">Partner Reassignments</span>
                <span className="text-xl font-extrabold text-[#00319D] mt-0.5 block">{auditMetrics.reassignments}</span>
                <span className="text-[11px] text-[#6B6860] mt-0.5 block">Portfolio reallocations</span>
              </div>
              <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E8E6E1] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#6B6860] block">Lead Stage Changes</span>
                <span className="text-xl font-extrabold text-blue-700 mt-0.5 block">{auditMetrics.statusUpdates}</span>
                <span className="text-[11px] text-[#6B6860] mt-0.5 block">Pipeline transitions</span>
              </div>
              <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E8E6E1] shadow-2xs">
                <span className="text-[10px] uppercase font-bold text-[#6B6860] block">Payment Verifications</span>
                <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">{auditMetrics.paymentVerifications}</span>
                <span className="text-[11px] text-[#6B6860] mt-0.5 block">Verified finance receipts</span>
              </div>
            </div>

            {/* Audit Search, Filter & CSV Export Toolbar */}
            <div className="rounded-xl border border-[#E8E6E1] bg-[#FFFFFF] p-4 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6860]" />
                  <input
                    type="text"
                    placeholder="Search audit trail by description, action, actor, target ID..."
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Category Filter */}
                  <select
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
                <span className="text-[11px] font-medium text-[#00319D] flex items-center gap-1">
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F6F3] text-[#6B6860] uppercase text-[10px] tracking-wider border-b border-[#E8E6E1]">
                      <tr>
                        <th className="py-3 px-4 font-bold">Timestamp &amp; Event ID</th>
                        <th className="py-3 px-4 font-bold">Action Category</th>
                        <th className="py-3 px-4 font-bold">Performed By</th>
                        <th className="py-3 px-4 font-bold">Target Entity</th>
                        <th className="py-3 px-4 font-bold">Audit Description</th>
                        <th className="py-3 px-4 font-bold">State Transition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E6E1]">
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
                          <tr key={act.id} className="hover:bg-[#F7F6F3]/50 transition-colors">
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-[#6B6860]" />
                                <span>{act.timestamp}</span>
                              </div>
                              <span className="font-mono text-[10px] text-[#6B6860]">{act.activityId}</span>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold ${
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

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-[#00319D]" />
                                <span>{act.performedBy?.name || 'System Operator'}</span>
                              </div>
                              <span className="text-[10px] uppercase font-bold text-[#6B6860] bg-[#F7F6F3] px-1.5 py-0.5 rounded border border-[#E8E6E1]">
                                {act.performedBy?.role || 'Staff'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-mono font-bold text-[11px] text-[#00319D] bg-[#00319D]/5 px-2 py-1 rounded border border-[#00319D]/20">
                                {act.studentId || 'N/A'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 max-w-md">
                              <p className="text-xs text-[#1A1A1A] leading-relaxed font-medium">
                                {act.description}
                              </p>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {act.oldValue || act.newValue ? (
                                <div className="inline-flex items-center gap-1 text-[11px] bg-[#F7F6F3] p-1.5 rounded-lg border border-[#E8E6E1]">
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
                                <span className="text-[11px] text-[#6B6860] italic">Recorded event</span>
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
                className="rounded-lg border border-[#E8E6E1] px-3 py-1.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                className="rounded-lg bg-[#00319D] px-4 py-1.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] cursor-pointer"
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
