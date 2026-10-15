'use client';

import React from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  size?: number;
  className?: string;
  variant?: 'light' | 'dark' | 'auto';
  showWordmark?: boolean;
  subtitle?: string;
}

export function BrandLogo({
  size = 36,
  className = '',
}: BrandLogoProps) {
  return (
    <Image
      src="/brand/hearthaway_icon_transparent_tight.svg"
      alt="HearthAway"
      width={size}
      height={size}
      className={`object-contain select-none ${className}`}
      priority
    />
  );
}
