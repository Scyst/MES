import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BusFront, Ticket, UserCircle } from 'lucide-react';

/**
 * EmployeeLayout — Shell layout for the employee-facing app.
 * Provides a sticky bottom navigation bar (mobile-first).
 */
const EmployeeLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans transition-colors duration-300">
      {/* Page Content */}
      <div className="flex-1 pb-20">
        <Outlet />
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">

          <NavLink
            to="/booking"
            end
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
                  <BusFront size={22} />
                </div>
                <span className="text-[10px] font-bold">จองรถ</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/booking/history"
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
                  <Ticket size={22} />
                </div>
                <span className="text-[10px] font-bold">การจองของฉัน</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/booking/profile"
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
                  <UserCircle size={22} />
                </div>
                <span className="text-[10px] font-bold">โปรไฟล์</span>
              </>
            )}
          </NavLink>

        </div>
      </nav>
    </div>
  );
};

export default EmployeeLayout;
