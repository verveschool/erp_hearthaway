'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHearthAway } from '@/lib/context';
import { UserRole, AppUser } from '@/lib/types';
import { Mail, Key, LogIn, AlertCircle, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

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

const roleDisplayLabels: Record<string, string> = {
  management: 'Management',
  portfolio_owner: 'Portfolio Owner',
  sales: 'Sales',
  finance: 'Finance',
  partner: 'Partner',
  admin: 'Admin',
};

export default function HomePage() {
  const router = useRouter();
  const {
    currentUser,
    isAuthenticated,
    loginWithUser,
    loginWithEmailPassword,
    resetPassword,
    createAccount,
    availableUsers,
    logout,
  } = useHearthAway();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot password mode
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // If already authenticated, redirect directly to the user's designated workspace
  useEffect(() => {
    if (isAuthenticated && currentUser?.uid) {
      const targetRoute = getDashboardForRole(currentUser.role);
      router.replace(targetRoute);
    }
  }, [isAuthenticated, currentUser, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your work email address.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithEmailPassword(cleanEmail, password);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResetSuccess(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(cleanEmail);
      setResetSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to send password reset link. Please check your email address.');
    } finally {
      setIsLoading(false);
    }
  };

  // If already authenticated, render a minimal redirect view
  if (isAuthenticated && currentUser?.uid) {
    const targetRoute = getDashboardForRole(currentUser.role);
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-8 text-center space-y-4 shadow-xs">
          <div className="h-10 w-10 mx-auto rounded-full border-2 border-[#00319D] border-t-transparent animate-spin" />
          <h2 className="text-base font-bold text-[#1A1A1A]">Redirecting to Workspace</h2>
          <p className="text-xs text-[#6B6860]">
            Signed in as <strong className="text-[#1A1A1A]">{currentUser.displayName}</strong> ({roleDisplayLabels[currentUser.role] || currentUser.role})
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push(targetRoute)}
              className="rounded-lg bg-[#00319D] px-4 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors"
            >
              Open Dashboard Now
            </button>
            <button
              onClick={logout}
              className="rounded-lg border border-[#E8E6E1] px-4 py-2 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3] transition-colors"
            >
              Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center py-6 px-4 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-8 sm:p-9 shadow-xs space-y-6">
        {/* Header - Clean Sign In without Logo */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
            {isForgotPassword ? 'Reset Password' : 'Sign In'}
          </h1>
          <p className="text-xs text-[#6B6860]">
            {isForgotPassword
              ? 'Enter your work email to receive a password recovery link'
              : 'Enter your credentials to access your workspace'}
          </p>
        </div>

        {!isForgotPassword ? (
          /* Unified Sign In Form */
          <form onSubmit={handleSignIn} className="space-y-4">
            {errorMessage && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6860]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-hidden transition-all"
                  placeholder="e.g. alex@hearthaway.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#1A1A1A]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setErrorMessage('');
                    setResetSuccess(false);
                  }}
                  className="text-[11px] font-semibold text-[#00319D] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6860]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-hidden transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-[#00319D] py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              <span>{isLoading ? 'Signing In...' : 'Sign In to System'}</span>
            </button>
          </form>
        ) : (
          /* Password Recovery Form */
          <form onSubmit={handleResetPassword} className="space-y-4">
            {resetSuccess && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-bold">Reset Email Sent!</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Instructions to set a new password have been sent to <strong>{email}</strong>.
                  </p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                Registered Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#6B6860]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:ring-1 focus:ring-[#00319D] focus:outline-hidden transition-all"
                  placeholder="e.g. user@hearthaway.com"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setErrorMessage('');
                  setResetSuccess(false);
                }}
                className="flex-1 rounded-lg border border-[#E8E6E1] py-2.5 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Sign In</span>
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-lg bg-[#00319D] py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{isLoading ? 'Sending...' : 'Send Reset Link'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
