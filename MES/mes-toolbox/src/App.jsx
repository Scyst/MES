import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import MainLayout from './layouts/MainLayout';
import MaintenanceList from './pages/MaintenanceList';
import StopCauseList from './pages/StopCauseList';
import Login from './pages/Login';

// Production Module
import Home from './pages/production/Home';
import MachineList from './pages/production/MachineList';
import QRScanner from './pages/production/QRScanner';
import MachineCockpit from './pages/production/MachineCockpit';
import GlobalHistory from './pages/production/GlobalHistory';
import Profile from './pages/production/Profile';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const checkAuth = async () => {
      try {
        const url = (import.meta.env.VITE_API_BASE_URL || './api/v1') + '/auth.php';
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.success) {
          setIsAuthenticated(true);
          setAuthChecked(true);
        } else {
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
      } catch (e) {
        console.error('Auth error:', e);
        setIsAuthenticated(false);
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

  if (!authChecked) {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} />
        
        <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/maintenance" replace />} />
          <Route path="maintenance" element={<MaintenanceList />} />
          <Route path="stop-causes" element={<StopCauseList />} />
          
          <Route path="production">
            <Route index element={<Home />} />
            <Route path="machines" element={<MachineList />} />
            <Route path="scan" element={<QRScanner />} />
            <Route path="machine/:id" element={<MachineCockpit type="machine" />} />
            <Route path="history" element={<GlobalHistory />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
