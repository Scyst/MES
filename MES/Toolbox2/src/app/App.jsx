import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from '../shared/components/AppLayout';
import ErrorBoundary from '../shared/components/ErrorBoundary';
import { AuthProvider, useAuth } from '../shared/contexts/AuthContext';

// 🚀 Lazy Loading โมดูลต่างๆ
const HomeDashboard = lazy(() => import('../modules/Home/pages/HomeDashboard'));
const QmsDashboard = lazy(() => import('../modules/QMS/pages/QmsDashboard'));
const MoodInsightDashboard = lazy(() => import('../modules/MoodInsight/pages/MoodInsightDashboard'));
const UserManagement = lazy(() => import('../modules/Admin/pages/UserManagement'));
const Login = lazy(() => import('../modules/Auth/pages/Login'));
const PaintChemEntryPage = lazy(() => import('../modules/PaintChem/pages/PaintChemEntryPage'));
const TransportApp = lazy(() => import('../modules/Transport/TransportApp'));
const TeamPlannerApp = lazy(() => import('../modules/TeamPlanner/TeamPlannerApp'));

// Component สำหรับป้องกัน Route ที่ต้อง Login
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  return children;
};

export default function App() {
  return (
    <ErrorBoundary>
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
            
            {/* Employee Shuttle / Transport System */}
            <Route path="/transport/*" element={
              <ErrorBoundary>
                <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center">กำลังโหลดระบบรถรับส่งพนักงาน...</div>}>
                  <TransportApp />
                </Suspense>
              </ErrorBoundary>
            } />

            {/* Team Planner System (Full-Screen Layout) */}
            <Route path="/planner/*" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Suspense fallback={<div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">กำลังโหลดระบบกระดานแผนงานและปฏิทินทีม...</div>}>
                    <TeamPlannerApp />
                  </Suspense>
                </ErrorBoundary>
              </ProtectedRoute>
            } />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 flex justify-center text-gray-500"><i className="fas fa-spinner fa-spin me-2"></i> กำลังโหลดหน้าแรก...</div>}>
                    <HomeDashboard />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              <Route path="qms/*" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดโมดูล QMS...</div>}>
                    <QmsDashboard />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="mood-insight/*" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดโมดูล Mood Insight...</div>}>
                    <MoodInsightDashboard />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="admin/users" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดโมดูล User Management...</div>}>
                    <UserManagement />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="paint-chem" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดโมดูลบันทึกเคมีสี...</div>}>
                    <PaintChemEntryPage />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              <Route path="*" element={<Navigate to="/" replace />} />

            </Route>
          </Routes>
        </AuthProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
