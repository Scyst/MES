import { useState, useEffect } from 'react';
import { BusFront, Users, QrCode, AlertCircle, Building2, MapPin, Clock, X, CheckCircle, UserPlus, Info, Download, Calendar as CalendarIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard = () => {
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Toolbar State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Modal state
  const [selectedTripDetails, setSelectedTripDetails] = useState(null);
  const [modalTab, setModalTab] = useState('boarded'); // boarded, extra, unscanned

  useEffect(() => {
    // Check dark mode for charts
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const savedTrips = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
    const savedBookings = JSON.parse(localStorage.getItem('bookings')) || [];
    setTrips(savedTrips);
    setBookings(savedBookings);
  }, []);

  const todayTrips = trips.filter(t => t.date === selectedDate);

  // Stats calculation
  const totalBookingsToday = bookings.filter(b => b.status !== 'CANCELLED' && b.bookedAt.startsWith(selectedDate)).length;
  const totalScansToday = bookings.filter(b => b.status === 'BOARDED' && b.bookedAt.startsWith(selectedDate)).length;
  
  // Unscanned List (Global for driver checklist)
  const unscannedBookings = bookings.filter(b => b.status === 'BOOKED' && b.bookedAt.startsWith(selectedDate));
  
  // Fair Billing Calculation (Per Trip)
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
      // If trip is past departure time, and nobody boarded, charge central fund
      const isPast = new Date(trip.departureTime) < new Date();
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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  const openTripModal = (trip) => {
    const tripBookings = bookings.filter(b => b.scheduledTripId === trip.id);
    setSelectedTripDetails({
      trip,
      boarded: tripBookings.filter(b => b.status === 'BOARDED' && !b.isExtra),
      extra: tripBookings.filter(b => b.status === 'BOARDED' && b.isExtra),
      unscanned: tripBookings.filter(b => b.status === 'BOOKED')
    });
    setModalTab('boarded');
  };

  return (
    <div className="text-gray-900 dark:text-gray-100 w-full space-y-6 font-sans">
      
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
            onClick={() => alert('จำลองการดาวน์โหลดรายงาน PDF/Excel')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
          >
            <Download size={16} /> ดาวน์โหลดรายงาน
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Col: Operations */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                <Users size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">ยอดจองรถ</p>
                <div className="text-3xl font-black">{totalBookingsToday} <span className="text-base font-bold text-gray-400">คน</span></div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center">
                <QrCode size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">สแกนขึ้นรถแล้ว</p>
                <div className="text-3xl font-black">{totalScansToday} <span className="text-base font-bold text-gray-400">คน</span></div>
              </div>
            </div>
          </div>

          {/* Demand vs Capacity (Real-time) */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Clock size={18} className="text-blue-500" />
                รอบรถ (Demand vs Capacity)
              </h3>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {todayTrips.length === 0 ? (
                   <p className="text-gray-500 text-sm">ไม่มีรอบรถในวันที่เลือก</p>
                ) : (
                  todayTrips.map(trip => {
                    const percent = Math.round((trip.bookedCount / trip.capacity) * 100);
                    let color = 'bg-blue-500';
                    if (percent >= 100) color = 'bg-red-500';
                    else if (percent >= 80) color = 'bg-amber-500';

                    return (
                      <div 
                        key={trip.id} 
                        onClick={() => openTripModal(trip)}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/50 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer transition-all shadow-sm hover:shadow-md group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{trip.route}</h4>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <MapPin size={12}/> {trip.vehicleName}
                            </p>
                          </div>
                          <span className="text-sm font-bold bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                            {new Date(trip.departureTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex justify-between text-xs font-bold mb-1.5">
                            <span className="text-gray-600 dark:text-gray-400">จอง {trip.bookedCount} คน</span>
                            <span className="text-gray-600 dark:text-gray-400">ว่าง {trip.capacity - trip.bookedCount} ที่</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="mt-3 text-xs text-center text-gray-400 font-medium group-hover:text-blue-500">
                          คลิกเพื่อดูรายชื่อผู้โดยสาร
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* BU Billing Summary */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Building2 size={18} className="text-emerald-500" />
                สรุปค่าใช้จ่ายตาม BU (Fair Billing)
              </h3>
            </div>
            <div className="p-5">
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 text-xs p-3 rounded-xl mb-6 flex items-start gap-2 font-medium">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>คำนวณจาก <b>ค่าเหมารอบรถ ÷ จำนวนผู้โดยสารจริง</b> (สแกน 1 คนจ่ายเต็ม, สแกนเยอะหารเฉลี่ยถูกลง)</p>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-full md:w-1/2 h-[250px]">
                  {billingData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={billingData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="amount"
                        >
                          {billingData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${value.toLocaleString()} ฿`} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">ยังไม่มีข้อมูลค่าใช้จ่าย</div>
                  )}
                </div>
                <div className="w-full md:w-1/2 space-y-3">
                  {billingData.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-gray-900 dark:text-white">{item.amount.toLocaleString()} ฿</div>
                        <div className="text-[10px] text-gray-500 font-bold">{item.count > 0 ? `${item.count} สแกน` : 'เหมาจ่ายรถเปล่า'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Col: Driver Checklist */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10">
              <h3 className="font-bold text-lg text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertCircle size={18} />
                ผู้โดยสารที่ยังไม่สแกน
              </h3>
              <p className="text-xs text-red-500 mt-1 font-medium">รวมทุกสาย สำหรับให้ HR/คนขับขานชื่อตามตัว</p>
            </div>
            <div className="p-0 flex-1 overflow-auto max-h-[600px] custom-scrollbar">
              {unscannedBookings.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500 opacity-50" />
                  สแกนขึ้นรถครบทุกคนแล้ว หรือไม่มีรอบรถ
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {unscannedBookings.map((booking) => {
                    const trip = trips.find(t => t.id === booking.scheduledTripId);
                    return (
                      <li key={booking.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white block">{booking.name} <span className="text-gray-400 font-normal">({booking.empId})</span></span>
                            <span className="text-xs text-gray-500 font-medium">{booking.bu}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">{trip?.route}</span>
                            <span className="text-[10px] text-red-500 font-black bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded mt-1 inline-block">
                              {trip ? new Date(trip.departureTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'}) : ''}
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
            ></motion.div>

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl relative z-10 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">{selectedTripDetails.trip.route}</h3>
                  <p className="text-sm text-gray-500 font-medium flex items-center gap-2 mt-1">
                    <Clock size={14} /> {new Date(selectedTripDetails.trip.departureTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <MapPin size={14} /> {selectedTripDetails.trip.vehicleName}
                  </p>
                </div>
                <button onClick={() => setSelectedTripDetails(null)} className="p-2 bg-white dark:bg-gray-800 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 transition-colors shadow-sm">
                  <X size={20} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 pt-2">
                <button 
                  onClick={() => setModalTab('boarded')}
                  className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${modalTab === 'boarded' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  <CheckCircle size={16} /> สแกนปกติ ({selectedTripDetails.boarded.length})
                </button>
                <button 
                  onClick={() => setModalTab('extra')}
                  className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${modalTab === 'extra' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  <UserPlus size={16} /> สแกนเกิน/ไม่จอง ({selectedTripDetails.extra.length})
                </button>
                <button 
                  onClick={() => setModalTab('unscanned')}
                  className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${modalTab === 'unscanned' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                  <AlertCircle size={16} /> ยังไม่สแกน ({selectedTripDetails.unscanned.length})
                </button>
              </div>

              {/* List */}
              <div className="p-0 overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/30">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedTripDetails[modalTab].length === 0 ? (
                    <li className="p-10 text-center text-gray-400 font-medium">ไม่มีข้อมูลในหมวดหมู่นี้</li>
                  ) : (
                    selectedTripDetails[modalTab].map(b => (
                      <li key={b.id} className="p-4 bg-white dark:bg-gray-800 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white block">{b.name} <span className="text-gray-400 font-normal">({b.empId})</span></span>
                          <span className="text-xs text-gray-500 font-medium">{b.bu}</span>
                        </div>
                        <div className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
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

    </div>
  );
};

export default AdminDashboard;
