/**
 * After login/signup, only allow internal researcher paths (open-redirect safe).
 */
export function isSafeAppPath(path) {
  if (typeof path !== 'string') return false;
  if (path.includes('..')) return false;
  if (path.startsWith('//') || path.includes('://')) return false;
  return path === '/app' || path.startsWith('/app/');
}

/**
 * Target path: ?next= then React Router `state.from` (set by ProtectedRoute), else default.
 */
export function getAppRedirectPath(location, defaultPath = '/app') {
  const q = new URLSearchParams(
    typeof location.search === 'string' ? location.search : '',
  );
  const next = q.get('next');
  if (next) {
    const base = next.split('?')[0];
    if (isSafeAppPath(base)) return next;
  }
  const from = location.state?.from;
  if (from && typeof from.pathname === 'string' && isSafeAppPath(from.pathname)) {
    return `${from.pathname}${from.search || ''}${from.hash || ''}`;
  }
  return defaultPath;
}

/** Use on the marketing site for any “create survey / use the app” link when logged out. */
export const AUTH_CREATE_SURVEY = '/login?next=/app/new';

/**
 * Login first, then open new survey with a preset mode (landing mode cards / modal).
 * `modeKey` must match `Survey.mode` (e.g. founder, product).
 */
export function loginThenNewSurveyWithMode(modeKey) {
  const next = `/app/new?mode=${encodeURIComponent(String(modeKey))}`;
  return `/login?next=${encodeURIComponent(next)}`;
}
