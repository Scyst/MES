import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, Suspense, lazy } from 'react';

import MainLayout from './layouts/MainLayout';
import Login from './pages/Login'; // keep Login direct

const MaintenanceList = lazy(() => import('./pages/MaintenanceList'));
const StopCauseList = lazy(() => import('./pages/StopCauseList'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WorkOrderList = lazy(() => import('./pages/WorkOrderList'));
const SparePartsList = lazy(() => import('./pages/SparePartsList'));
const QMSDashboard = lazy(() => import('./pages/qms/QMSDashboard'));
const SalesDashboard = lazy(() => import('./pages/sales/SalesDashboard'));
const ShippingLoading = lazy(() => import('./pages/sales/ShippingLoading'));
const DailyMeeting = lazy(() => import('./pages/planning/DailyMeeting'));
const StoreManagement = lazy(() => import('./pages/inventory/StoreManagement'));
const ForkliftBooking = lazy(() => import('./pages/logistics/ForkliftBooking'));
const UserManage = lazy(() => import('./pages/admin/UserManage'));
const ManpowerDashboard = lazy(() => import('./pages/manpower/ManpowerDashboard'));
const HolidayCalendar = lazy(() => import('./pages/manpower/HolidayCalendar'));

// Production Module
const Home = lazy(() => import('./pages/production/Home'));
const MachineList = lazy(() => import('./pages/production/MachineList'));
const QRScanner = lazy(() => import('./pages/production/QRScanner'));
const MachineCockpit = lazy(() => import('./pages/production/MachineCockpit'));
const GlobalHistory = lazy(() => import('./pages/production/GlobalHistory'));
const Profile = lazy(() => import('./pages/production/Profile'));

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
    <Router>
      <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-900"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={() => setIsAuthenticated(true)} />} />
          
          <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="maintenance" element={<MaintenanceList />} />
            <Route path="work-orders" element={<WorkOrderList />} />
            <Route path="spare-parts" element={<SparePartsList />} />
            <Route path="stop-causes" element={<StopCauseList />} />
            
            <Route path="qms" element={<QMSDashboard />} />
            <Route path="sales">
              <Route index element={<SalesDashboard />} />
              <Route path="shipping" element={<ShippingLoading />} />
            </Route>
            
            <Route path="planning">
              <Route index element={<DailyMeeting />} />
            </Route>
            
            <Route path="inventory">
              <Route index element={<StoreManagement />} />
            </Route>
            
            <Route path="logistics">
              <Route path="forklift" element={<ForkliftBooking />} />
            </Route>
            
            <Route path="admin">
              <Route path="users" element={<UserManage />} />
            </Route>
            
            <Route path="manpower">
              <Route index element={<ManpowerDashboard />} />
              <Route path="holiday" element={<HolidayCalendar />} />
            </Route>
            
            <Route path="production">
              <Route index element={<Home />} />
              <Route path="machines" element={<MachineList />} />
              <Route path="scan" element={<QRScanner />} />
              <Route path="cockpit" element={<MachineCockpit />} />
              <Route path="history" element={<GlobalHistory />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
