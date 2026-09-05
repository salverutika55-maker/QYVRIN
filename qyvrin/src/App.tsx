/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AuthProvider } from './lib/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { NewEntry } from './pages/NewEntry';
import { Analysis } from './pages/Analysis';
import { Replay } from './pages/Replay';
import { Insights } from './pages/Insights';
import { Settings } from './pages/Settings';
import { Fingerprint } from './pages/Fingerprint';
import { Profile } from './pages/Profile';
import { Circles } from './pages/Circles';
import { CircleDetail } from './pages/CircleDetail';
import { SharedDecision } from './pages/SharedDecision';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/new-entry" element={<ProtectedRoute><NewEntry /></ProtectedRoute>} />
            <Route path="/analysis/:id" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
            <Route path="/replay" element={<ProtectedRoute><Replay /></ProtectedRoute>} />
            <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
            <Route path="/fingerprint" element={<ProtectedRoute><Fingerprint /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/circles" element={<ProtectedRoute><Circles /></ProtectedRoute>} />
            <Route path="/circles/:id" element={<ProtectedRoute><CircleDetail /></ProtectedRoute>} />
            <Route path="/circles/:circleId/decision/:decisionId" element={<ProtectedRoute><SharedDecision /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}

