import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('candor_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** 401 on sign-in attempts must not redirect — the login page needs to show an error. */
function isCredentialAttempt(config) {
  const url = [config?.baseURL, config?.url].filter(Boolean).join('').split('?')[0];
  return /\/auth\/(login|signup|google)$/.test(url);
}

// Handle 401 globally (expired session on protected routes — not wrong password)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !isCredentialAttempt(err.config)) {
      localStorage.removeItem('candor_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/**
 * Download survey export (JSON or Excel) with the user's JWT.
 * Plain anchor navigation and window.open do not send Authorization headers.
 */
export async function downloadSurveyExport(surveyId, format) {
  const path = format === 'excel' ? 'excel' : 'json';
  const res = await api.get(`/surveys/${surveyId}/export/${path}`, { responseType: 'blob' });
  const cd = res.headers['content-disposition'];
  let filename = `candor-export.${path === 'excel' ? 'xlsx' : 'json'}`;
  if (cd) {
    const m = /filename\*?=(?:UTF-8''|)([^";\n]+)|filename="([^"]+)"/i.exec(cd);
    const raw = (m && (m[1] || m[2])) || '';
    if (raw) filename = decodeURIComponent(raw.replace(/^"|"$/g, ''));
  }
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default api;
