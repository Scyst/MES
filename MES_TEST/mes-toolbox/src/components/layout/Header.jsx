import React, { useState, useEffect } from 'react';
import { Menu, Search, Bell, Sun, Moon, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toggleTheme, isDarkMode } from '../../utils/theme';

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check initial theme
    setIsDark(isDarkMode());
    
    // Get user info
    const team = JSON.parse(localStorage.getItem('mes_active_team') || '[]');
    if (team.length > 0) {
      setUser(team[0]); // First user is the logged in user
    }
  }, []);

  const handleToggleTheme = () => {
    setIsDark(toggleTheme());
  };

  const handleLogout = async () => {
    try {
      const url = (import.meta.env.VITE_API_BASE_URL || './api/v1') + '/logout.php';
      await fetch(url, { method: 'POST' });
      // Clear local storage
      localStorage.removeItem('mes_active_team');
      // Force reload to trigger auth check
      window.location.href = import.meta.env.BASE_URL;
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  return (
    <header className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border-b border-white/20 dark:border-white/10 sticky top-0 z-30 transition-colors duration-200">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        
        {/* Left: Mobile Menu & Breadcrumb placeholder */}
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleSidebar}
            className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <span className="text-indigo-600 dark:text-indigo-400">MES Toolbox</span>
            <span className="text-slate-400">/</span>
            <span>Dashboard</span>
          </div>
        </div>

        {/* Center: Search (Optional/Hidden on very small screens) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-full leading-5 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={handleToggleTheme}
            className="p-2 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <button className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm border border-indigo-200 dark:border-indigo-800">
                {user?.fullname ? user.fullname.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>
            </button>

            {/* Dropdown Menu */}
            {showProfile && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowProfile(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 py-1 z-20">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {user?.fullname || 'User'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user?.position || user?.role || 'Guest'}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
      </div>
    </header>
  );
}
