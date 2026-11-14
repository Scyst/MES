import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2, ClipboardCheck, Lock, Printer, RefreshCw, Save,
  Search, Share2, Truck, Unlock, WifiOff,
} from 'lucide-react';
import { loadingReportApi } from '../../../shared/services/loadingApi';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import CtpatPhotoGrid from '../components/CtpatPhotoGrid';
import CtpatChecklistPanel from '../components/CtpatChecklistPanel';
import CtpatPrintPreviewModal from '../components/CtpatPrintPreviewModal';
import CompletedTrackingTab from '../components/CompletedTrackingTab';

const todayIso = () => new Date().toISOString().slice(0, 10);

const toDatetimeInput = (val) => {
  if (!val) return '';
  return String(val).trim().slice(0, 16).replace(' ', 'T');
};

/**
 * Self-contained C-TPAT Container Loading Report SPA (`#/loading-report`).
 */
export default function LoadingReportPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') === 'tracking' ? 'tracking' : 'inspection';
  const soIdParam = Number(searchParams.get('so_id') || 0);

  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
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

  const isReadOnly = String(user?.role || '').toLowerCase() === 'customer';

  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, draft: 0 });
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [selectedSoId, setSelectedSoId] = useState(soIdParam);
  const [bundle, setBundle] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [workTab, setWorkTab] = useState('header');

  const [headerForm, setHeaderForm] = useState({
    seal_no: '',
    cable_seal: '',
    container_no: '',
    container_type: '',
    car_license: '',
    driver_name: '',
    inspector_name: '',
    supervisor_name: '',
    loading_location: '',
    loading_start_time: '',
    loading_end_time: '',
  });
  const [savingHeader, setSavingHeader] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (soIdParam > 0) setSelectedSoId(soIdParam);
  }, [soIdParam]);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const res = await loadingReportApi.getJobs({
        start_date: startDate,
        end_date: endDate,
        status: statusFilter,
        search: debouncedSearch,
        page: 1,
        page_size: 100,
      });
      setJobs(Array.isArray(res.data) ? res.data : []);
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถโหลดคิวงาน Loading ได้');
    } finally {
      setLoadingJobs(false);
    }
  }, [startDate, endDate, statusFilter, debouncedSearch, toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const loadReportDetail = useCallback(async (soId) => {
    if (!soId || soId <= 0) {
      setBundle(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const res = await loadingReportApi.getReportDetail({ so_id: soId });
      const data = res.data;
      setBundle(data);
      const h = data?.header || {};
      setHeaderForm({
        seal_no: h.report_seal || h.master_seal || '',
        cable_seal: h.cable_seal || '',
        container_no: h.report_container || h.master_container || '',
        container_type: h.container_type || h.ctn_size || '',
        car_license: h.car_license || '',
        driver_name: h.driver_name || '',
        inspector_name: h.inspector_name || user?.full_name || user?.username || '',
        supervisor_name: h.supervisor_name || '',
        loading_location: h.loading_location || '',
        loading_start_time: toDatetimeInput(h.loading_start_time),
        loading_end_time: toDatetimeInput(h.loading_end_time),
      });
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถโหลดรายละเอียดใบงาน Loading ได้');
    } finally {
      setLoadingDetail(false);
    }
  }, [toast, user]);

  useEffect(() => {
    if (selectedSoId > 0) {
      loadReportDetail(selectedSoId);
    }
  }, [selectedSoId, loadReportDetail]);

  const handleSelectJob = (soId) => {
    setSelectedSoId(soId);
    setSearchParams({ tab: 'inspection', so_id: String(soId) });
  };

  const reportId = Number(bundle?.header?.report_id || 0);
  const isCompleted = String(bundle?.header?.status || '').toUpperCase() === 'COMPLETED';
  const formLocked = isCompleted || isOffline || isReadOnly;

  const handleSaveHeader = async (e) => {
    e.preventDefault();
    if (formLocked || !selectedSoId || savingHeader) return;
    setSavingHeader(true);
    try {
      await loadingReportApi.saveHeader({
        sales_order_id: selectedSoId,
        ...headerForm,
      });
      toast.success('บันทึกข้อมูลส่วนหัว C-TPAT เรียบร้อย');
      await Promise.all([loadReportDetail(selectedSoId), loadJobs()]);
    } catch (err) {
      toast.error(err.message || 'บันทึกข้อมูลส่วนหัวไม่สำเร็จ');
    } finally {
      setSavingHeader(false);
    }
  };

  const handleChecklistChange = async (topicId, itemIdx, nextData) => {
    if (topicId === 'RELOAD_ALL') {
      await loadReportDetail(selectedSoId);
      return;
    }
    setBundle((cur) => {
      if (!cur) return cur;
      const nextChecklist = { ...(cur.checklist || {}) };
      nextChecklist[topicId] = {
        ...(nextChecklist[topicId] || {}),
        [itemIdx]: { topic_id: topicId, item_index: itemIdx, ...nextData },
      };
      return { ...cur, checklist: nextChecklist };
    });
  };

  const handleFinish = async () => {
    if (!reportId || formLocked) return;
    const ok = await confirm({
      title: 'ยืนยันปิดงานตรวจ C-TPAT',
      message: 'เมื่อปิดงานแล้ว สถานะจะเปลี่ยนเป็น COMPLETED และส่งข้อมูลเข้าสู่บัญชีเที่ยวรถ (Freight FleetLog) อัตโนมัติ ยืนยันหรือไม่?',
      confirmText: 'ยืนยันปิดงาน (COMPLETED)',
    });
    if (!ok) return;

    try {
      await loadingReportApi.finishReport(reportId);
      toast.success('ปิดงาน Loading Report และบันทึกเข้า Freight FleetLog สำเร็จ');
      await Promise.all([loadReportDetail(selectedSoId), loadJobs()]);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถปิดงานได้');
    }
  };

  const handleReopen = async () => {
    if (!reportId || isOffline || isReadOnly) return;
    const ok = await confirm({
      title: 'ปลดล็อกแก้ไขรายงาน COMPLETED',
      message: 'การปลดล็อกจะย้อนสถานะกลับเป็น DRAFT และลบรายการซิงค์อัตโนมัติใน Freight FleetLog เพื่อตรวจใหม่ ดำเนินการต่อหรือไม่?',
      confirmText: 'ยืนยันปลดล็อก (DRAFT)',
      danger: true,
    });
    if (!ok) return;

    try {
      await loadingReportApi.reopenReport(reportId);
      toast.success('ปลดล็อกรายงานกลับเป็น DRAFT เรียบร้อย');
      await Promise.all([loadReportDetail(selectedSoId), loadJobs()]);
    } catch (err) {
      toast.error(err.message || 'ปลดล็อกไม่สำเร็จ');
    }
  };

  const handleGenerateShare = async () => {
    if (!reportId || isOffline || isReadOnly) return;
    try {
      const res = await loadingReportApi.generateShareToken(reportId);
      const token = res?.data?.access_token;
      if (token) {
        const shareUrl = `${window.location.origin}/iot-toolbox/sandbox-b9/MES/MES/page/loadingReport/customerView.php?token=${encodeURIComponent(token)}`;
        await navigator.clipboard?.writeText(shareUrl).catch(() => {});
        toast.success(`สร้างลิงก์สำหรับลูกค้าเรียบร้อยและคัดลอกลงคลิปบอร์ดแล้ว (หมดอายุใน 30 วัน)`);
        await loadReportDetail(selectedSoId);
      }
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถสร้างลิงก์แชร์ได้');
    }
  };

  return (
    <div className="w-full space-y-5 p-3 sm:p-5">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>ออฟไลน์อยู่ — ไม่สามารถอัปโหลดภาพหรือบันทึกรายงานได้</span>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              C-TPAT Container Loading Report
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ตรวจสอบความปลอดภัยตู้คอนเทนเนอร์ 10 หมวด พร้อมภาพถ่าย 16 จุด และซิงค์ Freight FleetLog
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSearchParams(selectedSoId ? { tab: 'inspection', so_id: String(selectedSoId) } : { tab: 'inspection' })}
            className={`min-h-[44px] rounded-xl px-4 text-xs font-semibold ${
              tabParam === 'inspection'
                ? 'bg-slate-900 text-white dark:bg-blue-600'
                : 'border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            หน้างานตรวจตู้ (Inspection)
          </button>
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'tracking' })}
            className={`min-h-[44px] rounded-xl px-4 text-xs font-semibold ${
              tabParam === 'tracking'
                ? 'bg-slate-900 text-white dark:bg-blue-600'
                : 'border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            ค้นหาเอกสารเสร็จสมบูรณ์ (Tracking)
          </button>
        </div>
      </div>

      {tabParam === 'tracking' ? (
        <CompletedTrackingTab onSelectJob={handleSelectJob} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left Queue Panel */}
          <div className="lg:col-span-4 space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { key: 'ALL', label: 'ทั้งหมด', val: summary.total },
                  { key: 'DRAFT', label: 'รอ/กำลังตรวจ', val: summary.draft },
                  { key: 'COMPLETED', label: 'เสร็จสิ้น', val: summary.completed },
                ].map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => setStatusFilter(k.key)}
                    className={`min-h-[56px] rounded-xl border p-2 ${
                      statusFilter === k.key
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="text-[11px] text-slate-500">{k.label}</div>
                    <div className="text-base font-bold text-slate-900 dark:text-white">{k.val || 0}</div>
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="ค้นหา PO, Booking, Container, CI..."
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="วันโหลดตั้งแต่"
                  className="min-h-[44px] rounded-xl border border-slate-300 px-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="วันโหลดถึง"
                  className="min-h-[44px] rounded-xl border border-slate-300 px-2.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <button
                type="button"
                onClick={loadJobs}
                disabled={loadingJobs}
                className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700"
              >
                <RefreshCw className={`h-4 w-4 ${loadingJobs ? 'animate-spin' : ''}`} />
                <span>โหลดคิวงาน</span>
              </button>
            </div>

            <div className="max-h-[600px] overflow-y-auto space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              {jobs.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500">ไม่พบใบงาน Loading ในช่วงเวลาที่เลือก</p>
              ) : (
                jobs.map((job) => {
                  const selected = Number(job.so_id) === Number(selectedSoId);
                  const done = job.report_status === 'COMPLETED';
                  return (
                    <button
                      key={job.so_id}
                      type="button"
                      onClick={() => handleSelectJob(job.so_id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selected
                          ? 'border-orange-500 bg-orange-50/70 ring-1 ring-orange-500 dark:bg-orange-950/30'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{job.po_number}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {done ? 'COMPLETED' : 'DRAFT'}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                        {job.description || '-'}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-400">
                        <span>Container: {job.container_no || '-'}</span>
                        <span>BKG: {job.booking_no || '-'}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Inspection Workspace */}
          <div className="lg:col-span-8">
            {!selectedSoId ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <ClipboardCheck className="h-12 w-12 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  เลือก PO จากรายการด้านซ้ายเพื่อเริ่มบันทึกการตรวจตู้ C-TPAT
                </p>
              </div>
            ) : loadingDetail && !bundle ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                กำลังโหลดข้อมูลการตรวจตู้...
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        PO: {bundle?.header?.po_number || '-'}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isCompleted ? <Lock className="h-3 w-3" /> : null}
                        {bundle?.header?.status || 'NEW DRAFT'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      SKU: {bundle?.header?.sku || '-'} · Qty: {bundle?.header?.quantity || 0} · Booking: {bundle?.header?.booking_no || '-'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!reportId}
                      onClick={() => setPrintOpen(true)}
                      className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700"
                    >
                      <Printer className="h-4 w-4" />
                      <span>พิมพ์ C-TPAT</span>
                    </button>

                    {!isReadOnly && reportId > 0 && (
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={handleGenerateShare}
                        className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-blue-300 px-3.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40 dark:border-blue-800 dark:text-blue-300"
                      >
                        <Share2 className="h-4 w-4" />
                        <span>ลิงก์ลูกค้า</span>
                      </button>
                    )}

                    {!isReadOnly && reportId > 0 && !isCompleted && (
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={handleFinish}
                        className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Finish &amp; Sync Fleet</span>
                      </button>
                    )}

                    {!isReadOnly && reportId > 0 && isCompleted && (
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={handleReopen}
                        className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-600 px-4 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-40"
                      >
                        <Unlock className="h-4 w-4" />
                        <span>ปลดล็อกแก้ไข</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'header', label: '1. ข้อมูลตู้ & คนขับ (Header)' },
                    { key: 'photos', label: '2. ภาพถ่าย 16 จุด (Photos)' },
                    { key: 'checklist', label: '3. แบบตรวจ 10 หมวด (C-TPAT)' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setWorkTab(t.key)}
                      className={`min-h-[44px] rounded-xl px-4 text-xs font-semibold transition ${
                        workTab === t.key
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {workTab === 'header' && (
                  <form onSubmit={handleSaveHeader} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                    {[
                      { key: 'container_no', label: 'Container No. (เบอร์ตู้)' },
                      { key: 'container_type', label: 'Container Type (เช่น 20GP, 40HQ)' },
                      { key: 'seal_no', label: 'Seal No. (เลขซีล)' },
                      { key: 'cable_seal', label: 'Cable Seal (ซีลสลิง)' },
                      { key: 'car_license', label: 'Car License (ทะเบียนรถ)' },
                      { key: 'driver_name', label: 'Driver Name (ชื่อคนขับ)' },
                      { key: 'loading_location', label: 'Loading Location (จุดโหลด)' },
                      { key: 'inspector_name', label: 'Inspector Name (ผู้ตรวจ)' },
                      { key: 'supervisor_name', label: 'Supervisor Name (ผู้รับรอง)' },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">{f.label}</label>
                        <input
                          type="text"
                          disabled={formLocked}
                          value={headerForm[f.key] || ''}
                          onChange={(e) => setHeaderForm({ ...headerForm, [f.key]: e.target.value })}
                          className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                    ))}

                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Loading Start Time</label>
                      <input
                        type="datetime-local"
                        disabled={formLocked}
                        value={headerForm.loading_start_time}
                        onChange={(e) => setHeaderForm({ ...headerForm, loading_start_time: e.target.value })}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">Loading End Time</label>
                      <input
                        type="datetime-local"
                        disabled={formLocked}
                        value={headerForm.loading_end_time}
                        onChange={(e) => setHeaderForm({ ...headerForm, loading_end_time: e.target.value })}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>

                    {!formLocked && (
                      <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingHeader}
                          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-blue-600"
                        >
                          <Save className="h-4 w-4" />
                          <span>{savingHeader ? 'กำลังบันทึก...' : 'บันทึกข้อมูลส่วนหัว'}</span>
                        </button>
                      </div>
                    )}
                  </form>
                )}

                {workTab === 'photos' && (
                  <CtpatPhotoGrid
                    reportId={reportId}
                    photos={bundle?.photos}
                    isCompleted={isCompleted}
                    isOffline={isOffline}
                    isReadOnly={isReadOnly}
                    onPhotoChanged={() => loadReportDetail(selectedSoId)}
                  />
                )}

                {workTab === 'checklist' && (
                  <CtpatChecklistPanel
                    reportId={reportId}
                    checklist={bundle?.checklist}
                    isCompleted={isCompleted}
                    isOffline={isOffline}
                    isReadOnly={isReadOnly}
                    onChecklistChanged={handleChecklistChange}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {printOpen && bundle && (
        <CtpatPrintPreviewModal
          initialBundle={bundle}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}
