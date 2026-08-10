import { useState, useEffect } from 'react';
import { masterAPI, bookingsAPI } from '../../services/api';
import { BusFront, ChevronRight, Filter, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';

const BookingHome = () => {
  const { passengerProfile } = useAuth();
  
  const [selectedRoute, setSelectedRoute] = useState('ทั้งหมด');
  const [bookings, setBookings] = useState([]);
  
  // Date Picker State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [masterRoutes, setMasterRoutes] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');

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

  const [bookingModal, setBookingModal] = useState({
    isOpen: false,
    route: null
  });

  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const currentEmpId = passengerProfile?.empId || '';
      const [bookingsData, routesData, timeSlotsData] = await Promise.all([
        bookingsAPI.getBookings(currentEmpId ? { empId: currentEmpId } : {}),
        masterAPI.getRoutes(),
        masterAPI.getTimeSlots()
      ]);
      
      setBookings(bookingsData || []);
      setMasterRoutes(routesData || []);
      
      // Sort time slots chronologically
      const sortedTimeSlots = (timeSlotsData || []).sort((a, b) => {
        const timeA = a.time || '';
        const timeB = b.time || '';
        return timeA.localeCompare(timeB);
      });
      setTimeSlots(sortedTimeSlots);
      
      if (sortedTimeSlots.length > 0 && !selectedTimeSlot) {
        setSelectedTimeSlot(sortedTimeSlots[0].id);
      }
    } catch (err) {
      setError(err.message || 'โหลดข้อมูลล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [passengerProfile]);

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

  // --- Helper: Get Profile Data ---
  const getCurrentUserParams = () => {
    if (!passengerProfile) return { empId: '', name: '', bu: '' };
    return { 
      empId: passengerProfile.empId || '', 
      name: passengerProfile.name || '', 
      bu: passengerProfile.bu || '' 
    };
  };

  const doBookSingleRoute = async (route) => {
    const { empId, name, bu } = getCurrentUserParams();
    
    if (!empId || !name) {
      navigate('/booking/profile');
      return;
    }
    
    if (!selectedTimeSlot) {
      setConfirmModal({
        isOpen: true,
        title: 'ข้อมูลไม่ครบ',
        message: 'กรุณาเลือกรอบเวลา (กะเช้า/กะเย็น) ก่อนทำการลงชื่อ',
        details: [],
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false })),
        variant: 'danger',
        confirmText: 'ตกลง',
      });
      return;
    }

    try {
      const payload = { routeId: route.id, timeSlotId: selectedTimeSlot, targetDate: selectedDate, empId, name, bu, isExtra: false };
      const res = await bookingsAPI.addBooking(payload);
      await loadData();
      navigate(`/booking/ticket/${res.id}`);
    } catch (err) {
      setConfirmModal({
        isOpen: true,
        title: 'เกิดข้อผิดพลาด',
        message: err.message || 'ไม่สามารถลงชื่อเดินทางได้',
        details: [],
        onConfirm: () => setConfirmModal(m => ({ ...m, isOpen: false })),
        variant: 'danger',
        confirmText: 'ตกลง',
      });
    }
  };

  const handleBookClick = (route) => {
    setBookingModal({ isOpen: true, route });
  };

  const handleBook = (route) => {
    const timeSlotName = timeSlots.find(t => t.id === selectedTimeSlot)?.name || 'ไม่ระบุ';
    setConfirmModal({
      isOpen: true,
      title: 'ยืนยันการลงชื่อเดินทาง',
      message: 'คุณกำลังลงชื่อแสดงความประสงค์เดินทางในเส้นทางนี้',
      details: [
        { label: 'สายรถ', value: route.name },
        { label: 'วันที่', value: new Date(selectedDate).toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
        { label: 'รอบเวลา', value: timeSlotName },
      ],
      onConfirm: () => doBookSingleRoute(route),
      variant: 'info',
      confirmText: 'ลงชื่อเดินทาง',
    });
  };

  const routes = ['ทั้งหมด', ...masterRoutes.map(r => r.name)];
  
  const filteredRoutes = masterRoutes.filter(route => {
    return selectedRoute === 'ทั้งหมด' || route.name === selectedRoute;
  });

  return (
    <div className="w-full">
      
      <div className="pt-4 pb-4 px-6 bg-white dark:bg-gray-800 rounded-b-3xl shadow-sm z-10 sticky top-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">ลงชื่อเดินทาง</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">ระบุเส้นทางและวันที่ต้องการเดินทาง</p>
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
        </div>
      </div>

      <div className="flex-1 w-full mx-auto px-4 pt-6">
        
        {/* Date Strip */}
        <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {dateStrip.map((item) => (
            <button
              key={item.dateStr}
              onClick={() => setSelectedDate(item.dateStr)}
              className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border ${
                selectedDate === item.dateStr
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-105'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-300'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">{item.isToday ? 'วันนี้' : item.dayName}</span>
              <span className="text-xl font-black">{item.dayNum}</span>
            </button>
          ))}
        </div>

        {/* Route List */}
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 font-bold mt-3">กำลังโหลดข้อมูล...</p>
            </div>
          ) : filteredRoutes.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <BusFront size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-bold">ไม่พบเส้นทาง</p>
            </div>
          ) : (
            filteredRoutes.map(route => {
              const currentEmpId = passengerProfile?.empId || '';
              const myBooking = bookings.find(b => b.routeId === route.id && b.targetDate === selectedDate && b.timeSlotId === selectedTimeSlot && b.empId === currentEmpId && b.status !== 'CANCELLED');

              return (
                <div key={route.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between gap-4 transition-all hover:border-blue-300">
                  
                  {/* Info */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-gray-900 dark:text-white">
                        {route.name}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate max-w-[200px]" title={route.stops ? route.stops.map(s => typeof s === 'string' ? s : s.name).filter(Boolean).join(' ➔ ') : ''}>
                      {route.stops && route.stops.map(s => typeof s === 'string' ? s : s.name).filter(Boolean).join(' ➔ ')}
                    </div>
                  </div>

                  {/* Action */}
                  <div>
                    {myBooking ? (
                      <button 
                        onClick={() => navigate(`/booking/ticket/${myBooking.id}`)}
                        className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl font-bold text-sm flex items-center gap-1 whitespace-nowrap flex-shrink-0"
                      >
                        ดูตั๋ว <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleBookClick(route)}
                        className={`px-6 py-2 rounded-xl font-bold text-sm transition-all bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md whitespace-nowrap flex-shrink-0`}
                      >
                        ลงชื่อ
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

      {/* Booking Time Slot Modal */}
      {bookingModal.isOpen && bookingModal.route && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm shadow-xl overflow-hidden flex flex-col scale-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <h3 className="text-xl font-black text-gray-900 dark:text-white text-center">เลือกรอบเวลา</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 font-medium">{bookingModal.route.name}</p>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {timeSlots.map((ts) => (
                <button
                  key={ts.id}
                  onClick={() => setSelectedTimeSlot(ts.id)}
                  className={`px-4 py-3 rounded-xl font-bold flex items-center justify-between transition-all border ${
                    selectedTimeSlot === ts.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock size={18} className={selectedTimeSlot === ts.id ? 'text-blue-500' : 'text-gray-400'} />
                    <span>{ts.name}</span>
                  </div>
                  <span className="text-xs font-black bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md">{ts.time}</span>
                </button>
              ))}
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setBookingModal({ isOpen: false, route: null })}
                className="py-3 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  setBookingModal({ isOpen: false, route: null });
                  handleBook(bookingModal.route);
                }}
                disabled={!selectedTimeSlot}
                className={`py-3 font-bold rounded-xl transition-colors shadow-sm ${
                  selectedTimeSlot
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                ดำเนินการต่อ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingHome;
