import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Truck, Battery, BatteryCharging, Clock, RefreshCw, History, Settings,
  Search, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ShieldCheck,
  Map, QrCode, LayoutGrid
} from 'lucide-react';
import { forkliftApi } from '../../../shared/services/forkliftApi';
import { useAuth } from '../../../shared/contexts/AuthContext';
import ForkliftCard from '../components/ForkliftCard';
import ForkliftTimeline from '../components/ForkliftTimeline';
import BookingModal from '../components/BookingModal';
import ReturnModal from '../components/ReturnModal';
import ForkliftHistoryModal from '../components/ForkliftHistoryModal';
import ManageFleetModal from '../components/ManageFleetModal';
import ForkliftLiveMapTab from '../components/ForkliftLiveMapTab';
import ForkliftScanTab from '../components/ForkliftScanTab';
import ForkliftQrModal from '../components/ForkliftQrModal';
import ReportIssueModal from '../components/ReportIssueModal';

const VALID_TABS = ['overview', 'map', 'scan'];

export default function ForkliftPage({ initialTabOverride = null }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUserId = user?.id || 0;
  const role = String(user?.role || '').toLowerCase();
  const isAdmin = ['admin', 'creator', 'supervisor', 'manager'].includes(role);

  const urlTab = searchParams.get('tab');
  const urlCode = searchParams.get('code') || '';
  const initialTab = VALID_TABS.includes(initialTabOverride)
    ? initialTabOverride
    : VALID_TABS.includes(urlTab)
    ? urlTab
    : 'overview';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [forklifts, setForklifts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    in_use: 0,
    charging: 0,
    maintenance: 0,
    avg_battery: 0
  });
  const [timelineData, setTimelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showTimeline, setShowTimeline] = useState(true);

  // Modals
  const [selectedForklift, setSelectedForklift] = useState(null);
  const [bookingMode, setBookingMode] = useState('INSTANT');
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (initialTabOverride && VALID_TABS.includes(initialTabOverride)) {
      setActiveTab(initialTabOverride);
    } else if (urlTab && VALID_TABS.includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [initialTabOverride, urlTab]);

  const switchTab = (nextTab) => {
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'overview') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  }, []);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [dashRes, timeRes] = await Promise.all([
        forkliftApi.getDashboard(),
        forkliftApi.getTimeline()
      ]);

      if (dashRes?.success) {
        setForklifts(dashRes.data?.forklifts || []);
        setStats(dashRes.data?.stats || {});
        setLastUpdated(new Date());
      } else {
        setError(dashRes?.message || 'ไม่สามารถโหลดข้อมูลรถโฟล์คลิฟท์ได้');
      }

      if (timeRes?.success) {
        setTimelineData(timeRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load forklift data:', err);
      setError(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 15s Auto Refresh
  useEffect(() => {
    if (!autoRefresh) return undefined;
    const interval = setInterval(() => {
      loadData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Modal Handlers
  const handleInstantUse = (fl) => {
    setSelectedForklift(fl);
    setBookingMode('INSTANT');
    setIsBookingOpen(true);
  };

  const handleReserve = (fl) => {
    setSelectedForklift(fl);
    setBookingMode('RESERVE');
    setIsBookingOpen(true);
  };

  const handleReturn = (fl) => {
    setSelectedForklift(fl);
    setIsReturnOpen(true);
  };

  const handleOpenQr = (fl) => {
    setSelectedForklift(fl);
    setIsQrOpen(true);
  };

  const handleReportIssue = (fl) => {
    setSelectedForklift(fl);
    setIsIssueOpen(true);
  };

  const filteredForklifts = forklifts.filter((fl) => {
    const statusMatch = statusFilter === 'ALL' || (fl.status || 'AVAILABLE').toUpperCase() === statusFilter;
    const q = search.toLowerCase();
    const searchMatch =
      (fl.code || '').toLowerCase().includes(q) ||
      (fl.name || '').toLowerCase().includes(q) ||
      (fl.current_driver || '').toLowerCase().includes(q) ||
      (fl.last_location || '').toLowerCase().includes(q);

    return statusMatch && searchMatch;
  });

  return (
    <div className="w-full space-y-5 animate-fade-in pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium border border-slate-700 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                  Forklift Command &amp; Live Tracking
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Fleet + IoT Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบบเบิกใช้ จองล่วงหน้า ติดตามพิกัด GPS/Wi-Fi Heatmap และสแกน QR ขับรถโรงงาน B9 &amp; B10
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'เปิด Auto Refresh (15 วิ)' : 'ปิด Auto Refresh'}
              className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">{autoRefresh ? 'Auto 15s' : 'Manual'}</span>
            </button>

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>ประวัติการใช้</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsManageOpen(true)}
                className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>จัดการรถ</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => switchTab('overview')}
            className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>ภาพรวม &amp; จองรถ ({stats.total || forklifts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab('map')}
            className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'map'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Map className="w-4 h-4" />
            <span>แผนที่ติดตามสด &amp; Heatmap</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab('scan')}
            className={`min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'scan'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>สแกน QR ขับรถ</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-700 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadData()}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium"
          >
            ลองใหม่
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'map' && (
        <ForkliftLiveMapTab
          isAdmin={isAdmin}
          onOpenQr={handleOpenQr}
          onSelectForBooking={handleInstantUse}
          onToast={showToast}
        />
      )}

      {activeTab === 'scan' && (
        <ForkliftScanTab
          initialCode={urlCode}
          forklifts={forklifts}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onInstantUse={handleInstantUse}
          onReserve={handleReserve}
          onReturn={handleReturn}
          onReportIssue={handleReportIssue}
          onOpenQr={handleOpenQr}
        />
      )}

      {activeTab === 'overview' && (
        <>
          {/* KPI Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 text-xs font-medium mb-1">
                <span>รถทั้งหมดในระบบ</span>
                <Truck className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {stats.total || 0}
                <span className="text-xs font-normal text-slate-400 font-sans ml-1">คัน</span>
              </div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
              className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                statusFilter === 'AVAILABLE' ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200/80 hover:border-emerald-200'
              }`}
            >
              <div className="flex justify-between items-center text-emerald-600 text-xs font-medium mb-1">
                <span>พร้อมใช้งาน</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {stats.available || 0}
                <span className="text-xs font-normal text-slate-400 font-sans ml-1">คัน</span>
              </div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'IN_USE' ? 'ALL' : 'IN_USE')}
              className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                statusFilter === 'IN_USE' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-slate-200/80 hover:border-amber-200'
              }`}
            >
              <div className="flex justify-between items-center text-amber-600 text-xs font-medium mb-1">
                <span>กำลังใช้งาน</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              </div>
              <div className="text-2xl font-bold font-mono text-amber-700">
                {stats.in_use || 0}
                <span className="text-xs font-normal text-slate-400 font-sans ml-1">คัน</span>
              </div>
            </div>

            <div
              onClick={() => setStatusFilter(statusFilter === 'CHARGING' ? 'ALL' : 'CHARGING')}
              className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                statusFilter === 'CHARGING' ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200/80 hover:border-blue-200'
              }`}
            >
              <div className="flex justify-between items-center text-blue-600 text-xs font-medium mb-1">
                <span>กำลังชาร์จไฟ</span>
                <BatteryCharging className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-blue-700">
                {stats.charging || 0}
                <span className="text-xs font-normal text-slate-400 font-sans ml-1">คัน</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
              <div className="flex justify-between items-center text-slate-500 text-xs font-medium mb-1">
                <span>แบตเตอรี่เฉลี่ย</span>
                <Battery className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-800">
                {stats.avg_battery || 0}
                <span className="text-xs font-normal text-slate-400 font-sans ml-1">%</span>
              </div>
            </div>
          </div>

          {/* 24-Hour Schedule Timeline (Collapsible) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
              >
                <span>ตารางเวลา 24 ชั่วโมง (Timeline Schedule)</span>
                {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            {showTimeline && (
              <ForkliftTimeline timelineData={timelineData} forklifts={forklifts} />
            )}
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'ALL', label: 'ทั้งหมด' },
                { key: 'AVAILABLE', label: 'พร้อมใช้งาน' },
                { key: 'IN_USE', label: 'กำลังใช้งาน' },
                { key: 'CHARGING', label: 'กำลังชาร์จ' },
                { key: 'MAINTENANCE', label: 'ซ่อมบำรุง' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative flex-grow sm:flex-grow-0 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหารหัสรถ, ช่างผู้ขับ, จุดจอด..."
                className="w-full min-h-[38px] pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Forklift Fleet Grid */}
          {loading && forklifts.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filteredForklifts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              <Truck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-medium text-slate-600 text-sm">ไม่พบรถโฟล์คลิฟท์ตามเงื่อนไขที่เลือก</p>
              <p className="text-slate-400 mt-1">ลองเปลี่ยนสถานะตัวกรองหรือล้างคำค้นหา</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredForklifts.map((fl) => (
                <ForkliftCard
                  key={fl.id}
                  forklift={fl}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onInstantUse={handleInstantUse}
                  onReserve={handleReserve}
                  onReturn={handleReturn}
                  onOpenQr={handleOpenQr}
                  onReportIssue={handleReportIssue}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 px-2 gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>อัปเดตล่าสุด: {lastUpdated ? lastUpdated.toLocaleTimeString('th-TH') : '-'}</span>
          {refreshing && <span className="text-blue-500 font-medium">(กำลังซิงค์...)</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>SNC Forklift Command &amp; Safety Management Protocol</span>
        </div>
      </div>

      {/* Shared Modals across all Tabs */}
      <BookingModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        forklift={selectedForklift}
        initialMode={bookingMode}
        onSuccess={() => {
          showToast('ทำรายการสำเร็จเรียบร้อยแล้ว');
          loadData(true);
        }}
      />

      <ReturnModal
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        forklift={selectedForklift}
        onSuccess={() => {
          showToast('บันทึกการคืนรถเรียบร้อยแล้ว');
          loadData(true);
        }}
      />

      <ForkliftHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <ManageFleetModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        forklifts={forklifts}
        onUpdated={() => {
          showToast('อัปเดตข้อมูลรถเรียบร้อยแล้ว');
          loadData(true);
        }}
      />

      <ForkliftQrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        forklift={selectedForklift}
      />

      <ReportIssueModal
        isOpen={isIssueOpen}
        onClose={() => setIsIssueOpen(false)}
        forklift={selectedForklift}
        onReported={(msg) => {
          showToast(msg);
          loadData(true);
        }}
      />
    </div>
  );
}
