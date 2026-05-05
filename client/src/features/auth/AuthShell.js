import React from 'react';
import { Link } from 'react-router-dom';
import { CandorLogoMark } from 'components/CandorLogoMark';

/**
 * Shared layout for login / signup — responsive, accessible chrome.
 */
export default function AuthShell({ brand = 'sage', title, subtitle, children, footer }) {
  const bg = brand === 'teal' ? 'var(--teal)' : 'var(--sage)';
  return (
    <div className="auth-shell">
      <div className="auth-shell-form">
        <div className="auth-shell-inner">
          <Link to="/" className="auth-shell-home" aria-label="Candor home">
            ← Candor
          </Link>
          <h1 className="auth-shell-title">{title}</h1>
          {subtitle ? <p className="auth-shell-subtitle">{subtitle}</p> : null}
          {children}
          {footer}
        </div>
      </div>
      <aside className="auth-shell-brand" style={{ background: bg }}>
        <CandorLogoMark size={44} title="Candor" style={{ flexShrink: 0 }} />
        <div className="auth-shell-brand-logo" style={{ marginTop: 14 }}>Candor</div>
        <p className="auth-shell-brand-copy">
          {brand === 'teal'
            ? 'Your first 3 interviews are free. No credit card required.'
            : 'AI-powered qualitative research that turns conversations into clarity.'}
        </p>
      </aside>
    </div>
  );
}
