import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Bus, Route, Menu, X, Hexagon, Sun, Moon, LogOut, CalendarDays, ExternalLink, Settings, Database } from 'lucide-react';
import { useState, useEffect } from 'react';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const navigate = useNavigate();
  const location = useLocation();

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  // Handle Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    document.documentElement.classList.add('theme-transitioning');
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 400);
  };

  const handleLogout = () => {
    navigate('/checkin');
  };

  const getPageTitle = () => {
    if (location.pathname.includes('dashboard')) return 'ภาพรวมการเดินรถ (Operations Center)';
    if (location.pathname.includes('schedules')) return 'จัดการรอบรถล่วงหน้า';
    if (location.pathname.includes('vehicles')) return 'ฐานข้อมูลยานพาหนะ';
    return 'Admin Control';
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden text-gray-900 dark:text-gray-100 transition-colors">
      
      {/* Top Navbar - Clean & Compact */}
      <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 z-30 shadow-sm flex-shrink-0 transition-colors">
        
        {/* Left: Logo & Breadcrumb Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white">
            <Bus size={18} />
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="font-bold text-gray-900 dark:text-white tracking-tight">SNC Transport</span>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <span className="font-medium text-gray-500 dark:text-gray-400">{getPageTitle()}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          
          <button 
            onClick={() => navigate('/booking')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors mr-2"
          >
            แอปพนักงาน <ExternalLink size={14} />
          </button>

          <button 
            onClick={toggleTheme}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

          {/* Profile Minimal */}
          <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors">
             <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                AD
             </div>
             <span className="text-xs font-bold hidden md:block">Admin</span>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 top-14' : '-translate-x-full lg:top-0'}`}>
          
          <div className="p-4">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-2">Menu</p>
            <nav className="space-y-1">
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                  }`
                }
              >
                <LayoutDashboard className="mr-3" size={18} />
                ภาพรวมระบบ
              </NavLink>
              
              <NavLink
                to="/admin/schedules"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                  }`
                }
              >
                <CalendarDays className="mr-3" size={18} />
                จัดการรอบรถล่วงหน้า
              </NavLink>

              <NavLink
                to="/admin/master"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors mt-2 ${
                    isActive 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                  }`
                }
              >
                <Database className="mr-3" size={18} />
                ตั้งค่าข้อมูลหลัก
              </NavLink>
            </nav>
          </div>

          <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700">
             <button 
                onClick={() => navigate('/booking')}
                className="flex lg:hidden items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors mb-2"
             >
                <ExternalLink size={18} />
                <span>ไปหน้าแอปพนักงาน</span>
             </button>

             <button 
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
             >
                <LogOut size={18} />
                <span>ออกจากระบบ</span>
             </button>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 top-14 bg-gray-900/20 dark:bg-gray-900/60 z-30 lg:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto custom-scrollbar relative z-0 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="p-4 md:p-6 w-full mx-auto min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
