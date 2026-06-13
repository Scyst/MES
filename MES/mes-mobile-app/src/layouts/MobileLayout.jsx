import { Outlet, NavLink } from 'react-router-dom';
import { Home, ScanLine, History, Server, User } from 'lucide-react';

export default function MobileLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex justify-center transition-colors duration-300">
      <div className="w-full h-screen flex flex-col shadow-2xl bg-white dark:bg-gray-900 overflow-hidden relative transition-colors duration-300">
        
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 p-4 transition-colors duration-300">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 dark:from-blue-400 dark:to-teal-400 bg-clip-text text-transparent">
            MES Data Entry
          </h1>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-20 p-4">
          <Outlet />
        </main>

        {/* Sticky Bottom Navigation */}
        <nav className="fixed bottom-0 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-safe transition-colors duration-300">
          <div className="flex justify-around items-center h-16">
            <NavLink to="/" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <Home size={24} />
              <span className="text-[10px] mt-1 font-medium">Overview</span>
            </NavLink>
            <NavLink to="/machines" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <Server size={24} />
              <span className="text-[10px] mt-1 font-medium">Machines</span>
            </NavLink>
            <NavLink to="/scan" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <div className="bg-blue-600 dark:bg-blue-500 text-white p-3 rounded-full -mt-6 shadow-lg shadow-blue-500/30 ring-4 ring-gray-50 dark:ring-gray-950 transition-colors">
                <ScanLine size={28} />
              </div>
              <span className="text-[10px] mt-1 font-medium text-gray-500 dark:text-gray-300">Scan</span>
            </NavLink>
            <NavLink to="/history" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <History size={24} />
              <span className="text-[10px] mt-1 font-medium">History</span>
            </NavLink>
            <NavLink to="/profile" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <User size={24} />
              <span className="text-[10px] mt-1 font-medium">Profile</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </div>
  );
}
