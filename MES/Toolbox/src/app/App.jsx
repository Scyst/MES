import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppLayout from '../shared/components/AppLayout';
import ErrorBoundary from '../shared/components/ErrorBoundary';
import GlobalAiAssistant from '../shared/components/GlobalAiAssistant';
import { AuthProvider, useAuth } from '../shared/contexts/AuthContext';
import { FeedbackProvider } from '../shared/contexts/FeedbackContext';
import { LanguageProvider } from '../shared/contexts/LanguageContext';

// 🚀 Lazy Loading โมดูลต่างๆ
const HomeDashboard = lazy(() => import('../modules/Home/pages/HomeDashboard'));
const UserManagement = lazy(() => import('../modules/Admin/pages/UserManagement'));
const SystemSettingsPage = lazy(() => import('../modules/SystemSettings/pages/SystemSettingsPage'));
const SystemBlueprintPage = lazy(() => import('../modules/SystemBlueprint/pages/SystemBlueprintPage'));
const ProfilePage = lazy(() => import('../modules/Profile/pages/ProfilePage'));
const Login = lazy(() => import('../modules/Auth/pages/Login'));
const PaintChemEntryPage = lazy(() => import('../modules/PaintChem/pages/PaintChemEntryPage'));
const TransportApp = lazy(() => import('../modules/Transport/TransportApp'));
const TeamPlannerApp = lazy(() => import('../modules/TeamPlanner/TeamPlannerApp'));
const InboundHubPage = lazy(() => import('../modules/InboundHub/pages/InboundHubPage'));
const StandalonePartnerPortalPage = lazy(() => import('../modules/InboundHub/pages/StandalonePartnerPortalPage'));
const DocumentCenterPage = lazy(() => import('../modules/DocumentCenter/pages/DocumentCenterPage'));
const LearningHubApp = lazy(() => import('../modules/LearningHub/LearningHubApp'));
const StoreApp = lazy(() => import('../modules/Store/StoreApp'));
const UtilityDashboardPage = lazy(() => import('../modules/Utility/pages/UtilityDashboardPage'));
const ForkliftPage = lazy(() => import('../modules/Forklift/pages/ForkliftPage'));
const DailyLogPage = lazy(() => import('../modules/DailyLog/pages/DailyLogPage'));
const FleetLogPage = lazy(() => import('../modules/FleetLog/pages/FleetLogPage'));

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
      <LanguageProvider>
        <FeedbackProvider>
          <HashRouter>
            <AuthProvider>
              <GlobalAiAssistant />
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

            {/* External Partner Portal (Isolated Layout without Internal Sidebar) */}
            <Route path="/partner-portal" element={
              <ErrorBoundary>
                <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center">กำลังโหลดพอร์ทัลคู่ค้า...</div>}>
                  <StandalonePartnerPortalPage />
                </Suspense>
              </ErrorBoundary>
            } />

            {/* Standalone Executive Prototype Presentation Mode */}
            <Route path="/inbound-demo" element={
              <ErrorBoundary>
                <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center">กำลังโหลดหน้าสาธิตระบบ Inbound Hub...</div>}>
                  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6">
                    <InboundHubPage />
                  </div>
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

            {/* MES Learning Hub (Engineering Academy - Dedicated Workspace) */}
            <Route path="/learning/*" element={
              <ErrorBoundary>
                <Suspense fallback={<div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center font-bold">กำลังโหลดศูนย์เรียนรู้ MES Learning Hub...</div>}>
                  <LearningHubApp />
                </Suspense>
              </ErrorBoundary>
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
              
              <Route path="admin/users" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดโมดูล User Management...</div>}>
                    <UserManagement />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="system-settings" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดระบบตั้งค่าข้อมูลหลัก...</div>}>
                    <SystemSettingsPage />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="blueprint" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดพิมพ์เขียวระบบโรงงาน...</div>}>
                    <SystemBlueprintPage />
                  </Suspense>
                </ErrorBoundary>
              } />
              <Route path="profile" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดโปรไฟล์ผู้ใช้งาน...</div>}>
                    <ProfilePage />
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

              <Route path="inbound-hub" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดศูนย์กลางรับสินค้าขาเข้า...</div>}>
                    <InboundHubPage />
                  </Suspense>
                </ErrorBoundary>
              } />

              <Route path="documents" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดศูนย์รวมเอกสาร (Document Center)...</div>}>
                    <DocumentCenterPage />
                  </Suspense>
                </ErrorBoundary>
              } />

              <Route path="store/*" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดระบบบริหารคลังสินค้า (Store Management)...</div>}>
                    <StoreApp />
                  </Suspense>
                </ErrorBoundary>
              } />

              <Route path="utility" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดระบบติดตามการใช้พลังงาน (Utility & Energy)...</div>}>
                    <UtilityDashboardPage />
                  </Suspense>
                </ErrorBoundary>
              } />

              <Route path="forklift" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดระบบจองและติดตามรถโฟล์คลิฟท์ (Forklift Command)...</div>}>
                    <ForkliftPage />
                  </Suspense>
                </ErrorBoundary>
              } />

              <Route path="forklift/scan" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดระบบสแกน QR รถโฟล์คลิฟท์...</div>}>
                    <ForkliftPage initialTabOverride="scan" />
                  </Suspense>
                </ErrorBoundary>
              } />

              <Route path="daily-log" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดสมุดบันทึกกะและสุขภาพใจ...</div>}>
                    <DailyLogPage />
                  </Suspense>
                </ErrorBoundary>
              } />

              <Route path="mood-report" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดรายงาน Mood Insight Report...</div>}>
                    <DailyLogPage />
                  </Suspense>
                </ErrorBoundary>
              } />

              <Route path="fleet-log" element={
                <ErrorBoundary>
                  <Suspense fallback={<div className="p-8 text-gray-500">กำลังโหลดระบบบัญชีเที่ยวรถและค่าขนส่ง...</div>}>
                    <FleetLogPage />
                  </Suspense>
                </ErrorBoundary>
              } />
              
              <Route path="*" element={<Navigate to="/" replace />} />

            </Route>
          </Routes>
        </AuthProvider>
      </HashRouter>
      </FeedbackProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
