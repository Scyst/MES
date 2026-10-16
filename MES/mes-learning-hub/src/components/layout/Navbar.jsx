import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { FiBook, FiAward, FiUsers, FiLayers, FiPlus, FiTool } from 'react-icons/fi';
import { getCurrentUser, calculateRank, fetchRealUserSession } from '../../data/communityStore';
import { DEFAULT_AVATAR } from '../../data/offlineAssets';

export default function Navbar() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const rank = calculateRank(currentUser.exp);

  useEffect(() => {
    fetchRealUserSession().then(user => {
      if (user) {
        setCurrentUser(user);
      }
    });
  }, []);

  // Re-read user exp whenever path changes (e.g. after post creation or upvote)
  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, [location.pathname]);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-2.5 text-fuchsia-400 font-black text-lg sm:text-xl hover:text-fuchsia-300 transition-colors flex-shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-fuchsia-600/30">
            <FiBook className="text-xl" />
          </div>
          <span className="hidden xs:inline tracking-tight">MES Learning Hub</span>
        </Link>

        {/* Center Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2">
          <NavLink 
            to="/" 
            end
            className={({ isActive }) => `px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              isActive 
                ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FiLayers className="w-4 h-4 text-fuchsia-400" />
            <span className="hidden sm:inline">หลักสูตรมาตรฐาน</span>
            <span className="sm:hidden">หลักสูตร</span>
          </NavLink>

          <NavLink 
            to="/community" 
            className={({ isActive }) => `px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              isActive 
                ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FiUsers className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">คลังความรู้ชุมชน</span>
            <span className="sm:hidden">ชุมชน</span>
          </NavLink>

          <NavLink 
            to="/ranks" 
            className={({ isActive }) => `px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              isActive 
                ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FiAward className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">ทำเนียบยศ</span>
            <span className="sm:hidden">ยศ</span>
          </NavLink>
        </div>

        {/* Right User Status & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Quick Create Link */}
          <Link
            to="/admin/course-builder"
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            title="สร้างหลักสูตรมาตรฐานโรงงาน (Admin Studio)"
          >
            <FiTool className="w-3.5 h-3.5 text-amber-400" />
            <span>สร้างหลักสูตร</span>
          </Link>

          <Link
            to="/community/new"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <FiPlus className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>เขียนบทเรียน</span>
          </Link>

          <Link 
            to="/ranks"
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-800/80 transition-colors"
            title={`ยศปัจจุบัน: Lv.${rank.level} ${rank.name} (${currentUser.exp} EXP)`}
          >
            <div className="text-right hidden lg:block">
              <div className="text-xs font-bold text-white flex items-center justify-end gap-1">
                <span>{currentUser.name}</span>
                <span className="text-xs">{rank.badge}</span>
              </div>
              <div className="text-[10px] text-amber-300 font-mono font-bold flex items-center justify-end gap-1">
                {currentUser.isLoggedInReal && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="เชื่อมต่อบัญชี MES สำเร็จ"></span>
                )}
                <span>Lv.{rank.level} · {currentUser.exp} EXP</span>
              </div>
            </div>

            <div className="relative">
              <img 
                src={currentUser.avatar || DEFAULT_AVATAR} 
                alt={currentUser.name} 
                className="w-8 h-8 rounded-full object-cover border-2 border-fuchsia-500/60 shadow-sm"
                onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
              />
              <span className="lg:hidden absolute -bottom-1 -right-1 text-xs">
                {rank.badge}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  );
}
