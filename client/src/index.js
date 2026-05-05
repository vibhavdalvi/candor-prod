import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from 'app/App';
import { googleSignInEnabled } from 'config/env';

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.info(
    '[Candor]',
    googleSignInEnabled
      ? 'Google Sign-In: enabled (REACT_APP_GOOGLE_CLIENT_ID is set).'
      : 'Google Sign-In: disabled — set REACT_APP_GOOGLE_CLIENT_ID in client/.env and restart the dev server.',
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
