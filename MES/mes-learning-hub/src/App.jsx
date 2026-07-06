import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Catalog from './pages/Catalog';
import CourseViewer from './pages/CourseViewer';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container min-h-screen bg-slate-900 text-slate-200">
        <Navbar />
        <main className="main-content pt-16">
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/course/:courseId" element={<CourseViewer />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
