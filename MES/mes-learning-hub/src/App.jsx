import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Navbar from './components/layout/Navbar';
import Catalog from './pages/Catalog';
import CourseViewer from './pages/CourseViewer';
import CourseBuilder from './pages/CourseBuilder';
import CommunityHub from './pages/CommunityHub';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import Leaderboard from './pages/Leaderboard';
import AuditDashboard from './pages/AuditDashboard';
import UserProfile from './pages/UserProfile';
import './index.css';

function AppLayout() {
  const { isDark } = useTheme();

  return (
    <div className={`app-container min-h-screen transition-colors duration-200 ${
      isDark ? 'bg-slate-900 text-slate-200' : 'bg-slate-50 text-slate-800'
    }`}>
      <Navbar />
      <main className="main-content pt-16">
        <Routes>
          {/* Standard Curriculum Courses */}
          <Route path="/" element={<Catalog />} />
          <Route path="/course/:courseId" element={<CourseViewer />} />
          <Route path="/admin/course-builder" element={<CourseBuilder />} />

          {/* Community-Driven Knowledge Hub */}
          <Route path="/community" element={<CommunityHub />} />
          <Route path="/community/new" element={<CreatePost />} />
          <Route path="/community/:postId" element={<PostDetail />} />

          {/* Factory Ranks & Leaderboard */}
          <Route path="/ranks" element={<Leaderboard />} />

          {/* Training Tracking & Audit Matrix (ISO 9001 Clause 7.2) */}
          <Route path="/audit" element={<AuditDashboard />} />

          {/* Employee Competency Passport & Training Profile */}
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/profile/:empId" element={<UserProfile />} />

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
