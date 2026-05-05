import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { getAppRedirectPath } from 'shared/authRedirect';

/**
 * Login / signup only — signed-in users go to the app (or ?next= / state.from).
 */
export function GuestOnlyRoute({ children }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
        <span
          className="animate-spin"
          style={{
            width: 20,
            height: 20,
            border: '2px solid var(--b2)',
            borderTopColor: 'var(--t2)',
            borderRadius: '50%',
            display: 'block',
          }}
        />
      </div>
    );
  }

  if (user) {
    const to = getAppRedirectPath(location, '/app');
    return <Navigate to={to} replace />;
  }

  return children;
}
