import { Outlet, NavLink } from 'react-router-dom';
import { Home, ScanLine, History, Server, User, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toggleTheme, isDarkMode } from '../utils/theme';

export default function MobileLayout() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(isDarkMode());
  }, []);

  const handleToggleTheme = () => {
    setIsDark(toggleTheme());
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex justify-center transition-colors duration-300">
      <div className="w-full h-screen flex flex-col shadow-2xl bg-white dark:bg-gray-900 overflow-hidden relative transition-colors duration-300">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 p-4 transition-colors duration-300">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 dark:from-blue-400 dark:to-teal-400 bg-clip-text text-transparent">
            MES Data Entry
          </h1>
          <button 
            onClick={handleToggleTheme}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={24} className="text-amber-400" /> : <Moon size={24} />}
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-20 p-4">
          <Outlet />
        </main>

        {/* Sticky Bottom Navigation */}
        <nav className="fixed bottom-0 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-safe transition-colors duration-300 z-50">
          <div className="flex justify-around items-center h-16 px-2">
            <NavLink to="/" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <Home size={22} />
              <span className="text-[9px] mt-1 font-medium">Home</span>
            </NavLink>
            <NavLink to="/receipt" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              <span className="text-[9px] mt-1 font-medium">Receipt</span>
            </NavLink>
            <NavLink to="/machines" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <div className="bg-blue-600 dark:bg-blue-500 text-white p-3 rounded-full -mt-6 shadow-lg shadow-blue-500/30 ring-4 ring-gray-50 dark:ring-gray-950 transition-colors">
                <Server size={24} />
              </div>
              <span className="text-[9px] mt-1 font-medium text-gray-500 dark:text-gray-300">Production</span>
            </NavLink>
            <NavLink to="/scan" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <ScanLine size={22} />
              <span className="text-[9px] mt-1 font-medium">Scan</span>
            </NavLink>
            <NavLink to="/history" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <History size={22} />
              <span className="text-[9px] mt-1 font-medium">History</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </div>
  );
}
