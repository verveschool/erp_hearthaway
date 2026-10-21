'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useHearthAway } from '@/lib/context';
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  LogOut,
  RefreshCw,
  Home,
  CheckCircle,
} from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const rawPath = usePathname();
  const pathname = rawPath || '/';
  const router = useRouter();
  const {
    canAccessRoute,
    isAuthenticated,
    authInitialized,
    currentUser,
    setIsLoginModalOpen,
    logout,
  } = useHearthAway();

  if (!authInitialized) {
    return <div className="min-h-[70vh]" aria-busy="true" />;
  }

  const access = canAccessRoute(pathname);

  // If permitted, render children directly
  if (access.allowed) {
    return <>{children}</>;
  }

  // Case 1: Unauthenticated
  if (access.reason === 'unauthenticated') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-8 text-center shadow-xs space-y-6">
          <div className="h-12 w-12 rounded-xl bg-[#F7F6F3] border border-[#E8E6E1] text-[#00319D] flex items-center justify-center mx-auto">
            <Lock className="h-5 w-5" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block rounded-md bg-[#F7F6F3] border border-[#E8E6E1] px-2.5 py-0.5 text-[10px] font-bold text-[#00319D] uppercase tracking-wider">
              Account Required
            </span>
            <h2 className="text-xl font-bold text-[#1A1A1A]">Sign In Required</h2>
            <p className="text-xs text-[#6B6860] leading-relaxed">
              The workspace at <strong className="font-mono text-[#1A1A1A]">{pathname}</strong> requires an authorized account to protect operational records.
            </p>
          </div>

          <div className="space-y-2.5">
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00319D] px-4 py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors"
            >
              Go to Sign In
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Pending Administrator Approval
  if (access.reason === 'pending_approval') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-lg rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-8 text-center shadow-xs space-y-6">
          <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="h-5 w-5 text-amber-600" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block rounded-md bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
              Pending Administrator Approval
            </span>
            <h2 className="text-xl font-bold text-[#1A1A1A]">Account Awaiting Approval</h2>
            <p className="text-xs text-[#6B6860] leading-relaxed">
              Your account for <strong className="text-[#1A1A1A]">{currentUser.displayName || currentUser.email}</strong> does not currently have access to this workspace.
            </p>
          </div>

          <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-4 text-xs text-left space-y-2">
            <div className="flex items-center justify-between text-[#6B6860] text-[10px] font-bold uppercase tracking-wider">
              <span>Account Status</span>
              <span className="text-amber-700 font-mono font-bold">AWAITING APPROVAL</span>
            </div>
            <div className="space-y-1 text-[#1A1A1A]">
              <div>Email: <strong>{currentUser.email}</strong></div>
              <div>Assigned Role: <strong className="uppercase">{currentUser.role}</strong></div>
              <div>System Administrator: <strong className="text-[#00319D]">tribeverve@gmail.com</strong></div>
            </div>
            <p className="text-[11px] text-[#6B6860] pt-1">
              Contact a workspace administrator if you believe your role is missing or incorrect.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => logout()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F7F6F3] transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 text-[#6B6860]" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Insufficient Role (403 Forbidden)
  const defaultAllowedRoute =
    currentUser.role === 'partner'
      ? '/partners'
      : currentUser.role === 'portfolio_owner'
      ? '/portfolio'
      : currentUser.role === 'finance'
      ? '/finance'
      : currentUser.role === 'management' || currentUser.role === 'admin'
      ? '/portfolio'
      : '/sales';

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-lg rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-8 text-center shadow-xs space-y-6">
        <div className="h-12 w-12 rounded-xl bg-[#F7F6F3] border border-[#E8E6E1] text-[#1A1A1A] flex items-center justify-center mx-auto">
          <ShieldAlert className="h-5 w-5 text-[#00319D]" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-block rounded-md bg-[#F7F6F3] border border-[#E8E6E1] px-2.5 py-0.5 text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider">
            Workspace Permission Boundary
          </span>
          <h2 className="text-xl font-bold text-[#1A1A1A]">Access Restricted</h2>
          <p className="text-xs text-[#6B6860] leading-relaxed">
            Your active role is <strong className="uppercase font-bold text-[#1A1A1A]">{currentUser.role}</strong>.
            This workspace at <strong className="font-mono text-[#1A1A1A]">{pathname}</strong> is isolated to designated operational roles.
          </p>
        </div>

        {/* Required Roles Box */}
        <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-4 text-xs text-left space-y-2">
          <div className="flex items-center justify-between text-[#6B6860] text-[10px] font-bold uppercase tracking-wider">
            <span>Role Requirement</span>
            <span className="text-[#00319D] font-mono font-bold">STRICT RBAC</span>
          </div>
          <p className="text-[#1A1A1A]">
            Authorized roles:{' '}
            <strong className="text-[#00319D]">
              {access.requiredRoles.map((r) => r.toUpperCase()).join(', ')}
            </strong>
          </p>
          {currentUser.role === 'partner' && (
            <p className="text-[11px] text-[#6B6860] leading-relaxed">
              Partner accounts are strictly partitioned to their assigned institution portfolio and cannot access internal management or financial records.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
          <Link
            href={defaultAllowedRoute}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#00319D] px-4 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors"
          >
            Go to Your Workspace ({currentUser.role})
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-4 py-2 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F7F6F3] transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#6B6860]" />
            Switch Active Profile
          </button>
        </div>
      </div>
    </div>
  );
}
