'use client';

import React from 'react';
import { HearthAwayProvider } from '@/lib/context';
import { Navbar } from '@/components/Navbar';
import { StudentDetailDrawer } from '@/components/StudentDetailDrawer';
import { AuthGuard } from '@/components/AuthGuard';
import { LoginModal } from '@/components/LoginModal';
import Image from 'next/image';

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <HearthAwayProvider>
      <div className="ha-shell font-sans antialiased flex flex-col selection:bg-[#FCC20A] selection:text-[#1A1A1A]">
        <a href="#workspace" className="ha-skip">Skip to workspace</a>
        <Navbar />
        <main id="workspace" tabIndex={-1} className="ha-frame flex-1 py-4 sm:py-6">
          <AuthGuard>{children}</AuthGuard>
        </main>
        <footer className="border-t border-[#E8E6E1] bg-[#FFFFFF] py-6 text-xs text-[#6B6860]">
          <div className="ha-frame flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Image
                src="/brand/hearthaway_icon_transparent_tight.svg"
                alt="HearthAway"
                width={24}
                height={24}
                className="h-6 w-6 object-contain select-none opacity-85 hover:opacity-100 transition-opacity"
              />
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
