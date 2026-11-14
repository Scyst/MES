import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, Cpu, Wifi, WifiOff, RefreshCw, Map as MapIcon, BarChart3,
  Radio, ZoomIn, ZoomOut, RotateCcw, Save, Plus, Trash2, Move, X, Check, Lock
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { peApi, resolvePeMediaUrl } from '../../../shared/services/peApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import { getLocalIsoDate, formatPeDateTime, formatNumber } from '../utils/peFormatters';

const STATUS_STYLE = {
  RUNNING: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', pin: '#10b981', bar: 'bg-emerald-500', label: 'RUNNING' },
  STOP: { badge: 'bg-rose-100 text-rose-700 border-rose-200', pin: '#ef4444', bar: 'bg-rose-500', label: 'STOP' },
  IDLE: { badge: 'bg-amber-100 text-amber-700 border-amber-200', pin: '#f59e0b', bar: 'bg-amber-400', label: 'IDLE' },
  OFFLINE: { badge: 'bg-slate-100 text-slate-600 border-slate-200', pin: '#64748b', bar: 'bg-slate-300', label: 'OFFLINE' },
};

function resolveTelemetryStatus(teleRow) {
  if (!teleRow || !teleRow.is_fresh) return 'OFFLINE';
  const s = String(teleRow.live_status || '').toUpperCase();
  if (s.includes('RUN') || s.includes('ON')) return 'RUNNING';
  if (s.includes('IDLE')) return 'IDLE';
  if (s === 'OFFLINE') return 'OFFLINE';
  return 'STOP';
}

function computeFabricLineCoords(obj) {
  const cx = Number(obj.left ?? 0);
  const cy = Number(obj.top ?? 0);
  const sx = Number(obj.scaleX ?? 1);
  const sy = Number(obj.scaleY ?? 1);
  const angleRad = (Number(obj.angle ?? 0) * Math.PI) / 180;
  const dx = ((Number(obj.x2 ?? 0) - Number(obj.x1 ?? 0)) / 2) * sx;
  const dy = ((Number(obj.y2 ?? 0) - Number(obj.y1 ?? 0)) / 2) * sy;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const rx = dx * cos - dy * sin;
  const ry = dx * sin + dy * cos;
  return { x1: cx - rx, y1: cy - ry, x2: cx + rx, y2: cy + ry };
}

function formatShiftHour(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export default function IiotAndMapTab({ isOffline = false }) {
  const showToast = useToast();
  const confirm = useConfirm();

  const [subTab, setSubTab] = useState('live');

  // --- Live Monitor State ---
  const [liveDate, setLiveDate] = useState(getLocalIsoDate());
  const [autoPoll, setAutoPoll] = useState(true);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveData, setLiveData] = useState({
    telemetry: {},
    machines: [],
    discovery: [],
    availability: {},
    timeline: {},
    shift_start: 0,
    shift_end: 0,
  });
  const [lineFilter, setLineFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [bindTopicModal, setBindTopicModal] = useState(null);
  const [bindMachineId, setBindMachineId] = useState('');

  // --- 2D Map State ---
  const svgRef = useRef(null);
  const [mapState, setMapState] = useState({ version: '5.3.0', objects: [] });
  const [mapMeta, setMapMeta] = useState({ updated_at: null, updated_by: null });
  const [showBgImage, setShowBgImage] = useState(true);
  const [editMapMode, setEditMapMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState(null);
  const [draggingPin, setDraggingPin] = useState(null);
  const [selectedPinMachine, setSelectedPinMachine] = useState(null);
  const [placingMachineId, setPlacingMachineId] = useState('');
  const [zoneDraft, setZoneDraft] = useState({ zoneName: '', fill: 'rgba(59,130,246,0.14)', stroke: '#2563eb' });
  const [mapSaving, setMapSaving] = useState(false);

  // --- Historical OEE State ---
  const [oeeFilter, setOeeFilter] = useState({
    start_date: getLocalIsoDate(-7),
    end_date: getLocalIsoDate(),
    line: '',
    machine: '',
  });
  const [oeeData, setOeeData] = useState({
    summary: { availability: 0, performance: 0, quality: 0, oee: 0, total_output: 0, total_defects: 0 },
    trend: [],
    machines: [],
  });
  const [oeeLoading, setOeeLoading] = useState(false);

  const loadLive = useCallback(async (silent = false) => {
    if (!silent) setLiveLoading(true);
    try {
      const params = liveDate !== getLocalIsoDate() ? { date: liveDate } : {};
      const res = await peApi.getIiotLiveDashboard(params);
      if (res?.success && res.data) {
        setLiveData({
          telemetry: res.data.telemetry || {},
          machines: Array.isArray(res.data.machines) ? res.data.machines : [],
          discovery: Array.isArray(res.data.discovery) ? res.data.discovery : [],
          availability: res.data.availability || {},
          timeline: res.data.timeline || {},
          shift_start: Number(res.data.shift_start || 0),
          shift_end: Number(res.data.shift_end || 0),
        });
      }
    } catch {
      // handled
    } finally {
      if (!silent) setLiveLoading(false);
    }
  }, [liveDate]);

  const loadMapData = useCallback(async () => {
    try {
      const res = await peApi.loadIiotMap(1);
      if (res?.success && res.data) {
        setMapMeta({ updated_at: res.data.updated_at, updated_by: res.data.updated_by });
        if (res.data.map_data) {
          try {
            const parsed = typeof res.data.map_data === 'string'
              ? JSON.parse(res.data.map_data)
              : res.data.map_data;
            if (parsed && Array.isArray(parsed.objects)) {
              setMapState({ version: parsed.version || '5.3.0', objects: parsed.objects });
            }
          } catch {
            // keep empty canvas safely
          }
        }
      }
    } catch {
      // handled
    }
  }, []);

  const loadOee = useCallback(async () => {
    setOeeLoading(true);
    try {
      const res = await peApi.getIiotHistoricalOee(oeeFilter);
      if (res?.success && res.data) {
        setOeeData(res.data);
      }
    } catch {
      // handled
    } finally {
      setOeeLoading(false);
    }
  }, [oeeFilter]);

  useEffect(() => {
    loadLive(false);
  }, [loadLive]);

  useEffect(() => {
    if (subTab === 'map') {
      loadMapData();
    } else if (subTab === 'oee') {
      loadOee();
    }
  }, [subTab, loadMapData, loadOee]);

  useEffect(() => {
    if (!autoPoll || (subTab !== 'live' && subTab !== 'map') || isOffline) return undefined;
    const timer = setInterval(() => loadLive(true), 10000);
    return () => clearInterval(timer);
  }, [autoPoll, subTab, isOffline, loadLive]);

  const lines = useMemo(() => {
    const s = new Set();
    liveData.machines.forEach((m) => { if (m.line) s.add(m.line); });
    return Array.from(s).sort();
  }, [liveData.machines]);

  const filteredMachines = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return liveData.machines.filter((m) => {
      if (lineFilter && m.line !== lineFilter) return false;
      if (!q) return true;
      return (
        String(m.machine_code || '').toLowerCase().includes(q) ||
        String(m.machine_name || '').toLowerCase().includes(q) ||
        String(m.mqtt_topic || '').toLowerCase().includes(q)
      );
    });
  }, [liveData.machines, lineFilter, searchFilter]);

  const liveStats = useMemo(() => {
    let running = 0;
    let stopped = 0;
    let offline = 0;
    let totalKw = 0;
    let availSum = 0;
    let availCount = 0;
    liveData.machines.forEach((m) => {
      const t = liveData.telemetry[m.machine_code];
      const st = resolveTelemetryStatus(t);
      if (st === 'RUNNING') running += 1;
      else if (st === 'OFFLINE') offline += 1;
      else stopped += 1;
      if (t?.is_fresh && t.power_kw != null) {
        totalKw += Number(t.power_kw || 0);
      }
      const av = liveData.availability[m.machine_code];
      if (av && typeof av.availability_percent === 'number') {
        availSum += av.availability_percent;
        availCount += 1;
      }
    });
    return {
      running,
      stopped,
      offline,
      totalKw,
      avgAvail: availCount > 0 ? (availSum / availCount).toFixed(1) : '0.0',
    };
  }, [liveData]);

  // --- Bind Discovery MQTT Topic to Machine ---
  const handleBindTopic = async () => {
    if (isOffline || !bindTopicModal || !bindMachineId) return;
    try {
      const targetMachine = liveData.machines.find((m) => String(m.machine_id) === String(bindMachineId));
      const res = await peApi.saveIiotMachinePin({
        machine_id: Number(bindMachineId),
        map_x: targetMachine?.map_x ?? null,
        map_y: targetMachine?.map_y ?? null,
        mqtt_topic: bindTopicModal.topic_name,
      });
      if (res?.success) {
        showToast(`ผูก Topic "${bindTopicModal.topic_name}" สำเร็จ`, 'success');
        setBindTopicModal(null);
        setBindMachineId('');
        loadLive(false);
      }
    } catch {
      // handled
    }
  };

  // --- 2D Map Coordinate Math & Interaction ---
  const clientToSvgCoords = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 100, y: 100 };
    const rect = svg.getBoundingClientRect();
    const viewW = 2200 / zoom;
    const viewH = 900 / zoom;
    const viewX = pan.x;
    const viewY = pan.y;
    const x = viewX + ((clientX - rect.left) / rect.width) * viewW;
    const y = viewY + ((clientY - rect.top) / rect.height) * viewH;
    return {
      x: Math.max(10, Math.min(2190, Math.round(x * 10) / 10)),
      y: Math.max(10, Math.min(890, Math.round(y * 10) / 10)),
    };
  };

  const handleSvgPointerDown = (e) => {
    if (draggingPin) return;
    if (editMapMode && placingMachineId) {
      const pt = clientToSvgCoords(e.clientX, e.clientY);
      const target = liveData.machines.find((m) => String(m.machine_id) === String(placingMachineId));
      if (target && !isOffline) {
        peApi.saveIiotMachinePin({ machine_id: target.machine_id, map_x: pt.x, map_y: pt.y })
          .then((res) => {
            if (res?.success) {
              showToast(`ปักหมุด ${target.machine_code} ที่ (${pt.x}, ${pt.y})`, 'success');
              setPlacingMachineId('');
              loadLive(true);
            }
          })
          .catch(() => {});
      }
      return;
    }
    setPanDrag({ startX: e.clientX, startY: e.clientY, origPanX: pan.x, origPanY: pan.y });
  };

  const handleSvgPointerMove = (e) => {
    if (draggingPin) {
      const pt = clientToSvgCoords(e.clientX, e.clientY);
      setDraggingPin((prev) => (prev ? { ...prev, x: pt.x, y: pt.y } : null));
      return;
    }
    if (panDrag && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const dx = ((e.clientX - panDrag.startX) / rect.width) * (2200 / zoom);
      const dy = ((e.clientY - panDrag.startY) / rect.height) * (900 / zoom);
      setPan({ x: panDrag.origPanX - dx, y: panDrag.origPanY - dy });
    }
  };

  const handleSvgPointerUp = async () => {
    if (draggingPin && !isOffline) {
      const pin = draggingPin;
      setDraggingPin(null);
      try {
        const res = await peApi.saveIiotMachinePin({
          machine_id: pin.machine_id,
          map_x: pin.x,
          map_y: pin.y,
        });
        if (res?.success) {
          showToast(`ย้ายหมุด ${pin.machine_code} สำเร็จ`, 'success');
          loadLive(true);
        }
      } catch {
        // handled
      }
    }
    setPanDrag(null);
  };

  const handleAddZoneRect = () => {
    const name = zoneDraft.zoneName.trim() || `Zone ${(mapState.objects || []).length + 1}`;
    const newObj = {
      type: 'rect',
      left: 120 + ((mapState.objects.length * 40) % 1200),
      top: 120 + ((mapState.objects.length * 30) % 450),
      width: 260,
      height: 160,
      fill: zoneDraft.fill,
      stroke: zoneDraft.stroke,
      strokeWidth: 2,
      zoneName: name,
    };
    setMapState((prev) => ({ ...prev, objects: [...prev.objects, newObj] }));
    setZoneDraft((p) => ({ ...p, zoneName: '' }));
  };

  const handleRemoveMapObj = (idx) => {
    setMapState((prev) => ({
      ...prev,
      objects: prev.objects.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveMapLayout = async () => {
    if (isOffline) return;
    const ok = await confirm({
      title: 'บันทึกผังโรงงาน 2D Visual Board',
      message: `ยืนยันบันทึกองค์ประกอบแผนผังทั้งหมด ${mapState.objects.length} รายการลงฐานข้อมูลใช่หรือไม่?`,
      confirmText: 'บันทึกแผนผัง',
      cancelText: 'ยกเลิก',
    });
    if (!ok) return;
    setMapSaving(true);
    try {
      const res = await peApi.saveIiotMap(1, mapState);
      if (res?.success) {
        showToast(res.message || 'บันทึกแผนผัง 2D เรียบร้อยแล้ว', 'success');
        loadMapData();
      }
    } catch {
      // handled
    } finally {
      setMapSaving(false);
    }
  };

  const handleClearPin = async (machine) => {
    if (isOffline || !machine) return;
    try {
      const res = await peApi.saveIiotMachinePin({ machine_id: machine.machine_id, map_x: null, map_y: null });
      if (res?.success) {
        showToast(`นำหมุด ${machine.machine_code} ออกจากแผนผังแล้ว`, 'success');
        setSelectedPinMachine(null);
        loadLive(true);
      }
    } catch {
      // handled
    }
  };

  const pinnedMachines = useMemo(
    () => liveData.machines.filter((m) => m.map_x !== null && m.map_x !== '' && m.map_y !== null && m.map_y !== ''),
    [liveData.machines]
  );

  const unpinnedMachines = useMemo(
    () => liveData.machines.filter((m) => m.map_x === null || m.map_x === '' || m.map_y === null || m.map_y === ''),
    [liveData.machines]
  );

  const viewBoxStr = `${pan.x} ${pan.y} ${2200 / zoom} ${900 / zoom}`;
  const shiftWindowSec = Math.max(1, (liveData.shift_end || 1) - (liveData.shift_start || 0));

  return (
    <div className="space-y-4">
      {/* Top Sub-tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab('live')}
            className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 ${
              subTab === 'live' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <Activity className="w-4 h-4" /> Live IIoT Monitor & Timeline
          </button>
          <button
            type="button"
            onClick={() => setSubTab('map')}
            className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 ${
              subTab === 'map' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <MapIcon className="w-4 h-4" /> ผังโรงงาน 2D Visual Board
          </button>
          <button
            type="button"
            onClick={() => setSubTab('oee')}
            className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 ${
              subTab === 'oee' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> IIoT OEE ย้อนหลัง
          </button>
        </div>

        {(subTab === 'live' || subTab === 'map') && (
          <div className="flex items-center gap-2">
            <label className="min-h-[40px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPoll}
                onChange={(e) => setAutoPoll(e.target.checked)}
              />
              Live Sync (10s)
            </label>
            <button
              type="button"
              onClick={() => loadLive(false)}
              disabled={liveLoading}
              className="min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${liveLoading ? 'animate-spin' : ''}`} /> รีเฟรช
            </button>
          </div>
        )}
      </div>

      {/* ==================== 1. LIVE TELEMETRY + TIMELINE + DISCOVERY ==================== */}
      {subTab === 'live' && (
        <div className="space-y-4">
          {/* KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">เครื่องจักร Running</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600">{liveStats.running}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">หยุด / เตรียมตั้ง (Stop/Idle)</div>
              <div className="mt-1 text-2xl font-extrabold text-rose-600">{liveStats.stopped}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">Offline / ไม่มีสัญญาณ</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-500">{liveStats.offline}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">กำลังไฟฟ้ารวม (Live kW)</div>
              <div className="mt-1 text-2xl font-extrabold text-blue-600">{formatNumber(liveStats.totalKw, 2)} kW</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2 md:col-span-1">
              <div className="text-xs font-semibold text-slate-500">Avg Shift Availability</div>
              <div className="mt-1 text-2xl font-extrabold text-indigo-600">{liveStats.avgAvail}%</div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="date"
              value={liveDate}
              onChange={(e) => setLiveDate(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
            />
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
            >
              <option value="">ทุกสายการผลิต</option>
              {lines.map((ln) => <option key={ln} value={ln}>{ln}</option>)}
            </select>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="ค้นหาเครื่อง / MQTT Topic..."
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
            />
          </div>

          {/* Live Machine Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredMachines.map((m) => {
              const t = liveData.telemetry[m.machine_code];
              const av = liveData.availability[m.machine_code];
              const statusKey = resolveTelemetryStatus(t);
              const meta = STATUS_STYLE[statusKey] || STATUS_STYLE.OFFLINE;
              const availPct = av?.availability_percent ?? 0;

              return (
                <div
                  key={m.machine_id}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-bold text-slate-500 flex items-center gap-1">
                          {m.machine_code}
                          {Number(m.is_loto) === 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px]">LOTO</span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white truncate">{m.machine_name}</h4>
                        <div className="text-xs text-slate-400">{m.line || '-'} • Topic: {m.mqtt_topic || '-'}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 shrink-0 ${meta.badge}`}>
                        {statusKey === 'OFFLINE' ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
                        {meta.label}
                      </span>
                    </div>

                    {t ? (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                          <div className="text-slate-400">Net Counter</div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {formatNumber(t.net_counter, 0)}
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                          <div className="text-slate-400">Cycle Time</div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                            {t.cycle_time != null ? `${Number(t.cycle_time).toFixed(1)} s` : '-'}
                          </div>
                        </div>
                        {(t.power_kw != null || t.voltage != null) && (
                          <div className="col-span-2 p-2 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 flex items-center justify-between text-[11px] font-semibold text-blue-700">
                            <span>{Number(t.power_kw || 0).toFixed(2)} kW</span>
                            <span>{Number(t.voltage || 0).toFixed(1)} V</span>
                            <span>{Number(t.current_a || 0).toFixed(1)} A</span>
                            <span>PF {Number(t.power_factor || 0).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        ยังไม่มีข้อมูล Telemetry ใน 15 นาทีล่าสุด
                      </div>
                    )}
                  </div>

                  {/* Availability Bar & Shift Timeline preview */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px] text-slate-500 font-semibold">
                      <span>Availability กะงาน (08:00–07:59)</span>
                      <span>{availPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, availPct)}%` }} />
                    </div>
                    {(liveData.timeline[m.machine_code] || []).length > 0 && (
                      <div className="relative h-3 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1" title="Shift Gantt Timeline">
                        {liveData.timeline[m.machine_code].map((seg, i) => {
                          const leftPct = Math.max(0, ((seg.start - liveData.shift_start) / shiftWindowSec) * 100);
                          const widthPct = Math.max(0.5, (seg.duration / shiftWindowSec) * 100);
                          const stMeta = STATUS_STYLE[seg.status] || STATUS_STYLE.OFFLINE;
                          return (
                            <div
                              key={i}
                              className={`absolute top-0 bottom-0 ${stMeta.bar}`}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              title={`${seg.status}: ${formatShiftHour(seg.start)} - ${formatShiftHour(seg.end)}`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* MQTT Auto-Discovery Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 font-bold text-sm">
              <Radio className="w-4 h-4 text-emerald-600" />
              รายการสัญญาณ IIoT ที่ตรวจพบอัตโนมัติ (MQTT Discovery — {liveData.discovery.length} Topics)
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">MQTT Topic / Node ID</th>
                    <th className="px-4 py-2 text-left">ผูกกับเครื่องจักร</th>
                    <th className="px-4 py-2 text-left">Payload ล่าสุด</th>
                    <th className="px-4 py-2 text-left">อัปเดตล่าสุด</th>
                    <th className="px-4 py-2 text-right">ตั้งค่า</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {liveData.discovery.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">ยังไม่มีสัญญาณ Discovery</td></tr>
                  ) : (
                    liveData.discovery.map((d) => (
                      <tr key={d.topic_name}>
                        <td className="px-4 py-2 font-mono font-bold text-slate-900 dark:text-white">{d.topic_name}</td>
                        <td className="px-4 py-2">
                          {d.machine_code ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-xs">
                              {d.machine_code} — {d.machine_name}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-semibold text-xs">ยังไม่ผูกเครื่องจักร</span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                          {d.last_payload || '-'}
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-500">{formatPeDateTime(d.last_seen)}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            disabled={isOffline}
                            onClick={() => {
                              setBindTopicModal(d);
                              setBindMachineId('');
                            }}
                            className="min-h-[36px] px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100 disabled:opacity-50"
                          >
                            ผูกเครื่องจักร
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. 2D VISUAL FACTORY BOARD ==================== */}
      {subTab === 'map' && (
        <div className="space-y-4">
          {/* Map Controls */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-200 hover:bg-slate-50 inline-flex items-center justify-center"
                title="ขยายเข้า"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-200 hover:bg-slate-50 inline-flex items-center justify-center"
                title="ย่อออก"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1"
              >
                <RotateCcw className="w-4 h-4" /> รีเซ็ตมุมมอง
              </button>
              <label className="min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={showBgImage} onChange={(e) => setShowBgImage(e.target.checked)} />
                พื้นหลังแบบแปลน PNG
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isOffline}
                onClick={() => {
                  setEditMapMode((v) => !v);
                  setPlacingMachineId('');
                }}
                className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 border ${
                  editMapMode ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                } disabled:opacity-50`}
              >
                <Move className="w-4 h-4" /> {editMapMode ? 'กำลังแก้ไขแผนผัง' : 'แก้ไขหมุด / โซนผัง 2D'}
              </button>
              {editMapMode && (
                <button
                  type="button"
                  disabled={mapSaving || isOffline}
                  onClick={handleSaveMapLayout}
                  className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {mapSaving ? 'กำลังบันทึก...' : 'บันทึกผัง 2D'}
                </button>
              )}
            </div>
          </div>

          {/* Edit Mode Palette */}
          {editMapMode && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-amber-900">ปักหมุดเครื่องจักรลงผัง:</span>
                <select
                  value={placingMachineId}
                  onChange={(e) => setPlacingMachineId(e.target.value)}
                  className="flex-1 min-w-[200px] min-h-[44px] px-3 rounded-xl border border-amber-300 bg-white text-sm"
                >
                  <option value="">-- เลือกเครื่องที่ยังไม่มีหมุด แล้วคลิกบนผัง --</option>
                  {unpinnedMachines.map((m) => (
                    <option key={m.machine_id} value={m.machine_id}>{m.machine_code} — {m.machine_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={zoneDraft.zoneName}
                  onChange={(e) => setZoneDraft((p) => ({ ...p, zoneName: e.target.value }))}
                  placeholder="ชื่อโซนใหม่ (เช่น Assembly Line)"
                  className="flex-1 min-w-[160px] min-h-[44px] px-3 rounded-xl border border-amber-300 bg-white text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddZoneRect}
                  className="min-h-[44px] px-3.5 rounded-xl bg-amber-600 text-white font-semibold inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> เพิ่มกล่องโซน
                </button>
              </div>
            </div>
          )}

          {/* Native React SVG 2D Canvas */}
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-inner">
            <svg
              ref={svgRef}
              viewBox={viewBoxStr}
              className={`w-full h-[520px] select-none touch-none ${
                placingMachineId ? 'cursor-crosshair' : draggingPin ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onPointerDown={handleSvgPointerDown}
              onPointerMove={handleSvgPointerMove}
              onPointerUp={handleSvgPointerUp}
              onPointerLeave={handleSvgPointerUp}
            >
              <defs>
                <pattern id="pe-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#cbd5e1" strokeWidth="0.7" strokeOpacity="0.45" />
                </pattern>
              </defs>
              <rect x="-500" y="-500" width="3200" height="1900" fill="url(#pe-grid)" />

              {showBgImage && (
                <image
                  href={resolvePeMediaUrl('uploads/iiot-map-bg.png')}
                  x="0"
                  y="0"
                  width="2100"
                  height="780"
                  preserveAspectRatio="xMidYMid meet"
                  opacity="0.85"
                />
              )}

              {/* Fabric 5.3 Compatible Zones (rect) & Layout Walls (line) */}
              {(mapState.objects || []).map((obj, idx) => {
                if (obj.type === 'rect') {
                  const x = Number(obj.left ?? 0);
                  const y = Number(obj.top ?? 0);
                  const w = Number(obj.width ?? 100) * Number(obj.scaleX ?? 1);
                  const h = Number(obj.height ?? 80) * Number(obj.scaleY ?? 1);
                  return (
                    <g key={`rect-${idx}`}>
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={h}
                        fill={obj.fill || 'rgba(59,130,246,0.12)'}
                        stroke={obj.stroke || '#3b82f6'}
                        strokeWidth={Number(obj.strokeWidth ?? 2)}
                        rx="8"
                      />
                      {obj.zoneName && (
                        <text x={x + 12} y={y + 24} fill="#0f172a" fontSize="18" fontWeight="bold">
                          {obj.zoneName}
                        </text>
                      )}
                      {editMapMode && (
                        <g
                          className="cursor-pointer"
                          onPointerDown={(ev) => {
                            ev.stopPropagation();
                            handleRemoveMapObj(idx);
                          }}
                        >
                          <circle cx={x + w - 12} cy={y + 12} r="11" fill="#ef4444" />
                          <text x={x + w - 16} y={y + 16} fill="#ffffff" fontSize="13" fontWeight="bold">×</text>
                        </g>
                      )}
                    </g>
                  );
                }

                if (obj.type === 'line') {
                  const coords = computeFabricLineCoords(obj);
                  return (
                    <line
                      key={`line-${idx}`}
                      x1={coords.x1}
                      y1={coords.y1}
                      x2={coords.x2}
                      y2={coords.y2}
                      stroke={obj.stroke || '#334155'}
                      strokeWidth={Number(obj.strokeWidth ?? 3)}
                      strokeLinecap="round"
                    />
                  );
                }
                return null;
              })}

              {/* Machine Live Status Pins */}
              {pinnedMachines.map((m) => {
                const isDraggingThis = draggingPin && draggingPin.machine_id === m.machine_id;
                const px = isDraggingThis ? draggingPin.x : Number(m.map_x);
                const py = isDraggingThis ? draggingPin.y : Number(m.map_y);
                const stKey = resolveTelemetryStatus(liveData.telemetry[m.machine_code]);
                const stMeta = STATUS_STYLE[stKey] || STATUS_STYLE.OFFLINE;
                const isLocked = Number(m.is_loto) === 1;
                const isSelected = selectedPinMachine?.machine_id === m.machine_id;

                return (
                  <g
                    key={m.machine_id}
                    transform={`translate(${px}, ${py})`}
                    className="cursor-pointer"
                    onPointerDown={(ev) => {
                      ev.stopPropagation();
                      setSelectedPinMachine(m);
                      if (editMapMode && !isOffline) {
                        setDraggingPin({ machine_id: m.machine_id, machine_code: m.machine_code, x: px, y: py });
                      }
                    }}
                  >
                    {isLocked && (
                      <circle r="22" fill="none" stroke="#dc2626" strokeWidth="4" strokeDasharray="4 2" />
                    )}
                    <circle
                      r={isSelected ? 17 : 14}
                      fill={stMeta.pin}
                      stroke="#ffffff"
                      strokeWidth="3"
                    />
                    <rect x="-42" y="18" width="84" height="20" rx="5" fill="#0f172a" fillOpacity="0.86" />
                    <text x="0" y="32" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                      {m.machine_code}
                    </text>
                  </g>
                );
              })}
            </svg>

            <div className="px-4 py-2 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" /> RUNNING</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-500" /> STOP</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400" /> IDLE</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-400" /> OFFLINE</span>
                <span className="inline-flex items-center gap-1 text-red-600 font-semibold"><Lock className="w-3 h-3" /> วงแดง = LOTO</span>
              </div>
              <div>
                หมุดบนผัง {pinnedMachines.length} เครื่อง • อัปเดตผังล่าสุด: {mapMeta.updated_by || '-'} ({formatPeDateTime(mapMeta.updated_at)})
              </div>
            </div>
          </div>

          {/* Selected Machine Inspector Drawer */}
          {selectedPinMachine && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {selectedPinMachine.machine_code} — {selectedPinMachine.machine_name}
                  </div>
                  <div className="text-xs text-slate-500">
                    พิกัด ({selectedPinMachine.map_x}, {selectedPinMachine.map_y}) • สายผลิต: {selectedPinMachine.line || '-'} • Topic: {selectedPinMachine.mqtt_topic || '-'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {editMapMode && (
                  <button
                    type="button"
                    disabled={isOffline}
                    onClick={() => handleClearPin(selectedPinMachine)}
                    className="min-h-[40px] px-3 rounded-xl border border-red-200 text-red-600 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ถอนหมุดออก
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedPinMachine(null)}
                  className="min-h-[40px] px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  ปิดแถบนี้
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== 3. HISTORICAL OEE ANALYTICS ==================== */}
      {subTab === 'oee' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <input
              type="date"
              value={oeeFilter.start_date}
              onChange={(e) => setOeeFilter((p) => ({ ...p, start_date: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
            />
            <input
              type="date"
              value={oeeFilter.end_date}
              onChange={(e) => setOeeFilter((p) => ({ ...p, end_date: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
            />
            <select
              value={oeeFilter.line}
              onChange={(e) => setOeeFilter((p) => ({ ...p, line: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
            >
              <option value="">ทุกสายการผลิต</option>
              {lines.map((ln) => <option key={ln} value={ln}>{ln}</option>)}
            </select>
            <select
              value={oeeFilter.machine}
              onChange={(e) => setOeeFilter((p) => ({ ...p, machine: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
            >
              <option value="">ทุกเครื่องจักร</option>
              {liveData.machines.map((m) => (
                <option key={m.machine_code} value={m.machine_code}>{m.machine_code} — {m.machine_name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadOee}
              disabled={oeeLoading}
              className="min-h-[44px] px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${oeeLoading ? 'animate-spin' : ''}`} /> คำนวณ OEE
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">Overall OEE</div>
              <div className="mt-1 text-2xl font-extrabold text-indigo-600">{oeeData.summary?.oee ?? 0}%</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">Availability</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600">{oeeData.summary?.availability ?? 0}%</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">Performance</div>
              <div className="mt-1 text-2xl font-extrabold text-blue-600">{oeeData.summary?.performance ?? 0}%</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">Quality</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-600">{oeeData.summary?.quality ?? 0}%</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2 lg:col-span-1">
              <div className="text-xs font-semibold text-slate-500">ยอดผลผลิต / ของเสีย</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                {formatNumber(oeeData.summary?.total_output || 0, 0)}{' '}
                <span className="text-xs text-rose-600">/ {formatNumber(oeeData.summary?.total_defects || 0, 0)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-sm mb-3">แนวโน้ม OEE / Availability / Performance / Quality รายวัน</h4>
            <div className="h-64 w-full">
              {(oeeData.trend || []).length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">ไม่มีข้อมูล IIoT OEE ในช่วงเวลาที่เลือก</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={oeeData.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="oee" name="OEE %" stroke="#4f46e5" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="availability" name="Availability %" stroke="#10b981" />
                    <Line type="monotone" dataKey="performance" name="Performance %" stroke="#0ea5e9" />
                    <Line type="monotone" dataKey="quality" name="Quality %" stroke="#f59e0b" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">รหัสเครื่องจักร</th>
                  <th className="px-4 py-3 text-right">Avail %</th>
                  <th className="px-4 py-3 text-right">Perf %</th>
                  <th className="px-4 py-3 text-right">Qual %</th>
                  <th className="px-4 py-3 text-right">OEE %</th>
                  <th className="px-4 py-3 text-right">Output</th>
                  <th className="px-4 py-3 text-right">Defects</th>
                  <th className="px-4 py-3 text-right">Online (ชม.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(oeeData.machines || []).length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">ไม่มีข้อมูล OEE รายเครื่องจักร</td></tr>
                ) : (
                  oeeData.machines.map((m) => (
                    <tr key={m.machine_code}>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white">{m.machine_code}</td>
                      <td className="px-4 py-2.5 text-right">{m.availability}%</td>
                      <td className="px-4 py-2.5 text-right">{m.performance}%</td>
                      <td className="px-4 py-2.5 text-right">{m.quality}%</td>
                      <td className="px-4 py-2.5 text-right font-extrabold text-indigo-600">{m.oee}%</td>
                      <td className="px-4 py-2.5 text-right">{formatNumber(m.output, 0)}</td>
                      <td className="px-4 py-2.5 text-right text-rose-600">{formatNumber(m.defects, 0)}</td>
                      <td className="px-4 py-2.5 text-right">{(Number(m.online_seconds || 0) / 3600).toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================== MODAL: BIND MQTT TOPIC TO MACHINE ==================== */}
      {bindTopicModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold">ผูก Topic: {bindTopicModal.topic_name}</h3>
              <button type="button" onClick={() => setBindTopicModal(null)} className="min-w-[40px] min-h-[40px] rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">เลือกเครื่องจักรที่จะรับสัญญาณจาก Topic นี้</label>
                <select
                  value={bindMachineId}
                  onChange={(e) => setBindMachineId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                >
                  <option value="">-- เลือกเครื่องจักร --</option>
                  {liveData.machines.map((m) => (
                    <option key={m.machine_id} value={m.machine_id}>
                      {m.machine_code} — {m.machine_name} ({m.line || '-'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setBindTopicModal(null)} className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold">ยกเลิก</button>
                <button
                  type="button"
                  disabled={!bindMachineId || isOffline}
                  onClick={handleBindTopic}
                  className="min-h-[44px] px-5 rounded-xl bg-blue-600 text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> ยืนยันการผูก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
