import React from 'react';

/** Line icons for landing mode cards — stroke uses currentColor */
export function LandingModeIcon({ mode }) {
  const s = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', display: 'block' };
  switch (mode) {
    case 'founder':
      return (
        <svg {...s} aria-hidden><path d="M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" /></svg>
      );
    case 'researcher':
      return (
        <svg {...s} aria-hidden><path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M8 7h8M8 11h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      );
    case 'product':
      return (
        <svg {...s} aria-hidden><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" /><path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      );
    case 'event':
      return (
        <svg {...s} aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      );
    case 'hr':
      return (
        <svg {...s} aria-hidden><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" /><circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" /><path d="M3 20c0-3 3-5 5-5M16 15c2 0 5 2 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      );
    case 'csat':
      return (
        <svg {...s} aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" /><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="9" cy="10" r="1" fill="currentColor" /><circle cx="15" cy="10" r="1" fill="currentColor" /></svg>
      );
    default:
      return (
        <svg {...s} aria-hidden><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" /></svg>
      );
  }
}

const stepS = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none' };

export function LandingHowIcon({ step }) {
  switch (step) {
    case 'setup':
      return (
        <svg {...stepS} aria-hidden><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case 'share':
      return (
        <svg {...stepS} aria-hidden><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      );
    case 'interview':
      return (
        <svg {...stepS} aria-hidden><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      );
    case 'synthesis':
      return (
        <svg {...stepS} aria-hidden><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /><path d="M14 2v6h6M8 13h8M8 17h6M8 9h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      );
    default:
      return null;
  }
}
