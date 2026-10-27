import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { FiBook, FiAward, FiUsers, FiLayers, FiShield, FiSun, FiMoon, FiLock, FiLogIn, FiLogOut } from 'react-icons/fi';
import { getCurrentUser, calculateRank, fetchRealUserSession, getMesLoginUrl, logoutFromMes } from '../../data/communityStore';
import { DEFAULT_AVATAR } from '../../data/offlineAssets';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar() {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const isAuthenticated = Boolean(currentUser && currentUser.isLoggedInReal);
  const rank = calculateRank(currentUser.exp);

  useEffect(() => {
    const syncSession = () => {
      fetchRealUserSession().then(user => {
        if (user) {
          setCurrentUser(user);
        }
      });
    };

    syncSession();

    const handleUserUpdated = (e) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncSession();
      }
    };

    window.addEventListener('mes-user-updated', handleUserUpdated);
    window.addEventListener('focus', syncSession);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mes-user-updated', handleUserUpdated);
      window.removeEventListener('focus', syncSession);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Re-verify session and user exp whenever path changes
  useEffect(() => {
    setCurrentUser(getCurrentUser());
    fetchRealUserSession().then(user => {
      if (user) {
        setCurrentUser(user);
      }
    });
  }, [location.pathname]);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Side: Brand Logo + Navigation Tabs */}
        <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 min-w-0">
          {/* Brand / Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2.5 text-fuchsia-400 font-black text-lg sm:text-xl hover:text-fuchsia-300 transition-colors flex-shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-fuchsia-600/30">
              <FiBook className="text-xl" />
            </div>
            <span className="hidden xs:inline tracking-tight font-sans">MES Learning Hub</span>
          </Link>

          {/* Navigation Tabs (Anchored to Left) */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-1">
          <NavLink 
            to="/" 
            end
            className={({ isActive }) => `px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
              isActive 
                ? isDark
                  ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40' 
                  : 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-300 shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FiLayers className={`w-4 h-4 ${isDark ? 'text-fuchsia-400' : 'text-fuchsia-600'}`} />
            <span className="hidden sm:inline">หลักสูตรมาตรฐาน</span>
            <span className="sm:hidden">หลักสูตร</span>
          </NavLink>

          <NavLink 
            to="/community" 
            className={({ isActive }) => `px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isActive 
                ? isDark
                  ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40' 
                  : 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-300 shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FiUsers className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span className="hidden sm:inline">คลังความรู้ชุมชน</span>
            <span className="sm:hidden">ชุมชน</span>
            {!isAuthenticated && (
              <FiLock className="w-3 h-3 text-amber-500 opacity-80" title="เฉพาะพนักงานที่เข้าสู่ระบบ MES" />
            )}
          </NavLink>

          <NavLink 
            to="/ranks" 
            className={({ isActive }) => `px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isActive 
                ? isDark
                  ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40' 
                  : 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-300 shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FiAward className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <span className="hidden sm:inline">ทำเนียบยศ</span>
            <span className="sm:hidden">ยศ</span>
            {!isAuthenticated && (
              <FiLock className="w-3 h-3 text-amber-500 opacity-80" title="เฉพาะพนักงานที่เข้าสู่ระบบ MES" />
            )}
          </NavLink>

          <NavLink 
            to="/audit" 
            className={({ isActive }) => `px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isActive 
                ? isDark
                  ? 'bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/40' 
                  : 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-300 shadow-sm'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="ระบบติดตามผลการฝึกอบรมและตรวจรับรองสมรรถนะ (ISO 9001 Clause 7.2)"
          >
            <FiShield className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className="hidden lg:inline">ติดตามผล & ออดิท</span>
            <span className="lg:hidden">ออดิท</span>
            {!isAuthenticated && (
              <FiLock className="w-3 h-3 text-amber-500 opacity-80" title="เฉพาะพนักงานที่เข้าสู่ระบบ MES" />
            )}
          </NavLink>
        </div>
        </div>

        {/* Right User Status & Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher (Dark / Light) */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold border min-w-[38px] min-h-[38px] ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 hover:border-amber-400/40 shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:border-slate-400 shadow-sm'
            }`}
            title={isDark ? 'สลับเป็นโหมดสว่าง (Light Mode)' : 'สลับเป็นโหมดมืด (Dark Mode)'}
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <>
                <FiSun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline text-xs font-semibold text-slate-300">โหมดสว่าง</span>
              </>
            ) : (
              <>
                <FiMoon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline text-xs font-semibold text-slate-700">โหมดมืด</span>
              </>
            )}
          </button>

          {isAuthenticated ? (
            <div className="flex items-center gap-1.5">
              <Link 
                to="/profile"
                className={`flex items-center gap-2.5 p-1.5 rounded-xl transition-all border ${
                  location.pathname.startsWith('/profile') 
                    ? isDark
                      ? 'bg-fuchsia-600/20 text-fuchsia-300 border-fuchsia-500/40 shadow-sm' 
                      : 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-300 shadow-sm'
                    : isDark
                      ? 'hover:bg-slate-800 border-transparent hover:border-slate-700'
                      : 'hover:bg-slate-100 border-transparent hover:border-slate-200 shadow-none'
                }`}
                title={`สมรรถนะ & ประวัติการฝึกอบรม: ${currentUser.name} (Lv.${rank.level} · ${currentUser.exp} EXP)`}
              >
                <div className="text-right hidden lg:block">
                  <div className={`text-xs font-bold flex items-center justify-end gap-1 ${
                    isDark ? 'text-white' : 'text-slate-800'
                  }`}>
                    <span>{currentUser.name}</span>
                    <span className="text-xs">{rank.badge}</span>
                  </div>
                  <div className={`text-[10px] font-mono font-bold flex items-center justify-end gap-1 ${
                    isDark ? 'text-amber-300' : 'text-amber-700'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="เชื่อมต่อบัญชี MES สำเร็จ"></span>
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

              <button
                type="button"
                onClick={logoutFromMes}
                className={`p-2 rounded-xl transition-all flex items-center justify-center border min-w-[36px] min-h-[36px] ${
                  isDark
                    ? 'bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border-slate-700 hover:border-rose-500/40'
                    : 'bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-300 hover:border-rose-300 shadow-sm'
                }`}
                title="ออกจากระบบ (Logout)"
                aria-label="Logout"
              >
                <FiLogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`hidden xl:flex flex-col items-end px-2 py-0.5 rounded-lg border text-right ${
                isDark
                  ? 'bg-slate-800/60 border-slate-700/80 text-slate-300'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                <span className="text-[11px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  ผู้เยี่ยมชม (Guest)
                </span>
                <span className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  โหมดอ่านหลักสูตรมาตรฐาน
                </span>
              </div>

              <a
                href={getMesLoginUrl()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 shadow-md shadow-fuchsia-600/20 transition-all"
                title="เข้าสู่ระบบด้วยบัญชี MES เพื่อบันทึกผลการเรียนและเข้าถึงข้อมูลภายใน"
              >
                <FiLogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ MES</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
