import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { getAppRedirectPath } from 'shared/authRedirect';
import GoogleSignInButton from './GoogleSignInButton';
import AuthShell from './AuthShell';
import { googleSignInEnabled } from 'config/env';

export default function SignupPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signup = useAuthStore((s) => s.signup);
  const navigate = useNavigate();
  const location = useLocation();
  const afterSignup = useMemo(() => getAppRedirectPath(location, '/app/new'), [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!form.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(form.email.trim().toLowerCase(), form.password, form.fullName.trim());
      navigate(afterSignup);
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not create your account. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <AuthShell
      brand="teal"
      title="Create your account"
      subtitle="Start running smarter research in minutes"
      footer={(
        <p className="auth-footer-link">
          Already have an account?{' '}
          <Link to={{ pathname: '/login', search: location.search }}>Sign in</Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="signup-name" className="auth-field-label">Full name</label>
          <input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            value={form.fullName}
            onChange={set('fullName')}
            placeholder="Your name"
            required
            minLength={1}
            className="auth-field-input"
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="signup-email" className="auth-field-label">Email</label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            value={form.email}
            onChange={set('email')}
            placeholder="you@example.com"
            required
            className="auth-field-input"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'signup-error' : undefined}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="signup-password" className="auth-field-label">Password</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            placeholder="8+ characters"
            required
            minLength={8}
            className="auth-field-input"
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="signup-confirm" className="auth-field-label">Confirm password</label>
          <input
            id="signup-confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
            placeholder="••••••••"
            required
            className="auth-field-input"
          />
        </div>
        {error ? (
          <div id="signup-error" className="auth-error" role="alert">
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="auth-btn-primary auth-btn-primary--teal"
        >
          {loading ? <span className="animate-spin" style={spinStyle} aria-hidden /> : null}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      {googleSignInEnabled ? (
        <>
          <div className="auth-divider" aria-hidden>
            <div className="auth-divider-line" />
            <span style={{ flexShrink: 0 }}>or</span>
            <div className="auth-divider-line" />
          </div>
          <GoogleSignInButton redirectTo={afterSignup} />
        </>
      ) : null}
    </AuthShell>
  );
}

const spinStyle = {
  width: 14,
  height: 14,
  border: '2px solid rgba(255,255,255,.3)',
  borderTopColor: 'white',
  borderRadius: '50%',
  display: 'inline-block',
};
