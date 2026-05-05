import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from 'store/authStore';
import { ProtectedRoute } from './ProtectedRoute';
import { GuestOnlyRoute } from './GuestOnlyRoute';

import LoginPage from 'features/auth/LoginPage';
import SignupPage from 'features/auth/SignupPage';
import LandingPage from 'features/marketing/LandingPage';

import DashboardPage from 'features/researcher/DashboardPage';
import NewSurveyPage from 'features/researcher/NewSurveyPage';
import SharePage from 'features/researcher/SharePage';
import ResultsPage from 'features/researcher/ResultsPage';
import EditSurveyPage from 'features/researcher/EditSurveyPage';

import InterviewPage from 'features/participant/InterviewPage';

import ResearcherLayout from 'components/layouts/ResearcherLayout';
import { GOOGLE_WEB_CLIENT_ID } from 'config/env';

export default function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);

  const routes = (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
        <Route path="/signup" element={<GuestOnlyRoute><SignupPage /></GuestOnlyRoute>} />

        <Route path="/i/:token" element={<InterviewPage />} />

        <Route
          path="/app"
          element={(
            <ProtectedRoute>
              <ResearcherLayout />
            </ProtectedRoute>
          )}
        >
          <Route index element={<DashboardPage />} />
          <Route path="new" element={<NewSurveyPage />} />
          <Route path="surveys/:id" element={<SharePage />} />
          <Route path="surveys/:id/edit" element={<EditSurveyPage />} />
          <Route path="surveys/:id/results" element={<ResultsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );

  if (GOOGLE_WEB_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_WEB_CLIENT_ID}>
        {routes}
      </GoogleOAuthProvider>
    );
  }
  return routes;
}
