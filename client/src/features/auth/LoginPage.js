import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { getAppRedirectPath } from 'shared/authRedirect';
import GoogleSignInButton from './GoogleSignInButton';
import AuthShell from './AuthShell';
import { googleSignInEnabled } from 'config/env';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const afterLogin = useMemo(() => getAppRedirectPath(location, '/app'), [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate(afterLogin);
    } catch (err) {
      const msg = err.response?.data?.error || 'Sign in failed. Check your connection and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Candor account"
      footer={(
        <p className="auth-footer-link">
          Don&apos;t have an account?{' '}
          <Link to={{ pathname: '/signup', search: location.search }}>Sign up</Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="login-email" className="auth-field-label">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="auth-field-input"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="login-password" className="auth-field-label">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="auth-field-input"
            aria-invalid={error ? 'true' : 'false'}
          />
        </div>
        {error ? (
          <div id="login-error" className="auth-error" role="alert">
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="auth-btn-primary"
        >
          {loading ? <span className="animate-spin" style={spinStyle} aria-hidden /> : null}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {googleSignInEnabled ? (
        <>
          <div className="auth-divider" aria-hidden>
            <div className="auth-divider-line" />
            <span style={{ flexShrink: 0 }}>or</span>
            <div className="auth-divider-line" />
          </div>
          <GoogleSignInButton redirectTo={afterLogin} />
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
