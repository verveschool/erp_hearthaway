'use client';

import React from 'react';
import Link from 'next/link';
import { useHearthAway } from '@/lib/context';
import { BrandLogo } from '@/components/BrandLogo';
import {
  Layers,
  Users,
  Briefcase,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Building,
  UserCheck,
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
  HelpCircle,
  FileText,
  Clock,
  Phone,
} from 'lucide-react';

export default function HomePage() {
  const {
    currentUser,
    setCurrentUser,
    availableUsers,
    isAuthenticated,
    openAuthModal,
    students,
    partners,
    bookings,
    payments,
  } = useHearthAway();

  const isManagement = currentUser.role === 'management' || currentUser.role === 'admin';
  const isPortfolioOwner = currentUser.role === 'portfolio_owner';
  const isSales = currentUser.role === 'sales';
  const isFinance = currentUser.role === 'finance';
  const isPartner = currentUser.role === 'partner';

  // Metrics
  const activeLeadsCount = students.filter(
    (s) => s.leadStatus !== 'Lost' && s.bookingStatus !== 'Cancelled'
  ).length;
  const bookedCount = students.filter(
    (s) => s.bookingStatus === 'Booked' || s.bookingStatus === 'Move-in Confirmed'
  ).length;
  const verifiedRevenue = payments
    .filter((p) => p.paymentStatus === 'Verified')
    .reduce((sum, p) => sum + p.amount, 0);

  // Suggested Next Step based on role
  const getNextAction = () => {
    if (isManagement) {
      return {
        title: 'Management Overview',
        text: 'Inspect organization-wide Portfolio Owners, assign partner relationships, or monitor revenue.',
        ctaText: 'Open Portfolio Module',
        ctaHref: '/portfolio',
      };
    }
    if (isPortfolioOwner) {
      const myPartners = partners.filter((p) => p.portfolioOwnerId === currentUser.uid);
      return {
        title: 'Portfolio Activity',
        text: `You have ${myPartners.length} onboarded education consultant partners. Review lead rollups and assigned sales owners.`,
        ctaText: 'View My Portfolio',
        ctaHref: '/portfolio',
      };
    }
    if (isSales) {
      const myLeads = students.filter((s) => s.assignedSalesExecutiveId === currentUser.uid);
      return {
        title: 'Sales Pipeline Tasks',
        text: `You are assigned to ${myLeads.length} student leads. Progress qualified leads and record booking payments.`,
        ctaText: 'Open Sales Workspace',
        ctaHref: '/sales',
      };
    }
    if (isFinance) {
      const pendingCount = payments.filter((p) => p.paymentStatus === 'Pending Verification').length;
      return {
        title: 'Finance Queue',
        text: `There are ${pendingCount} incoming payments awaiting audit verification and partner payout confirmation.`,
        ctaText: 'Open Finance Ledger',
        ctaHref: '/finance',
      };
    }
    if (isPartner) {
      return {
        title: 'Partner Leads Submission',
        text: 'Submit new student applicants or upload multiple leads in one click using CSV bulk import.',
        ctaText: 'Open Partners Workspace',
        ctaHref: '/partners',
      };
    }
    return {
      title: 'Welcome to HearthAway',
      text: 'Sign in with an authorized role to access your designated workspace.',
      ctaText: 'Sign In to System',
      ctaHref: '#',
    };
  };

  const nextAction = getNextAction();

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      {/* Hero / Executive Header */}
      <section className="border-b border-[#E8E6E1] bg-[#FFFFFF] px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#00319D]/10 px-2.5 py-1 text-xs font-bold text-[#00319D] uppercase tracking-wider">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Business Operations System
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A1A1A] tracking-tight leading-tight">
                Student Accommodation Platform
              </h1>

              <p className="text-sm text-[#6B6860] leading-relaxed">
                Streamlined platform for managing education consultant partnerships, student lead conversion,
                sales ownership, and verified financial settlements.
              </p>
            </div>

            {/* Obvious What To Do Next Card */}
            <div className="w-full md:w-96 rounded-2xl border border-[#E8E6E1] bg-[#F7F6F3] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00319D]">
                  Next Recommended Action
                </span>
                <span className="text-xs font-bold text-[#1A1A1A] capitalize">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#1A1A1A]">{nextAction.title}</h3>
                <p className="text-xs text-[#6B6860] mt-1 leading-relaxed">{nextAction.text}</p>
              </div>

              {isAuthenticated ? (
                <Link
                  href={nextAction.ctaHref}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#00319D] py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs"
                >
                  {nextAction.ctaText}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <button
                  onClick={() => openAuthModal('signin')}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#00319D] py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs"
                >
                  Sign In to Continue
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Persona Tester Bar for instant evaluation */}
          <div className="mt-8 pt-6 border-t border-[#E8E6E1]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#00319D]" />
                <span className="text-xs font-bold text-[#1A1A1A]">
                  Quick Switch Test Persona:
                </span>
                <span className="text-[11px] text-[#6B6860]">
                  (Click any persona to test their exact role-based permissions and module navigation)
                </span>
              </div>
              <button
                onClick={() => openAuthModal('signup')}
                className="text-xs font-bold text-[#00319D] hover:underline"
              >
                + Create New Account
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {availableUsers.map((user) => {
                const isSelected = user.uid === currentUser.uid;
                const roleLabel =
                  user.role === 'portfolio_owner'
                    ? 'Portfolio Owner'
                    : user.role === 'management'
                    ? 'Management'
                    : user.role === 'sales'
                    ? 'Sales'
                    : user.role === 'finance'
                    ? 'Finance'
                    : 'Partner';

                return (
                  <button
                    key={user.uid}
                    onClick={() => setCurrentUser(user)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-[#00319D] bg-[#00319D] text-[#FFFFFF] font-bold shadow-xs'
                        : 'border-[#E8E6E1] bg-[#FFFFFF] text-[#1A1A1A] hover:bg-[#F7F6F3] font-medium'
                    }`}
                  >
                    <span>{user.displayName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        isSelected
                          ? 'bg-[#FFFFFF]/20 text-[#FFFFFF]'
                          : 'bg-[#00319D]/10 text-[#00319D]'
                      }`}
                    >
                      {roleLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* The Four Core Modules Grid: Portfolio | Partners | Sales | Finance */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A] tracking-tight">The Four Core Modules</h2>
          <p className="text-xs text-[#6B6860] mt-0.5">
            Strict role-based isolation enforces that each authorized user only accesses workflows permitted by their role.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Module 1: Portfolio */}
          <div className="rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-5 shadow-2xs hover:border-[#00319D]/50 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-[#00319D]/10 text-[#00319D] flex items-center justify-center">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase rounded bg-[#F7F6F3] px-2 py-0.5 text-[#6B6860] border border-[#E8E6E1]">
                  Module 1
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">Portfolio</h3>
                <p className="text-xs text-[#6B6860] mt-1 leading-relaxed">
                  Shows business and lead activity associated with each Portfolio Owner and their onboarded education consultant partners.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8E6E1] mt-4">
              {isManagement || isPortfolioOwner ? (
                <Link
                  href="/portfolio"
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#00319D] py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors"
                >
                  Open Portfolio
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="text-[11px] text-[#6B6860] block text-center py-2 font-medium bg-[#F7F6F3] rounded-lg">
                  Restricted to Portfolio Owners
                </span>
              )}
            </div>
          </div>

          {/* Module 2: Partners */}
          <div className="rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-5 shadow-2xs hover:border-[#00319D]/50 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-[#00319D]/10 text-[#00319D] flex items-center justify-center">
                  <Building className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase rounded bg-[#F7F6F3] px-2 py-0.5 text-[#6B6860] border border-[#E8E6E1]">
                  Module 2
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">Partners</h3>
                <p className="text-xs text-[#6B6860] mt-1 leading-relaxed">
                  Manage education consultants who supply student leads. Includes bulk lead upload using CSV with 8-step validation.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8E6E1] mt-4">
              {isManagement || isPartner ? (
                <Link
                  href="/partners"
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#00319D] py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors"
                >
                  Open Partners
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="text-[11px] text-[#6B6860] block text-center py-2 font-medium bg-[#F7F6F3] rounded-lg">
                  Restricted to Management &amp; Partners
                </span>
              )}
            </div>
          </div>

          {/* Module 3: Sales */}
          <div className="rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-5 shadow-2xs hover:border-[#00319D]/50 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-[#00319D]/10 text-[#00319D] flex items-center justify-center">
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase rounded bg-[#F7F6F3] px-2 py-0.5 text-[#6B6860] border border-[#E8E6E1]">
                  Module 3
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">Sales</h3>
                <p className="text-xs text-[#6B6860] mt-1 leading-relaxed">
                  Leads qualification, sales owner assignment, booking progression, requirement matching, and payment recording.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8E6E1] mt-4">
              {isManagement || isSales ? (
                <Link
                  href="/sales"
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#00319D] py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors"
                >
                  Open Sales
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="text-[11px] text-[#6B6860] block text-center py-2 font-medium bg-[#F7F6F3] rounded-lg">
                  Restricted to Sales Team
                </span>
              )}
            </div>
          </div>

          {/* Module 4: Finance */}
          <div className="rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-5 shadow-2xs hover:border-[#00319D]/50 transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-[#00319D]/10 text-[#00319D] flex items-center justify-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase rounded bg-[#F7F6F3] px-2 py-0.5 text-[#6B6860] border border-[#E8E6E1]">
                  Module 4
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#1A1A1A]">Finance</h3>
                <p className="text-xs text-[#6B6860] mt-1 leading-relaxed">
                  Transactions ledger, payment audit verification, tenancy booking records, and partner commission payouts.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E8E6E1] mt-4">
              {isManagement || isFinance ? (
                <Link
                  href="/finance"
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[#00319D] py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors"
                >
                  Open Finance
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <span className="text-[11px] text-[#6B6860] block text-center py-2 font-medium bg-[#F7F6F3] rounded-lg">
                  Restricted to Finance Team
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Relational Ownership Architecture Summary */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 sm:p-8 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-[#FCC20A]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#00319D]">
              Relational Ownership Architecture
            </h3>
          </div>
          <h4 className="text-xl font-bold text-[#1A1A1A]">How Lead Attribution &amp; Ownership Operates</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-xs">
            <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E8E6E1] space-y-2">
              <span className="inline-block px-2 py-0.5 rounded bg-[#00319D] text-[#FFFFFF] text-[10px] font-bold">
                1. Sourcing Partner
              </span>
              <h5 className="font-bold text-[#1A1A1A]">Education Consultant</h5>
              <p className="text-[#6B6860] leading-relaxed">
                The partner who brings the lead to HearthAway (individually or via CSV). Each lead retains this relationship regardless of who handles sales.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E8E6E1] space-y-2">
              <span className="inline-block px-2 py-0.5 rounded bg-[#00319D] text-[#FFFFFF] text-[10px] font-bold">
                2. Portfolio Owner (Derived)
              </span>
              <h5 className="font-bold text-[#1A1A1A]">Internal Onboarding Specialist</h5>
              <p className="text-[#6B6860] leading-relaxed">
                The internal user who onboarded the partner. All leads from that partner automatically roll up into their Portfolio without manual assignment.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F7F6F3] border border-[#E8E6E1] space-y-2">
              <span className="inline-block px-2 py-0.5 rounded bg-[#00319D] text-[#FFFFFF] text-[10px] font-bold">
                3. Sales Owner
              </span>
              <h5 className="font-bold text-[#1A1A1A]">Internal Booking Representative</h5>
              <p className="text-[#6B6860] leading-relaxed">
                The sales representative assigned to convert the student, coordinate requirements, progress stages, and record payments.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
