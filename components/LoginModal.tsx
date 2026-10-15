'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useHearthAway } from '@/lib/context';
import { UserRole, AppUser } from '@/lib/types';
import { BrandLogo } from '@/components/BrandLogo';
import {
  X,
  Lock,
  UserPlus,
  LogIn,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Users,
  Briefcase,
  Layers,
  CreditCard,
  LogOut,
  Mail,
  Key,
  User,
  ArrowRight,
  Settings,
  Building,
  AlertCircle,
} from 'lucide-react';

export function LoginModal() {
  const {
    isLoginModalOpen,
    setIsLoginModalOpen,
    authModalTab,
    setAuthModalTab,
    availableUsers,
    currentUser,
    isAuthenticated,
    loginWithUser,
    loginWithGoogle,
    createAccount,
    updateCurrentUserProfile,
    logout,
  } = useHearthAway();

  // Create account state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('portfolio_owner');
  const [partnerOrg, setPartnerOrg] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Sign in state
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');

  // Profile update state
  const [editName, setEditName] = useState(currentUser?.displayName || '');
  const [profileSaved, setProfileSaved] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');
    if (!fullName || !email) return;

    if (!passcode) {
      setPasscodeError('Authorization passcode is required to create an account.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Server-side passcode verification & registration check
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode,
          displayName: fullName,
          email,
          password,
          role: selectedRole,
          partnerName: selectedRole === 'partner' ? partnerOrg || 'Global Partner Consulting' : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPasscodeError(data.error || 'Invalid passcode. Only authorized users may create accounts.');
        setIsSubmitting(false);
        return;
      }

      // Success confirmed by server
      createAccount({
        displayName: fullName,
        email,
        role: selectedRole,
        partnerName: selectedRole === 'partner' ? partnerOrg || 'Global Partner Consulting' : undefined,
      });

      setSignupSuccess(true);
      setTimeout(() => {
        setSignupSuccess(false);
        setIsLoginModalOpen(false);
      }, 1200);
    } catch (err) {
      setPasscodeError('Server error validating passcode. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const match = availableUsers.find(
      (u) => u.email.toLowerCase() === signinEmail.toLowerCase().trim()
    );
    if (match) {
      loginWithUser(match);
      setIsLoginModalOpen(false);
    } else {
      createAccount({
        displayName: signinEmail.split('@')[0] || 'Operations Specialist',
        email: signinEmail,
        role: 'portfolio_owner',
      });
      setIsLoginModalOpen(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    updateCurrentUserProfile({ displayName: editName.trim() });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const roleLabels: Record<string, string> = {
    management: 'Management',
    portfolio_owner: 'Portfolio Owner',
    sales: 'Sales',
    finance: 'Finance',
    partner: 'Partner',
    admin: 'Admin',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={() => setIsLoginModalOpen(false)}
          className="absolute top-5 right-5 rounded-lg p-1 text-[#6B6860] hover:bg-[#F7F6F3] hover:text-[#1A1A1A] transition-colors focus:outline-none"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <BrandLogo variant="light" size={40} showWordmark={true} subtitle="Student Accommodation Platform" />
        </div>

        {/* Auth Mode Tabs - Login is Primary Action */}
        <div className="grid grid-cols-3 gap-1 bg-[#F7F6F3] p-1 rounded-lg text-xs font-semibold mb-6 border border-[#E8E6E1]">
          <button
            onClick={() => setAuthModalTab('signin')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
              authModalTab === 'signin'
                ? 'bg-[#FFFFFF] text-[#00319D] shadow-xs'
                : 'text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign In
          </button>
          <button
            onClick={() => setAuthModalTab('signup')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
              authModalTab === 'signup'
                ? 'bg-[#FFFFFF] text-[#00319D] shadow-xs'
                : 'text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Create Account
          </button>
          <button
            onClick={() => setAuthModalTab('manage')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
              authModalTab === 'manage'
                ? 'bg-[#FFFFFF] text-[#00319D] shadow-xs'
                : 'text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Active Role
          </button>
        </div>

        {/* TAB 1: SIGN IN (Primary Action) */}
        {authModalTab === 'signin' && (
          <div className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B6860]" />
                  <input
                    type="email"
                    required
                    value={signinEmail}
                    onChange={(e) => setSigninEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B6860]" />
                  <input
                    type="password"
                    value={signinPassword}
                    onChange={(e) => setSigninPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-[#00319D] py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs"
              >
                Sign In to System
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: CREATE ACCOUNT (Requires Passcode Authorization 106) */}
        {authModalTab === 'signup' && (
          <form onSubmit={handleCreateAccount} className="space-y-4">
            {signupSuccess ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center space-y-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                <h4 className="text-xs font-bold text-emerald-900">Account Created Successfully</h4>
                <p className="text-[11px] text-emerald-700">
                  Welcome to HearthAway. Logging you in now...
                </p>
              </div>
            ) : (
              <>
                {/* Authorization Passcode Input - Mandatory Server-Enforced Field */}
                <div className="rounded-xl border border-[#00319D]/20 bg-[#00319D]/5 p-3 space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-[#00319D]">
                    <Lock className="h-3.5 w-3.5 text-[#00319D]" />
                    Authorization Passcode (Required)
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter passcode (e.g. 106)"
                    value={passcode}
                    onChange={(e) => {
                      setPasscode(e.target.value);
                      setPasscodeError('');
                    }}
                    className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-hidden font-mono"
                  />
                  {passcodeError ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 mt-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{passcodeError}</span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#6B6860]">
                      Account creation is restricted. Contact administration for your passcode authorization.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A1A] mb-1.5">
                    Select Internal or Partner Role:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('portfolio_owner')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedRole === 'portfolio_owner'
                          ? 'border-[#00319D] bg-[#F7F6F3] ring-1 ring-[#00319D]'
                          : 'border-[#E8E6E1] bg-[#FFFFFF] hover:border-[#1A1A1A]/30'
                      }`}
                    >
                      <Layers className="h-4 w-4 text-[#00319D] mb-1" />
                      <div className="text-xs font-bold text-[#1A1A1A]">Portfolio Owner</div>
                      <div className="text-[10px] text-[#6B6860] leading-tight">Onboard partners &amp; track leads</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole('partner')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedRole === 'partner'
                          ? 'border-[#00319D] bg-[#F7F6F3] ring-1 ring-[#00319D]'
                          : 'border-[#E8E6E1] bg-[#FFFFFF] hover:border-[#1A1A1A]/30'
                      }`}
                    >
                      <Users className="h-4 w-4 text-[#00319D] mb-1" />
                      <div className="text-xs font-bold text-[#1A1A1A]">Partner</div>
                      <div className="text-[10px] text-[#6B6860] leading-tight">Education consultant</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole('sales')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedRole === 'sales'
                          ? 'border-[#00319D] bg-[#F7F6F3] ring-1 ring-[#00319D]'
                          : 'border-[#E8E6E1] bg-[#FFFFFF] hover:border-[#1A1A1A]/30'
                      }`}
                    >
                      <Briefcase className="h-4 w-4 text-[#00319D] mb-1" />
                      <div className="text-xs font-bold text-[#1A1A1A]">Sales</div>
                      <div className="text-[10px] text-[#6B6860] leading-tight">Lead conversion &amp; booking</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole('finance')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedRole === 'finance'
                          ? 'border-[#00319D] bg-[#F7F6F3] ring-1 ring-[#00319D]'
                          : 'border-[#E8E6E1] bg-[#FFFFFF] hover:border-[#1A1A1A]/30'
                      }`}
                    >
                      <CreditCard className="h-4 w-4 text-[#00319D] mb-1" />
                      <div className="text-xs font-bold text-[#1A1A1A]">Finance</div>
                      <div className="text-[10px] text-[#6B6860] leading-tight">Ledger &amp; verification</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRole('management')}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        selectedRole === 'management'
                          ? 'border-[#00319D] bg-[#F7F6F3] ring-1 ring-[#00319D]'
                          : 'border-[#E8E6E1] bg-[#FFFFFF] hover:border-[#1A1A1A]/30'
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4 text-[#00319D] mb-1" />
                      <div className="text-xs font-bold text-[#1A1A1A]">Management</div>
                      <div className="text-[10px] text-[#6B6860] leading-tight">Organization management</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rachel Adams"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                      Work Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="rachel@hearthaway.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-hidden"
                    />
                  </div>

                  {selectedRole === 'partner' && (
                    <div>
                      <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                        Partner Agency / Company Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Global Education Ltd"
                        value={partnerOrg}
                        onChange={(e) => setPartnerOrg(e.target.value)}
                        className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-hidden"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-2 text-xs text-[#1A1A1A] placeholder-[#6B6860] focus:border-[#00319D] focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-[#00319D] py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Verifying Authorization...' : 'Create Authorized Account'}
                </button>
              </>
            )}
          </form>
        )}

        {/* TAB 3: MANAGE PROFILE */}
        {authModalTab === 'manage' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-4 flex items-center gap-3">
              <Image
                src={currentUser.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={currentUser.displayName}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-[#FFFFFF]"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-[#1A1A1A]">{currentUser.displayName}</h4>
                <p className="text-[11px] text-[#6B6860] truncate">{currentUser.email}</p>
                <div className="mt-1 inline-flex items-center gap-1 rounded bg-[#00319D]/10 px-2 py-0.5 text-[10px] font-bold text-[#00319D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FCC20A]" />
                  Active Role: {roleLabels[currentUser.role] || currentUser.role}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Update Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:outline-hidden"
                />
              </div>

              {profileSaved && (
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Profile updated successfully.
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-[#00319D] py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors"
              >
                Save Changes
              </button>
            </form>

            <button
              onClick={() => {
                logout();
                setIsLoginModalOpen(false);
              }}
              className="w-full rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out of Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
