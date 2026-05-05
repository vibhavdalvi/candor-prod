import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, useGoogleOAuth } from '@react-oauth/google';
import { useAuthStore } from 'store/authStore';
import { googleSignInEnabled } from 'config/env';

function useGoogleButtonWidth() {
  const [w, setW] = useState(360);
  useEffect(() => {
    const ro = () => {
      setW(Math.min(400, Math.max(280, (typeof window !== 'undefined' ? window.innerWidth : 400) - 56)));
    };
    ro();
    window.addEventListener('resize', ro);
    return () => window.removeEventListener('resize', ro);
  }, []);
  return w;
}

/**
 * Renders after gsi script loads. Shows hints if the script is blocked (common with ad blockers).
 */
function GoogleSignInInner({ redirectTo = '/app' }) {
  const [error, setError] = useState('');
  const [showSlowHint, setShowSlowHint] = useState(false);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const navigate = useNavigate();
  const width = useGoogleButtonWidth();
  const { scriptLoadedSuccessfully } = useGoogleOAuth();

  useEffect(() => {
    const t = setTimeout(() => setShowSlowHint(true), 6000);
    return () => clearTimeout(t);
  }, []);

  const w = Math.max(280, Math.min(400, Math.round(width)));

  return (
    <>
      <div className="auth-google-wrap" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {!scriptLoadedSuccessfully ? (
          <p style={{ fontSize: 12, color: 'var(--t3)', margin: 0, textAlign: 'center' }}>
            Loading Google Sign-In…
          </p>
        ) : null}
        {showSlowHint && !scriptLoadedSuccessfully ? (
          <div className="auth-error" role="status" style={{ fontSize: 12, lineHeight: 1.45 }}>
            Google&apos;s sign-in script didn&apos;t load. Turn off ad blockers or privacy extensions for this page,
            or allow <strong>accounts.google.com</strong>, then refresh.
          </div>
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: 44 }}>
          <GoogleLogin
            onSuccess={async (res) => {
              if (!res.credential) return;
              setError('');
              try {
                await loginWithGoogle(res.credential);
                navigate(redirectTo);
              } catch (err) {
                const msg = err.response?.data?.error || 'Google sign-in failed';
                setError(msg);
              }
            }}
            onError={() => setError('Google sign-in was cancelled or could not finish.')}
            type="standard"
            theme="outline"
            size="large"
            text="continue_with"
            shape="rectangular"
            width={w}
          />
        </div>
      </div>
      {error ? (
        <div className="auth-error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </div>
      ) : null}
    </>
  );
}

/**
 * Google Sign-In for researchers. Requires REACT_APP_GOOGLE_CLIENT_ID in client/.env + dev server restart.
 */
export default function GoogleSignInButton({ redirectTo = '/app' }) {
  if (!googleSignInEnabled) return null;
  return <GoogleSignInInner redirectTo={redirectTo} />;
}
