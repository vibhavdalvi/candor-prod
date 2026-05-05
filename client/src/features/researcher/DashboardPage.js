import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from 'shared/api';
import { MODES } from 'shared/theme';
import { useAuthStore } from 'store/authStore';
import { CandorLogoMark } from 'components/CandorLogoMark';

export default function DashboardPage() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const initAuth = useAuthStore((s) => s.init);

  const loadSurveys = useCallback(() => {
    setLoading(true);
    api.get('/surveys')
      .then((r) => { setSurveys(r.data.surveys); })
      .catch(() => setSurveys([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  if (loading) return <div className="app-loading">Loading surveys</div>;

  if (!surveys.length) {
    return (
      <div className="app-empty">
        <div className="app-empty-icon">
          <CandorLogoMark size={34} title="Candor" />
        </div>
        <div className="app-empty-title">Create your first survey</div>
        <p className="app-empty-copy">
          Ship a link and collect adaptive interviews—no scheduling or live moderation required.
        </p>
        <button type="button" className="btn-app-primary" onClick={() => navigate('/app/new')}>
          Get started
          <span aria-hidden>→</span>
        </button>
      </div>
    );
  }

  return (
    <div className="app-page">
      <header className="app-page-header">
        <div>
          <div className="app-page-kicker">Overview</div>
          <h1 className="app-page-title">Your surveys</h1>
        </div>
      </header>
      <div className="dashboard-grid">
        {surveys.map((s) => (
          <SurveyCard
            key={s._id}
            survey={s}
            onOpen={() => {
              const hasResults = s._counts?.completed > 0;
              navigate(hasResults ? `/app/surveys/${s._id}/results` : `/app/surveys/${s._id}`);
            }}
            onDelete={async (e) => {
              e.stopPropagation();
              if (!window.confirm('Delete this study and all interviews/transcripts from the database? This cannot be undone.')) return;
              try {
                await api.delete(`/surveys/${s._id}`);
                await initAuth();
                setSurveys((prev) => prev.filter((x) => x._id !== s._id));
              } catch (err) {
                alert(err.response?.data?.error || 'Could not delete study');
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SurveyCard({ survey, onOpen, onDelete }) {
  const m = MODES[survey.mode] || MODES.founder;
  const completed = survey._counts?.completed || 0;
  const pct = completed > 0 ? 100 : 0;

  return (
    <article className="dashboard-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'var(--fm)',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              color: m.color,
              background: m.light,
              border: `1px solid ${m.border}`,
              borderRadius: 20,
              padding: '2px 8px',
            }}
          >
            {m.label}
          </span>
        </div>
        <button
          type="button"
          aria-label={`Delete study: ${survey.title}`}
          onClick={onDelete}
          className="btn-card-delete"
        >
          Delete
        </button>
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen();
          }
        }}
        style={{ cursor: 'pointer', margin: '-4px', padding: '4px', borderRadius: 8 }}
      >
        <div className="dashboard-card-title">{survey.title}</div>
        <div className="dashboard-card-metric">
          {completed} completed interview{completed !== 1 ? 's' : ''}
          {' · '}
          ~{survey.numQ} exchanges each
          {' · '}
          {new Date(survey.createdAt).toLocaleDateString()}
        </div>
        <div className="dashboard-card-progress">
          <div
            className="dashboard-card-progress-fill"
            style={{
              width: `${pct}%`,
              background: m.color,
              opacity: completed > 0 ? 1 : 0.35,
            }}
          />
        </div>
      </div>
    </article>
  );
}
