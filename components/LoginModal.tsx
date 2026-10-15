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
} from 'lucide-react';

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
    createAccount,
    updateCurrentUserProfile,
    logout,
  } = useHearthAway();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sign in state
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');

  // Profile update state
  const [editName, setEditName] = useState(currentUser?.displayName || '');
  const [editAvatarUrl, setEditAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (currentUser?.uid) {
      queueMicrotask(() => {
        setEditName(currentUser.displayName || '');
        setEditAvatarUrl(currentUser.avatarUrl || '');
      });
    }
  }, [currentUser?.uid, currentUser?.displayName, currentUser?.avatarUrl]);

  if (!isLoginModalOpen) return null;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = signinEmail.toLowerCase().trim();
    if (!cleanEmail) return;

    const match = availableUsers.find(
      (u) => u.email.toLowerCase() === cleanEmail
    );
    if (match) {
      loginWithUser(match);
      setIsLoginModalOpen(false);
    } else {
      const newUser = createAccount({
        displayName: cleanEmail.split('@')[0] || 'Operations Specialist',
        email: cleanEmail,
        role: 'portfolio_owner',
      });
      loginWithUser(newUser);
      setIsLoginModalOpen(false);
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
      const dataUrl = event.target?.result as string;
      setEditAvatarUrl(dataUrl);
      updateCurrentUserProfile({ avatarUrl: dataUrl });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
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

        {/* TAB 1: SIGN IN */}
        {authModalTab === 'signin' && (
          <div className="space-y-4">
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
                className="w-full rounded-lg bg-[#00319D] py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors shadow-xs cursor-pointer"
              >
                Sign In to System
              </button>
            </form>
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

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-[#00319D] bg-[#00319D]/5 px-3 py-2 text-xs font-semibold text-[#00319D] hover:bg-[#00319D]/10 transition-colors cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload Photo from Computer
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
    </div>
  );
}
