import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Menu, X, LogOut, Sun, Moon, Coffee, UserCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

  // Auto-close menu when route changes
  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  // Update date
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      setCurrentDate(now.toLocaleDateString('en-GB', options));
    };
    updateDate();
    const timer = setInterval(updateDate, 60000);
    return () => clearInterval(timer);
  }, []);

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
    
    // Add smooth transition class temporarily
    document.documentElement.classList.add('theme-transitioning');
    
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    
    // Remove class after transition completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 400);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      
      {/* Top Navbar */}
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-8 z-30 shadow-sm flex-shrink-0">
        
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={`${import.meta.env.BASE_URL}assets/logo.webp`} alt="SNC Logo" className="h-8 object-contain" />
          </Link>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">TOOLBOX OS</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน)</p>
          </div>
        </div>

          {/* Right: Desktop Tools & Profile */}
          <div className="hidden md:flex items-center gap-2">
            
            {/* Date Block */}
            <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-3 mr-1">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-600 dark:text-gray-200 border border-gray-100 dark:border-gray-600" title="Current Date">
                <Clock size={16} className="text-blue-500 dark:text-blue-400" />
                <span>{currentDate}</span>
              </div>
            </div>
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="relative z-50 flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full py-1 pl-1 pr-3 hover:shadow-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                  {user?.fullname ? user.fullname.charAt(0) : 'U'}
                </div>
                <div className="hidden lg:block text-sm text-left">
                  <p className="font-bold text-gray-800 dark:text-gray-100 leading-none">{user?.fullname || 'Admin User'}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{user?.position || user?.role || 'Guest'}</p>
                </div>
              </button>
              
              {isProfileDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 lg:hidden">
                    <p className="font-bold text-gray-800 dark:text-gray-100">{user?.fullname || 'Admin User'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.position || user?.role || 'Guest'}</p>
                  </div>
                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('openMorningBrief'));
                      setIsProfileDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  >
                    <Coffee size={16} /> <span>สรุปประจำวัน</span>
                  </button>
                  <button 
                    onClick={toggleTheme}
                    className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-yellow-600 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />} 
                      <span>โหมดการแสดงผล</span>
                    </div>
                    <span className="text-xs text-gray-400">{theme === 'dark' ? 'มืด' : 'สว่าง'}</span>
                  </button>
                  <button className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors border-t border-gray-100 dark:border-gray-700">
                    <Settings size={16} /> <span>ตั้งค่าบัญชี</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-gray-700"
                  >
                    <LogOut size={16} /> <span>ออกจากระบบ</span>
                  </button>
                </div>
                </>
              )}
            </div>
          </div>

        {/* Right: Mobile Menu Toggle */}
        <button onClick={toggleMenu} className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Slide-down Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-20 flex flex-col p-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4 p-3 border-b border-gray-100 mb-2">
             <UserCircle size={32} className="text-gray-400" />
             <div>
               <p className="font-bold text-gray-800">{user?.fullname || 'User'}</p>
               <p className="text-xs text-gray-500">{currentDate}</p>
             </div>
          </div>
          <div className="mt-2">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-3 rounded-lg text-red-600 font-medium hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              <span>ออกจากระบบ (Logout)</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 top-16 bg-black/20 z-10 backdrop-blur-sm"
          onClick={closeMenu}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 h-full overflow-auto relative z-0">
        <div className="p-4 lg:p-6 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
