import React from 'react';
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center py-16 px-4 sm:px-6">
      <div className="ha-auth-card w-full max-w-md rounded-2xl border border-[#E8E6E1] bg-[#FFFFFF] p-8 text-center shadow-xs space-y-6">
        <div className="flex justify-center">
          <BrandLogo variant="light" size={40} showWordmark={false} />
        </div>

        <div className="space-y-2">

          <h1 className="text-2xl font-bold text-[#1A1A1A]">Page Not Found</h1>
          <p className="text-xs text-[#6B6860] leading-relaxed">
            The workspace or resource you requested could not be found or may have been relocated.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#00319D] px-4 py-2.5 text-xs font-bold text-[#FFFFFF] hover:bg-[#00257A] transition-colors"
          >
            <Home className="h-4 w-4" />
            Return to workspace
          </Link>

        </div>
      </div>
    </div>
  );
}
