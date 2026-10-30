import { NavLink } from 'react-router-dom';
import { Home, Globe } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
          MES Team Planner
        </div>
        <div className="flex gap-4">
          <NavLink 
            to="/planner/home" 
            className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <Home size={18} />
            <span>My Planner</span>
          </NavLink>
          <NavLink 
            to="/planner/global" 
            className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <Globe size={18} />
            <span>Global Board</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
