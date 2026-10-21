'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useHearthAway } from '@/lib/context';
import { UserRole, AppUser } from '@/lib/types';
import {
  X,
  LogIn,
  CheckCircle2,
  LogOut,
  Mail,
  Key,
  Settings,
  Upload,
  Camera,
  Trash2,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Send,
} from 'lucide-react';
import { ProfilePhotoModal } from '@/components/ProfilePhotoModal';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
];

export function LoginModal() {
  const {
    isLoginModalOpen,
    setIsLoginModalOpen,
    authModalTab,
    setAuthModalTab,
    availableUsers,
    currentUser,
    loginWithUser,
    loginWithEmailPassword,
    resetPassword,
    createAccount,
    updateCurrentUserProfile,
    logout,
  } = useHearthAway();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sign in state
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [signinError, setSigninError] = useState('');

  // Password recovery state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // Profile update state
  const [editName, setEditName] = useState(currentUser?.displayName || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.uid) {
      queueMicrotask(() => {
        setEditName(currentUser.displayName || '');
        setEditAvatarUrl(currentUser.avatarUrl || '');
      });
    }
  }, [currentUser?.uid, currentUser?.displayName, currentUser?.avatarUrl]);

  if (!isLoginModalOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = signinEmail.toLowerCase().trim();
    if (!cleanEmail) return;

    setSigninError('');
    try {
      await loginWithEmailPassword(cleanEmail, signinPassword);
    } catch (error) {
      setSigninError(error instanceof Error ? error.message : 'Invalid email or password.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);

    const cleanEmail = (forgotEmail || signinEmail).toLowerCase().trim();
    if (!cleanEmail) {
      setResetError('Please enter a valid work email address.');
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(cleanEmail);
      setResetSuccess(true);
    } catch (err: any) {
      setResetError(err?.message || 'Unable to send password reset email. Please verify your email address.');
    } finally {
      setResetLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const targetDim = 280;
          canvas.width = targetDim;
          canvas.height = targetDim;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const minDim = Math.min(img.naturalWidth || 280, img.naturalHeight || 280);
            const startX = ((img.naturalWidth || 280) - minDim) / 2;
            const startY = ((img.naturalHeight || 280) - minDim) / 2;
            ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetDim, targetDim);
            const compressed = canvas.toDataURL('image/jpeg', 0.88);
            setEditAvatarUrl(compressed);
            updateCurrentUserProfile({ avatarUrl: compressed });
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 2500);
          } else {
            setEditAvatarUrl(rawDataUrl);
            updateCurrentUserProfile({ avatarUrl: rawDataUrl });
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 2500);
          }
        } catch {
          setEditAvatarUrl(rawDataUrl);
          updateCurrentUserProfile({ avatarUrl: rawDataUrl });
          setProfileSaved(true);
          setTimeout(() => setProfileSaved(false), 2500);
        }
      };
      img.onerror = () => {
        setEditAvatarUrl(rawDataUrl);
        updateCurrentUserProfile({ avatarUrl: rawDataUrl });
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setUploadError('Error reading file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setEditAvatarUrl('');
    updateCurrentUserProfile({ avatarUrl: '' });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleSelectPreset = (url: string) => {
    setEditAvatarUrl(url);
    updateCurrentUserProfile({ avatarUrl: url });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    updateCurrentUserProfile({
      displayName: editName.trim(),
      avatarUrl: editAvatarUrl,
    });
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

  const userInitials = (editName || currentUser?.displayName || currentUser?.email || 'HA')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-6 sm:p-7 shadow-2xl relative animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={() => setIsLoginModalOpen(false)}
          className="absolute top-5 right-5 rounded-lg p-1 text-[#6B6860] hover:bg-[#F7F6F3] hover:text-[#1A1A1A] transition-colors focus:outline-none cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header: Clean Title without Logo */}
        <div className="mb-5">
          <h2 className="text-xl font-extrabold text-[#1A1A1A] tracking-tight">
            {authModalTab === 'signin' ? 'Sign In' : 'Account & Profile Photo'}
          </h2>
          <p className="text-xs text-[#6B6860] mt-1">
            {authModalTab === 'signin'
              ? 'Enter your work credentials to access your designated workspace'
              : 'Update your display name, role settings, and custom profile photo'}
          </p>
        </div>

        {/* Auth Mode Tabs (Sign In or Profile & Photo) */}
        <div className="grid grid-cols-2 gap-1 bg-[#F7F6F3] p-1 rounded-lg text-xs font-semibold mb-5 border border-[#E8E6E1]">
          <button
            onClick={() => setAuthModalTab('signin')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
              authModalTab === 'signin'
                ? 'bg-[#FFFFFF] text-[#00319D] shadow-xs'
                : 'text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign In
          </button>
          <button
            onClick={() => setAuthModalTab('manage')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all cursor-pointer ${
              authModalTab === 'manage'
                ? 'bg-[#FFFFFF] text-[#00319D] shadow-xs'
                : 'text-[#6B6860] hover:text-[#1A1A1A]'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            Profile &amp; Photo
          </button>
        </div>

        {/* TAB 1: SIGN IN / FORGOT PASSWORD */}
        {authModalTab === 'signin' && (
          <div className="space-y-4">
            {!isForgotPassword ? (
              <form onSubmit={handleSignIn} className="space-y-3.5">
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#1A1A1A]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setForgotEmail(signinEmail);
                        setResetSuccess(false);
                        setResetError('');
                      }}
                      className="text-[11px] font-semibold text-[#00319D] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
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
                {signinError && <p className="text-xs font-medium text-red-600" role="alert">{signinError}</p>}

                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#00319D] py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In to System</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="rounded-lg bg-[#00319D]/5 border border-[#00319D]/15 p-3 flex items-start gap-2.5">
                  <Key className="h-4 w-4 text-[#00319D] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#00319D]">Recover Account Access</h4>
                    <p className="text-[11px] text-[#6B6860] mt-0.5">
                      Enter your account email below. We&apos;ll send a password reset link directly via Firebase Authentication.
                    </p>
                  </div>
                </div>

                {resetSuccess && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="font-bold">Password Reset Link Sent!</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Please check your email inbox for instructions to reset your password.
                      </p>
                    </div>
                  </div>
                )}

                {resetError && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 flex items-start gap-2 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <div>
                      <p className="font-bold">Reset Request Failed</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">{resetError}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6B6860]" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full rounded-lg border border-[#E8E6E1] bg-[#FFFFFF] pl-9 pr-3 py-2 text-xs text-[#1A1A1A] focus:border-[#00319D] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSuccess(false);
                      setResetError('');
                    }}
                    className="flex-1 rounded-lg border border-[#E8E6E1] py-2 text-xs font-semibold text-[#6B6860] hover:bg-[#F7F6F3] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Sign In
                  </button>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 rounded-lg bg-[#00319D] py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{resetLoading ? 'Sending...' : 'Send Reset Link'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: MANAGE PROFILE & PHOTO */}
        {authModalTab === 'manage' && (
          <div className="space-y-5">
            {/* Current Profile Card */}
            <div className="rounded-xl border border-[#E8E6E1] bg-[#F7F6F3] p-4 flex items-center gap-3.5">
              <div className="relative group shrink-0">
                <div className="h-14 w-14 rounded-full overflow-hidden bg-[#00319D] text-[#FFFFFF] flex items-center justify-center ring-2 ring-[#00319D]/20 shadow-xs">
                  {editAvatarUrl ? (
                    <Image
                      src={editAvatarUrl}
                      alt={editName || 'User'}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      unoptimized
                    />
                  ) : (
                    <span className="text-base font-extrabold tracking-wide">
                      {userInitials}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Upload new photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-[#1A1A1A] truncate">{currentUser?.displayName || 'Authorized User'}</h4>
                <p className="text-[11px] text-[#6B6860] truncate">{currentUser?.email}</p>
                <div className="mt-1 inline-flex items-center gap-1 rounded bg-[#00319D]/10 px-2 py-0.5 text-[10px] font-bold text-[#00319D]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FCC20A]" />
                  Active Role: {roleLabels[currentUser?.role || ''] || currentUser?.role}
                </div>
              </div>
            </div>

            {/* Photo Upload & Avatar Picker Section */}
            <div className="space-y-2.5 border-t border-[#E8E6E1] pt-4">
              <label className="block text-xs font-semibold text-[#1A1A1A]">
                Profile Photo
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#00319D] bg-[#00319D]/5 px-3 py-2 text-xs font-semibold text-[#00319D] hover:bg-[#00319D]/10 transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload from Device
                </button>

                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#00319D] px-3 py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Take with Camera
                </button>

                {editAvatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                    title="Remove Photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {uploadError && (
                <p className="text-[11px] text-rose-600 font-medium">{uploadError}</p>
              )}

              {/* Preset Avatars for quick selection */}
              <div className="pt-2">
                <p className="text-[10px] font-semibold text-[#6B6860] mb-1.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-[#FCC20A]" />
                  Or choose a preset profile image:
                </p>
                <div className="flex items-center gap-2">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectPreset(url)}
                      className={`h-8 w-8 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                        editAvatarUrl === url ? 'border-[#00319D] scale-110 shadow-xs' : 'border-transparent hover:border-[#E8E6E1]'
                      }`}
                    >
                      <Image
                        src={url}
                        alt={`Preset ${i + 1}`}
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Edit Display Name Form */}
            <form onSubmit={handleSaveProfile} className="space-y-3 border-t border-[#E8E6E1] pt-4">
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
                  Profile updated &amp; photo saved successfully!
                </p>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-[#00319D] py-2 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </form>

            <button
              onClick={() => {
                logout();
                setIsLoginModalOpen(false);
              }}
              className="w-full rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out of Session
            </button>
          </div>
        )}
      </div>

      <ProfilePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        currentAvatarUrl={editAvatarUrl || currentUser?.avatarUrl}
        userName={editName || currentUser?.displayName || currentUser?.email}
        onSavePhoto={(newPhotoUrl) => {
          setEditAvatarUrl(newPhotoUrl);
          updateCurrentUserProfile({ avatarUrl: newPhotoUrl });
          setProfileSaved(true);
          setTimeout(() => setProfileSaved(false), 2000);
        }}
      />
    </div>
  );
}
