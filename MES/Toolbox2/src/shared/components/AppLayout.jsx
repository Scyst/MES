import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Settings,
  Menu,
  LogOut,
  Sun,
  Moon,
  Coffee,
  Clock,
  Calendar as CalendarIcon,
} from 'lucide-react';
import axios from 'axios';

import { useAuth } from '../contexts/AuthContext';
import DesktopSidebar from './DesktopSidebar';

function resolveProfilePictureUrl(profilePicture) {
  if (!profilePicture) return null;
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://') || profilePicture.startsWith('/')) {
    return profilePicture;
  }
  return `/iot-toolbox/sandbox-b9/MES/MES/uploads/profiles/${profilePicture}`;
}

function getGradeBadgeStyle(grade) {
  switch ((grade || '').toUpperCase()) {
    case 'A':
      return 'bg-emerald-600 text-white';
    case 'B':
      return 'bg-blue-600 text-white';
    case 'C':
      return 'bg-amber-400 text-slate-900';
    case 'D':
      return 'bg-red-600 text-white';
    default:
      return 'bg-slate-400 text-white';
  }
}

export default function AppLayout() {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [performance, setPerformance] = useState(() => {
    try {
      const cached = localStorage.getItem('mes_learning_user_grading');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const userRoleLower = (user?.role || '').toLowerCase();
  const canViewPerformance =
    Boolean(user?.emp_id) && ['creator', 'admin', 'manager'].includes(userRoleLower);

  // Reset avatar fallback when user changes
  useEffect(() => {
    setAvatarError(false);
  }, [user?.profile_picture]);

  // Real-time clock (updates every 1s like top_header.php)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live employee performance & grading summary (matching top_header.php)
  useEffect(() => {
    if (!canViewPerformance) return;

    let cancelled = false;
    const fetchPerformance = async () => {
      try {
        const res = await axios.get(
          '/iot-toolbox/sandbox-b9/MES/MES/page/manpower/api/api_my_performance.php',
          { withCredentials: true }
        );
        if (!cancelled && res.data && res.data.success && res.data.data) {
          setPerformance(res.data.data);
          try {
            localStorage.setItem('mes_learning_user_grading', JSON.stringify(res.data.data));
          } catch {
            // ignore storage errors
          }
        }
      } catch {
        // Silently ignore when running locally or if endpoint is unreachable
      }
    };

    fetchPerformance();
    return () => {
      cancelled = true;
    };
  }, [canViewPerformance, user?.emp_id]);

  // Handle Theme & Cross-Tab Theme Sync
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleStorageTheme = (e) => {
      if (e.key === 'theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageTheme);
    return () => window.removeEventListener('storage', handleStorageTheme);
  }, []);

  const toggleTheme = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    document.documentElement.classList.add('theme-transitioning');
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 400);
  };

  const handleLogout = async () => {
    setIsProfileDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const formattedTime = now.toLocaleTimeString('th-TH', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedThaiDate = now.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const avatarUrl = !avatarError ? resolveProfilePictureUrl(user?.profile_picture) : null;
  const userInitial = (user?.fullname || user?.username || 'U').charAt(0).toUpperCase();

  const finalGrade = performance?.has_data ? performance.grade || '-' : '-';
  const sysGrade = performance?.has_data ? performance.system_grade || '-' : '-';
  const iphFormatted = performance?.has_data
    ? `฿${Number(performance.income_per_head || 0).toLocaleString('th-TH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '฿0.00';
  const ratioFormatted = performance?.has_data
    ? Number(performance.income_ratio || 0).toFixed(2)
    : '0.00';

  const isHomeRoute =
    location.pathname === '/' ||
    location.pathname === '/iot-toolbox/sandbox-b9/Toolbox2/' ||
    location.pathname === '/iot-toolbox/sandbox-b9/Toolbox2';

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Top Navbar */}
      <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-8 z-30 shadow-xs flex-shrink-0 w-full">
        {/* Left: Mobile Menu Button, Logo & Title */}
        <div className="flex items-center gap-3 md:gap-4">
          {!isHomeRoute && (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="เปิดเมนูนำทาง"
            >
              <Menu size={22} />
            </button>
          )}
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img
              src={`${import.meta.env.BASE_URL}assets/logo.webp`}
              alt="SNC Logo"
              className="h-8 object-contain"
            />
          </Link>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 leading-tight">
              TOOLBOX OS
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน)
            </p>
          </div>
        </div>

        {/* Right: Live Clock/Date & Profile */}
        <div className="flex items-center gap-2">
          {/* Date & Real-Time Clock Block (matching top_header.php) */}
          <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-2 md:pr-3 mr-1">
            <div
              className="flex items-center gap-2 px-2.5 md:px-3.5 py-1 md:py-1.5 bg-gray-50 dark:bg-gray-700/80 rounded-full text-xs md:text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200/70 dark:border-gray-600"
              title="เวลาและวันที่ปัจจุบันของระบบ"
            >
              <Clock className="text-blue-600 dark:text-blue-400 w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
              <span className="font-bold tabular-nums tracking-tight">{formattedTime}</span>
              <span className="hidden sm:inline text-gray-300 dark:text-gray-500">|</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-gray-500 dark:text-gray-300 whitespace-nowrap">
                <CalendarIcon className="w-3.5 h-3.5 opacity-75" />
                {formattedThaiDate}
              </span>
            </div>
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className={`relative z-50 flex items-center gap-2 border rounded-full py-1 pl-1 pr-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer ${
                isProfileDropdownOpen
                  ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-inner'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60'
              }`}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user?.fullname || user?.username || 'User'}
                  onError={() => setAvatarError(true)}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                  {userInitial}
                </div>
              )}

              <div className="hidden lg:flex items-center gap-2 text-sm text-left">
                <div>
                  <p className="font-bold text-gray-800 dark:text-gray-100 leading-none">
                    {user?.fullname || user?.username || 'ผู้ใช้งาน'}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 uppercase">
                    {user?.position || user?.role || 'Guest'}
                  </p>
                </div>
                {canViewPerformance && (
                  <span
                    className={`${getGradeBadgeStyle(
                      finalGrade
                    )} text-[11px] font-bold px-2 py-0.5 rounded border border-black/10 shadow-xs`}
                    title="เกรดประเมินประจำเดือน"
                  >
                    {finalGrade}
                  </span>
                )}
              </div>
            </button>

            {isProfileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileDropdownOpen(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {/* User Info Header */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center text-center">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={user?.fullname || user?.username || 'User'}
                        onError={() => setAvatarError(true)}
                        className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-xs mb-2"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-2xl mb-2">
                        {userInitial}
                      </div>
                    )}
                    <p className="font-bold text-gray-800 dark:text-gray-100">
                      {user?.fullname || user?.username || 'ผู้ใช้งาน'}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 tracking-wider uppercase mt-0.5">
                      {user?.position || user?.role || 'Guest'}
                    </p>
                  </div>

                  {/* Performance Summary (matches top_header.php) */}
                  {canViewPerformance && (
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          เกรดประเมิน:
                        </span>
                        <span
                          className={`${getGradeBadgeStyle(
                            finalGrade
                          )} text-[10px] font-bold px-2 py-0.5 rounded`}
                        >
                          {finalGrade === sysGrade && finalGrade !== '-'
                            ? `${finalGrade} (คาดการณ์)`
                            : finalGrade}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ค่าผลงาน (IPH):
                        </span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {iphFormatted}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Ratio:</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {ratioFormatted}
                        </span>
                      </div>
                    </div>
                  )}

                  {(userRoleLower === 'admin' || userRoleLower === 'creator') && (
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('openMorningBrief'));
                        setIsProfileDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Coffee size={16} /> <span>สรุปประจำวัน</span>
                    </button>
                  )}

                  <button
                    onClick={toggleTheme}
                    className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-yellow-600 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                      <span>โหมดการแสดงผล</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {theme === 'dark' ? 'มืด' : 'สว่าง'}
                    </span>
                  </button>

                  <a
                    href="/iot-toolbox/sandbox-b9/MES/MES/page/profile/profileUI.php"
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors border-t border-gray-100 dark:border-gray-700"
                  >
                    <Settings size={16} /> <span>ตั้งค่าบัญชี</span>
                  </a>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-100 dark:border-gray-700 cursor-pointer"
                  >
                    <LogOut size={16} /> <span>ออกจากระบบ</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {!isHomeRoute && (
          <DesktopSidebar
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 h-full overflow-auto relative z-0">
          <div className="p-4 lg:p-6 h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
