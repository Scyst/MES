import { Outlet, NavLink } from 'react-router-dom';
import { Home, ScanLine, History, Server, User } from 'lucide-react';

export default function MobileLayout() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex justify-center">
      <div className="w-full h-screen flex flex-col shadow-2xl bg-gray-900 overflow-hidden relative">
        
        {/* Header */}
        <header className="bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-800 p-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
            MES Data Entry
          </h1>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-20 p-4">
          <Outlet />
        </main>

        {/* Sticky Bottom Navigation */}
        <nav className="fixed bottom-0 w-full bg-gray-900/90 backdrop-blur-lg border-t border-gray-800 pb-safe">
          <div className="flex justify-around items-center h-16">
            <NavLink to="/" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
              <Home size={24} />
              <span className="text-[10px] mt-1 font-medium">Overview</span>
            </NavLink>
            <NavLink to="/machines" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
              <Server size={24} />
              <span className="text-[10px] mt-1 font-medium">Machines</span>
            </NavLink>
            <NavLink to="/scan" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
              <div className="bg-blue-500 text-white p-3 rounded-full -mt-6 shadow-lg shadow-blue-500/30 ring-4 ring-gray-950">
                <ScanLine size={28} />
              </div>
              <span className="text-[10px] mt-1 font-medium text-gray-300">Scan</span>
            </NavLink>
            <NavLink to="/history" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
              <History size={24} />
              <span className="text-[10px] mt-1 font-medium">History</span>
            </NavLink>
            <NavLink to="/profile" className={({isActive}) => `flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
              <User size={24} />
              <span className="text-[10px] mt-1 font-medium">Profile</span>
            </NavLink>
          </div>
        </nav>
      </div>
    </div>
  );
}
