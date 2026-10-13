'use client';

import React from 'react';
import { HearthAwayProvider } from '@/lib/context';
import { Navbar } from '@/components/Navbar';
import { StudentDetailDrawer } from '@/components/StudentDetailDrawer';
import { AuthGuard } from '@/components/AuthGuard';
import { LoginModal } from '@/components/LoginModal';
import { BrandLogo } from '@/components/BrandLogo';

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <HearthAwayProvider>
      <div className="min-h-screen bg-[#F7F6F3] text-[#1A1A1A] font-sans antialiased flex flex-col selection:bg-[#FCC20A] selection:text-[#1A1A1A]">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AuthGuard>{children}</AuthGuard>
        </main>
        <footer className="border-t border-[#E8E6E1] bg-[#FFFFFF] py-6 text-xs text-[#6B6860]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <BrandLogo variant="light" size={24} showWordmark={false} />
              <span className="font-semibold text-[#1A1A1A]">HearthAway</span>
            </div>
            <div className="text-[11px] text-[#6B6860]">
              © 2026 JIRAIYA EDUCATION LLP
            </div>
          </div>
        </footer>
        <StudentDetailDrawer />
        <LoginModal />
      </div>
    </HearthAwayProvider>
  );
}
