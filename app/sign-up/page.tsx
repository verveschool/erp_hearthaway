'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useHearthAway } from '@/lib/context';
import { UserRole } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import {
  Lock,
  Mail,
  Key,
  User,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Layers,
  Users,
  Briefcase,
  CreditCard,
  Clock,
} from 'lucide-react';

function getDashboardForRole(role: UserRole): string {
  switch (role) {
    case 'partner':
      return '/partners';
    case 'portfolio_owner':
      return '/portfolio';
    case 'sales':
      return '/sales';
    case 'finance':
      return '/finance';
    case 'management':
    case 'admin':
    default:
      return '/portfolio';
  }
}

export default function SignUpPage() {
  const router = useRouter();
  const { createAccount } = useHearthAway();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('portfolio_owner');
  const [partnerOrg, setPartnerOrg] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!passcode) {
      setErrorMessage('Authorization passcode is required.');
      return;
    }
    if (!fullName.trim() || !email.trim()) {
      setErrorMessage('Full name and work email are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate passcode and register server-side
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode: passcode.trim(),
          displayName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: selectedRole,
          partnerName: selectedRole === 'partner' ? partnerOrg || 'Global Partner Consulting' : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Invalid passcode. Only authorized users may create accounts.');
        setIsSubmitting(false);
        return;
      }

      // Create Firebase Auth user credentials
      try {
        await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      } catch (authErr: any) {
        // If user already exists in Auth, log and proceed with profile document creation
        console.warn('Firebase Auth user registration note:', authErr.message);
      }

      // Create account in application context & sync to Firestore
      const newUser = createAccount({
        displayName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role: selectedRole,
        partnerName: selectedRole === 'partner' ? partnerOrg || 'Global Partner Consulting' : undefined,
      });

      setIsSuccess(true);
      setTimeout(() => {
        const dest = getDashboardForRole(newUser.role);
        router.push(dest);
      }, 1800);
    } catch (err) {
      setErrorMessage('Server error validating authorization. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-6 px-4 sm:px-6">
      <div className="w-full max-w-lg rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-8 sm:p-9 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#00319D]/10 px-3 py-1 text-[11px] font-bold text-[#00319D] mb-1">
            <Lock className="h-3 w-3" />
            Restricted Registration • Passcode Required
          </div>
          <h1 className="text-xl font-extrabold text-[#1A1A1A] tracking-tight">
            Create Authorized Account
          </h1>
          <p className="text-xs text-[#6B6860]">
            Enter your authorization passcode and credentials to provision an account
          </p>
        </div>

        {isSuccess ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3 animate-in fade-in duration-200">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-emerald-900">Account Created &amp; Synced with Firebase</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Your account has been registered with Firebase Authentication. For security, non-admin accounts require administrator approval (<strong className="text-[#00319D]">tribeverve@gmail.com</strong>) before workspace access is unlocked.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-[11px] font-semibold text-emerald-800">
              <Clock className="h-3 w-3" />
              Redirecting to your workspace status...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Passcode Field */}
            <div className="rounded-xl border border-[#00319D]/20 bg-[#00319D]/5 p-3.5 space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#00319D]">
                <Lock className="h-3.5 w-3.5 text-[#00319D]" />
                Authorization Passcode (Required)
              </label>
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-hidden font-mono transition-all"
              />
              <p className="text-[10px] text-[#6B6860]">
                Access is restricted to authorized personnel with assigned passcodes.
              </p>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                Account Role:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('portfolio_owner')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedRole === 'portfolio_owner'
                      ? 'border-[#00319D] bg-[#F7F6F3] ring-1 ring-[#00319D]'
                      : 'border-[#E8E6E1] bg-[#FFFFFF] hover:border-[#1A1A1A]/30'
                  }`}
                >
                  <Layers className="h-4 w-4 text-[#00319D] mb-1" />
                  <div className="text-xs font-bold text-[#1A1A1A]">Portfolio Owner</div>
                  <div className="text-[10px] text-[#6B6860] leading-tight">Partners &amp; lead rollups</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('partner')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
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
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedRole === 'sales'
                      ? 'border-[#00319D] bg-[#F7F6F3] ring-1 ring-[#00319D]'
                      : 'border-[#E8E6E1] bg-[#FFFFFF] hover:border-[#1A1A1A]/30'
                  }`}
                >
                  <Briefcase className="h-4 w-4 text-[#00319D] mb-1" />
                  <div className="text-xs font-bold text-[#1A1A1A]">Sales</div>
                  <div className="text-[10px] text-[#6B6860] leading-tight">Lead conversion &amp; bookings</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('finance')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedRole === 'finance'
                      ? 'border-[#00319D] bg-[#F7F6F3] ring-1 ring-[#00319D]'
                      : 'border-[#E8E6E1] bg-[#FFFFFF] hover:border-[#1A1A1A]/30'
                  }`}
                >
                  <CreditCard className="h-4 w-4 text-[#00319D] mb-1" />
                  <div className="text-xs font-bold text-[#1A1A1A]">Finance</div>
                  <div className="text-[10px] text-[#6B6860] leading-tight">Audits &amp; settlements</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('management')}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    selectedRole === 'management'
                      ? 'border-[#00319D] bg-[#F7F6F3] ring-1 ring-[#00319D]'
                      : 'border-[#E8E6E1] bg-[#FFFFFF] hover:border-[#1A1A1A]/30'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4 text-[#00319D] mb-1" />
                  <div className="text-xs font-bold text-[#1A1A1A]">Management</div>
                  <div className="text-[10px] text-[#6B6860] leading-tight">Operations management</div>
                </button>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B6860]" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B6860]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              {selectedRole === 'partner' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Partner Agency / Company Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B6860]" />
                    <input
                      type="text"
                      value={partnerOrg}
                      onChange={(e) => setPartnerOrg(e.target.value)}
                      className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-hidden transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B6860]" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#00319D] py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isSubmitting ? 'Verifying Authorization...' : 'Create Authorized Account'}</span>
            </button>
          </form>
        )}

        {/* Back to Sign In Link */}
        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs font-semibold text-[#6B6860] hover:text-[#00319D] transition-colors inline-flex items-center gap-1.5"
          >
            <span>Return to Sign In</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
