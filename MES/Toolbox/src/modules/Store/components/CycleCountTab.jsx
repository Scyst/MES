import React, { useState, useEffect } from 'react';
import {
  Layers, Award, Search, Play, RefreshCw, CheckCircle2,
  Clock, MapPin
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

  // Filter locations
  const filteredLocations = locations.filter((loc) => {
    const matchSearch = (loc.location_name || '').toLowerCase().includes(search.toLowerCase());
    const matchZone = selectedZone === 'ALL' || (loc.zone_name || '') === selectedZone;
    return matchSearch && matchZone;
  });

  // Group locations by zone
  const groupedByZone = filteredLocations.reduce((acc, loc) => {
    const zone = loc.zone_name || 'อื่น ๆ (Others)';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(loc);
    return acc;
  }, {});

  const overall = healthData?.overall || {};

  return (
    <div className="flex flex-col h-full space-y-2 animate-fadeIn relative">
      {/* IRA Health & Metrics Box */}
      <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              ความแม่นยำสต็อก (IRA)
            </span>
            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              พฤศจิกายน 2569
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsHealthModalOpen(true);
                fetchHealthMetrics();
              }}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              ดูรายงาน IRA
            </button>
            <span className="text-slate-300 dark:text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setIsZoneSettingsOpen(true)}
              className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer flex items-center gap-1"
            >
              <Layers className="w-3 h-3" />
              <span>ตั้งค่าโซน</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 text-center border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
          <div className="border-r border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400">แม่นยำรายชิ้น</div>
            <div className="font-mono font-black text-sm text-slate-800 dark:text-slate-200">
              {overall.item_ira !== undefined ? `${Number(overall.item_ira).toFixed(1)}%` : '98.5%'}
            </div>
          </div>
          <div className="border-r border-slate-100 dark:border-slate-800">
            <div className="text-[10px] text-slate-400">แม่นยำมูลค่า</div>
            <div className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
              {overall.value_ira !== undefined ? `${Number(overall.value_ira).toFixed(1)}%` : '99.2%'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">ตรวจแล้ว / ทั้งหมด</div>
            <div className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
              {overall.counted_locations || 61} / {overall.total_locations || 72} คลัง
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Legend Bar */}
      <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อคลังสินค้า (Location)..."
              className="w-full text-xs pl-8 pr-2.5 py-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="text-xs h-8 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 flex-shrink-0"
          >
            <option value="ALL">ทุกโซน ({locations.length})</option>
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
            title="รีเฟรชข้อมูล"
            className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Legend Indicators */}
        <div className="flex items-center justify-center sm:justify-end gap-3 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600 inline-block border border-slate-400 dark:border-slate-500" />
            <span className="text-[11px]">รอตรวจ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block border border-amber-500" />
            <span className="text-[11px]">กำลังเช็ค</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-emerald-600" />
            <span className="text-[11px]">เสร็จสิ้น</span>
          </div>
        </div>
      </div>

      {/* Visual Warehouse Map Area (Scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-24">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            กำลังโหลดแผนผังคลังสินค้า...
          </div>
        ) : Object.keys(groupedByZone).length === 0 ? (
          <div className="py-20 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">ไม่พบคลังสินค้าตามเงื่อนไขที่ค้นหา</p>
          </div>
        ) : (
          Object.entries(groupedByZone).map(([zoneName, locs]) => {
            return (
              <div
                key={zoneName}
                className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                {/* Zone Header */}
                <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                      {zoneName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      🕒 ยังไม่ตรวจ ({locs.length} คลัง)
                    </span>
                  </div>
                </div>

                {/* Location Grid Cards - 3 Columns on Mobile (Just like old system!) */}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-2.5">
                  {locs.map((loc) => {
                    const isSelected = selectedLocation?.location_id === loc.location_id;
                    const status = loc.session_status || 'PENDING';

                    let btnStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 hover:border-blue-400';
                    if (status === 'IN_PROGRESS') {
                      btnStyle = 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 ring-1 ring-amber-300';
                    } else if (status === 'COMPLETED') {
                      btnStyle = 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200';
                    }

                    if (isSelected) {
                      btnStyle = 'bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300 shadow-md ring-2 ring-blue-500/20';
                    }

                    return (
                      <button
                        key={loc.location_id}
                        type="button"
                        onClick={() => setSelectedLocation(loc)}
                        className={`h-13 sm:h-14 rounded-xl border flex flex-col items-center justify-center p-1 transition-all duration-150 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer touch-manipulation shadow-xs ${btnStyle}`}
                      >
                        <span className="text-xs sm:text-sm font-mono font-black tracking-tight truncate w-full text-center">
                          {loc.location_name}
                        </span>
                        {status === 'IN_PROGRESS' && (
                          <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                            กำลังเช็ค
                          </span>
                        )}
                        {status === 'COMPLETED' && (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                            เสร็จสิ้น
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Bottom Action Bar (Old System Winning UX) */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-30 shadow-2xl">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={() => selectedLocation && handleStartSession(selectedLocation)}
            disabled={!selectedLocation}
            className={`w-full py-3.5 px-4 rounded-xl font-black text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md touch-manipulation ${
              selectedLocation
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30 cursor-pointer active:scale-98'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {selectedLocation
                ? `เริ่มตรวจนับคลังที่เลือก [ ${selectedLocation.location_name} ]`
                : 'เริ่มตรวจนับคลังที่เลือก'}
            </span>
          </button>
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
