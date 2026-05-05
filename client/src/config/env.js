/**
 * CRA inlines REACT_APP_* when webpack runs. `npm start` uses dotenv-cli so `.env` is loaded
 * from `client/` before react-scripts (fixes missing vars when the shell cwd differs).
 * Restart dev after editing `.env`.
 */
export const GOOGLE_WEB_CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim();
export const googleSignInEnabled = GOOGLE_WEB_CLIENT_ID.length > 0;
