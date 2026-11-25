'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useHearthAway } from '@/lib/context';
import {
  Activity,
  Users,
  Briefcase,
  CreditCard,
  ChevronDown,
  LogOut,
  UserPlus,
  LogIn,
  Settings,
  ShieldCheck,
  Check,
  Archive,
  Camera,
  Upload,
  Menu,
  X,
} from 'lucide-react';
import { AppUser } from '@/lib/types';
import { ArchivalControlModal } from '@/components/ArchivalControlModal';
import { ProfilePhotoModal } from '@/components/ProfilePhotoModal';

export function Navbar() {
  const rawPath = usePathname();
  const pathname = rawPath || '/';
  const router = useRouter();
  const {
    currentUser,
    leadOperationsRole,
    internalRole,
    isAuthenticated,
    logout,
    openAuthModal,
    updateCurrentUserProfile,
    students,
    payments,
    bookings,
  } = useHearthAway();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isArchivalModalOpen, setIsArchivalModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);
  const navToggle = useRef<HTMLButtonElement>(null);
  const accountToggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dropdownOpen && !mobileNavOpen) return;
    function dismiss(event: KeyboardEvent) {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      if (dropdownOpen) accountToggle.current?.focus();
      else navToggle.current?.focus();
      setDropdownOpen(false);
      setMobileNavOpen(false);
    }
    function outside(event: PointerEvent) {
      if (!(event.target instanceof Element)) return;
      if (!accountRef.current?.contains(event.target)) setDropdownOpen(false);
      if (!navToggle.current?.contains(event.target) && !event.target.closest('#mobile-module-navigation')) {
        setMobileNavOpen(false);
      }
    }
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('pointerdown', outside);
    };
  }, [dropdownOpen, mobileNavOpen]);

  const flaggedStudents = students.filter((s) => s.isTestRecord || s.archivalStatus === 'Flagged For Archival').length;
  const flaggedPayments = payments.filter((p) => p.isTestRecord || p.archivalStatus === 'Flagged For Archival').length;
  const flaggedBookings = bookings.filter((b) => b.isTestRecord || b.archivalStatus === 'Flagged For Archival').length;
  const totalFlagged = flaggedStudents + flaggedPayments + flaggedBookings;

  const isInternal = internalRole === 'admin' || internalRole === 'management';
  const navItems = [];
  if (isInternal) {
    navItems.push(
      { name: 'Partners', href: '/partners', icon: Users, active: pathname.startsWith('/partners') },
      { name: 'Sales', href: '/sales', icon: Briefcase, active: pathname.startsWith('/sales') },
      { name: 'Activity', href: '/activity', icon: Activity, active: pathname.startsWith('/activity') },
    );
    if (internalRole === 'admin') navItems.push(
      { name: 'Finance', href: '/finance', icon: CreditCard, active: pathname.startsWith('/finance') },
    );
    navItems.push(
      { name: 'Users', href: '/management', icon: Users, active: pathname.startsWith('/management') },
    );
    navItems.push({ name: 'Data archive', href: '/archive', icon: Archive, active: pathname === '/archive' });
  } else if (currentUser.role === 'finance') {
    navItems.push({ name: 'Finance', href: '/finance/payments', icon: CreditCard, active: pathname.startsWith('/finance') });
  } else if (currentUser.role === 'partner') {
    navItems.push({ name: 'Partners', href: '/partners', icon: Users, active: pathname.startsWith('/partner') });
  }

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case 'management':
        return 'Management';
      case 'portfolio_owner':
        return 'Portfolio Owner';
      case 'sales':
        return 'Sales';
      case 'finance':
        return 'Finance';
      case 'partner':
        return 'Partner';
      case 'admin':
        return 'Admin';
      default:
        return role;
    }
  };

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-[#E8E6E1] bg-[#FFFFFF]/95 backdrop-blur-md">
      <div className="ha-frame flex h-16 items-center justify-between gap-3">
        {/* Brand Anchor: Official Attached Transparent Icon */}
        <div className="flex min-w-0 items-center gap-3 lg:gap-6">
          <Link href="/" className="flex items-center focus:outline-none group" title="HearthAway Workspace">
            <div className="relative h-9 w-9 flex items-center justify-center">
              <Image
                src="/brand/hearthaway_icon_transparent_tight.svg"
                alt="HearthAway"
                width={36}
                height={36}
                className="h-9 w-9 object-contain select-none"
                priority
              />
            </div>
          </Link>

          {/* Role-Based Module Navigation: Portfolio | Partners | Sales | Finance */}
          {isAuthenticated && navItems.length > 0 && (
            <nav aria-label="Workspaces" className="hidden lg:flex items-center gap-1 border-l border-ha-line pl-3 lg:pl-6">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    aria-current={item.active ? 'page' : undefined}
                    className={`ha-nav-link flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      item.active
                        ? 'bg-ha-canvas text-ha-blue'
                        : 'text-[#6B6860] hover:text-[#1A1A1A] hover:bg-[#F7F6F3]'
                    }`}
                  >
                    <IconComponent className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {isAuthenticated && navItems.length > 0 && (
            <div className="lg:hidden">
              <button
                type="button"
                ref={navToggle}
                onClick={() => { setDropdownOpen(false); setMobileNavOpen((open) => !open); }}
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-module-navigation"
                aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className="flex min-h-11 items-center gap-2 px-2.5 justify-center rounded-lg border border-[#E8E6E1] text-[#1A1A1A] hover:bg-[#F7F6F3] focus:outline-none focus:ring-2 focus:ring-[#00319D]/30"
              >
                {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                <span className="text-sm font-semibold">{navItems.find((item) => item.active)?.name || 'Workspaces'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Section: Clean Account Controls & Photo */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <div className="relative" ref={accountRef}>
              <div className="flex items-center gap-1.5">
                <button
                  ref={accountToggle}
                  aria-expanded={dropdownOpen}
                  aria-label={`Account menu for ${currentUser.displayName || 'current user'}`}
                  aria-controls={dropdownOpen ? 'account-panel' : undefined}
                  onClick={() => { setMobileNavOpen(false); setDropdownOpen(!dropdownOpen); }}
                  className="group flex items-center gap-2 rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] pl-1.5 pr-2.5 py-1 hover:bg-[#E8E6E1]/60 transition-all text-left focus:outline-none cursor-pointer"
                >
                  <div className="relative h-8 w-8 rounded-full overflow-hidden ring-1 ring-[#E8E6E1] shrink-0 bg-[#00319D] text-[#FFFFFF] flex items-center justify-center">
                    {currentUser.avatarUrl ? (
                      <Image
                        src={currentUser.avatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                        unoptimized
                      />
                    ) : (
                      <span className="text-[11px] font-bold">
                        {(currentUser.displayName || currentUser.email || 'HA')
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}

                  </div>

                  <div className="hidden sm:block max-w-32 truncate">
                    <span className="text-xs font-semibold text-[#1A1A1A] leading-tight block">
                      {currentUser.displayName || 'My Account'}
                    </span>
                  </div>
                  <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 text-[#6B6860] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {dropdownOpen && (
                <div id="account-panel" className="ha-account-menu absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.75rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl bg-[#FFFFFF] p-2 shadow-lg ring-1 ring-[#1A1A1A]/5 z-50 border border-[#E8E6E1]">
                  {/* User Profile Header with Photo Upload & Camera Action */}
                  <div className="px-3 py-3 border-b border-[#E8E6E1] mb-1">
                    <div className="flex items-center gap-3">
                      <div className="relative group shrink-0">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-[#00319D] text-[#FFFFFF] flex items-center justify-center ring-2 ring-[#00319D]/20 shadow-xs">
                          {currentUser.avatarUrl ? (
                            <Image
                              src={currentUser.avatarUrl}
                              alt=""
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                              unoptimized
                            />
                          ) : (
                            <span className="text-sm font-extrabold tracking-wide">
                              {(currentUser.displayName || currentUser.email || 'HA')
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>

                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1A1A1A] truncate">{currentUser.displayName || 'Authorized User'}</p>
                        <p className="text-[11px] text-[#6B6860] truncate">{currentUser.email}</p>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#00319D] font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#FCC20A]" />
                          <span>Role: <strong>{formatRoleLabel(internalRole || currentUser.role)}</strong></span>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setIsPhotoModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F7F6F3] text-left transition-colors cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5 text-[#00319D]" />
                      Change profile photo
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        openAuthModal('manage');
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F7F6F3] text-left transition-colors cursor-pointer"
                    >
                      <Settings className="h-3.5 w-3.5 text-[#6B6860]" />
                      Account settings
                    </button>

                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                        router.push('/');
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left transition-colors cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            pathname === '/sign-up' && (
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3.5 py-1.5 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F7F6F3] transition-colors"
              >
                <LogIn className="h-3.5 w-3.5 text-[#00319D]" />
                Sign In
              </Link>
            )
          )}
        </div>
      </div>

      {isAuthenticated && mobileNavOpen && navItems.length > 0 && (
        <nav
          id="mobile-module-navigation"
          aria-label="Workspaces"
          className="lg:hidden border-t border-[#E8E6E1] bg-[#FFFFFF] px-4 py-3 shadow-sm"
        >
          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                    aria-current={item.active ? 'page' : undefined}
                  onClick={() => setMobileNavOpen(false)}
                  className={`ha-nav-link flex min-h-11 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    item.active
                      ? 'bg-ha-canvas text-ha-blue'
                      : 'text-[#6B6860] hover:bg-[#F7F6F3] hover:text-[#1A1A1A]'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <ArchivalControlModal
        isOpen={isArchivalModalOpen}
        onClose={() => setIsArchivalModalOpen(false)}
      />

      <ProfilePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => { setIsPhotoModalOpen(false); requestAnimationFrame(() => accountToggle.current?.focus()); }}
        currentAvatarUrl={currentUser.avatarUrl}
        userName={currentUser.displayName || currentUser.email}
        onSavePhoto={avatarUrl => updateCurrentUserProfile({ avatarUrl })}
      />
    </header>
  );
}
