'use client';

import { PasswordField } from '@/components/PasswordField';

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
    if (isSubmitting) return;
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
      // This app intentionally has no privileged backend. Keep authorization in the
      // client flow and let Firestore rules enforce authenticated ownership.
      if (passcode.trim() !== '106') {
        setErrorMessage('Invalid authorization passcode.');
        return;
      }

      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }

      await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);

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
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-6">
      <div className="ha-auth-card w-full max-w-lg rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-8 sm:p-9 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <h1 className="ha-title">
            Create account
          </h1>
          <p className="text-xs text-[#6B6860]">
            Use the passcode provided by your workspace administrator.
          </p>
        </div>

        {isSuccess ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center space-y-3 animate-in fade-in duration-200">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-emerald-900">Account created</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Your account is ready.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-[11px] font-semibold text-emerald-800">
              <Clock className="h-3 w-3" />
              Redirecting to your workspace status...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-start gap-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Passcode Field */}
            <div className="rounded-xl border border-[#00319D]/20 bg-[#00319D]/5 p-3.5 space-y-1.5">
              <label htmlFor="sign-up-passcode" className="flex items-center gap-1.5 text-xs font-bold text-[#00319D]">
                <Lock className="h-3.5 w-3.5 text-[#00319D]" />
                Authorization passcode
              </label>
              <input
                id="sign-up-passcode"
                type="password"
                required
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] px-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-hidden font-mono transition-all"
              />

            </div>

            <label className="block text-sm font-medium">Account role
              <select className="mt-1 w-full rounded-lg border border-ha-line bg-white px-3 py-2" value={selectedRole}
                onChange={event => setSelectedRole(event.target.value as UserRole)}>
                <option value="portfolio_owner">Portfolio owner</option><option value="partner">Partner</option>
                <option value="sales">Sales</option><option value="finance">Finance</option><option value="management">Management</option>
              </select>
            </label>

            {/* User Details */}
            <div className="space-y-3">
              <div>
                <label htmlFor="sign-up-full-name" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B6860]" />
                  <input
                    id="sign-up-full-name" autoComplete="name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sign-up-email" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B6860]" />
                  <input
                    id="sign-up-email" autoComplete="email"
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
                  <label htmlFor="sign-up-partner-org" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Partner Agency / Company Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B6860]" />
                    <input
                      id="sign-up-partner-org"
                      type="text"
                      value={partnerOrg}
                      onChange={(e) => setPartnerOrg(e.target.value)}
                      className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-hidden transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="sign-up-password" className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                  Password
                </label>
                <PasswordField id="sign-up-password" autoComplete="new-password" minLength={6} required value={password} disabled={isSubmitting} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-[#00319D] py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isSubmitting ? 'Creating account…' : 'Create account'}</span>
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
