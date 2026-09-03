import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../shared/components/AppLayout';
import { AuthProvider, useAuth } from '../shared/contexts/AuthContext';

// 🚀 Lazy Loading โมดูลต่างๆ
const HomeDashboard = lazy(() => import('../modules/Home/pages/HomeDashboard'));
const QmsDashboard = lazy(() => import('../modules/QMS/pages/QmsDashboard'));
const MoodInsightDashboard = lazy(() => import('../modules/MoodInsight/pages/MoodInsightDashboard'));
const UserManagement = lazy(() => import('../modules/Admin/pages/UserManagement'));
const Login = lazy(() => import('../modules/Auth/pages/Login'));

// Component สำหรับป้องกัน Route ที่ต้อง Login
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={
            <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center">กำลังโหลด...</div>}>
              <Login />
            </Suspense>
          } />
          <Route path="/dashboard.html" element={<Navigate to="/" replace />} />
          <Route path="/app.html" element={<Navigate to="/" replace />} />
          
          {/* Protected Routes */}
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={
              <Suspense fallback={<div className="p-8 flex justify-center text-gray-500"><i className="fas fa-spinner fa-spin me-2"></i> กำลังโหลดหน้าแรก...</div>}>
                <HomeDashboard />
              </Suspense>
            } />
            
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
            <Route path="admin/users" element={
              <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดโมดูล User Management...</div>}>
                <UserManagement />
              </Suspense>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}
