import { useState, useEffect } from 'react';
import { schedulesAPI, masterAPI, bookingsAPI } from '../../services/api';
import { Clock, MapPin, BusFront, CheckSquare, Square, ChevronRight, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';

const BookingHome = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('ทั้งหมด');
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  // Date Picker State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Multi-day selection state
  const [multiDayMode, setMultiDayMode] = useState(false);
  const [selectedMultiDays, setSelectedMultiDays] = useState([]);
  const [masterRoutes, setMasterRoutes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    details: [],
    onConfirm: () => {},
    variant: 'info',
    confirmText: 'ยืนยัน',
  });

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const empId = localStorage.getItem('passenger_empId') || '';
      const [schedData, bookingsData, routesData] = await Promise.all([
        schedulesAPI.getSchedules(),
        bookingsAPI.getBookings(empId ? { empId } : {}),
        masterAPI.getRoutes()
      ]);
      setTrips(schedData || []);
      setBookings(bookingsData || []);
      setMasterRoutes(routesData || []);
    } catch (err) {
      setError(err.message || 'โหลดข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Generate next 7 days for Date Picker
  const dateStrip = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('th-TH', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: i === 0
    };
  });

  const handleToggleMultiDay = (dateStr) => {
    if (selectedMultiDays.includes(dateStr)) {
      setSelectedMultiDays(selectedMultiDays.filter(d => d !== dateStr));
    } else {
      setSelectedMultiDays([...selectedMultiDays, dateStr]);
    }
  };

  const doBookSingleTrip = async (trip) => {
    const empId = localStorage.getItem('passenger_empId') || '';
    const name = localStorage.getItem('passenger_name') || '';
    const bu = localStorage.getItem('passenger_bu') || '';
    if (!empId || !name) {
      navigate('/booking/profile');
      return;
    }
    try {
      const payload = { scheduledTripId: trip.id, empId, name, bu, isExtra: false };
      const res = await bookingsAPI.addBooking(payload);
      await loadData();
      navigate(`/booking/ticket/${res.id}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const doBookMultiDay = async (trip) => {
    const empId = localStorage.getItem('passenger_empId') || '';
    const name = localStorage.getItem('passenger_name') || '';
    const bu = localStorage.getItem('passenger_bu') || '';
    if (!empId || !name) {
      navigate('/booking/profile');
      return;
    }
    let lastBookingId = null;

    try {
      for (const dateStr of selectedMultiDays) {
        const targetTrip = trips.find(t => {
          const tripDate = t.date || (t.departureTime ? t.departureTime.split(' ')[0] : '');
          return tripDate === dateStr && t.route === trip.route;
        });
        if (targetTrip && targetTrip.bookedCount < targetTrip.capacity) {
          const payload = { scheduledTripId: targetTrip.id, empId, name, bu, isExtra: false };
          const res = await bookingsAPI.addBooking(payload);
          lastBookingId = res.id;
        }
      }

      await loadData();
      if (lastBookingId) {
        navigate(`/booking/ticket/${lastBookingId}`);
      } else {
        alert('ไม่สามารถจองได้ (รอบรถอาจเต็มแล้ว)');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBook = (trip) => {
    if (multiDayMode && selectedMultiDays.length > 0) {
      const skippedDates = selectedMultiDays.filter(dateStr => {
        const t = trips.find(t => t.date === dateStr && t.route === trip.route);
        return !t || t.bookedCount >= t.capacity;
      });
      const willBook = selectedMultiDays.length - skippedDates.length;
      setConfirmModal({
        isOpen: true,
        title: 'ยืนยันการจองล่วงหน้า',
        message: skippedDates.length > 0
          ? `จะจองได้ ${willBook} วัน (ไม่มีรอบรถหรือเต็มแล้ว ${skippedDates.length} วัน)`
          : `จองรถล่วงหน้า ${selectedMultiDays.length} วัน`,
        details: [
          { label: 'สายรถ', value: trip.route },
          { label: 'จำนวนวัน', value: `${willBook} วัน` },
          { label: 'เวลา', value: new Date(trip.departureTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) },
        ],
        onConfirm: () => doBookMultiDay(trip),
        variant: 'info',
        confirmText: 'จองเลย',
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: 'ยืนยันการจองที่นั่ง',
        message: 'ตรวจสอบข้อมูลรอบรถด้านล่างก่อนยืนยัน',
        details: [
          { label: 'สายรถ', value: trip.route },
          { label: 'วันที่', value: new Date(trip.departureTime).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
          { label: 'เวลา', value: new Date(trip.departureTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) },
          { label: 'ทะเบียนรถ', value: trip.vehicleName || '-' },
        ],
        onConfirm: () => doBookSingleTrip(trip),
        variant: 'info',
        confirmText: 'จองที่นั่ง',
      });
    }
  };

  const routes = ['ทั้งหมด', ...masterRoutes.map(r => r.name)];

  const now = new Date();

  const filteredTrips = trips.filter(trip => {
    // Basic filters
    const matchesDate = trip.date === selectedDate;
    const matchesRoute = selectedRoute === 'ทั้งหมด' || trip.route === selectedRoute;
    
    // Time filter (hide past trips for today)
    const tripTime = new Date(trip.departureTime);
    const isPast = trip.date === now.toISOString().split('T')[0] && tripTime < now;

    return matchesDate && matchesRoute && !isPast;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans transition-colors duration-300 pb-20">
      
      <div className="pt-4 pb-4 px-6 bg-white dark:bg-gray-800 rounded-b-3xl shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">จองรถรับ-ส่ง</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">เลือกวันที่และรอบรถที่ต้องการ</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
            <BusFront size={24} />
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={18} className="text-gray-400" />
            </div>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900 dark:text-white transition-all appearance-none"
            >
              {routes.map(route => (
                <option key={route} value={route}>{route}</option>
              ))}
            </select>
          </div>
          <button 
            onClick={() => setMultiDayMode(!multiDayMode)}
            className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${multiDayMode ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'}`}
          >
            {multiDayMode ? <CheckSquare size={18} /> : <Square size={18} />}
            <span className="hidden sm:inline">จองล่วงหน้า</span>
          </button>
        </div>
      </div>

      <div className="flex-1 w-full mx-auto md:max-w-4xl px-4 pt-6">
        
        {/* Date Strip */}
        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {dateStrip.map((item) => (
            <button
              key={item.dateStr}
              onClick={() => {
                if (multiDayMode) {
                  handleToggleMultiDay(item.dateStr);
                } else {
                  setSelectedDate(item.dateStr);
                }
              }}
              className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${
                multiDayMode 
                  ? selectedMultiDays.includes(item.dateStr)
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-300'
                  : selectedDate === item.dateStr
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.isToday ? 'วันนี้' : item.dayName}</span>
              <span className="text-xl font-black">{item.dayNum}</span>
            </button>
          ))}
        </div>

        {multiDayMode && selectedMultiDays.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-xl mb-4 text-sm font-bold flex justify-between items-center">
            <span>เลือกแล้ว {selectedMultiDays.length} วัน</span>
            <button onClick={() => setSelectedMultiDays([])} className="text-blue-600 dark:text-blue-400 underline text-xs">ล้างทั้งหมด</button>
          </div>
        )}

        {/* Compact Schedule List */}
        <div className="mt-2 space-y-3">
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 font-bold mt-3">กำลังโหลดข้อมูล...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <BusFront size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-bold">ไม่มีรอบรถในวันที่และสายที่คุณเลือก</p>
            </div>
          ) : (
            filteredTrips.map(trip => {
              const myBooking = bookings.find(b => b.scheduledTripId === trip.id && b.empId === '1096902163' && b.status !== 'CANCELLED');
              const isFull = trip.bookedCount >= trip.capacity;
              const percent = (trip.bookedCount / trip.capacity) * 100;

              return (
                <div key={trip.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between gap-4 transition-all hover:border-blue-300">
                  
                  {/* Info */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-gray-900 dark:text-white">
                        {trip.departureTime ? trip.departureTime.split(' ')[1].substring(0, 5) : ''}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg">{trip.route}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1"><MapPin size={12}/> {trip.vehicleName}</span>
                      <span className="flex items-center gap-1">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden flex">
                          <div className={`h-full ${percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                        </div>
                        {trip.capacity - trip.bookedCount} ที่
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div>
                    {myBooking ? (
                      <button 
                        onClick={() => navigate(`/booking/ticket/${myBooking.id}`)}
                        className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl font-bold text-sm flex items-center gap-1"
                      >
                        ดูตั๋ว <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleBook(trip)}
                        disabled={isFull}
                        className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${
                          isFull 
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                        }`}
                      >
                        {isFull ? 'เต็ม' : multiDayMode ? 'จองล่วงหน้า' : 'จองที่นั่ง'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(m => ({ ...m, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        details={confirmModal.details}
        variant={confirmModal.variant}
        confirmText={confirmModal.confirmText}
      />
    </div>
  );
};

export default BookingHome;
