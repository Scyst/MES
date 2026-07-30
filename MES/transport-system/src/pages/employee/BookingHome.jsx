import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Search, Ticket, ArrowRight, ShieldCheck, BusFront, AlertCircle } from 'lucide-react';

const BookingHome = () => {
  const [schedules, setSchedules] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [empData, setEmpData] = useState({ empId: '', bu: 'OEM' });
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check if employee has an active ticket today
    const myTicketId = localStorage.getItem('my_ticket_id');
    if (myTicketId) {
      // We could auto redirect, but let's just let them see the button
    }

    const savedSchedules = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
    // Only show OPEN schedules
    setSchedules(savedSchedules.filter(s => s.status === 'OPEN'));
    
    // Remember last used emp details
    const savedEmpId = localStorage.getItem('saved_emp_id');
    const savedBu = localStorage.getItem('saved_bu');
    if (savedEmpId) {
      setEmpData({ empId: savedEmpId, bu: savedBu || 'OEM' });
    }
  }, []);

  const handleBookClick = (schedule) => {
    if (schedule.bookedCount >= schedule.capacity) {
      alert('ขออภัย รอบรถนี้เต็มแล้ว');
      return;
    }
    setSelectedSchedule(schedule);
    setShowBookingModal(true);
  };

  const submitBooking = (e) => {
    e.preventDefault();
    if (!empData.empId) return;

    // Save to local storage for convenience next time
    localStorage.setItem('saved_emp_id', empData.empId);
    localStorage.setItem('saved_bu', empData.bu);

    // Create booking
    const allBookings = JSON.parse(localStorage.getItem('bookings')) || [];
    const newBooking = {
      id: 'TKT-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      scheduledTripId: selectedSchedule.id,
      empId: empData.empId,
      bu: empData.bu,
      status: 'BOOKED',
      bookedAt: new Date().toISOString()
    };
    
    allBookings.push(newBooking);
    localStorage.setItem('bookings', JSON.stringify(allBookings));

    // Update schedule booked count
    const allSchedules = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
    const scheduleIndex = allSchedules.findIndex(s => s.id === selectedSchedule.id);
    if (scheduleIndex !== -1) {
      allSchedules[scheduleIndex].bookedCount += 1;
      if (allSchedules[scheduleIndex].bookedCount >= allSchedules[scheduleIndex].capacity) {
        // Just leave it OPEN but full, or change status. Let's leave it and handle on UI.
      }
      localStorage.setItem('scheduledTrips', JSON.stringify(allSchedules));
    }

    // Save active ticket
    localStorage.setItem('my_ticket_id', newBooking.id);
    
    // Redirect to ticket
    navigate(`/booking/ticket/${newBooking.id}`);
  };

  const filteredSchedules = schedules.filter(s => 
    s.route.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTicketId = localStorage.getItem('my_ticket_id');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-6 shadow-md rounded-b-3xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <BusFront size={28} />
            <h1 className="text-xl font-bold">SNC Pre-booking</h1>
          </div>
          {activeTicketId && (
            <button 
              onClick={() => navigate(`/booking/ticket/${activeTicketId}`)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Ticket size={16} />
              ตั๋วของฉัน
            </button>
          )}
        </div>
        
        <h2 className="text-2xl font-bold mb-2">จองรถกลับบ้าน</h2>
        <p className="text-blue-100 mb-6">จองที่นั่งล่วงหน้า เพื่อการเดินทางที่แน่นอน</p>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="ค้นหาเส้นทาง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-4 max-w-lg w-full mx-auto pb-12 mt-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <CalendarDays size={20} className="text-blue-600" />
          รอบรถที่เปิดให้จองวันนี้
        </h3>

        {filteredSchedules.length === 0 ? (
          <div className="text-center py-10 px-4 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="inline-flex justify-center items-center w-12 h-12 bg-gray-100 rounded-full text-gray-400 mb-3">
              <BusFront size={24} />
            </div>
            <p className="text-gray-600 font-medium">ยังไม่มีรอบรถในขณะนี้</p>
            <p className="text-sm text-gray-400 mt-1">กรุณารอแอดมินเปิดรอบรถ หรือลองค้นหาใหม่</p>
          </div>
        ) : (
          filteredSchedules.map((schedule) => {
            const isFull = schedule.bookedCount >= schedule.capacity;
            const availableSeats = schedule.capacity - schedule.bookedCount;
            
            return (
              <div 
                key={schedule.id}
                className={`bg-white rounded-2xl shadow-sm border p-4 transition-all ${
                  isFull ? 'border-red-100 opacity-75' : 'border-blue-50 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isFull ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      <MapPin size={20} />
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">{schedule.route}</h4>
                  </div>
                  {isFull ? (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      รถเต็ม
                    </span>
                  ) : (
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      ว่าง {availableSeats} ที่
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 mb-4 ml-12">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock size={16} className="mr-2 text-gray-400" />
                    เวลาออก: <strong className="ml-1 text-gray-900">{new Date(schedule.departureTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})} น.</strong>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <ShieldCheck size={16} className="mr-2 text-gray-400" />
                    รถที่ใช้: {schedule.vehicleName}
                  </div>
                </div>
                
                <button
                  onClick={() => handleBookClick(schedule)}
                  disabled={isFull}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
                    isFull 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  }`}
                >
                  {isFull ? 'เต็มแล้ว' : 'จองที่นั่ง'}
                  {!isFull && <ArrowRight size={18} />}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">ยืนยันการจอง</h3>
              <button 
                onClick={() => setShowBookingModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                ×
              </button>
            </div>
            
            <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
              <div className="font-bold text-blue-900 mb-1">{selectedSchedule.route}</div>
              <div className="text-sm text-blue-700 flex items-center gap-1">
                <Clock size={14} /> 
                {new Date(selectedSchedule.departureTime).toLocaleString('th-TH')}
              </div>
            </div>

            <form onSubmit={submitBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">รหัสพนักงาน</label>
                <input 
                  type="text" 
                  required
                  placeholder="เช่น 6400123"
                  value={empData.empId}
                  onChange={(e) => setEmpData({...empData, empId: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg font-medium"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">สังกัด (BU)</label>
                <select 
                  value={empData.bu}
                  onChange={(e) => setEmpData({...empData, bu: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium"
                >
                  <option value="OEM">OEM</option>
                  <option value="Toolbox">Toolbox</option>
                  <option value="Pipe">Pipe</option>
                  <option value="SheetMetal">Sheet Metal</option>
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 text-amber-800 text-sm mt-2">
                <AlertCircle className="shrink-0" size={18} />
                <p>กรุณามาขึ้นรถให้ตรงเวลา หากจองแล้วไม่มาอาจมีผลต่อการประเมินการเดินทางของ BU ท่าน</p>
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-200 mt-4 text-lg"
              >
                ยืนยันการจองตั๋ว
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingHome;
