import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Camera,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { accessoriesApi } from '../../../shared/services/accessoriesApi';
import AccessoriesChartModal from '../components/AccessoriesChartModal';
import CameraStationPanel from '../components/CameraStationPanel';
import InspectionImageModal from '../components/InspectionImageModal';
import {
  GAP_LIMIT_SEC,
  computeRowCycleMetrics,
  formatCameraErrorMessage,
  formatClockOnly,
  formatDiffDuration,
  getProductionDateStr,
} from '../utils/accessoriesHelpers';

/**
 * Self-contained Accessories Inspection (AI Vision) SPA page.
 */
export default function AccessoriesInspectionPage() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [camConfigured, setCamConfigured] = useState(false);
  const [canControl, setCanControl] = useState(false);

  const [camOnline, setCamOnline] = useState(false);
  const [camStatus, setCamStatus] = useState({});
  const [models, setModels] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [modelLoadingMsg, setModelLoadingMsg] = useState('');
  const [streamBust, setStreamBust] = useState(Date.now());

  const [dateFilter, setDateFilter] = useState(getProductionDateStr);
  const [shiftFilter, setShiftFilter] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ total: 0, ok: 0, alarm: 0, avg_elapsed_s: 0 });
  const [hourly, setHourly] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 200, total_rows: 0, total_pages: 1 });
  const [rangeWindow, setRangeWindow] = useState({ start: '', end: '' });
  const [newerS1In, setNewerS1In] = useState(null);
  const [chartOpen, setChartOpen] = useState(false);
  const [chartRows, setChartRows] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [notice, setNotice] = useState(null);
  const [previewImage, setPreviewImage] = useState('');

  useEffect(() => {
    const onUp = () => setIsOnline(true);
    const onDown = () => setIsOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await accessoriesApi.getConfigStatus();
        if (!active) return;
        setCamConfigured(Boolean(res.data?.cam_configured));
        setCanControl(Boolean(res.data?.can_control));
      } catch {
        /* fallback gracefully */
      }
    })();
    return () => { active = false; };
  }, []);

  const refreshModels = useCallback(async () => {
    if (!camConfigured || !isOnline) return;
    try {
      const json = await accessoriesApi.getModels();
      if (Array.isArray(json?.models)) {
        setModels(json.models);
      }
    } catch {
      /* handled silently when station unreachable */
    }
  }, [camConfigured, isOnline]);

  useEffect(() => {
    if (!camConfigured || !isOnline) return undefined;
    refreshModels();
    let active = true;
    let timerId = null;

    const poll = async () => {
      try {
        const s = await accessoriesApi.getStatus();
        if (!active) return;
        setCamStatus(s || {});
        setCamOnline(true);
        if (s?.product) setSelectedProduct((prev) => prev || s.product);
        if (s?.model_name) setSelectedModel((prev) => prev || s.model_name);
        const fast = Boolean(s?.armed || s?.io_state === 'alarm');
        timerId = setTimeout(poll, fast ? 1500 : 4000);
      } catch {
        if (!active) return;
        setCamOnline(false);
        timerId = setTimeout(poll, 6000);
      }
    };

    poll();
    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [camConfigured, isOnline, refreshModels]);

  const loadLogs = useCallback(async (silent = false) => {
    if (!silent) setLoadingLogs(true);
    try {
      const res = await accessoriesApi.getLogs({
        date: dateFilter,
        shift: shiftFilter,
        result: resultFilter,
        search: debouncedSearch,
        page,
        limit: 200,
      });
      const payload = res.data || {};
      setLogs(Array.isArray(payload.rows) ? payload.rows : []);
      setSummary(payload.summary || { total: 0, ok: 0, alarm: 0, avg_elapsed_s: 0 });
      setHourly(Array.isArray(payload.hourly) ? payload.hourly : []);
      setPagination(payload.pagination || { page: 1, limit: 200, total_rows: 0, total_pages: 1 });
      setRangeWindow({ start: payload.range_start || '', end: payload.range_end || '' });
      setNewerS1In(payload.newer_s1_in || null);
    } catch (err) {
      if (!silent) setNotice({ type: 'error', message: err?.message || 'ไม่สามารถดึงประวัติการตรวจสอบได้' });
    } finally {
      if (!silent) setLoadingLogs(false);
    }
  }, [dateFilter, shiftFilter, resultFilter, debouncedSearch, page]);

  const loadChartDataset = useCallback(async () => {
    setChartLoading(true);
    try {
      const res = await accessoriesApi.getChartData({
        date: dateFilter,
        shift: shiftFilter,
        result: resultFilter,
        search: debouncedSearch,
      });
      const payload = res.data || {};
      setChartRows(Array.isArray(payload.rows) ? payload.rows : []);
      if (payload.range_start && payload.range_end) {
        setRangeWindow({ start: payload.range_start, end: payload.range_end });
      }
    } catch (err) {
      setNotice({ type: 'error', message: err?.message || 'ไม่สามารถโหลดข้อมูลกราฟได้' });
    } finally {
      setChartLoading(false);
    }
  }, [dateFilter, shiftFilter, resultFilter, debouncedSearch]);

  useEffect(() => {
    loadLogs(false);
  }, [loadLogs]);

  useEffect(() => {
    if (!isOnline) return undefined;
    const timer = setInterval(() => {
      if (page === 1) loadLogs(true);
      if (chartOpen) loadChartDataset();
    }, 20000);
    return () => clearInterval(timer);
  }, [isOnline, page, chartOpen, loadLogs, loadChartDataset]);

  useEffect(() => {
    if (chartOpen) {
      loadChartDataset();
    }
  }, [chartOpen, loadChartDataset]);

  const rowMetrics = useMemo(() => computeRowCycleMetrics(logs, newerS1In), [logs, newerS1In]);

  const hourlyMap = useMemo(() => {
    const map = {};
    hourly.forEach((h) => {
      map[h.hour_key] = h;
    });
    return map;
  }, [hourly]);

  const handleApplySettings = async (patch) => {
    if (!camConfigured || !isOnline) return;
    try {
      const res = await accessoriesApi.updateSettings(patch);
      if (res && res.ok === false) {
        setNotice({
          type: 'error',
          message: formatCameraErrorMessage(res, 'ไม่สามารถบันทึกการตั้งค่าไปยังเครื่องกล้องได้'),
        });
      }
    } catch (err) {
      setNotice({
        type: 'error',
        message: formatCameraErrorMessage(err, 'ไม่สามารถส่งคำสั่งตั้งค่าไปยังเครื่องกล้องได้ (ตรวจสอบการเชื่อมต่อ AI Vision)'),
      });
    }
  };

  const handleLoadModel = async () => {
    if (!selectedModel || !camConfigured || !isOnline) return;
    setModelLoadingMsg(`กำลังโหลด Model ${selectedModel}...`);
    try {
      const res = await accessoriesApi.loadModel(selectedModel);
      if (res && res.ok === false) {
        const msg = formatCameraErrorMessage(res, `ไม่สามารถโหลด Model ${selectedModel} ได้`);
        setModelLoadingMsg(msg);
        setNotice({ type: 'error', message: msg });
        return;
      }
      setModelLoadingMsg(`ส่งคำสั่งโหลด ${selectedModel} แล้ว`);
    } catch (err) {
      const msg = formatCameraErrorMessage(err, 'ไม่สามารถติดต่อเครื่อง AI Vision ได้');
      setModelLoadingMsg(msg);
      setNotice({ type: 'error', message: msg });
    }
  };

  const handleStart = async () => {
    if (!selectedProduct) {
      setNotice({ type: 'warning', message: 'กรุณาเลือกรุ่นงาน (Product) ก่อนกด START' });
      return;
    }
    try {
      await accessoriesApi.updateSettings({ product: selectedProduct });
      const res = await accessoriesApi.startDetection();
      if (res?.ok) {
        setNotice({ type: 'success', message: 'เริ่มระบบตรวจจับอัตโนมัติแล้ว' });
      } else {
        setNotice({
          type: 'error',
          message: formatCameraErrorMessage(res, 'ไม่สามารถเริ่มตรวจจับได้ กรุณาตรวจสอบสถานะกล้องและ Sensor'),
        });
      }
    } catch (err) {
      setNotice({
        type: 'error',
        message: formatCameraErrorMessage(err, 'ไม่สามารถติดต่อกล้อง AI Vision ได้ (ตรวจสอบสาย LAN หรือสิทธิ์ผู้ใช้งาน)'),
      });
    }
  };

  const handleCapture = async () => {
    try {
      const res = await accessoriesApi.captureSnapshot();
      setNotice({
        type: res?.ok ? 'success' : 'error',
        message: res?.ok
          ? 'บันทึกภาพตรวจจับเรียบร้อยแล้ว'
          : formatCameraErrorMessage(res, 'ไม่สามารถ Capture ภาพได้ กรุณาลองใหม่อีกครั้ง'),
      });
      loadLogs(true);
    } catch (err) {
      setNotice({
        type: 'error',
        message: formatCameraErrorMessage(err, 'ไม่สามารถติดต่อกล้อง AI Vision ได้ (ตรวจสอบสาย LAN หรือสิทธิ์ผู้ใช้งาน)'),
      });
    }
  };

  return (
    <div className="w-full space-y-3">
      {!isOnline && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800 font-medium">
          <WifiOff size={18} />
          <span>เครือข่ายออฟไลน์ — ปิดการสั่งงานกล้องชั่วคราว</span>
        </div>
      )}

      {notice && (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold border ${
            notice.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : notice.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {notice.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center shrink-0">
            <Camera size={24} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Accessories Inspection (ระบบตรวจจับชิ้นส่วนประกอบ AI Vision)
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              แสดงภาพสดควบคุมจุดตรวจประกอบ และสืบค้นประวัติผลตรวจ OK / ALARM รายกะและรายชั่วโมง
            </p>
          </div>
        </div>
      </div>

      {/* Live Station Controls & Stream */}
      <CameraStationPanel
        camConfigured={camConfigured}
        canControl={canControl}
        camOnline={camOnline}
        camStatus={camStatus}
        models={models}
        selectedProduct={selectedProduct}
        onProductChange={(val) => {
          setSelectedProduct(val);
          if (camConfigured) handleApplySettings({ product: val });
        }}
        selectedModel={selectedModel}
        onModelSelectChange={setSelectedModel}
        streamBust={streamBust}
        onReconnect={() => setStreamBust(Date.now())}
        onRefreshModels={refreshModels}
        onLoadModel={handleLoadModel}
        modelLoadingMsg={modelLoadingMsg}
        onStart={handleStart}
        onCapture={handleCapture}
        onApplySettings={handleApplySettings}
        isOnline={isOnline}
      />

      {/* History & Audit Log Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <Clock size={18} className="text-blue-600" />
            <span>ประวัติผลการตรวจสอบชิ้นส่วน (ACCESSORIES_INSPECTION_LOG)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ค้นหารุ่นสินค้า / ชื่อไฟล์..."
                className="min-h-[44px] pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
              />
            </div>
            <select
              value={shiftFilter}
              onChange={(e) => { setShiftFilter(e.target.value); setPage(1); }}
              className="min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            >
              <option value="all">ทุกกะ (08:00 - 08:00+1)</option>
              <option value="day">กะเช้า (08:00 - 20:00)</option>
              <option value="night">กะดึก (20:00 - 08:00+1)</option>
            </select>
            <select
              value={resultFilter}
              onChange={(e) => { setResultFilter(e.target.value); setPage(1); }}
              className="min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            >
              <option value="all">ผลตรวจทั้งหมด</option>
              <option value="ok">เฉพาะ OK</option>
              <option value="alarm">เฉพาะ ALARM</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            />
            <button
              type="button"
              onClick={() => setChartOpen(true)}
              className="min-h-[44px] px-3 flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-bold transition-colors"
              title="ดูกราฟ Cycle & S1 Analytics"
            >
              <BarChart3 size={16} />
              <span>กราฟ</span>
            </button>
            <button
              type="button"
              onClick={() => loadLogs(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="รีเฟรชประวัติ"
            >
              <RefreshCw size={16} className={loadingLogs ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50/70 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
          <div className="rounded-xl bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 font-semibold">ตรวจทั้งหมด</div>
            <div className="text-xl font-extrabold text-gray-900 dark:text-white">{summary.total}</div>
          </div>
          <div className="rounded-xl bg-white dark:bg-gray-800 p-3 border border-emerald-200 dark:border-emerald-800">
            <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} /> ผ่าน (OK)
            </div>
            <div className="text-xl font-extrabold text-emerald-600">{summary.ok}</div>
          </div>
          <div className="rounded-xl bg-white dark:bg-gray-800 p-3 border border-red-200 dark:border-red-800">
            <div className="text-xs text-red-600 font-semibold flex items-center gap-1">
              <ShieldAlert size={13} /> แจ้งเตือน (ALARM)
            </div>
            <div className="text-xl font-extrabold text-red-600">{summary.alarm}</div>
          </div>
          <div className="rounded-xl bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 font-semibold flex items-center gap-1">
              <ShieldCheck size={13} /> เวลาเฉลี่ย (Elapsed)
            </div>
            <div className="text-xl font-extrabold text-blue-600">{Number(summary.avg_elapsed_s || 0).toFixed(2)}s</div>
          </div>
        </div>

        {/* Log Rows with Hourly Dividers */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/70 text-xs font-bold uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2.5">เวลา</th>
                <th className="px-2.5 py-2.5 text-center" title="เวลาห่างจากชิ้นก่อนหน้าในชั่วโมงเดียวกัน">Diff</th>
                <th className="px-3 py-2.5 hidden sm:table-cell">รุ่นสินค้า (Model)</th>
                <th className="px-2.5 py-2.5 text-center">ผลตรวจ</th>
                <th className="px-2.5 py-2.5 text-right">Elapsed</th>
                <th className="px-2.5 py-2.5 text-right" title="เวลาที่งานมาถึง Sensor 1">S1 เข้า</th>
                <th className="px-2.5 py-2.5 text-right" title="เวลาที่งานพ้น Sensor 1">S1 ออก</th>
                <th className="px-2.5 py-2.5 text-right" title="ระยะเวลาที่ Sensor 1 จับงานอยู่">Detect</th>
                <th className="px-2.5 py-2.5 text-right" title="เวลาว่างระหว่างงาน S1 ออก → ชิ้นถัดไปเข้า">Idle</th>
                <th className="px-3 py-2.5 text-center">รูปภาพ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loadingLogs && logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    กำลังโหลดประวัติผลการตรวจ...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                    ไม่มีรายการตรวจสอบในช่วงเวลาที่เลือก
                  </td>
                </tr>
              ) : (
                logs.map((row, idx) => {
                  const hourKey = row.timestamp ? row.timestamp.slice(0, 13) : '';
                  const prevHourKey = idx > 0 && logs[idx - 1].timestamp ? logs[idx - 1].timestamp.slice(0, 13) : '';
                  const showDivider = hourKey && hourKey !== prevHourKey;
                  const hourStat = hourlyMap[hourKey];
                  const hh = hourKey.slice(11, 13);
                  const nextHh = String((Number(hh || 0) + 1) % 24).padStart(2, '0');
                  const isOk = row.result === 'ok';
                  const metrics = rowMetrics[idx] || { diffSec: null, detectSec: null, idleSec: null };
                  const ts = row.timestamp || '';

                  return (
                    <React.Fragment key={row.id || `${row.timestamp}_${idx}`}>
                      {showDivider && (
                        <tr className="bg-slate-100 dark:bg-slate-900/70">
                          <td colSpan={10} className="px-4 py-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-700 dark:text-slate-200">
                                ช่วงเวลา {hh}.00 - {nextHh}.00 น.
                              </span>
                              {hourStat && (
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                    OK = {hourStat.ok}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">
                                    ALARM = {hourStat.alarm}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                          {ts.length >= 19 ? (
                            <>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{ts.slice(11, 19)}</span>
                              <span className="hidden sm:inline ml-2 text-[11px] text-gray-400">
                                {`${ts.slice(8, 10)}/${ts.slice(5, 7)}/${ts.slice(0, 4)}`}
                              </span>
                            </>
                          ) : '-'}
                        </td>
                        <td className="px-2.5 py-2 text-center font-mono text-xs tabular-nums">
                          {metrics.diffSec !== null ? (
                            <span className={metrics.diffSec >= GAP_LIMIT_SEC ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-gray-500'}>
                              {formatDiffDuration(metrics.diffSec)}
                            </span>
                          ) : <span className="text-gray-400">–</span>}
                        </td>
                        <td className="px-3 py-2 font-semibold text-gray-800 dark:text-gray-200 hidden sm:table-cell whitespace-nowrap">
                          {row.model || '-'}
                        </td>
                        <td className="px-2.5 py-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isOk ? 'OK' : 'ALARM'}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono text-xs tabular-nums text-gray-600 dark:text-gray-300">
                          {Number(row.elapsed_s || 0).toFixed(2)}s
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono text-xs tabular-nums text-gray-500" title={row.s1_in || ''}>
                          {formatClockOnly(row.s1_in) || <span className="text-gray-400">–</span>}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono text-xs tabular-nums text-gray-500" title={row.s1_out || ''}>
                          {formatClockOnly(row.s1_out) || <span className="text-gray-400">–</span>}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono text-xs tabular-nums text-gray-600 dark:text-gray-300">
                          {metrics.detectSec !== null ? `${metrics.detectSec.toFixed(1)}s` : <span className="text-gray-400">–</span>}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono text-xs tabular-nums">
                          {metrics.idleSec !== null ? (
                            <span className={metrics.idleSec >= GAP_LIMIT_SEC ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-gray-500'}>
                              {metrics.idleSec.toFixed(1)}s
                            </span>
                          ) : <span className="text-gray-400">–</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {row.image ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(row.image)}
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                              title={`ดูรูป ${row.image}`}
                            >
                              <ImageIcon size={16} />
                            </button>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
          <span>
            แสดงหน้า {pagination.page} / {pagination.total_pages} (ทั้งหมด {pagination.total_rows} รายการ)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[44px] px-3.5 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold disabled:opacity-40"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              className="min-h-[44px] px-3.5 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold disabled:opacity-40"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      <InspectionImageModal imageName={previewImage} onClose={() => setPreviewImage('')} />

      <AccessoriesChartModal
        isOpen={chartOpen}
        onClose={() => setChartOpen(false)}
        rows={chartRows.length > 0 || chartLoading ? chartRows : logs}
        rangeStart={rangeWindow.start}
        rangeEnd={rangeWindow.end}
        shift={shiftFilter}
        loading={chartLoading}
      />
    </div>
  );
}
