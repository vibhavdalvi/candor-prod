import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';

/**
 * Guards researcher routes — redirects unauthenticated users to login.
 */
export function ProtectedRoute({ children }) {
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

  if (!user) {
    const next = `${location.pathname}${location.search || ''}`;
    const to = `/login?next=${encodeURIComponent(next)}`;
    return <Navigate to={to} replace state={{ from: location }} />;
  }
  return children;
}
