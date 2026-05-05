import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { MODES, MODE_ORDER } from 'shared/modes';
import { LandingModeIcon, LandingHowIcon } from './landingIcons';
import { CandorLogoMark } from 'components/CandorLogoMark';
import { AUTH_CREATE_SURVEY, loginThenNewSurveyWithMode } from 'shared/authRedirect';

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const [activeMode, setActiveMode] = useState(null);
  const modeGradients = useMemo(() => ({
    founder: 'linear-gradient(135deg, rgba(92,122,107,.12), rgba(92,122,107,0) 60%)',
    researcher: 'linear-gradient(135deg, rgba(74,101,128,.14), rgba(74,101,128,0) 62%)',
    product: 'linear-gradient(135deg, rgba(139,94,110,.14), rgba(139,94,110,0) 60%)',
    event: 'linear-gradient(135deg, rgba(122,92,46,.16), rgba(122,92,46,0) 62%)',
    hr: 'linear-gradient(135deg, rgba(107,80,128,.15), rgba(107,80,128,0) 62%)',
    csat: 'linear-gradient(135deg, rgba(61,117,117,.15), rgba(61,117,117,0) 62%)',
  }), []);

  const modeDetails = useMemo(() => ({
    founder: {
      whenToUse: 'Validate an idea or direction before you over-invest.',
      howToUse: ['Describe idea, audience, and riskiest assumption.', 'Share links where your people already are.'],
      offers: ['Pain vs politeness', 'Themes and quotes for decisions'],
    },
    researcher: {
      whenToUse: 'Structured qualitative work for academic or professional studies.',
      howToUse: ['One clear research question and criteria.', 'Optional must-cover probes.'],
      offers: ['Neutral tone', 'Synthesis with evidence'],
    },
    product: {
      whenToUse: 'Understand friction, delight, and real behavior around a product.',
      howToUse: ['Name the product and what to stress-test.', 'Share with real users.'],
      offers: ['Stories not scores', 'Prioritized fix signals'],
    },
    event: {
      whenToUse: 'Capture reactions right after an event.',
      howToUse: ['Name the session and what “good” meant.', 'QR or link at the exit.'],
      offers: ['Peak and low moments', 'Actionable follow-ups'],
    },
    hr: {
      whenToUse: 'Anonymous pulse on morale, load, and clarity.',
      howToUse: ['Scope team and time window.', 'Private link; review themes.'],
      offers: ['Candid channel', 'Manager-ready signals'],
    },
    csat: {
      whenToUse: 'Go beyond a single CSAT/NPS number.',
      howToUse: ['Business + the interaction you care about.', 'Send after the touchpoint.'],
      offers: ['Expectation vs reality', 'Repeat and referral clues'],
    },
  }), []);

  const activeModeMeta = activeMode ? MODES[activeMode] : null;
  const activeModeDetails = activeMode ? modeDetails[activeMode] : null;

  return (
    <div style={{ background:'var(--white)', minHeight:'100vh' }}>
      <nav className="landing-nav">
        <Link to="/" className="landing-nav-logo" aria-label="Candor home">
          <span className="landing-logo-mark">
            <CandorLogoMark size={30} />
          </span>
          <span className="landing-nav-wordmark">Candor</span>
        </Link>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {user ? (
            <>
              <Link to="/app" className="landing-link">Dashboard</Link>
              <Link to="/app/new" className="landing-cta">New survey</Link>
            </>
          ) : (
            <>
              <Link to="/login" className="landing-link">Sign in</Link>
              <Link to={AUTH_CREATE_SURVEY} className="landing-cta">Create survey</Link>
            </>
          )}
        </div>
      </nav>

      <div className="landing-hero">
        <div className="landing-hero-tag"><span className="landing-htdot" /> Smarter surveys, richer responses</div>
        <h1>Surveys that listen.<br /><em>Not just collect.</em></h1>
        <p>Adaptive AI interviews instead of static forms—richer answers, less setup.</p>
        {!user ? (
          <div className="landing-hero-btns">
            <Link to={AUTH_CREATE_SURVEY} className="btn-hero-p">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Create your first survey
            </Link>
          </div>
        ) : null}
      </div>

      <div className="landing-modes">
        <div className="landing-modes-label">Choose your survey type</div>
        <div className="landing-modes-grid">
          {MODE_ORDER.map(key => {
            const m = MODES[key];
            return (
              <button
                key={key}
                type="button"
                className="landing-mode-card"
                onClick={() => setActiveMode(key)}
                style={{ backgroundImage: modeGradients[key] }}
              >
                <div className="landing-mode-icon-wrap" style={{ color:m.color, background:m.light, borderColor:m.border }}>
                  <LandingModeIcon mode={key} />
                </div>
                <div className="mode-title">{m.label}</div>
                <div className="mode-desc">{m.desc}</div>
                <div className="mode-tags">
                  {(m.tags || []).slice(0, 3).map(t => (
                    <span key={t} className="mode-tag" style={{ color:m.color, background:m.light, borderColor:m.border }}>{t}</span>
                  ))}
                </div>
                <div className="mode-more">Details</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="landing-how">
        <div className="how-title">How it works</div>
        <p className="how-sub">Four steps. No moderator scheduling.</p>
        <div className="how-steps">
          {[
            { n:'01', icon:'setup', t:'Configure', d:'Pick a mode, enter your topic. Optional AI for depth and aligned fields.' },
            { n:'02', icon:'share', t:'Share', d:'Link or QR—works on any phone, no app.' },
            { n:'03', icon:'interview', t:'Interview', d:'AI-led chat; type or speak.' },
            { n:'04', icon:'synthesis', t:'Synthesize', d:'Themes, quotes, exports.' },
          ].map(s => (
            <div key={s.n} className="how-step">
              <div className="step-num">{s.n}</div>
              <div className="step-icon-wrap">
                <LandingHowIcon step={s.icon} />
              </div>
              <div className="step-title">{s.t}</div>
              <div className="step-desc">{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      <footer className="landing-footer">
        <div className="footer-logo">
          <CandorLogoMark size={20} />
          <span>Candor</span>
        </div>
        <div className="footer-note">AI qualitative research</div>
      </footer>

      {activeModeMeta && activeModeDetails && (
        <div
          className="landing-mode-modal-overlay"
          onClick={() => setActiveMode(null)}
          role="presentation"
        >
          <div
            className="landing-mode-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${activeModeMeta.label} details`}
            onClick={(e) => e.stopPropagation()}
            style={{
              '--mode-accent': activeModeMeta.color,
              '--mode-accent-soft': activeModeMeta.light,
              '--mode-gradient': modeGradients[activeMode],
            }}
          >
            <button type="button" className="landing-mode-modal-close" onClick={() => setActiveMode(null)} aria-label="Close mode details">
              ×
            </button>
            <div className="landing-mode-modal-head">
              <div className="landing-mode-logo-stack">
                <CandorLogoMark size={34} />
                <div className="landing-mode-modal-icon" style={{ color: activeModeMeta.color, background: activeModeMeta.light, borderColor: activeModeMeta.border }}>
                  <LandingModeIcon mode={activeMode} />
                </div>
              </div>
              <div>
                <div className="landing-mode-modal-title">{activeModeMeta.label}</div>
                <div className="landing-mode-modal-sub">{activeModeMeta.desc}</div>
              </div>
            </div>

            <div
              className="landing-mode-modal-section"
              style={{ borderColor: activeModeMeta.border, background: activeModeMeta.light }}
            >
              <div className="landing-mode-modal-label">Best when</div>
              <p>{activeModeDetails.whenToUse}</p>
            </div>

            <div className="landing-mode-modal-grid">
              <div className="landing-mode-modal-section">
                <div className="landing-mode-modal-label">How to use it</div>
                <ul>
                  {activeModeDetails.howToUse.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="landing-mode-modal-section">
                <div className="landing-mode-modal-label">What you get</div>
                <ul>
                  {activeModeDetails.offers.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="landing-mode-modal-cta">
              <Link
                to={user ? `/app/new?mode=${activeMode}` : loginThenNewSurveyWithMode(activeMode)}
                className="btn-hero-p"
                onClick={() => setActiveMode(null)}
              >
                Start with {activeModeMeta.label}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
