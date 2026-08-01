import { useState, useEffect, useCallback, useRef } from 'react';
import { BusFront, Users, QrCode, AlertCircle, Building2, MapPin, Clock, X, CheckCircle, UserPlus, Info, Download, Calendar as CalendarIcon, LayoutDashboard, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { schedulesAPI, bookingsAPI } from '../../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
const AUTO_REFRESH_INTERVAL = 30_000;

const AdminDashboard = () => {
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTripDetails, setSelectedTripDetails] = useState(null);
  const [modalTab, setModalTab] = useState('boarded');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const loadData = useCallback(async (animate = false) => {
    if (animate) setIsRefreshing(true);
    try {
      const [allSchedules, allBookings] = await Promise.all([
        schedulesAPI.getSchedules(),
        bookingsAPI.getBookings({}),
      ]);
      setTrips(allSchedules || []);
      setBookings(allBookings || []);
      setLastUpdated(new Date());
    } catch (err) {
      // Keep stale data on error
    } finally {
      if (animate) setTimeout(() => setIsRefreshing(false), 600);
    }
  }, []);

  useEffect(() => { loadData(false); }, [loadData]);

  useEffect(() => {
    const timer = setInterval(() => loadData(false), AUTO_REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    const handleFocus = () => loadData(false);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadData]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  // ─── Stats derived from selected date ───────────────────────────────────────
  const todayTrips = trips.filter(t => {
    const tripDate = t.date || (t.departureTime ? t.departureTime.split(' ')[0] : '');
    return tripDate === selectedDate;
  });

  const todayTripIds = new Set(todayTrips.map(t => t.id));
  const todayBookings = bookings.filter(b => todayTripIds.has(b.scheduledTripId) && b.status !== 'CANCELLED');
  const totalBookingsToday = todayBookings.length;
  const totalScansToday = todayBookings.filter(b => b.status === 'BOARDED').length;
  const unscannedBookings = todayBookings.filter(b => b.status === 'BOOKED');

  // ─── Fair Billing Calculation ────────────────────────────────────────────────
  const buBillingRaw = {};

  todayTrips.forEach(trip => {
    const baseCost = trip.baseCost || 1500;
    const tripBookings = bookings.filter(b => b.scheduledTripId === trip.id);
    const boardedBookings = tripBookings.filter(b => b.status === 'BOARDED');
    const boardedCount = boardedBookings.length;

    if (boardedCount > 0) {
      const costPerHead = baseCost / boardedCount;
      boardedBookings.forEach(b => {
        if (!buBillingRaw[b.bu]) buBillingRaw[b.bu] = { amount: 0, count: 0 };
        buBillingRaw[b.bu].amount += costPerHead;
        buBillingRaw[b.bu].count += 1;
      });
    } else {
      const departureTime = trip.departureTime || '';
      const isPast = departureTime && new Date(departureTime) < new Date();
      if (isPast || selectedDate < new Date().toISOString().split('T')[0]) {
        const centralKey = 'ส่วนกลาง (รถเปล่า)';
        if (!buBillingRaw[centralKey]) buBillingRaw[centralKey] = { amount: 0, count: 0 };
        buBillingRaw[centralKey].amount += baseCost;
      }
    }
  });

  const billingData = Object.keys(buBillingRaw).map(bu => ({
    name: bu,
    amount: Math.round(buBillingRaw[bu].amount),
    count: buBillingRaw[bu].count
  })).sort((a, b) => b.amount - a.amount);

  // ─── Export CSV ───────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (billingData.length === 0) {
      showToast('ไม่มีข้อมูลที่จะ export', 'warning');
      return;
    }
    const header = 'แผนก/ฝ่าย,จำนวนคน (สแกน),ค่าใช้จ่าย (บาท)';
    const rows = billingData.map(d => `${d.name},${d.count},${d.amount}`);
    const total = billingData.reduce((s, d) => s + d.amount, 0);
    const csvContent = [
      `วันที่: ${selectedDate}`,
      header,
      ...rows,
      `รวม,${totalScansToday},${total}`,
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `billing_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Export สำเร็จ: billing_${selectedDate}.csv`);
  };

  // ─── Trip Modal ───────────────────────────────────────────────────────────────
  const openTripModal = (trip) => {
    const tripBookings = bookings.filter(b => b.scheduledTripId === trip.id);
    setSelectedTripDetails({
      trip,
      boarded: tripBookings.filter(b => b.status === 'BOARDED' && !b.isExtra),
      extra: tripBookings.filter(b => b.status === 'BOARDED' && b.isExtra),
      unscanned: tripBookings.filter(b => b.status === 'BOOKED'),
    });
    setModalTab('boarded');
  };

  return (
    <div className="text-gray-900 dark:text-gray-100 w-full space-y-6 font-sans">

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">ภาพรวมระบบ (Dashboard)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">สรุปข้อมูลการเดินทางและการใช้งานระบบทั้งหมดประจำวัน</p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1">
          {lastUpdated && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              อัปเดตล่าสุด {lastUpdated.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => loadData(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <CalendarIcon size={20} />
          </div>
          <div className="flex-1 sm:w-48">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 outline-none text-gray-900 dark:text-white font-bold cursor-pointer"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-3">
                <BusFront size={22} />
              </div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">รอบรถ</p>
              <div className="text-3xl font-black mt-1">{todayTrips.length} <span className="text-sm font-bold text-gray-400">รอบ</span></div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-3">
                <Users size={22} />
              </div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ยอดจอง</p>
              <div className="text-3xl font-black mt-1">{totalBookingsToday} <span className="text-sm font-bold text-gray-400">คน</span></div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-3">
                <QrCode size={22} />
              </div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ขึ้นรถแล้ว</p>
              <div className="text-3xl font-black mt-1">{totalScansToday} <span className="text-sm font-bold text-gray-400">คน</span></div>
            </div>

            <div className={`p-5 rounded-2xl border shadow-sm ${unscannedBookings.length > 0 ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${unscannedBookings.length > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                <AlertCircle size={22} />
              </div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ยังไม่สแกน</p>
              <div className={`text-3xl font-black mt-1 ${unscannedBookings.length > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                {unscannedBookings.length} <span className="text-sm font-bold text-gray-400">คน</span>
              </div>
            </div>
          </div>

          {/* Demand vs Capacity */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Clock size={18} className="text-blue-500" />
                รอบรถ (Demand vs Capacity)
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{todayTrips.length} รอบ</span>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todayTrips.length === 0 ? (
                  <div className="col-span-2 py-12 text-center">
                    <BusFront size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">ไม่มีรอบรถในวันที่เลือก</p>
                  </div>
                ) : (
                  todayTrips.map(trip => {
                    const tripBoardedCount = bookings.filter(b => b.scheduledTripId === trip.id && b.status === 'BOARDED').length;
                    const bookedCount = trip.bookedCount || 0;
                    const capacity = trip.capacity || 1;
                    const percent = Math.round((bookedCount / capacity) * 100);
                    const boardedPercent = Math.round((tripBoardedCount / capacity) * 100);
                    let barColor = 'bg-blue-500';
                    if (percent >= 100) barColor = 'bg-red-500';
                    else if (percent >= 80) barColor = 'bg-amber-500';

                    return (
                      <div
                        key={trip.id}
                        onClick={() => openTripModal(trip)}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/50 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all shadow-sm hover:shadow-md group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{trip.route}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={11} /> {trip.vehicleName}
                            </p>
                          </div>
                          <span className="text-sm font-bold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg text-gray-700 dark:text-gray-300">
                            {trip.departureTime ? trip.departureTime.split(' ')[1].substring(0, 5) : ''}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-gray-500 dark:text-gray-400">จอง {bookedCount} / {capacity}</span>
                            <span className="text-emerald-600 dark:text-emerald-400">สแกน {tripBoardedCount}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative">
                            <div className={`${barColor} h-2 rounded-full transition-all`} style={{ width: `${Math.min(percent, 100)}%` }} />
                            {tripBoardedCount > 0 && (
                              <div className="bg-emerald-500 h-2 rounded-full absolute top-0 left-0 transition-all opacity-60" style={{ width: `${Math.min(boardedPercent, 100)}%` }} />
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-center text-gray-400 mt-2.5 font-medium group-hover:text-blue-500 transition-colors">
                          คลิกเพื่อดูรายชื่อผู้โดยสาร →
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* BU Billing */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Building2 size={18} className="text-emerald-500" />
                สรุปค่าใช้จ่ายตาม BU (Fair Billing)
              </h3>
            </div>
            <div className="p-5">
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 text-xs p-3 rounded-xl mb-5 flex items-start gap-2 font-medium">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>คำนวณจาก <b>ค่าเหมารอบรถ ÷ จำนวนผู้โดยสารจริง</b> (สแกน 1 คนจ่ายเต็ม, สแกนเยอะหารเฉลี่ยถูกลง)</p>
              </div>
              {billingData.length === 0 ? (
                <div className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <Building2 size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">ยังไม่มีข้อมูลค่าใช้จ่ายในวันนี้</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-full md:w-2/5 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={billingData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="amount">
                          {billingData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${value.toLocaleString()} ฿`, 'ค่าใช้จ่าย']}
                          contentStyle={{
                            backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                            border: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}`,
                            borderRadius: '12px',
                            fontSize: '13px',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full md:w-3/5 space-y-2.5">
                    {billingData.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-gray-900 dark:text-white">{item.amount.toLocaleString()} ฿</div>
                          <div className="text-[10px] text-gray-500 font-bold">{item.count > 0 ? `${item.count} คน` : 'เหมาจ่ายรถเปล่า'}</div>
                        </div>
                      </div>
                    ))}
                    {billingData.length > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700 mt-3">
                        <span className="text-sm font-black text-gray-700 dark:text-gray-300">รวมทั้งหมด</span>
                        <span className="font-black text-blue-600 dark:text-blue-400">
                          {billingData.reduce((s, d) => s + d.amount, 0).toLocaleString()} ฿
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Unscanned Checklist */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col sticky top-4">
            <div className={`p-5 border-b border-gray-200 dark:border-gray-700 ${unscannedBookings.length > 0 ? 'bg-red-50 dark:bg-red-900/10' : 'bg-emerald-50 dark:bg-emerald-900/10'}`}>
              <h3 className={`font-bold text-lg flex items-center gap-2 ${unscannedBookings.length > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {unscannedBookings.length > 0 ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                ผู้โดยสารที่ยังไม่สแกน
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                {unscannedBookings.length > 0
                  ? `${unscannedBookings.length} คน รวมทุกสาย`
                  : 'ทุกคนขึ้นรถครบแล้ว'}
              </p>
            </div>
            <div className="flex-1 overflow-auto max-h-[520px]">
              {unscannedBookings.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  <CheckCircle size={36} className="mx-auto mb-3 text-emerald-500 opacity-50" />
                  <p className="font-medium">สแกนขึ้นรถครบทุกคนแล้ว</p>
                  <p className="text-xs text-gray-400 mt-1">หรือยังไม่มีรอบรถในวันนี้</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {unscannedBookings.map(booking => {
                    const trip = trips.find(t => t.id === booking.scheduledTripId);
                    return (
                      <li key={booking.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <span className="font-bold text-gray-900 dark:text-white block truncate">
                              {booking.name}
                              <span className="text-gray-400 font-normal text-xs ml-1">({booking.empId})</span>
                            </span>
                            <span className="text-xs text-gray-500 font-medium">{booking.bu}</span>
                          </div>
                          <div className="text-right ml-2 flex-shrink-0">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">{trip?.route}</span>
                            <span className="text-[10px] text-red-500 font-black bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded mt-1 inline-block">
                              {trip?.departureTime ? trip.departureTime.split(' ')[1].substring(0, 5) : ''}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trip Details Modal */}
      <AnimatePresence>
        {selectedTripDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              onClick={() => setSelectedTripDetails(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl relative z-10 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">{selectedTripDetails.trip.route}</h3>
                  <p className="text-sm text-gray-500 font-medium flex items-center gap-2 mt-1">
                    <Clock size={14} />
                    {selectedTripDetails.trip.departureTime ? selectedTripDetails.trip.departureTime.split(' ')[1].substring(0, 5) : ''}
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <MapPin size={14} /> {selectedTripDetails.trip.vehicleName}
                    {selectedTripDetails.trip.driverName && <><span className="text-gray-300 dark:text-gray-600">|</span><span>คนขับ: {selectedTripDetails.trip.driverName}</span></>}
                  </p>
                </div>
                <button onClick={() => setSelectedTripDetails(null)} className="p-2 bg-white dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 transition-colors shadow-sm">
                  <X size={20} />
                </button>
              </div>

              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 pt-2">
                {[
                  { key: 'boarded', label: 'สแกนปกติ', icon: <CheckCircle size={15} />, count: selectedTripDetails.boarded.length, color: 'emerald' },
                  { key: 'extra', label: 'ผู้โดยสารเพิ่ม', icon: <UserPlus size={15} />, count: selectedTripDetails.extra.length, color: 'amber' },
                  { key: 'unscanned', label: 'ยังไม่สแกน', icon: <AlertCircle size={15} />, count: selectedTripDetails.unscanned.length, color: 'red' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setModalTab(tab.key)}
                    className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
                      modalTab === tab.key
                        ? `border-${tab.color}-500 text-${tab.color}-600 dark:text-${tab.color}-400`
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.icon} {tab.label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${
                      modalTab === tab.key ? `bg-${tab.color}-100 dark:bg-${tab.color}-900/30 text-${tab.color}-700 dark:text-${tab.color}-400` : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}>{tab.count}</span>
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/30">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedTripDetails[modalTab].length === 0 ? (
                    <li className="p-10 text-center text-gray-400 font-medium">ไม่มีข้อมูลในหมวดหมู่นี้</li>
                  ) : (
                    selectedTripDetails[modalTab].map(b => (
                      <li key={b.id} className="p-4 bg-white dark:bg-gray-800 flex justify-between items-center gap-3">
                        <div className="min-w-0">
                          <span className="font-bold text-gray-900 dark:text-white block truncate">
                            {b.name} <span className="text-gray-400 font-normal text-xs">({b.empId})</span>
                          </span>
                          <span className="text-xs text-gray-500 font-medium">{b.bu}</span>
                        </div>
                        <div className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded flex-shrink-0">
                          {new Date(b.bookedAt).toLocaleTimeString('th-TH')}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-2 ${
              toast.type === 'warning'
                ? 'bg-amber-500 text-white'
                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
            }`}
          >
            {toast.type === 'warning' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
