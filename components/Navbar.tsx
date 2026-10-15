'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useHearthAway } from '@/lib/context';
import {
  Layers,
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
    isAuthenticated,
    logout,
    openAuthModal,
    updateCurrentUserProfile,
    students,
    payments,
    bookings,
  } = useHearthAway();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isArchivalModalOpen, setIsArchivalModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const flaggedStudents = students.filter((s) => s.isTestRecord || s.archivalStatus === 'Flagged For Archival').length;
  const flaggedPayments = payments.filter((p) => p.isTestRecord || p.archivalStatus === 'Flagged For Archival').length;
  const flaggedBookings = bookings.filter((b) => b.isTestRecord || b.archivalStatus === 'Flagged For Archival').length;
  const totalFlagged = flaggedStudents + flaggedPayments + flaggedBookings;

  const isManagement = currentUser.role === 'management' || currentUser.role === 'admin';

  // Determine role-based visible navigation items
  // Exact names and exact order: Portfolio | Partners | Sales | Finance
  const navItems = [];

  if (isManagement) {
    // Management users see all four navigation items in exact order
    navItems.push(
      { name: 'Portfolio', href: '/portfolio', icon: Layers, active: pathname.startsWith('/portfolio') },
      { name: 'Partners', href: '/partners', icon: Users, active: pathname.startsWith('/partners') },
      { name: 'Sales', href: '/sales', icon: Briefcase, active: pathname.startsWith('/sales') },
      { name: 'Finance', href: '/finance', icon: CreditCard, active: pathname.startsWith('/finance') }
    );
  } else if (currentUser.role === 'portfolio_owner') {
    // Portfolio Owner sees only their permitted Portfolio module
    navItems.push({
      name: 'Portfolio',
      href: '/portfolio',
      icon: Layers,
      active: pathname.startsWith('/portfolio'),
    });
  } else if (currentUser.role === 'partner') {
    // Partner sees only their permitted Partners module
    navItems.push({
      name: 'Partners',
      href: '/partners',
      icon: Users,
      active: pathname.startsWith('/partners') || pathname.startsWith('/partner'),
    });
  } else if (currentUser.role === 'sales') {
    // Sales sees only their permitted Sales module
    navItems.push({
      name: 'Sales',
      href: '/sales',
      icon: Briefcase,
      active: pathname.startsWith('/sales'),
    });
  } else if (currentUser.role === 'finance') {
    // Finance sees only their permitted Finance module
    navItems.push({
      name: 'Finance',
      href: '/finance',
      icon: CreditCard,
      active: pathname.startsWith('/finance'),
    });
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
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E6E1] bg-[#FFFFFF]/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Brand Anchor: Official Attached Transparent Icon */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="flex items-center focus:outline-none group" title="HearthAway Workspace">
            <div className="relative h-9 w-9 flex items-center justify-center transition-transform group-hover:scale-105">
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
            <nav className="hidden md:flex items-center gap-1 border-l border-[#E8E6E1] pl-6">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      item.active
                        ? 'bg-[#00319D] text-[#FFFFFF]'
                        : 'text-[#6B6860] hover:text-[#1A1A1A] hover:bg-[#F7F6F3]'
                    }`}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Section: Clean Account Controls & Photo */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="group flex items-center gap-2 rounded-lg border border-[#E8E6E1] bg-[#F7F6F3] pl-1.5 pr-2.5 py-1 hover:bg-[#E8E6E1]/60 transition-all text-left focus:outline-none cursor-pointer"
                >
                  <div className="relative h-8 w-8 rounded-full overflow-hidden ring-1 ring-[#E8E6E1] shrink-0 bg-[#00319D] text-[#FFFFFF] flex items-center justify-center">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.displayName || 'User'}
                        className="h-full w-full object-cover"
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

                    {/* Camera icon overlay hint on hover */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPhotoModalOpen(true);
                      }}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Upload or snap profile photo"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="hidden sm:block">
                    <span className="text-xs font-semibold text-[#1A1A1A] leading-tight block">
                      {currentUser.displayName || 'My Account'}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-[#6B6860]" />
                </button>
              </div>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#FFFFFF] p-2 shadow-lg ring-1 ring-[#1A1A1A]/5 z-50 border border-[#E8E6E1] animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* User Profile Header with Photo Upload & Camera Action */}
                  <div className="px-3 py-3 border-b border-[#E8E6E1] mb-1">
                    <div className="flex items-center gap-3">
                      <div className="relative group shrink-0">
                        <div className="h-12 w-12 rounded-full overflow-hidden bg-[#00319D] text-[#FFFFFF] flex items-center justify-center ring-2 ring-[#00319D]/20 shadow-xs">
                          {currentUser.avatarUrl ? (
                            <img
                              src={currentUser.avatarUrl}
                              alt={currentUser.displayName || 'User'}
                              className="h-full w-full object-cover"
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
                        <button
                          type="button"
                          onClick={() => {
                            setDropdownOpen(false);
                            setIsPhotoModalOpen(true);
                          }}
                          className="absolute inset-0 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Upload new picture or take photo with camera"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1A1A1A] truncate">{currentUser.displayName || 'Authorized User'}</p>
                        <p className="text-[11px] text-[#6B6860] truncate">{currentUser.email}</p>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#00319D] font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#FCC20A]" />
                          <span>Role: <strong>{formatRoleLabel(currentUser.role)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Direct Quick Action to Change Photo from Device or Camera */}
                    <div className="mt-3 pt-2.5 border-t border-[#E8E6E1]/70 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          setIsPhotoModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#00319D]/10 hover:bg-[#00319D]/15 text-[#00319D] px-2 py-1.5 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Upload or Snap Photo
                      </button>
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
                      Custom Profile Picture (Device / Camera)
                    </button>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        openAuthModal('manage');
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-[#1A1A1A] hover:bg-[#F7F6F3] text-left transition-colors cursor-pointer"
                    >
                      <Settings className="h-3.5 w-3.5 text-[#6B6860]" />
                      Account Settings &amp; Profile
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

      <ArchivalControlModal
        isOpen={isArchivalModalOpen}
        onClose={() => setIsArchivalModalOpen(false)}
      />

      <ProfilePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        currentAvatarUrl={currentUser.avatarUrl}
        userName={currentUser.displayName || currentUser.email}
        onSavePhoto={(newPhotoUrl) => {
          updateCurrentUserProfile({ avatarUrl: newPhotoUrl });
        }}
      />
    </header>
  );
}
