import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import MobileLayout from './layouts/MobileLayout';
import MachineList from './pages/MachineList';
import QRScanner from './pages/QRScanner';
import MachineCockpit from './pages/MachineCockpit';
import Home from './pages/Home';
import GlobalHistory from './pages/GlobalHistory';
import Profile from './pages/Profile';

function App() {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Theme initialization
    const theme = localStorage.getItem('theme') || 'dark'; // Default to dark
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
        
        if (!data.success) {
          window.location.href = '../../auth/login_form.php?redirect=' + encodeURIComponent(window.location.href);
        } else {
          // Ensure logged-in user is in the active team
          let team = JSON.parse(localStorage.getItem('mes_active_team') || '[]');
          if (!team.some(m => m.id === data.user.id)) {
             team = [data.user, ...team];
             localStorage.setItem('mes_active_team', JSON.stringify(team));
          }
          setAuthChecked(true);
        }
      } catch (e) {
        console.error(e);
        setAuthChecked(true);
      }
    };
    checkAuth();
  }, []);

  if (!authChecked) {
    return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white text-xl font-bold">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MobileLayout />}>
          <Route index element={<Home />} />
          <Route path="machines" element={<MachineList />} />
          <Route path="scan" element={<QRScanner />} />
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
