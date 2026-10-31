import React from 'react';

/**
 * SNIT Modern Institutional Logo
 * Features a modern geometric crest combining the stylized letter 'S',
 * an academic diamond mortarboard vertex, and dynamic tech nodes.
 */
export const SnitLogo = ({ className = 'w-10 h-10', size = 40 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        {/* Primary Gradient for Badge Base */}
        <linearGradient id="snitBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>

        {/* Accent Glow Gradient */}
        <linearGradient id="snitAccent" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>

        {/* Golden Diamond Light */}
        <linearGradient id="snitGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        {/* Drop Shadow Filter */}
        <filter id="snitShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#312E81" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Rounded Hexagonal / Shield Outer Badge */}
      <rect
        x="6"
        y="6"
        width="88"
        height="88"
        rx="26"
        fill="url(#snitBgGradient)"
        filter="url(#snitShadow)"
      />

      {/* Subtle Inner Glass Ring */}
      <rect
        x="8"
        y="8"
        width="84"
        height="84"
        rx="24"
        stroke="white"
        strokeOpacity="0.2"
        strokeWidth="2"
      />

      {/* Stylized Modern 'S' Geometric Emblem */}
      {/* Top Hook of 'S' */}
      <path
        d="M68 33 C68 25 59 22 50 22 C37 22 30 28 30 36 C30 45 40 48 53 51 C66 54 71 58 71 66 C71 77 60 80 49 80 C36 80 28 73 28 65"
        stroke="white"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dynamic Overlay Accent Stroke */}
      <path
        d="M34 32 C38 27 44 25 50 25 C58 25 64 28 64 34 C64 41 57 44 47 47"
        stroke="url(#snitAccent)"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* Top Academic Diamond Star (Signifying Excellence & Institution) */}
      <path
        d="M72 20 L75 14 L81 17 L78 23 Z"
        fill="url(#snitGold)"
      />
      <circle cx="76.5" cy="18.5" r="1.5" fill="white" />

      {/* Academic Cap Corner Subtle Accent */}
      <path
        d="M24 67 L21 73 L27 75 Z"
        fill="url(#snitAccent)"
        opacity="0.8"
      />
    </svg>
  );
};

export default SnitLogo;
