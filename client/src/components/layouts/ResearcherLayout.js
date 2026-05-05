import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { PLANS, MODES } from 'shared/theme';
import api from 'shared/api';
import { CandorLogoMark } from 'components/CandorLogoMark';

export default function ResearcherLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState([]);
  const plan = PLANS[user?.plan || 'free'];
  const used = user?.interviewsUsed || 0;
  const limit = plan.interviews === -1 ? '∞' : plan.interviews;
  const pct = plan.interviews === -1 ? 100 : Math.round((used / plan.interviews) * 100);

  useEffect(() => {
    let cancelled = false;
    api.get('/surveys')
      .then((r) => {
        if (!cancelled) setProjects(r.data.surveys || []);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      });
    return () => { cancelled = true; };
  }, [location.pathname]);

  return (
    <div className="researcher-layout">
      <aside className="researcher-sidebar">
        <div className="researcher-sidebar-brand">
          <CandorLogoMark size={30} />
          <Link to="/" className="researcher-sidebar-brand-link" title="Candor home">
            Candor
          </Link>
        </div>

        <nav className="researcher-nav" aria-label="Primary">
          <NavLink to="/app" end className={navLinkClass}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden><rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="8.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="1.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/><rect x="8.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/></svg>
            Dashboard
          </NavLink>
          <NavLink to="/app/new" className={navLinkClass}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden><path d="M7.5 2v11M2 7.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            New survey
          </NavLink>

          <div className="researcher-nav-section">
            <div className="researcher-nav-section-label">Projects</div>
            {projects.length === 0 ? (
              <div className="researcher-nav-empty">
                No surveys yet — create one to see it here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {projects.map((s) => {
                  const m = MODES[s.mode] || MODES.founder;
                  const path = `/app/surveys/${s._id}`;
                  const active = location.pathname === path || location.pathname.startsWith(`${path}/`);
                  const label = (s.title && String(s.title).trim()) ? s.title : 'Untitled survey';
                  return (
                    <Link
                      key={s._id}
                      to={path}
                      title={label}
                      className={`researcher-project-link${active ? ' researcher-project-link--active' : ''}`}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: m.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        {label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="researcher-sidebar-footer">
          <div
            className="researcher-sidebar-name"
            title={user?.email || undefined}
          >
            {(user?.fullName && String(user.fullName).trim()) || 'Account'}
          </div>
          <div className="researcher-sidebar-plan-row">
            <span className="researcher-sidebar-plan-label">{plan.label}</span>
            <span className="researcher-sidebar-plan-use">{used} / {limit}</span>
          </div>
          <div className="researcher-sidebar-meter">
            <div className="researcher-sidebar-meter-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <button
            type="button"
            className="btn-sidebar-ghost"
            onClick={() => { logout(); navigate('/'); }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="researcher-main">
        <Outlet />
      </main>
    </div>
  );
}

function navLinkClass({ isActive }) {
  return `researcher-nav-link${isActive ? ' researcher-nav-link--active' : ''}`;
}
