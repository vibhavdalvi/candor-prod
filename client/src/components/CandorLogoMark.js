import React from 'react';

/** Same geometry as `public/favicon.svg` — Candor conversation mark. */
export function CandorLogoMark({ size = 32, title, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <rect width="32" height="32" rx="9" fill="#111827" />
      <path
        d="M9 12h14M9 16h9.5M9 20h6.5"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
