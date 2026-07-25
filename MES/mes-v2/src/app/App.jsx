import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../shared/components/AppLayout';

// 🚀 Lazy Loading โมดูลต่างๆ
const HomeDashboard = lazy(() => import('../modules/Home/pages/HomeDashboard'));
const QmsDashboard = lazy(() => import('../modules/QMS/pages/QmsDashboard'));
const MoodInsightDashboard = lazy(() => import('../modules/MoodInsight/pages/MoodInsightDashboard'));

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/dashboard.html" element={<Navigate to="/" replace />} />
        <Route path="/app.html" element={<Navigate to="/" replace />} />
        <Route path="/" element={<AppLayout />}>
          {/* หน้าแรกสุด (Home) ให้โหลด HomeDashboard (TOOLBOX OS Portal) */}
          <Route index element={
            <Suspense fallback={<div className="p-8 flex justify-center text-gray-500"><i className="fas fa-spinner fa-spin me-2"></i> กำลังโหลดหน้าแรก...</div>}>
              <HomeDashboard />
            </Suspense>
          } />
          
          {/* โมดูลย่อยต่างๆ */}
          <Route path="qms/*" element={
            <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดโมดูล QMS...</div>}>
              <QmsDashboard />
            </Suspense>
          } />
          <Route path="mood-insight/*" element={
            <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดโมดูล Mood Insight...</div>}>
              <MoodInsightDashboard />
            </Suspense>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
