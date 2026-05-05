import React from 'react';

const S = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', display: 'block', ariaHidden: true };

/**
 * Icons for “Where to share” hints — stroke uses `color` (survey accent).
 */
export function ShareWhereIcon({ name, color }) {
  const c = color || 'var(--t2)';

  switch (name) {
    case 'whatsapp':
      return (
        <svg {...S}>
          <path
            d="M12 3a9 9 0 00-7.8 13.5L4 21l4.7-1.2A9 9 0 1012 3z"
            stroke={c}
            strokeWidth="1.55"
            strokeLinejoin="round"
          />
          <path d="M8.5 10h7M8.5 13.5h4" stroke={c} strokeWidth="1.45" strokeLinecap="round" />
        </svg>
      );
    case 'email':
      return (
        <svg {...S}>
          <path d="M4 6h16v12H4V6z" stroke={c} strokeWidth="1.55" strokeLinejoin="round" />
          <path d="M4 8l8 6 8-6" stroke={c} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg {...S}>
          <rect x="3" y="3" width="18" height="18" rx="3" stroke={c} strokeWidth="1.55" />
          <path d="M8 10v7M8 7.5v.01M12.5 17v-4.2a2 2 0 014 0V17" stroke={c} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'slack':
      return (
        <svg {...S}>
          <path d="M8 10a2 2 0 012-2h0v4H8v-2zM14 8a2 2 0 012 2v0h-4V8h2zM16 14a2 2 0 01-2 2h0v-4h4v2zM10 16a2 2 0 01-2-2v0h4v4h-2z" stroke={c} strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'users':
      return (
        <svg {...S}>
          <circle cx="9" cy="8" r="3" stroke={c} strokeWidth="1.55" />
          <path d="M4 20v-1a4 4 0 014-4h2a4 4 0 014 4v1" stroke={c} strokeWidth="1.55" strokeLinecap="round" />
          <circle cx="17" cy="9" r="2.5" stroke={c} strokeWidth="1.55" />
          <path d="M21 20v0a3 3 0 00-3-3h-1" stroke={c} strokeWidth="1.55" strokeLinecap="round" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg {...S}>
          <path d="M9 4h6l1 2h3v14H5V6h3l1-2z" stroke={c} strokeWidth="1.55" strokeLinejoin="round" />
          <path d="M9 4h6v3H9V4z" stroke={c} strokeWidth="1.55" strokeLinejoin="round" />
          <path d="M8 11h8M8 15h6" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'forward':
      return (
        <svg {...S}>
          <path d="M14 5l5 4-5 4M19 9H7a4 4 0 00-4 4v6" stroke={c} strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'smartphone':
      return (
        <svg {...S}>
          <rect x="7" y="3" width="10" height="18" rx="2" stroke={c} strokeWidth="1.55" />
          <path d="M10 18h4" stroke={c} strokeWidth="1.55" strokeLinecap="round" />
        </svg>
      );
    case 'sms':
      return (
        <svg {...S}>
          <path d="M4 6h16v10H8l-4 4V6z" stroke={c} strokeWidth="1.55" strokeLinejoin="round" />
          <path d="M8 10h.01M12 10h.01M16 10h.01" stroke={c} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'messages':
      return (
        <svg {...S}>
          <path d="M12 20l-3-3H6a2 2 0 01-2-2V7a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-3l-3 3z" stroke={c} strokeWidth="1.55" strokeLinejoin="round" />
          <path d="M8 10h8M8 13h5" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'presentation':
      return (
        <svg {...S}>
          <rect x="3" y="4" width="18" height="12" rx="1" stroke={c} strokeWidth="1.55" />
          <path d="M12 16v3M9 21h6" stroke={c} strokeWidth="1.55" strokeLinecap="round" />
          <path d="M7 8h10M7 11h7" stroke={c} strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      );
    case 'poster':
      return (
        <svg {...S}>
          <path d="M8 3h8v18H8V3z" stroke={c} strokeWidth="1.55" strokeLinejoin="round" />
          <path d="M10 7h4M10 11h4M10 15h3" stroke={c} strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      );
    case 'qr':
      return (
        <svg {...S}>
          <path d="M3 3h7v7H3V3zM14 3h7v7h-7V3zM3 14h7v7H3v-7z" stroke={c} strokeWidth="1.45" strokeLinejoin="round" />
          <path d="M14 14h3v3h-3v-3zM18 18h3v3h-3v-3zM18 14h3M14 18v3" stroke={c} strokeWidth="1.45" strokeLinecap="round" />
        </svg>
      );
    case 'receipt':
      return (
        <svg {...S}>
          <path d="M7 3h10l2 3v15l-3-2-2 2-2-2-2 2-2-2-3 2V6l2-3z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 8h6M9 11h6M9 14h4" stroke={c} strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      );
    case 'store':
      return (
        <svg {...S}>
          <path d="M4 10V8l2-5h12l2 5v2M4 10h16v10a1 1 0 01-1 1H5a1 1 0 01-1-1V10z" stroke={c} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 14h6" stroke={c} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'link':
      return (
        <svg {...S}>
          <path d="M10 14a4 4 0 005.7 0l2-2a4 4 0 10-5.7-5.7l-1 1" stroke={c} strokeWidth="1.55" strokeLinecap="round" />
          <path d="M14 10a4 4 0 00-5.7 0l-2 2a4 4 0 105.7 5.7l1-1" stroke={c} strokeWidth="1.55" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...S}>
          <circle cx="12" cy="12" r="8" stroke={c} strokeWidth="1.55" />
          <path d="M12 8v8M8 12h8" stroke={c} strokeWidth="1.45" strokeLinecap="round" />
        </svg>
      );
  }
}

/** Tab / toolbar: link, qrcode, copy, download, navigation */
export function ShareUiIcon({ name, color, size = 14 }) {
  const c = color || 'currentColor';
  const svg = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', ariaHidden: true, style: { display: 'block' } };
  switch (name) {
    case 'link':
      return (
        <svg {...svg}>
          <path d="M10 13a4 4 0 005.7 0l2-2a4 4 0 10-5.7-5.7l-.6.6" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
          <path d="M14 11a4 4 0 00-5.7 0l-2 2a4 4 0 105.7 5.7l.5-.5" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'qrcode':
      return (
        <svg {...svg}>
          <path d="M4 4h7v7H4V4zM13 4h7v7h-7V4zM4 13h7v7H4v-7z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M13 13h3v3h-3v-3zM17 17h3v3h-3v-3zM17 13h3M13 17v3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'check':
      return (
        <svg {...svg}>
          <path d="M5 12l4 4L19 7" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'download':
      return (
        <svg {...svg}>
          <path d="M12 5v10M8 13l4 4 4-4" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 19h14" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case 'arrowLeft':
      return (
        <svg {...svg}>
          <path d="M19 12H5M12 19l-7-7 7-7" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...svg}>
          <path d="M21 12a9 9 0 00-15-6.3L3 8M3 8v4h4M3 12a9 9 0 0015 6.3L21 16m0 0v-4h-4" stroke={c} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}
