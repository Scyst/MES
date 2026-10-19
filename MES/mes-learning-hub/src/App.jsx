import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FiInfo, FiLogIn } from 'react-icons/fi';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Navbar from './components/layout/Navbar';
import AuthRequiredGate from './components/layout/AuthRequiredGate';
import Catalog from './pages/Catalog';
import CourseViewer from './pages/CourseViewer';
import CourseBuilder from './pages/CourseBuilder';
import CommunityHub from './pages/CommunityHub';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import Leaderboard from './pages/Leaderboard';
import AuditDashboard from './pages/AuditDashboard';
import UserProfile from './pages/UserProfile';
import { getCurrentUser, getMesLoginUrl } from './data/communityStore';
import './index.css';

function AppLayout() {
  const { isDark } = useTheme();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const handleUserUpdated = (e) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      }
    };
    window.addEventListener('mes-user-updated', handleUserUpdated);
    return () => window.removeEventListener('mes-user-updated', handleUserUpdated);
  }, []);

  const isGuest = !currentUser || !currentUser.isLoggedInReal;
  const isPublicCourseRoute = location.pathname === '/' || location.pathname.startsWith('/course/');

  return (
    <div className={`app-container min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-800'
    }`}>
      <Navbar />
      <main className="main-content pt-16">
        {isGuest && isPublicCourseRoute && (
          <div className={`border-b px-4 py-2 text-xs transition-colors ${
            isDark
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-200'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FiInfo className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>
                  <strong>โหมดผู้เยี่ยมชม (Guest Mode):</strong> คุณสามารถอ่านและศึกษาหลักสูตรมาตรฐานทั่วไปได้อิสระ กรุณาเข้าสู่ระบบ MES หากต้องการบันทึกผลการสอบ ใบรับรอง และเข้าถึงข้อมูลภายในองค์กร
                </span>
              </div>
              <a
                href={getMesLoginUrl()}
                className={`inline-flex items-center gap-1 font-bold underline hover:opacity-80 ${
                  isDark ? 'text-amber-300' : 'text-amber-800'
                }`}
              >
                <FiLogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ MES</span>
              </a>
            </div>
          </div>
        )}
        <Routes>
          {/* Public Standard Curriculum Courses (Accessible in Both Guest & Authenticated Modes) */}
          <Route path="/" element={<Catalog />} />
          <Route path="/course/:courseId" element={<CourseViewer />} />

          {/* Internal & Protected Routes (Require Active MES Authentication) */}
          <Route
            path="/admin/course-builder"
            element={
              <AuthRequiredGate featureName="ระบบจัดการและสร้างหลักสูตรมาตรฐานโรงงาน (Admin Course Studio)">
                <CourseBuilder />
              </AuthRequiredGate>
            }
          />

          <Route
            path="/community"
            element={
              <AuthRequiredGate featureName="คลังความรู้และเทคนิคการปฏิบัติงานภายในองค์กร (Internal Community Hub)">
                <CommunityHub />
              </AuthRequiredGate>
            }
          />
          <Route
            path="/community/new"
            element={
              <AuthRequiredGate featureName="สร้างและแบ่งปันบทเรียนเทคนิคภายในองค์กร">
                <CreatePost />
              </AuthRequiredGate>
            }
          />
          <Route
            path="/community/:postId"
            element={
              <AuthRequiredGate featureName="รายละเอียดบทเรียนและคู่มือเทคนิคภายในองค์กร">
                <PostDetail />
              </AuthRequiredGate>
            }
          />

          <Route
            path="/ranks"
            element={
              <AuthRequiredGate featureName="ทำเนียบยศและอันดับคะแนนสะสมของบุคลากร (Employee Leaderboard)">
                <Leaderboard />
              </AuthRequiredGate>
            }
          />

          <Route
            path="/audit"
            element={
              <AuthRequiredGate featureName="ระบบติดตามผลการฝึกอบรมและตรวจรับรองสมรรถนะ 4 มิติ (ISO 9001 Clause 7.2 & 4D Grading)">
                <AuditDashboard />
              </AuthRequiredGate>
            }
          />

          <Route
            path="/profile"
            element={
              <AuthRequiredGate featureName="สมุดพกสมรรถนะและประวัติการฝึกอบรมรายบุคคล (Employee Competency Passport)">
                <UserProfile />
              </AuthRequiredGate>
            }
          />
          <Route
            path="/profile/:empId"
            element={
              <AuthRequiredGate featureName="สมุดพกสมรรถนะและประวัติการฝึกอบรมรายบุคคล (Employee Competency Passport)">
                <UserProfile />
              </AuthRequiredGate>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppLayout />
      </Router>
    </ThemeProvider>
  );
}

export default App;

