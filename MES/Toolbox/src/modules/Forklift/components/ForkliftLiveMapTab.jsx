import React, { useState, useEffect, useCallback } from 'react';
import {
  Map, Grid, Flame, Wifi, Play, Pause, Search, RefreshCw,
  Crosshair, QrCode, Route, Battery, Radio, AlertCircle, Cpu
} from 'lucide-react';
import { forkliftApi } from '../../../shared/services/forkliftApi';
import { getVehicleVisualMeta, resolveNormalizedPosition } from '../utils/forkliftSpatialHelpers';
import ForkliftMapCanvas from './ForkliftMapCanvas';
import ApZoneModal from './ApZoneModal';

export default function ForkliftLiveMapTab({
  isAdmin = false,
  onOpenQr,
  onSelectForBooking,
  onToast
}) {
  const [vehicles, setVehicles] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [livePolling, setLivePolling] = useState(true);

  // Layer Controls
  const [showGrid, setShowGrid] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapWindow, setHeatmapWindow] = useState('24h');
  const [heatmapForkliftId, setHeatmapForkliftId] = useState(0);
  const [heatmapState, setHeatmapState] = useState({
    buckets: [],
    totalPoints: 0,
    maxWeight: 0,
    latestAt: null,
    totalArchive: 0,
    loading: false
  });

  // Simulation Mode & Site Survey Modal
  const [simMode, setSimMode] = useState(false);
  const [simPositions, setSimPositions] = useState({});
  const [apModalOpen, setApModalOpen] = useState(false);
  const [selectedGridCell, setSelectedGridCell] = useState(null);
  const [editingZone, setEditingZone] = useState(null);

  // Selection, Trail & Playback
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [followSelected, setFollowSelected] = useState(false);
  const [trailPoints, setTrailPoints] = useState([]);
  const [trailMode, setTrailMode] = useState('latest');
  const [trailLoading, setTrailLoading] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(-1);
  const [isPlayingTrail, setIsPlayingTrail] = useState(false);

  // Sidebar Filters & Hardware Docs Toggle
  const [fleetFilter, setFleetFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHardwareInfo, setShowHardwareInfo] = useState(false);

  const loadRealtime = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg('');
    try {
      const [rtRes, zoneRes] = await Promise.all([
        forkliftApi.getRealtime(),
        forkliftApi.getZones()
      ]);
      if (rtRes?.success) {
        const list = rtRes.data?.vehicles || [];
        setVehicles(list);
        setLastSync(new Date());
      } else {
        setErrorMsg(rtRes?.message || 'ไม่สามารถโหลดพิกัดรถแบบ Real-time ได้');
      }
      if (zoneRes?.success) {
        setZones(zoneRes.data || []);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลแผนที่');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRealtime(false);
  }, [loadRealtime]);

  useEffect(() => {
    if (!livePolling) return undefined;
    const timer = setInterval(() => loadRealtime(true), 15000);
    return () => clearInterval(timer);
  }, [livePolling, loadRealtime]);

  const loadHeatmap = useCallback(async (win, flId) => {
    setHeatmapState((prev) => ({ ...prev, loading: true }));
    try {
      const res = await forkliftApi.getHeatmap({ window: win, forkliftId: flId });
      if (res?.success) {
        setHeatmapState({
          buckets: res.data?.buckets || [],
          totalPoints: res.data?.total_points || 0,
          maxWeight: res.data?.max_weight || 0,
          latestAt: res.data?.latest_at || null,
          totalArchive: res.data?.total_archive || 0,
          loading: false
        });
      } else {
        setHeatmapState((prev) => ({ ...prev, loading: false }));
      }
    } catch {
      setHeatmapState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (showHeatmap) {
      loadHeatmap(heatmapWindow, heatmapForkliftId);
    }
  }, [showHeatmap, heatmapWindow, heatmapForkliftId, loadHeatmap]);

  const handleLoadTrail = async (vehicle, modeOverride = trailMode) => {
    if (!vehicle) return;
    setSelectedVehicleId(vehicle.id);
    setTrailLoading(true);
    setIsPlayingTrail(false);
    setPlaybackIndex(-1);
    try {
      const mins = modeOverride === '6h' ? 360 : 60;
      const modeParam = modeOverride === 'latest' ? 'latest' : 'minutes';
      const res = await forkliftApi.getTrackingHistory({
        code: vehicle.code,
        mode: modeParam,
        mins,
        limit: 150
      });
      if (res?.success) {
        const pts = res.data?.points || [];
        setTrailPoints(pts);
        if (pts.length > 0) {
          setPlaybackIndex(pts.length - 1);
          onToast?.(`โหลดเส้นทาง ${vehicle.code} (${pts.length} พิกัด)`);
        } else {
          onToast?.(`ไม่พบข้อมูลเส้นทางในช่วงเวลาที่เลือกสำหรับ ${vehicle.code}`);
        }
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'ไม่สามารถโหลดเส้นทางย้อนหลังได้');
    } finally {
      setTrailLoading(false);
    }
  };

  // Trail playback timer
  useEffect(() => {
    if (!isPlayingTrail || trailPoints.length === 0) return undefined;
    const timer = setInterval(() => {
      setPlaybackIndex((idx) => {
        if (idx >= trailPoints.length - 1) {
          setIsPlayingTrail(false);
          return trailPoints.length - 1;
        }
        return idx + 1;
      });
    }, 320);
    return () => clearInterval(timer);
  }, [isPlayingTrail, trailPoints]);

  const handleMapCellClick = (cellMeta) => {
    if (simMode) {
      const targetId = selectedVehicleId || vehicles[0]?.id;
      if (!targetId) return;
      setSimPositions((prev) => ({
        ...prev,
        [targetId]: {
          x: cellMeta.centerX,
          y: cellMeta.centerY,
          mode: 'INDOOR'
        }
      }));
      onToast?.(`จำลองตำแหน่งที่ ${cellMeta.zoneName} (${cellMeta.centerX}, ${cellMeta.centerY})`);
      return;
    }

    if (isAdmin) {
      const existing = zones.find((z) => z.zone_name === cellMeta.zoneName) || null;
      setSelectedGridCell(cellMeta);
      setEditingZone(existing);
      setApModalOpen(true);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    const matchText =
      (v.code || '').toLowerCase().includes(q) ||
      (v.last_location || '').toLowerCase().includes(q) ||
      (v.current_driver || '').toLowerCase().includes(q);
    if (!matchText) return false;
    if (fleetFilter === 'ONLINE') return !v.is_offline;
    if (fleetFilter === 'LOW_BAT') return Number(v.current_battery ?? 100) < 20;
    return true;
  });

  const activePlaybackRecord =
    playbackIndex >= 0 && playbackIndex < trailPoints.length ? trailPoints[playbackIndex] : null;

  return (
    <div className="space-y-4">
      {/* Map Controls Strip */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              showGrid ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>40×30 Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setShowZones((z) => !z)}
            className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              showZones
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>Wi-Fi AP ({zones.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHeatmap((h) => !h)}
            className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              showHeatmap
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Heatmap Density</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSimMode((s) => !s);
              if (simMode) setSimPositions({});
            }}
            className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              simMode
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{simMode ? 'ปิดโหมดจำลอง (Clear)' : 'โหมดจำลอง Indoor'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLivePolling((p) => !p)}
            className={`min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              livePolling
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${livePolling ? 'animate-pulse text-emerald-600' : ''}`} />
            <span>{livePolling ? 'Live Sync 15s' : 'Sync Paused'}</span>
          </button>

          <button
            type="button"
            onClick={() => loadRealtime(false)}
            disabled={loading}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHardwareInfo((s) => !s)}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>IoT Gateway</span>
          </button>
        </div>
      </div>

      {/* Heatmap Filter Bar (Shown when Heatmap active) */}
      {showHeatmap && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
              <Flame className="w-4 h-4" /> ความหนาแน่นการใช้งาน:
            </span>
            <select
              value={heatmapWindow}
              onChange={(e) => setHeatmapWindow(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs bg-white border border-rose-200 text-slate-800 outline-none"
            >
              <option value="24h">24 ชั่วโมงล่าสุด</option>
              <option value="7d">7 วันล่าสุด</option>
              <option value="30d">30 วันล่าสุด</option>
              <option value="latest_sample">7 วันรอบข้อมูลล่าสุด</option>
              <option value="all">ข้อมูลประวัติล่าสุด (60,000 จุด)</option>
            </select>

            <select
              value={heatmapForkliftId}
              onChange={(e) => setHeatmapForkliftId(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl text-xs bg-white border border-rose-200 text-slate-800 outline-none"
            >
              <option value={0}>รถโฟล์คลิฟท์ทุกคัน</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.code}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs text-rose-900 flex flex-wrap items-center gap-2">
            {heatmapState.loading ? (
              <span>กำลังประมวลผล Heatmap...</span>
            ) : heatmapState.totalPoints > 0 ? (
              <span>
                แสดงผล <strong>{heatmapState.totalPoints.toLocaleString()}</strong> จุด ({heatmapState.buckets.length} โซนความหนาแน่น)
              </span>
            ) : (
              <>
                <span>
                  ไม่พบ Telemetry ในช่วงนี้ (ข้อมูลล่าสุดในระบบ:{' '}
                  {heatmapState.latestAt ? String(heatmapState.latestAt).slice(0, 16) : '-'})
                </span>
                <button
                  type="button"
                  onClick={() => setHeatmapWindow('all')}
                  className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700"
                >
                  ดูข้อมูลประวัติ ({heatmapState.totalArchive.toLocaleString()})
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hardware Telemetry Endpoint Reference */}
      {showHardwareInfo && (
        <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 border border-slate-700 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sky-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> ESP32 Telemetry Ingestion Endpoint (Self-Contained)
            </span>
            <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
              POST JSON · sp_UpdateForkliftLocation_WiFi
            </span>
          </div>
          <p className="font-mono text-[11px] bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-emerald-300 break-all select-all">
            {forkliftApi.getHardwareEndpointUrl()}
          </p>
          <p className="text-[11px] text-slate-400">
            Payload:{' '}
            <code className="text-amber-300">
              {'{"forklift_code":"BYD 2.5 (PRD)","lat":12.8881,"lng":101.0897,"bssid_1":"AA:BB:CC","rssi_1":-55,"battery":92}'}
            </code>
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Split Grid: Spatial Map + Live Fleet Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Map Column */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-3">
          <ForkliftMapCanvas
            vehicles={vehicles}
            zones={zones}
            showGrid={showGrid}
            showZones={showZones}
            showHeatmap={showHeatmap}
            heatmapBuckets={heatmapState.buckets}
            heatmapMaxWeight={heatmapState.maxWeight}
            trailPoints={trailPoints}
            playbackIndex={playbackIndex}
            selectedVehicleId={selectedVehicleId}
            followSelected={followSelected}
            simMode={simMode}
            simPositions={simPositions}
            isAdmin={isAdmin}
            onSelectVehicle={(fl) => setSelectedVehicleId(fl.id)}
            onCellClick={handleMapCellClick}
          />

          {/* Trail Playback & Selected Vehicle Bar */}
          {selectedVehicle && (
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-slate-900 text-sm">{selectedVehicle.code}</span>
                  <span className="text-xs text-slate-500">({selectedVehicle.last_location})</span>
                  <button
                    type="button"
                    onClick={() => setFollowSelected((f) => !f)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      followSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {followSelected ? 'กำลังติดตาม (Following)' : 'Follow รถคันนี้'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={trailMode}
                    onChange={(e) => setTrailMode(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-50 border border-slate-200"
                  >
                    <option value="latest">เส้นทางล่าสุด 150 จุด</option>
                    <option value="1h">1 ชั่วโมงล่าสุด</option>
                    <option value="6h">6 ชั่วโมงล่าสุด</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleLoadTrail(selectedVehicle, trailMode)}
                    disabled={trailLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700"
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>{trailLoading ? 'กำลังโหลด...' : 'โหลดเส้นทางวิ่ง'}</span>
                  </button>
                  {trailPoints.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setTrailPoints([]);
                        setPlaybackIndex(-1);
                        setIsPlayingTrail(false);
                      }}
                      className="px-2.5 py-1.5 rounded-xl text-xs text-slate-500 hover:bg-slate-100"
                    >
                      ล้างเส้นทาง
                    </button>
                  )}
                </div>
              </div>

              {trailPoints.length > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPlayingTrail && playbackIndex >= trailPoints.length - 1) {
                        setPlaybackIndex(0);
                      }
                      setIsPlayingTrail((p) => !p);
                    }}
                    className="w-10 h-10 shrink-0 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800"
                  >
                    {isPlayingTrail ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <div className="flex-1 space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, trailPoints.length - 1)}
                      value={Math.max(0, playbackIndex)}
                      onChange={(e) => {
                        setIsPlayingTrail(false);
                        setPlaybackIndex(Number(e.target.value));
                      }}
                      className="w-full accent-sky-600"
                    />
                    <div className="flex justify-between text-[11px] text-slate-600 font-mono">
                      <span>
                        จุดที่ {Math.max(1, playbackIndex + 1)}/{trailPoints.length} ·{' '}
                        {activePlaybackRecord?.last_location || '-'} ({activePlaybackRecord?.current_battery ?? '-'}%)
                      </span>
                      <span>
                        {activePlaybackRecord?.recorded_at
                          ? String(activePlaybackRecord.recorded_at).slice(0, 19).replace('T', ' ')
                          : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Fleet Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col max-h-[660px] overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Map className="w-4 h-4 text-blue-600" /> สถานะพิกัดรถ ({vehicles.length})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                {lastSync ? lastSync.toLocaleTimeString('th-TH') : '-'}
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารหัสรถ / โซน..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-1">
              {[
                { key: 'ALL', label: 'ทั้งหมด' },
                { key: 'ONLINE', label: 'ออนไลน์' },
                { key: 'LOW_BAT', label: 'แบตต่ำ' }
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setFleetFilter(pill.key)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                    fleetFilter === pill.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {filteredVehicles.map((fl) => {
              const meta = getVehicleVisualMeta(fl);
              const pos = simPositions[fl.id] || resolveNormalizedPosition(fl);
              const isSelected = fl.id === selectedVehicleId;

              return (
                <div
                  key={fl.id}
                  onClick={() => setSelectedVehicleId(fl.id)}
                  className={`p-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate">{fl.code}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {fl.last_location} · {pos ? `${pos.mode}` : 'No Signal'}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
                    <span className="inline-flex items-center gap-1 font-mono font-semibold">
                      <Battery className="w-3.5 h-3.5 text-slate-400" />
                      {fl.current_battery ?? 100}%
                    </span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleLoadTrail(fl, trailMode)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-700 text-[10px] font-semibold"
                        title="ดูเส้นทางย้อนหลัง"
                      >
                        เส้นทาง
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenQr?.(fl)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700"
                        title="แสดง QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      {onSelectForBooking && (
                        <button
                          type="button"
                          onClick={() => onSelectForBooking(fl)}
                          className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-semibold"
                        >
                          เบิกใช้
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredVehicles.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                ไม่พบรถโฟล์คลิฟท์ตามตัวกรอง
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Wi-Fi AP Site Survey Modal */}
      <ApZoneModal
        isOpen={apModalOpen}
        onClose={() => setApModalOpen(false)}
        initialZone={selectedGridCell}
        existingZone={editingZone}
        onSaved={(msg) => {
          onToast?.(msg);
          loadRealtime(true);
        }}
      />
    </div>
  );
}
