import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  AlertTriangle,
  Barcode,
  Camera,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import { productionApi } from '../../../shared/services/productionApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import OperatorMultiSelect from '../components/OperatorMultiSelect';
import { playScanTone } from '../utils/thermalPrinter';

const todayIso = () => new Date().toISOString().slice(0, 10);

const SCAN_TYPES = [
  {
    id: 'FG',
    label: 'FG (งานดี)',
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    idleClass: 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
  },
  {
    id: 'HOLD',
    label: 'HOLD (รอตรวจสอบ)',
    activeClass: 'bg-amber-500 text-white border-amber-500 shadow-sm',
    idleClass: 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30',
  },
  {
    id: 'SCRAP',
    label: 'SCRAP (ของเสีย)',
    activeClass: 'bg-rose-600 text-white border-rose-600 shadow-sm',
    idleClass: 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/30',
  },
];

const SHIFTS = [
  { id: 'day', label: 'กะเช้า (08:00 - 19:59)' },
  { id: 'night', label: 'กะดึก (20:00 - 07:59)' },
  { id: 'all', label: 'ทั้งหมด (24 ชม.)' },
];

const LOG_BADGE = {
  FG: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  HOLD: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  SCRAP: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
};

/**
 * High-Speed Industrial Barcode Scanner Terminal (#/scan-barcode).
 * Supports USB/Bluetooth HID scanners, mobile camera scanning, active RUNNING job linking,
 * hourly STOCK_TRANSACTIONS aggregation, and shift-based scan logs.
 */
export default function ScanBarcodePage() {
  const toast = useToast();
  const barcodeInputRef = useRef(null);
  const submittingRef = useRef(false);
  const qrScannerRef = useRef(null);

  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false,
  );
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [runningJobs, setRunningJobs] = useState([]);
  const [jobNo, setJobNo] = useState('');

  const [prodType, setProdType] = useState('FG');
  const [barcode, setBarcode] = useState('');
  const [lotRef, setLotRef] = useState('');
  const [notes, setNotes] = useState('');
  const [teamUserIds, setTeamUserIds] = useState([]);

  const [matchedItem, setMatchedItem] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Camera modal
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Shift Log Filters
  const [logDate, setLogDate] = useState(todayIso);
  const [shift, setShift] = useState(() => {
    const hr = new Date().getHours();
    return hr >= 8 && hr < 20 ? 'day' : 'night';
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ total_scans: 0, fg_count: 0, hold_count: 0, scrap_count: 0 });
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const loadLocations = async () => {
      try {
        const res = await productionApi.getScanLocations();
        if (cancelled) return;
        const rows = res?.data || [];
        setLocations(rows);
        if (rows.length > 0) {
          setLocationId((prev) => prev || String(rows[0].location_id));
        }
      } catch (err) {
        if (!cancelled) toast.error(err?.message || 'ไม่สามารถโหลดรายชื่อสถานี/ไลน์ผลิตได้');
      }
    };
    loadLocations();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Load RUNNING jobs when location changes
  useEffect(() => {
    if (!locationId) {
      setRunningJobs([]);
      return;
    }
    let cancelled = false;
    const loadJobs = async () => {
      try {
        const res = await productionApi.getActiveJobs(locationId);
        if (cancelled) return;
        const allJobs = res?.data || [];
        const running = allJobs.filter((j) => String(j.status || '').toUpperCase() === 'RUNNING');
        setRunningJobs(running);
        setJobNo((prev) => {
          if (prev && running.some((j) => j.job_no === prev)) return prev;
          return running.length === 1 ? running[0].job_no : '';
        });
      } catch {
        if (!cancelled) setRunningJobs([]);
      }
    };
    loadJobs();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await productionApi.getScanLogs({
        date: logDate,
        shift,
        location_id: locationId || 'ALL',
        search: debouncedSearch,
      });
      setLogs(res?.data?.rows || []);
      setSummary(res?.data?.summary || { total_scans: 0, fg_count: 0, hold_count: 0, scrap_count: 0 });
    } catch (err) {
      toast.error(err?.message || 'ไม่สามารถโหลดประวัติการสแกนได้');
    } finally {
      setLoadingLogs(false);
    }
  }, [logDate, shift, locationId, debouncedSearch, toast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleLookup = async (codeOverride = null) => {
    const code = String(codeOverride !== null ? codeOverride : barcode).trim();
    if (!code) {
      toast.warning('กรุณาระบุหรือสแกนรหัสบาร์โค้ดก่อนตรวจสอบ');
      return;
    }
    try {
      const res = await productionApi.getScanProduct(code);
      setMatchedItem(res?.data || null);
      if (soundEnabled) playScanTone('success');
    } catch (err) {
      setMatchedItem(null);
      if (soundEnabled) playScanTone('error');
      toast.error(err?.message || 'ไม่พบข้อมูลสินค้าในระบบ');
    }
  };

  const handleSubmitScan = useCallback(
    async (scannedCode = null) => {
      const code = String(scannedCode !== null ? scannedCode : barcode).trim();
      if (isOffline) {
        toast.error('ไม่สามารถบันทึกข้อมูลได้ขณะออฟไลน์');
        return;
      }
      if (!locationId) {
        toast.warning('กรุณาเลือกสถานี / ไลน์ผลิตก่อนสแกน');
        return;
      }
      if (!code) {
        toast.warning('กรุณาสแกนบาร์โค้ดสินค้า');
        return;
      }
      if (submittingRef.current) return;

      submittingRef.current = true;
      setSubmitting(true);
      try {
        const res = await productionApi.saveScan({
          barcode: code,
          production_type: prodType,
          location_id: Number(locationId),
          lot_ref: lotRef.trim(),
          job_no: jobNo,
          notes: notes.trim(),
          team_user_ids: teamUserIds.join(','),
        });
        const data = res?.data || {};
        setLastScan(data);
        setMatchedItem({
          sap_no: data.sap_no,
          part_no: data.part_no,
          part_description: data.part_description,
          barcode: data.barcode_no,
        });
        setBarcode('');
        if (soundEnabled) playScanTone('success');
        toast.success(res?.message || `สแกน ${data.part_no || code} (${prodType}) สำเร็จ`);
        loadLogs();
      } catch (err) {
        if (soundEnabled) playScanTone('error');
        toast.error(err?.message || 'บันทึกการสแกนไม่สำเร็จ');
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
        setTimeout(() => barcodeInputRef.current?.focus(), 60);
      }
    },
    [barcode, isOffline, locationId, prodType, lotRef, jobNo, notes, teamUserIds, soundEnabled, toast, loadLogs],
  );

  // Camera Scanner lifecycle
  useEffect(() => {
    if (!cameraOpen) return undefined;
    let active = true;
    setCameraError('');
    const scanner = new Html5Qrcode('scan-barcode-camera-box');
    qrScannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          if (!active) return;
          const clean = String(decodedText || '').trim();
          if (clean) {
            setCameraOpen(false);
            setBarcode(clean);
            handleSubmitScan(clean);
          }
        },
        () => {
          // Ignore frame decode misses
        },
      )
      .catch((err) => {
        if (active) {
          setCameraError(err?.message || 'ไม่สามารถเปิดกล้องสแกนได้ กรุณาตรวจสอบสิทธิ์การใช้งานกล้อง');
        }
      });

    return () => {
      active = false;
      const cur = qrScannerRef.current;
      qrScannerRef.current = null;
      if (cur) {
        try {
          if (cur.isScanning) {
            cur.stop().then(() => cur.clear()).catch(() => {});
          } else {
            cur.clear();
          }
        } catch {
          // Ignore scanner cleanup errors
        }
      }
    };
  }, [cameraOpen, handleSubmitScan]);

  // Group scan history by hour
  const hourlyGroups = useMemo(() => {
    const groups = new Map();
    logs.forEach((row) => {
      const hr = Number.isFinite(Number(row.scan_hour))
        ? String(Number(row.scan_hour)).padStart(2, '0')
        : String(row.logdate || '').slice(11, 13) || '--';
      const label = hr === '--' ? 'ไม่ระบุเวลา' : `${hr}:00 - ${hr}:59`;
      if (!groups.has(label)) {
        groups.set(label, { label, count: 0, rows: [] });
      }
      const bucket = groups.get(label);
      bucket.count += 1;
      bucket.rows.push(row);
    });
    return Array.from(groups.values());
  }, [logs]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-10">
      {isOffline && (
        <div
          role="alert"
          className="bg-rose-600 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>ขาดการเชื่อมต่อ (Offline) — ปิดการบันทึกสแกนชั่วคราว</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">
                สถานีสแกนบาร์โค้ดการผลิต (Scan Barcode Terminal)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                บันทึกยอดผลิตความเร็วสูงแบบ Real-time พร้อมตัด BOM และอัปเดตคิวงาน KDS อัตโนมัติ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                soundEnabled
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'เสียงตอบรับ: เปิด' : 'เสียงตอบรับ: ปิด'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 pt-5 space-y-5">
        {/* Scanner Terminal Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* Left: Scan Controls */}
          <div className="xl:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  สถานี / ไลน์ผลิต <span className="text-rose-500">*</span>
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
                >
                  <option value="">-- เลือกสถานี / ไลน์ผลิต --</option>
                  {locations.map((loc) => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.location_name}
                      {loc.production_line ? ` (${loc.production_line})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  เชื่อมโยงใบสั่งผลิตที่กำลังเดินเครื่อง (Active Job)
                </label>
                <select
                  value={jobNo}
                  onChange={(e) => setJobNo(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  <option value="">-- ไม่ระบุ Job (ตัดสต็อกตามไลน์) --</option>
                  {runningJobs.map((job) => (
                    <option key={job.job_id} value={job.job_no}>
                      {job.job_no} · {job.part_no || job.sap_no} (
                      {Math.round(Number(job.actual_qty || 0))}/{Math.round(Number(job.target_qty || 0))})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* FG / HOLD / SCRAP Big Industrial Touch Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                ประเภทการบันทึกยอด (Production Status)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SCAN_TYPES.map((st) => {
                  const active = prodType === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setProdType(st.id)}
                      className={`min-h-[50px] px-2 sm:px-3 py-2 rounded-xl border-2 font-bold text-xs sm:text-sm transition-all ${
                        active ? st.activeClass : st.idleClass
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barcode Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitScan();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  สแกนบาร์โค้ด / รหัส SAP / Part No. (กด Enter เพื่อบันทึกทันที)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="สแกนบาร์โค้ดสินค้า..."
                    autoFocus
                    disabled={isOffline}
                    className="flex-1 min-h-[52px] px-4 py-2 rounded-xl border-2 border-indigo-400 dark:border-indigo-600 bg-white dark:bg-slate-800 text-base sm:text-lg font-mono font-bold tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLookup()}
                      disabled={!barcode.trim()}
                      className="min-h-[52px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
                    >
                      <Search className="w-4 h-4" />
                      <span>ตรวจสอบ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraOpen(true)}
                      disabled={isOffline}
                      className="min-h-[52px] px-3.5 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" />
                      <span className="hidden sm:inline">กล้อง</span>
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || isOffline || !barcode.trim()}
                      className="flex-1 sm:flex-none min-h-[52px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
                    >
                      {submitting ? 'กำลังบันทึก...' : 'บันทึกสแกน'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    เลข Lot / อ้างอิง (ไม่บังคับ)
                  </label>
                  <input
                    type="text"
                    value={lotRef}
                    onChange={(e) => setLotRef(e.target.value)}
                    placeholder="เช่น LOT-261114-01"
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    หมายเหตุ (Remark)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ระบุหมายเหตุเพิ่มเติม..."
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>
            </form>

            {/* Operator Attribution */}
            <OperatorMultiSelect
              locationId={locationId || null}
              date={logDate}
              selectedIds={teamUserIds}
              onChange={setTeamUserIds}
              label="ผู้ปฏิบัติงานประจำจุดสแกน (เฉลี่ยยอดผลิตเข้า OEE รายบุคคล)"
              disabled={isOffline}
            />
          </div>

          {/* Right: Live KPI Summary & Last Scanned Card */}
          <div className="xl:col-span-5 space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="text-xs font-semibold text-slate-500">ยอดสแกนทั้งหมด (กะ)</div>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                  {Number(summary.total_scans || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-emerald-900 p-4">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">FG (งานดี)</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {Number(summary.fg_count || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900 p-4">
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400">HOLD (รอตรวจ)</div>
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {Number(summary.hold_count || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900 p-4">
                <div className="text-xs font-semibold text-rose-700 dark:text-rose-400">SCRAP (ของเสีย)</div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {Number(summary.scrap_count || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Matched / Last Scan Feedback */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ผลลัพธ์การสแกนล่าสุด</span>
                </h2>
                {lastScan?.timestamp && (
                  <span className="text-xs text-slate-500 font-mono">{lastScan.timestamp}</span>
                )}
              </div>

              {lastScan ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-base text-slate-900 dark:text-white">
                      {lastScan.part_no || lastScan.barcode_no}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        LOG_BADGE[lastScan.production_type] || 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {lastScan.production_type} +1 PCS
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    SAP: <span className="font-mono font-semibold">{lastScan.sap_no || '-'}</span> | สถานี:{' '}
                    <span className="font-semibold">{lastScan.location_name || '-'}</span>
                  </div>
                  {lastScan.part_description && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {lastScan.part_description}
                    </div>
                  )}
                  {(lastScan.job_no || lastScan.lot_ref) && (
                    <div className="text-xs text-indigo-700 dark:text-indigo-300 font-mono">
                      {lastScan.job_no ? `Job: ${lastScan.job_no} ` : ''}
                      {lastScan.lot_ref ? `Lot: ${lastScan.lot_ref}` : ''}
                    </div>
                  )}
                </div>
              ) : matchedItem ? (
                <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 space-y-1">
                  <div className="font-bold text-sm">{matchedItem.part_no}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    SAP: {matchedItem.sap_no} | Barcode: {matchedItem.barcode || '-'}
                  </div>
                  <div className="text-xs text-slate-500">{matchedItem.part_description}</div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs sm:text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                  พร้อมรับการสแกน — เลือกสถานีผลิตแล้วสแกนบาร์โค้ดได้เลย
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Shift Scan History Section */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>ประวัติการสแกนแยกตามช่วงชั่วโมง (Shift Scan Logs)</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-2">
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                {SHIFTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา Barcode / SAP / Lot..."
                className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
              <button
                type="button"
                onClick={loadLogs}
                disabled={loadingLogs}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
                <span>โหลดใหม่</span>
              </button>
            </div>
          </div>

          {loadingLogs && logs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">กำลังโหลดข้อมูลการสแกน...</div>
          ) : hourlyGroups.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              ไม่พบรายการสแกนในช่วงวันที่และกะที่เลือก
            </div>
          ) : (
            <div className="space-y-4">
              {hourlyGroups.map((grp) => (
                <div
                  key={grp.label}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                >
                  <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-bold">
                    <span>ช่วงเวลา {grp.label}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                      {grp.count} รายการ
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">เวลา</th>
                          <th className="py-2.5 px-3">ประเภท</th>
                          <th className="py-2.5 px-3">Part No / SAP</th>
                          <th className="py-2.5 px-3 hidden md:table-cell">Barcode</th>
                          <th className="py-2.5 px-3 hidden sm:table-cell">สถานีผลิต</th>
                          <th className="py-2.5 px-3 hidden lg:table-cell">Lot / หมายเหตุ</th>
                          <th className="py-2.5 px-3">ผู้สแกน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {grp.rows.map((r) => (
                          <tr key={r.transaction_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                              {String(r.logdate || '').slice(11, 19)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  LOG_BADGE[String(r.production_type || '').toUpperCase()] ||
                                  'bg-slate-200 text-slate-800'
                                }`}
                              >
                                {r.production_type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {r.part_no || r.sap_no || '-'}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">{r.sap_no || '-'}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono hidden md:table-cell">{r.barcode_no}</td>
                            <td className="py-2.5 px-3 hidden sm:table-cell">{r.location_name || '-'}</td>
                            <td className="py-2.5 px-3 hidden lg:table-cell text-xs text-slate-600 dark:text-slate-400">
                              {r.lot_ref ? `[${r.lot_ref}] ` : ''}
                              {r.notes || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-xs font-medium">{r.scanned_by || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Camera Scanner Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-4 space-y-3 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                <span>สแกนบาร์โค้ดด้วยกล้อง</span>
              </h3>
              <button
                type="button"
                onClick={() => setCameraOpen(false)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {cameraError ? (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            ) : (
              <div id="scan-barcode-camera-box" className="w-full rounded-xl overflow-hidden bg-black min-h-[260px]" />
            )}
            <button
              type="button"
              onClick={() => setCameraOpen(false)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold"
            >
              ปิดหน้าต่างกล้อง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
