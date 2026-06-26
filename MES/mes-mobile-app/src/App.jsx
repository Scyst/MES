import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { initTheme } from './utils/theme';
import { useEffect, useState } from 'react';
import MobileLayout from './layouts/MobileLayout';
import MachineList from './pages/MachineList';
import QRScanner from './pages/QRScanner';
import MachineCockpit from './pages/MachineCockpit';
import Home from './pages/Home';
import GlobalHistory from './pages/GlobalHistory';
import Profile from './pages/Profile';
import Receipt from './pages/Receipt';
import Login from './pages/Login';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Theme initialization
    initTheme();

    const checkAuth = async () => {
      try {
        const url = (import.meta.env.VITE_API_BASE_URL || './api/v1') + '/auth.php';
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.success) {
          // Ensure logged-in user is in the active team
          let team = JSON.parse(localStorage.getItem('mes_active_team') || '[]');
          if (!team.some(m => m.id === data.user.id)) {
             team = [data.user, ...team];
             localStorage.setItem('mes_active_team', JSON.stringify(team));
          }
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.error('Auth check error:', e);
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

  if (!authChecked) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white text-xl font-bold"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} />
        
        <Route path="/" element={isAuthenticated ? <MobileLayout /> : <Navigate to="/login" />}>
          <Route index element={<Home />} />
          <Route path="machines" element={<MachineList />} />
          <Route path="scan" element={<QRScanner />} />
          <Route path="receipt" element={<Receipt />} />
          <Route path="receipt/:id" element={<Receipt />} />
          <Route path="machine/:id" element={<MachineCockpit type="machine" />} />
          <Route path="location/:id" element={<MachineCockpit type="location" />} />
          <Route path="history" element={<GlobalHistory />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App;
