import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiBook, FiSearch, FiBell, FiUser } from 'react-icons/fi';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2 text-fuchsia-400 font-black text-xl hover:text-fuchsia-300 transition-colors">
          <FiBook className="text-2xl" />
          <span>MES Academy</span>
        </NavLink>

        <div className="hidden md:flex flex-1 max-w-xl mx-8">
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search for courses, skills, or mentors..." 
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <button className="hover:text-white transition-colors">
            <FiBell className="text-xl" />
          </button>
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-fuchsia-500 to-violet-500 flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-90 transition-opacity">
            <FiUser />
          </div>
        </div>
      </div>
    </nav>
  );
}
