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

          <h1 className="ha-title">Page not found</h1>
          <p className="text-xs text-[#6B6860] leading-relaxed">
            This page may have moved or no longer exists.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="ha-primary-action w-full sm:w-auto"
          >
            <Home className="h-4 w-4" />
            Return to workspace
          </Link>

        </div>
      </div>
    </div>
  );
}
