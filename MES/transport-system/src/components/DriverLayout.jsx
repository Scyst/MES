import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bus, Settings, LogOut, ClipboardList } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * DriverLayout — Shell layout for the driver-facing app.
 * Provides a sticky bottom navigation bar (mobile-first) and a simple top bar.
 */
const DriverLayout = () => {
  const navigate = useNavigate();
  const { driverVehicleId, logoutDriver } = useAuth();

  useEffect(() => {
    if (!driverVehicleId) {
      // Redirect to login if not logged in
      navigate('/driver/login', { replace: true });
    }
  }, [navigate, driverVehicleId]);

  const handleLogout = () => {
    logoutDriver();
    navigate('/driver/login', { replace: true });
  };

  // Don't render the layout shell if we are redirecting to login
  if (!driverVehicleId) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Header */}
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-30 shadow-sm flex-shrink-0 sticky top-0">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-black">
          <Bus size={20} />
          <span>SNC Driver</span>
        </div>
        <button 
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-500 transition-colors p-2"
          title="ออกจากระบบ"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Page Content */}
      <div className="flex-1 pb-20">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">
          
          <NavLink
            to="/driver/trips"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all ${
                isActive 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                  <ClipboardList size={22} />
                </div>
                <span className="text-[10px] font-bold">รอบวิ่งวันนี้</span>
              </>
            )}
          </NavLink>

          {/* You can add more driver nav items here in the future, e.g. Settings, History */}

        </div>
      </nav>
    </div>
  );
};

export default DriverLayout;
