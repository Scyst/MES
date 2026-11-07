import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Tv, Activity, Users, Zap, Network, BarChart3, Maximize2, Minimize2,
  RefreshCw, Clock, Play, Pause, ChevronRight, CheckCircle2, Shield,
  Layers, ExternalLink, Sparkles, ScanLine
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';

const SCREENS = [
  {
    id: 'oee',
    name: 'OEE Shopfloor',
    thaiName: 'ภาพรวม OEE ประจำกะ (Shopfloor)',
    icon: Activity,
    badge: 'Shopfloor Live',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    url: '/iot-toolbox/sandbox-b9/MES/MES/page/OEE_Dashboard/OEE_Shopfloor.php',
    description: 'ติดตาม OEE, สถานะ Good/Hold/Scrap, ความเร็ว Conveyor และยอดผลิตเรียลไทม์'
  },
  {
    id: 'manpower',
    name: 'Manpower Live',
    thaiName: 'กำลังพลและสถานะพนักงาน (Manpower)',
    icon: Users,
    badge: 'Workforce Live',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    url: '/iot-toolbox/sandbox-b9/MES/MES/page/manpower/manpowerUI.php',
    description: 'ยอดพนักงานในกะ, การเข้างานแต่ละไลน์ผลิต, ทักษะ Skill Matrix และเกรดผลงาน'
  },
  {
    id: 'utility',
    name: 'Utility Monitoring',
    thaiName: 'พลังงาน & ค่าไฟ TOU (Utility)',
    icon: Zap,
    badge: 'Energy & Cost',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    url: '/iot-toolbox/sandbox-b9/MES/MES/page/management/utilityDashboard.php',
    description: 'ติดตามการใช้ไฟฟ้า (kWh), ก๊าซ LPG (m³), ค่าไฟ TOU On-Peak / Off-Peak แบบเรียลไทม์'
  },
  {
    id: 'twin',
    name: 'Digital Twin',
    thaiName: 'ดิจิทัลทวินจำลองโรงงาน (3D Simulation)',
    icon: Network,
    badge: 'Digital Twin 3D',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    url: '/iot-toolbox/sandbox-b9/MES/MES/page/digitalTwin/digitalTwin.html',
    description: 'แบบจำลองเสมือนจริง 3 มิติของโรงงาน SNC Former B9 (Digital Twin Simulation)'
  },
  {
    id: 'scan-fg',
    name: 'Scan FG (Accessories)',
    thaiName: 'สแกน FG ตรวจสอบชิ้นงาน (Accessories Inspection)',
    icon: ScanLine,
    badge: 'Vision & Inspection',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    url: '/iot-toolbox/sandbox-b9/MES/MES/page/AccessoriesInspection/accessoriesInspectionUI.php',
    description: 'ระบบสแกนตรวจสอบกล้อง Vision และตรวจนับชิ้นงานสำเร็จรูปก่อนส่งมอบ'
  }
];

export default function ControlRoomTvPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialScreen = searchParams.get('screen') || 'oee';
  const [activeScreenId, setActiveScreenId] = useState(initialScreen);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Auto-Cycle Mode: 0 = Off, 30 = 30s, 60 = 60s
  const [autoCycleSeconds, setAutoCycleSeconds] = useState(0);
  const [cycleCountdown, setCycleCountdown] = useState(0);

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Iframe key to force refresh
  const [refreshKey, setRefreshKey] = useState(0);

  const { user } = useAuth();
  const iframeRef = useRef(null);

  // Sync state with URL params
  useEffect(() => {
    const screenFromUrl = searchParams.get('screen');
    if (screenFromUrl && screenFromUrl !== activeScreenId) {
      setActiveScreenId(screenFromUrl);
    }
  }, [searchParams]);

  const selectScreen = (screenId) => {
    setActiveScreenId(screenId);
    setSearchParams({ screen: screenId });
    if (autoCycleSeconds > 0) {
      setCycleCountdown(autoCycleSeconds);
    }
  };

  // Live Clock (1s interval)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine Shift (Shift A: 08:00 - 20:00, Shift B: 20:00 - 08:00)
  const currentHour = currentTime.getHours();
  const currentShift = currentHour >= 8 && currentHour < 20 ? 'กะ A (Day)' : 'กะ B (Night)';

  // Auto-Cycle Timer
  useEffect(() => {
    if (autoCycleSeconds <= 0) return;

    setCycleCountdown(autoCycleSeconds);
    const interval = setInterval(() => {
      setCycleCountdown((prev) => {
        if (prev <= 1) {
          // Switch to next screen
          const currentIndex = SCREENS.findIndex((s) => s.id === activeScreenId);
          const nextIndex = (currentIndex + 1) % SCREENS.length;
          const nextScreen = SCREENS[nextIndex].id;
          setActiveScreenId(nextScreen);
          setSearchParams({ screen: nextScreen });
          return autoCycleSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoCycleSeconds, activeScreenId, setSearchParams]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen request error:', err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => console.error(err));
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 24/7 Heartbeat Ping to prevent TV network disconnects
  useEffect(() => {
    const heartbeat = setInterval(() => {
      fetch(`${import.meta.env.BASE_URL}check.php?silent=1&_t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store'
      }).catch(() => {});
    }, 30000); // 30s
    return () => clearInterval(heartbeat);
  }, []);

  const activeScreen = SCREENS.find((s) => s.id === activeScreenId) || SCREENS[0];

  const handleRefreshActive = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* TV Control Room Top Bar */}
      <header
        className={`bg-slate-900/95 border-b border-slate-800 backdrop-blur-md px-3 sm:px-4 py-2 flex items-center justify-between gap-3 flex-shrink-0 transition-all duration-300 z-20 ${
          isHeaderCollapsed ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black">
            <Tv className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-tight text-white uppercase">
                SNC Control Room
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE 24/7
              </span>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
              <span>{currentShift}</span>
              <span>•</span>
              <span className="text-slate-300 font-medium">{activeScreen.description}</span>
            </div>
          </div>
        </div>

        {/* Center: 5 Screen Selector Pills */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 overflow-x-auto no-scrollbar max-w-full">
          {SCREENS.map((screen) => {
            const Icon = screen.icon;
            const isActive = activeScreenId === screen.id;
            return (
              <button
                key={screen.id}
                onClick={() => selectScreen(screen.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer touch-manipulation ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={screen.thaiName}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{screen.name}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Auto-Cycle, Real-Time Clock & Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Auto-Cycle Switcher */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
            <span className="text-[11px] text-slate-400">หมุนเวียน:</span>
            <select
              value={autoCycleSeconds}
              onChange={(e) => setAutoCycleSeconds(Number(e.target.value))}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value={0} className="bg-slate-900">ปิด (Fixed)</option>
              <option value={30} className="bg-slate-900">30 วิ (30s)</option>
              <option value={60} className="bg-slate-900">1 นาที (60s)</option>
              <option value={120} className="bg-slate-900">2 นาที (2m)</option>
            </select>
            {autoCycleSeconds > 0 && (
              <span className="font-mono text-emerald-400 font-bold ml-1">
                {cycleCountdown}s
              </span>
            )}
          </div>

          {/* Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 font-mono text-xs font-black text-cyan-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {currentTime.toLocaleTimeString('th-TH', { hour12: false })}
            </span>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefreshActive}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="รีเฟรชหน้าจอนี้"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
            title={isFullscreen ? 'ออกจากเต็มจอ' : 'แสดงผลเต็มจอ (Fullscreen)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Screen Container (100% Full Viewport) */}
      <main className="flex-1 w-full h-full relative bg-slate-950 overflow-hidden">
        <iframe
          key={`${activeScreen.id}-${refreshKey}`}
          ref={iframeRef}
          src={activeScreen.url}
          title={activeScreen.name}
          className="w-full h-full border-0 bg-slate-900"
          style={{ minHeight: '100%', height: '100%' }}
          allow="fullscreen"
        />

        {/* Hover/Tap Trigger for Auto-Hide Header on TV */}
        <button
          onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
          className={`absolute top-2 right-4 z-40 p-1.5 rounded-full bg-slate-900/80 hover:bg-blue-600 text-slate-400 hover:text-white transition-all backdrop-blur-sm border border-slate-700 shadow-md ${
            isHeaderCollapsed ? 'opacity-40 hover:opacity-100' : 'opacity-0 hover:opacity-100'
          }`}
          title={isHeaderCollapsed ? 'แสดงแถบเมนูควบคุม' : 'ซ่อนแถบเมนูเพื่อเน้นกราฟ'}
        >
          <Tv className="w-3.5 h-3.5" />
        </button>
      </main>
    </div>
  );
}
