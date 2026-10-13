'use client';

import React from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  variant?: 'light' | 'dark' | 'auto';
  size?: number;
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
}

export function BrandLogo({
  variant = 'light',
  size = 38,
  showWordmark = true,
  subtitle = 'Student Accommodation Platform',
  className = '',
}: BrandLogoProps) {
  // Official HearthAway SVG logo
  const iconSrc =
    variant === 'dark'
      ? '/brand/hearthaway_icon_light.svg'
      : '/brand/hearthaway-icon-dark.svg';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="relative overflow-hidden rounded-lg shadow-xs flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <Image
          src={iconSrc}
          alt="HearthAway logo"
          width={size}
          height={size}
          className="w-full h-full object-cover"
          priority
          referrerPolicy="no-referrer"
        />
      </div>

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-[18px] tracking-tight text-[#1A1A1A]">
              HearthAway
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] text-[#6B6860] font-medium tracking-tight mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
