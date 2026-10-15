'use client';

import React from 'react';

interface HearthAwayWordmarkProps {
  height?: number;
  className?: string;
}

export function HearthAwayWordmark({
  height = 32,
  className = '',
}: HearthAwayWordmarkProps) {
  // Aspect ratio is 1200 / 340 ≈ 3.53 : 1
  const calculatedWidth = Math.round(height * (1200 / 340));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1200 340"
      width={calculatedWidth}
      height={height}
      className={`h-auto max-w-full select-none inline-block ${className}`}
      style={{ height, width: 'auto' }}
      aria-label="HearthAway"
      role="img"
    >
      <defs>
        <style>{`
          .brand-wordmark-text {
            font-family: Georgia, 'Playfair Display', 'Times New Roman', 'Liberation Serif', serif;
            font-weight: 700;
            font-size: 206px;
            letter-spacing: -1px;
          }
        `}</style>
      </defs>

      {/* The Integrated HearthAway 'H' Lettermark */}
      <g transform="translate(8.14, 65.37) scale(0.44776)">
        <g fill="#00319D">
          {/* Left Column with Serifs */}
          <path d="M 60 55 L 205 55 L 205 70 C 190 70 170 75 170 110 L 170 402 C 170 437 190 442 205 442 L 205 457 L 60 457 L 60 442 C 75 442 95 437 95 402 L 95 110 C 95 75 75 70 60 70 Z" />
          
          {/* Right Column with Serifs */}
          <path d="M 307 55 L 452 55 L 452 70 C 437 70 417 75 417 110 L 417 402 C 417 437 437 442 452 442 L 452 457 L 307 457 L 307 442 C 322 442 342 437 342 402 L 342 110 C 342 75 322 70 307 70 Z" />
          
          {/* Central Bridge with Gable Roof Cutout */}
          <path d="M 170 210 L 342 210 L 342 285 L 256 235 L 170 285 Z" />
        </g>
        {/* Accent Gold Arch Door #FCC20A */}
        <path d="M 210 442 L 210 335 C 210 300 230 285 256 285 C 282 285 302 300 302 335 L 302 442 Z" fill="#FCC20A" />
      </g>

      {/* Wordmark Text: "earth" in Royal Blue #00319D and "Away" in Golden Amber #FCC20A */}
      <text x="216" y="263" className="brand-wordmark-text">
        <tspan fill="#00319D">earth</tspan><tspan fill="#FCC20A">Away</tspan>
      </text>
    </svg>
  );
}
