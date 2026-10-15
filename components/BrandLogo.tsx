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
  size = 34,
  className = '',
}: BrandLogoProps) {
  return (
    <Image
      src="/brand/hearthaway-wordmark.svg"
      alt="HearthAway"
      width={Math.round(size * 3.5)}
      height={size}
      className={`object-contain select-none ${className}`}
      style={{ height: size, width: 'auto' }}
      priority
    />
  );
}
