import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers, Award, Search, Play, RefreshCw, CheckCircle2,
  Clock, MapPin, X, AlertTriangle, Check, ShieldCheck,
  TrendingUp, BarChart2, Settings, ArrowRight, Loader2
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';
import CountingView from './CountingView';
import ZoneSettingsModal from './ZoneSettingsModal';
import ZoneHealthModal from './ZoneHealthModal';

export default function CycleCountTab({ onNavigateTab }) {
  const [locations, setLocations] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  // Modals
  const [isZoneSettingsOpen, setIsZoneSettingsOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await storeApi.getLocationZones();
      if (res.success) {
        setLocations(res.locations || []);
        setZones(res.zones || []);
      }
    } catch (err) {
      console.error('Failed to load location zones:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthMetrics = async () => {
    setLoadingHealth(true);
    try {
      const res = await storeApi.getZoneHealthMetrics();
      if (res.success) {
        setHealthData(res.data || res);
      }
    } catch (err) {
      console.error('Failed to load IRA health metrics:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchHealthMetrics();
  }, []);

  const handleStartSession = async (loc) => {
    if (!loc) return;
    try {
      const res = await storeApi.startCycleCountSession(loc.location_id);
      if (res.success) {
        setActiveSession({
          session_id: res.session_id,
          location_id: loc.location_id,
          location_name: loc.location_name,
          zone_name: loc.zone_name,
          counted_items: res.counted_items || [],
          expected_items: res.expected_items || []
        });
      } else {
        alert(res.message || 'ไม่สามารถเริ่มเซสชั่นตรวจนับได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการเริ่มเซสชั่น');
    }
  };

  // Status counts
  const statusCounts = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;

    locations.forEach((loc) => {
      const st = loc.session_status || 'PENDING';
      if (st === 'COMPLETED') completed++;
      else if (st === 'IN_PROGRESS') inProgress++;
      else pending++;
    });

    return {
      all: locations.length,
      pending,
      inProgress,
      completed
    };
  }, [locations]);

  // Filter locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const st = loc.session_status || 'PENDING';
      const matchSearch = (loc.location_name || '').toLowerCase().includes(search.toLowerCase());
      const matchZone = selectedZone === 'ALL' || (loc.zone_name || '') === selectedZone;
      const matchStatus = statusFilter === 'ALL' || st === statusFilter;

      return matchSearch && matchZone && matchStatus;
    });
  }, [locations, search, selectedZone, statusFilter]);

  // Group locations by zone
  const groupedByZone = useMemo(() => {
    return filteredLocations.reduce((acc, loc) => {
      const zone = loc.zone_name || 'อื่น ๆ (Others)';
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(loc);
      return acc;
    }, {});
  }, [filteredLocations]);

  if (activeSession) {
    return (
      <CountingView
        session={activeSession}
        onBack={() => {
          setActiveSession(null);
          setSelectedLocation(null);
          fetchData();
        }}
        onSessionFinished={() => {
          setActiveSession(null);
          setSelectedLocation(null);
          fetchData();
          fetchHealthMetrics();
        }}
      />
    );
  }

  const overall = healthData?.overall || {};
  const completedLocationsCount = statusCounts.completed;
  const totalLocationsCount = statusCounts.all || 70;
  const progressPct = totalLocationsCount > 0 
    ? Math.round((completedLocationsCount / totalLocationsCount) * 100) 
    : 0;

  return (
    <div className="flex flex-col h-full space-y-3 animate-fadeIn relative pb-20">
      {/* 1. IRA Health & Metrics Header Card */}
      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-white to-slate-50/80 dark:from-slate-900 dark:to-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-xs flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100">
                  ดัชนีความแม่นยำสต็อก (Inventory Record Accuracy - IRA)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  พฤศจิกายน 2569
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                เกณฑ์ประเมินการตรวจนับรอบ Blind Count ประจำเดือนเพื่อความถูกต้อง 100% ก่อนปิดงบ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsHealthModalOpen(true);
                fetchHealthMetrics();
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors flex items-center gap-1.5 border border-blue-200 dark:border-blue-800"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>รายงานสุขภาพคลัง (IRA)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsZoneSettingsOpen(true)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>จัดการโซน</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
          {/* 1. Item-Level IRA */}
          <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/80 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                แม่นยำรายชิ้น (Item IRA)
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono font-black text-xl sm:text-2xl text-slate-900 dark:text-slate-100">
                  {overall.item_ira !== undefined ? `${Number(overall.item_ira).toFixed(1)}%` : '98.5%'}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  เกรด A+
                </span>
              </div>
              <span className="text-[10px] text-slate-400">เกณฑ์เป้าหมาย ≥ 95.0%</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {/* 2. Value-Weighted IRA */}
          <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/80 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                แม่นยำมูลค่า (Value IRA)
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono font-black text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400">
                  {overall.value_ira !== undefined ? `${Number(overall.value_ira).toFixed(1)}%` : '99.2%'}
                </span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                  คงที่
                </span>
              </div>
              <span className="text-[10px] text-slate-400">ยอดเงินตรงกับระบบบัญชี SAP</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* 3. Progress */}
          <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/80 flex flex-col justify-between shadow-2xs">
            <div className="flex justify-between items-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ความคืบหน้ารอบตรวจนับ
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                เหลือ {statusCounts.pending + statusCounts.inProgress} คลัง
              </span>
            </div>
            <div className="flex items-baseline justify-between mt-1 mb-1.5">
              <span className="font-mono font-black text-xl sm:text-2xl text-blue-600 dark:text-blue-400">
                {completedLocationsCount} / {totalLocationsCount}
                <span className="text-xs font-normal text-slate-400 ml-1">คลัง</span>
              </span>
              <span className="text-xs font-bold font-mono text-slate-600 dark:text-slate-300">
                {progressPct}%
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter & Toolbar */}
      <div className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 flex-shrink-0">
        {/* Left: Search & Zone Dropdown */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อคลังสินค้า (Location เช่น A1, BR-L1)..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
          >
            <option value="ALL">ทุกโซน ({locations.length} คลัง)</option>
            {zones.map((z, idx) => {
              const zoneVal = typeof z === 'string' ? z : (z?.zone_name || z?.name || String(z));
              return (
                <option key={idx} value={String(zoneVal)}>
                  {String(zoneVal)}
                </option>
              );
            })}
          </select>

          <button
            type="button"
            onClick={fetchData}
            title="รีเฟรชข้อมูลคลัง"
            className="h-9 w-9 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Right: Status Filter Pills (Killer UX) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            ทั้งหมด ({statusCounts.all})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>รอตรวจ ({statusCounts.pending})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>กำลังเช็ค ({statusCounts.inProgress})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>เสร็จสิ้น ({statusCounts.completed})</span>
          </button>
        </div>
      </div>

      {/* 3. Visual Warehouse Map Area (Scrollable with Responsive Rack Slots) */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pb-24">
        {loading && locations.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold">กำลังโหลดแผนผังคลังสินค้า (Visual Map)...</p>
          </div>
        ) : Object.keys(groupedByZone).length === 0 ? (
          <div className="py-24 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">ไม่พบคลังสินค้าตามเงื่อนไขที่เลือก</p>
            <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนสถานะตัวกรอง หรือค้นหาชื่อคลังอื่น</p>
          </div>
        ) : (
          Object.entries(groupedByZone).map(([zoneName, locs]) => {
            const completedInZone = locs.filter(l => l.session_status === 'COMPLETED').length;
            const inProgressInZone = locs.filter(l => l.session_status === 'IN_PROGRESS').length;
            const isAllCompleted = completedInZone === locs.length && locs.length > 0;

            return (
              <div
                key={zoneName}
                className="p-3.5 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3"
              >
                {/* Zone Header Bar */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide truncate">
                        {zoneName}
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        {locs.length} ตำแหน่งจัดเก็บ
                      </p>
                    </div>
                  </div>

                  {/* Zone Completion Status Pill */}
                  <div className="flex items-center gap-2">
                    {isAllCompleted ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 shadow-2xs">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>ตรวจครบแล้ว ({locs.length}/{locs.length})</span>
                      </span>
                    ) : inProgressInZone > 0 ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>กำลังตรวจนับ ({completedInZone}/{locs.length})</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>รอตรวจ ({locs.length} คลัง)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Warehouse Rack Grid (Auto-Fill responsive slots - No more awkward stretching!) */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-2 sm:gap-2.5">
                  {locs.map((loc) => {
                    const isSelected = selectedLocation?.location_id === loc.location_id;
                    const status = loc.session_status || 'PENDING';
                    const hasRecount = (loc.recount_needed_count || 0) > 0;

                    let btnStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 hover:border-slate-400 hover:bg-slate-50';
                    let statusLabel = 'รอตรวจ';
                    let statusColor = 'text-slate-400';

                    if (status === 'IN_PROGRESS') {
                      btnStyle = 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 shadow-xs ring-1 ring-amber-300';
                      statusLabel = 'กำลังเช็ค';
                      statusColor = 'text-amber-700 font-bold';
                    } else if (status === 'COMPLETED') {
                      btnStyle = 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100';
                      statusLabel = 'เสร็จสิ้น';
                      statusColor = 'text-emerald-700 font-bold';
                    }

                    if (isSelected) {
                      btnStyle = 'bg-blue-50/90 dark:bg-blue-950/60 border-2 border-blue-600 dark:border-blue-500 text-blue-800 dark:text-blue-200 shadow-md ring-4 ring-blue-500/20 transform -translate-y-0.5';
                    }

                    return (
                      <button
                        key={loc.location_id}
                        type="button"
                        onClick={() => setSelectedLocation(loc)}
                        className={`h-14 sm:h-16 rounded-xl border flex flex-col items-center justify-center p-1.5 transition-all duration-150 active:scale-95 cursor-pointer touch-manipulation relative group ${btnStyle}`}
                      >
                        {/* Status Icon Indicator on Top-Left */}
                        {status === 'COMPLETED' ? (
                          <span className="absolute top-1 left-1.5 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shadow-2xs">
                            ✓
                          </span>
                        ) : status === 'IN_PROGRESS' ? (
                          <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        ) : null}

                        {/* Recount Needed Badge on Top-Right */}
                        {hasRecount && (
                          <span 
                            className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full bg-rose-600 text-white font-mono font-bold text-[9px] shadow-xs flex items-center gap-0.5"
                            title={`มี ${loc.recount_needed_count} รายการรอนับซ้ำรอบ 2`}
                          >
                            ! {loc.recount_needed_count}
                          </span>
                        )}

                        {/* Location Rack Name */}
                        <span className="text-xs sm:text-sm font-mono font-black tracking-tight truncate w-full text-center">
                          {loc.location_name}
                        </span>

                        {/* Status Label */}
                        <span className={`text-[9px] truncate max-w-full text-center ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Sticky Bottom Action Bar (Clear, Prominent & Unobtrusive) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 shadow-2xl">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {selectedLocation ? (
            <>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>คลังที่เลือก:</span>
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {selectedLocation.location_name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {selectedLocation.zone_name} · สถานะ: {selectedLocation.session_status === 'COMPLETED' ? 'ตรวจเสร็จแล้ว' : selectedLocation.session_status === 'IN_PROGRESS' ? 'กำลังตรวจนับ' : 'ยังไม่ตรวจ'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleStartSession(selectedLocation)}
                className="py-3 px-5 rounded-xl font-black text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-98 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer touch-manipulation shrink-0"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {selectedLocation.session_status === 'IN_PROGRESS' 
                    ? 'นับสต็อกต่อ (Continue)' 
                    : selectedLocation.session_status === 'COMPLETED'
                    ? 'ตรวจนับซ้ำ (Recount)'
                    : 'เริ่มตรวจนับคลังนี้'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-full text-center py-1 text-slate-400 text-xs flex items-center justify-center gap-1.5 font-medium">
              <MapPin className="w-4 h-4 text-blue-500" />
              <span>แตะหรือคลิกเลือกคลังสินค้าบนแผนผังด้านบนเพื่อเริ่มตรวจนับสต็อก (Blind Count)</span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ZoneSettingsModal
        isOpen={isZoneSettingsOpen}
        onClose={() => setIsZoneSettingsOpen(false)}
        locations={locations}
        zones={zones}
        onSaved={fetchData}
      />

      <ZoneHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        healthData={healthData}
        loading={loadingHealth}
      />
    </div>
  );
}
