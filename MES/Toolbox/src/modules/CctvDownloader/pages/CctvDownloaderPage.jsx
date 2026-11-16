import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eraser,
  Eye,
  Film,
  HardDrive,
  Link2,
  Network,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Video,
  WifiOff,
  X,
} from 'lucide-react';
import { cctvApi } from '../../../shared/services/cctvApi';
import LinkLoadingModal from '../components/LinkLoadingModal';
import VideoPreviewModal from '../components/VideoPreviewModal';

const EMPTY_JOB_ROW = () => ({ id: `${Date.now()}_${Math.random()}`, start_time: '', end_time: '', filename: '' });

function formatBytes(bytes) {
  const num = Number(bytes) || 0;
  if (num >= 1073741824) return `${(num / 1073741824).toFixed(2)} GB`;
  if (num >= 1048576) return `${(num / 1048576).toFixed(2)} MB`;
  return `${(num / 1024).toFixed(2)} KB`;
}

function calcEstimatedDuration(startStr, endStr) {
  if (!startStr || !endStr) return '';
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return '';
  const diffSec = Math.round((end - start) / 1000);
  if (diffSec <= 0) return 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น';
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return hrs > 0
    ? `ความยาวคลิป ${hrs} ชม. ${remMins} นาที ${secs} วิ`
    : `ความยาวคลิป ${mins} นาที ${secs} วิ`;
}

/**
 * Self-contained CCTV Downloader & C-TPAT Loading Video Archive SPA page.
 */
export default function CctvDownloaderPage() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [capabilities, setCapabilities] = useState({
    cam_credentials_configured: true,
    ffmpeg_available: true,
    downloads_dir_writable: true,
    os_family: '',
  });

  const [cameraIp, setCameraIp] = useState('');
  const [channel, setChannel] = useState(1);
  const [camStatus, setCamStatus] = useState({ state: 'idle', text: 'รอระบุ IP กล้อง' });

  const [snapshotUrl, setSnapshotUrl] = useState('');
  const [snapshotMsg, setSnapshotMsg] = useState('');
  const [previewBusy, setPreviewBusy] = useState(false);

  const [jobs, setJobs] = useState([EMPTY_JOB_ROW()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitNotice, setSubmitNotice] = useState(null);

  const [downloading, setDownloading] = useState([]);
  const [queued, setQueued] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_dl_desc');

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [playFile, setPlayFile] = useState('');
  const [deleteTarget, setDeleteTarget] = useState('');
  const [deleting, setDeleting] = useState(false);

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
    let active = true;
    cctvApi.getCapabilities()
      .then((res) => {
        if (active && res.data) setCapabilities(res.data);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const refreshFiles = useCallback(async (silent = false) => {
    if (!silent) setLoadingFiles(true);
    try {
      const res = await cctvApi.listFiles();
      const d = res.data || {};
      setDownloading(Array.isArray(d.downloading) ? d.downloading : []);
      setQueued(Array.isArray(d.queued) ? d.queued : []);
      setCompleted(Array.isArray(d.completed) ? d.completed : []);
    } catch {
      /* keep current list cleanly */
    } finally {
      if (!silent) setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    refreshFiles(false);
  }, [refreshFiles]);

  // Poll faster only while active/queued jobs exist
  useEffect(() => {
    const hasActive = downloading.some((j) => j.status === 'downloading') || queued.length > 0;
    const ms = hasActive ? 5000 : 20000;
    const id = setInterval(() => {
      if (isOnline) refreshFiles(true);
    }, ms);
    return () => clearInterval(id);
  }, [downloading, queued.length, isOnline, refreshFiles]);

  const handleCheckCamera = async () => {
    const ip = cameraIp.trim();
    if (!ip) {
      setCamStatus({ state: 'idle', text: 'รอระบุ IP กล้อง' });
      return;
    }
    setCamStatus({ state: 'checking', text: 'กำลังตรวจสอบพอร์ต RTSP...' });
    try {
      const res = await cctvApi.checkStatus(ip);
      if (res.data?.online) {
        setCamStatus({ state: 'online', text: 'กล้องออนไลน์ (RTSP 554)' });
      } else {
        setCamStatus({ state: 'offline', text: 'ไม่สามารถเชื่อมต่อกล้อง' });
      }
    } catch (err) {
      setCamStatus({ state: 'offline', text: err?.message || 'IP ไม่ถูกต้อง / ออฟไลน์' });
    }
  };

  const handlePreviewSnapshot = async () => {
    const ip = cameraIp.trim();
    if (!ip) {
      setSnapshotMsg('กรุณากรอก IP Address ของกล้องก่อนทดสอบภาพ');
      return;
    }
    setPreviewBusy(true);
    setSnapshotUrl('');
    setSnapshotMsg('กำลังดึงภาพตัวอย่างผ่าน ISAPI...');
    try {
      const res = await cctvApi.previewCamera(ip, channel);
      setSnapshotUrl(res.data?.image || '');
      setSnapshotMsg('');
    } catch (err) {
      setSnapshotMsg(err?.message || 'ไม่สามารถดึงภาพตัวอย่างได้');
    } finally {
      setPreviewBusy(false);
    }
  };

  const handleSubmitBatch = async (e) => {
    e.preventDefault();
    const ip = cameraIp.trim();
    if (!ip) {
      setSubmitNotice({ type: 'warning', message: 'กรุณากรอก IP Address ของกล้องก่อนสั่งดาวน์โหลด' });
      return;
    }
    const validJobs = jobs.filter((j) => j.start_time && j.end_time && j.filename.trim());
    if (validJobs.length === 0) {
      setSubmitNotice({ type: 'warning', message: 'กรุณากรอกข้อมูลเวลาเริ่มต้น เวลาสิ้นสุด และชื่อไฟล์อย่างน้อย 1 รายการ' });
      return;
    }

    setSubmitting(true);
    setSubmitNotice(null);
    try {
      const res = await cctvApi.startDownload({
        cameraIp: ip,
        channel,
        jobs: validJobs.map(({ start_time, end_time, filename }) => ({ start_time, end_time, filename })),
      });
      const errs = res.data?.errors || [];
      setSubmitNotice({
        type: errs.length > 0 ? 'warning' : 'success',
        message: errs.length > 0 ? `${res.message} | หมายเหตุ: ${errs.join(', ')}` : (res.message || 'ส่งคำสั่งสำเร็จ'),
      });
      refreshFiles(false);
    } catch (err) {
      setSubmitNotice({ type: 'error', message: err?.message || 'ไม่สามารถส่งคำสั่งดาวน์โหลดได้' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await cctvApi.deleteFile(deleteTarget);
      setDeleteTarget('');
      refreshFiles(false);
    } catch (err) {
      setSubmitNotice({ type: 'error', message: err?.message || 'ลบไฟล์ไม่สำเร็จ' });
      setDeleteTarget('');
    } finally {
      setDeleting(false);
    }
  };

  const filteredCompleted = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const items = completed.filter((item) => {
      if (q && !item.filename.toLowerCase().includes(q)) return false;
      if (dateFilter && (!item.start_time || !item.start_time.startsWith(dateFilter))) return false;
      return true;
    });
    items.sort((a, b) => {
      if (sortBy === 'date_dl_asc') return a.modified_ts - b.modified_ts;
      if (sortBy === 'date_dl_desc') return b.modified_ts - a.modified_ts;
      if (sortBy === 'date_start_asc') return a.start_ts - b.start_ts;
      if (sortBy === 'date_start_desc') return b.start_ts - a.start_ts;
      if (sortBy === 'name_asc') return a.filename.localeCompare(b.filename);
      if (sortBy === 'name_desc') return b.filename.localeCompare(a.filename);
      return 0;
    });
    return items;
  }, [completed, searchText, dateFilter, sortBy]);

  const missingHardwareDeps = !capabilities.cam_credentials_configured || !capabilities.ffmpeg_available;

  return (
    <div className="w-full space-y-4">
      {!isOnline && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800 font-medium">
          <WifiOff size={18} />
          <span>เครือข่ายออฟไลน์ — ปิดการส่งคำสั่งดาวน์โหลดวิดีโอชั่วคราว</span>
        </div>
      )}

      {missingHardwareDeps && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3.5 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
          <div>
            <div className="font-bold">แจ้งเตือนสภาพแวดล้อมเซิร์ฟเวอร์สำหรับงานดึงไฟล์จากกล้อง NVR/CCTV</div>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              {!capabilities.cam_credentials_configured && (
                <li>ยังไม่ได้กำหนด `CCTV_CAM_USER` และ `CCTV_CAM_PASS` ในไฟล์ `.env` บนเซิร์ฟเวอร์ (จำเป็นสำหรับ ISAPI Snapshot &amp; Smart Download)</li>
              )}
              {!capabilities.ffmpeg_available && (
                <li>ไม่พบโปรแกรม `ffmpeg` บนเซิร์ฟเวอร์นี้ (ระบบยังสามารถดู/จัดการไฟล์ MP4 ที่มีอยู่และดึงข้อมูล Loading Report ได้ตามปกติ)</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Video size={24} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              CCTV Video Downloader (ระบบดึงหลักฐานวิดีโอ Loading &amp; กล้องวงจรปิด)
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              เชื่อมต่อกล้อง NVR/Hikvision เพื่อสกัดไฟล์วิดีโอ MP4 ตามช่วงเวลา หรือผูกกับใบ Loading Report อัตโนมัติ
            </p>
          </div>
        </div>
      </div>

      {/* Camera Target & Batch Form */}
      <form
        onSubmit={handleSubmitBatch}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 space-y-4 shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6">
            <label className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
              <span>IP Address ของกล้อง NVR / CCTV</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  camStatus.state === 'online'
                    ? 'bg-emerald-100 text-emerald-700'
                    : camStatus.state === 'offline'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {camStatus.text}
              </span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Network size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={cameraIp}
                  onChange={(e) => setCameraIp(e.target.value)}
                  onBlur={handleCheckCamera}
                  placeholder="เช่น 10.1.48.131"
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
                />
              </div>
              <button
                type="button"
                disabled={!isOnline}
                onClick={handleCheckCamera}
                className="min-h-[44px] px-3 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
              >
                เช็คสถานะ
              </button>
              <button
                type="button"
                disabled={previewBusy || !isOnline}
                onClick={handlePreviewSnapshot}
                className="min-h-[44px] px-3 rounded-xl border border-blue-300 text-blue-600 hover:bg-blue-50 text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Eye size={15} />
                <span className="hidden sm:inline">{previewBusy ? 'กำลังดึง...' : 'ทดสอบภาพ'}</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Channel</label>
            <input
              type="number"
              min={1}
              max={64}
              value={channel}
              onChange={(e) => setChannel(Number(e.target.value) || 1)}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            />
          </div>

          <div className="md:col-span-4 flex flex-wrap gap-2 justify-end">
            <button
              type="button"
              disabled={!isOnline}
              onClick={() => setLinkModalOpen(true)}
              className="min-h-[44px] px-3.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs sm:text-sm font-bold flex items-center gap-1.5"
            >
              <Link2 size={16} /> <span>Link Loading Report</span>
            </button>
            <button
              type="button"
              onClick={() => setJobs((prev) => [...prev, EMPTY_JOB_ROW()])}
              className="min-h-[44px] px-3.5 rounded-xl border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Plus size={16} /> <span>เพิ่มแถว</span>
            </button>
          </div>
        </div>

        {(snapshotUrl || snapshotMsg) && (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 p-3 text-center relative">
            <button
              type="button"
              onClick={() => { setSnapshotUrl(''); setSnapshotMsg(''); }}
              className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
              aria-label="ปิดภาพตัวอย่าง"
            >
              <X size={16} />
            </button>
            {snapshotMsg && <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 py-2">{snapshotMsg}</div>}
            {snapshotUrl && <img src={snapshotUrl} alt="Camera Snapshot" className="mx-auto max-h-72 rounded-lg shadow" />}
          </div>
        )}

        {/* Batch Job Rows */}
        <div className="space-y-3">
          {jobs.map((job, idx) => {
            const est = calcEstimatedDuration(job.start_time, job.end_time);
            const invalidRange = est.includes('ต้องมากกว่า');
            return (
              <div
                key={job.id}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-xs font-bold">
                    รายการที่ {idx + 1}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setJobs((prev) =>
                          prev.map((row) => (row.id === job.id ? { ...row, start_time: '', end_time: '', filename: '' } : row))
                        )
                      }
                      className="px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-xs flex items-center gap-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Eraser size={12} /> เคลียร์
                    </button>
                    {jobs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setJobs((prev) => prev.filter((row) => row.id !== job.id))}
                        className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 text-xs flex items-center gap-1 hover:bg-red-50"
                      >
                        <X size={12} /> ลบ
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">เวลาเริ่มต้น</label>
                    <input
                      type="datetime-local"
                      value={job.start_time}
                      onChange={(e) =>
                        setJobs((prev) => prev.map((r) => (r.id === job.id ? { ...r, start_time: e.target.value } : r)))
                      }
                      className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">เวลาสิ้นสุด</label>
                    <input
                      type="datetime-local"
                      value={job.end_time}
                      onChange={(e) =>
                        setJobs((prev) => prev.map((r) => (r.id === job.id ? { ...r, end_time: e.target.value } : r)))
                      }
                      className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ชื่อไฟล์ (.mp4)</label>
                    <input
                      type="text"
                      value={job.filename}
                      onChange={(e) =>
                        setJobs((prev) => prev.map((r) => (r.id === job.id ? { ...r, filename: e.target.value } : r)))
                      }
                      placeholder="เช่น evidence_po_01"
                      className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                    />
                  </div>
                </div>

                {est && (
                  <div className={`text-xs font-semibold flex items-center gap-1.5 ${invalidRange ? 'text-red-600' : 'text-blue-600'}`}>
                    <Clock size={13} /> <span>{est}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {submitNotice && (
          <div
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold border ${
              submitNotice.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : submitNotice.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {submitNotice.message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !isOnline || missingHardwareDeps}
          className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Download size={18} />
          <span>{submitting ? 'กำลังส่งคำสั่ง...' : 'สั่งดาวน์โหลดวิดีโอ (Smart Download)'}</span>
        </button>
      </form>

      {/* Storage & Active Queue Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <HardDrive size={18} className="text-blue-600" />
            <span>ไฟล์วิดีโอในระบบ (Server Storage: {completed.length})</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="ค้นหาชื่อไฟล์..."
                className="min-h-[44px] pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
              />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            >
              <option value="date_dl_desc">วันที่ดาวน์โหลด (ใหม่ล่าสุด)</option>
              <option value="date_dl_asc">วันที่ดาวน์โหลด (เก่าสุด)</option>
              <option value="date_start_desc">เวลาเริ่มวิดีโอ (ใหม่ล่าสุด)</option>
              <option value="date_start_asc">เวลาเริ่มวิดีโอ (เก่าสุด)</option>
              <option value="name_asc">ชื่อไฟล์ (A-Z)</option>
              <option value="name_desc">ชื่อไฟล์ (Z-A)</option>
            </select>
            <button
              type="button"
              onClick={() => refreshFiles(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="รีเฟรชรายการไฟล์"
            >
              <RefreshCw size={16} className={loadingFiles ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {downloading.map((job) => (
            <div key={job.filename} className="p-4 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 flex-1 min-w-0">
                <div className={`font-bold text-sm truncate ${job.status === 'error' ? 'text-red-600' : 'text-blue-700 dark:text-blue-400'}`}>
                  {job.filename}
                </div>
                {job.status === 'error' ? (
                  <div className="text-xs text-red-600">{job.error_message}</div>
                ) : (
                  <>
                    <div className="w-full max-w-sm h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all" style={{ width: `${job.percent}%` }} />
                    </div>
                    <div className="text-xs text-blue-600 font-medium">
                      กำลังดาวน์โหลด {job.percent}% ({job.eta_text})
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(job.filename)}
                className="min-h-[40px] px-3 rounded-xl border border-red-300 text-red-600 text-xs font-bold shrink-0"
              >
                {job.status === 'error' ? 'ลบรายการ' : 'ยกเลิกงาน'}
              </button>
            </div>
          ))}

          {queued.map((job) => (
            <div key={job.filename} className="p-4 bg-amber-50/40 dark:bg-amber-950/10 flex items-center justify-between gap-3">
              <div>
                <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{job.filename}</div>
                <div className="text-xs text-amber-700">รอคิว: ระบบจะดาวน์โหลดอัตโนมัติเมื่อคิวก่อนหน้าเสร็จสิ้น</div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(job.filename)}
                className="min-h-[40px] px-3 rounded-xl border border-red-300 text-red-600 text-xs font-bold shrink-0"
              >
                ยกเลิกคิว
              </button>
            </div>
          ))}

          {!loadingFiles && downloading.length === 0 && queued.length === 0 && filteredCompleted.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-400 space-y-2">
              <Film size={36} className="mx-auto opacity-40" />
              <div>ยังไม่มีไฟล์วิดีโอที่ดาวน์โหลดไว้ในระบบ</div>
            </div>
          ) : (
            filteredCompleted.map((item) => (
              <div key={item.filename} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <div className="min-w-0 space-y-0.5">
                  <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span className="truncate">{item.filename}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                    {item.start_time && <span>ช่วงเวลา: {item.start_time}</span>}
                    <span>ขนาด: {formatBytes(item.size_bytes)}</span>
                    <span>บันทึกเมื่อ: {item.modified_at}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPlayFile(item.filename)}
                    className="min-h-[40px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <PlayCircle size={15} /> <span>เปิดดู</span>
                  </button>
                  <a
                    href={cctvApi.getStreamUrl(item.filename, true)}
                    download={item.filename}
                    className="min-h-[40px] px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Download size={15} /> <span>ดาวน์โหลด</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item.filename)}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-red-200 text-red-600 hover:bg-red-50"
                    title="ลบไฟล์"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <LinkLoadingModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onImportRows={(imported) => {
          setJobs((prev) => {
            const nonEmpty = prev.filter((r) => r.start_time || r.end_time || r.filename);
            const next = imported.map((imp, idx) => ({
              id: `imp_${Date.now()}_${idx}`,
              ...imp,
            }));
            return [...nonEmpty, ...next];
          });
        }}
      />

      <VideoPreviewModal filename={playFile} onClose={() => setPlayFile('')} />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">ยืนยันการลบไฟล์ / ยกเลิกงาน</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              ต้องการลบไฟล์หรือยกเลิกงาน <strong>{deleteTarget}</strong> ออกจากเซิร์ฟเวอร์ใช่หรือไม่? การกระทำนี้ไม่สามารถกู้คืนได้
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget('')}
                className="min-h-[44px] px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {deleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
