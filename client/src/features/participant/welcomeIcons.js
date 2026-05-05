import React from 'react';

/** Small icons for participant welcome info cards — use survey accent color */
export function WelcomeInfoIcon({ variant, color }) {
  const stroke = color || 'var(--t2)';
  const s = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', ariaHidden: true };

  switch (variant) {
    case 'time':
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.65" />
          <path d="M12 7.5V12l4 2.5" stroke={stroke} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'honest':
      return (
        <svg {...s}>
          <path d="M5.5 12.5l4.5 4.5L18.5 8" stroke={stroke} strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'private':
      return (
        <svg {...s}>
          <path
            d="M7 11V8a5 5 0 0110 0v3"
            stroke={stroke}
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          <rect x="5" y="11" width="14" height="11" rx="2" stroke={stroke} strokeWidth="1.65" />
          <circle cx="12" cy="16" r="1.2" fill={stroke} />
        </svg>
      );
    default:
      return null;
  }
}
