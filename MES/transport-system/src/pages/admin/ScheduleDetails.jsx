import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Users, CheckCircle, XCircle, Download } from 'lucide-react';
import { schedulesAPI, bookingsAPI } from '../../services/api';

const ScheduleDetails = () => {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showAddPassengerModal, setShowAddPassengerModal] = useState(false);
  const [newPassenger, setNewPassenger] = useState({ empId: '', name: '', bu: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [selectedPendingIds, setSelectedPendingIds] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const [allSchedules, scheduleBookings] = await Promise.all([
          schedulesAPI.getSchedules(),
          bookingsAPI.getBookings({ scheduleId })
        ]);
        
        const foundSchedule = allSchedules.find(s => s.id === scheduleId);
        if (foundSchedule) {
          setSchedule(foundSchedule);
          setBookings(scheduleBookings || []);
        } else {
          setError("ไม่พบข้อมูลรอบรถ");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [scheduleId]);

  const loadDetailsOnly = async () => {
    try {
      const scheduleBookings = await bookingsAPI.getBookings({ scheduleId });
      setBookings(scheduleBookings || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-bold">กำลังโหลด...</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-500 font-bold">เกิดข้อผิดพลาด: {error}</div>;
  }
  if (!schedule) {
    return <div className="p-8 text-center text-gray-500 font-bold">ไม่พบข้อมูลรอบรถ</div>;
  }

  const handleExportCSV = () => {
    if (bookings.length === 0) {
      alert('ไม่มีรายชื่อผู้จองในรอบนี้');
      return;
    }
    
    // Create CSV header
    const header = 'รหัสพนักงาน,ชื่อ-นามสกุล,แผนก (BU),เวลาที่จอง,สถานะ\n';
    
    // Map bookings to CSV rows
    const rows = bookings.map(b => {
      let statusStr = 'รอขึ้นรถ';
      if (b.status === 'BOARDED') statusStr = 'ขึ้นรถแล้ว';
      else if (b.status === 'NO_SHOW') statusStr = 'ไม่มาแสดงตัว';
      
      const timeStr = new Date(b.bookedAt).toLocaleTimeString('th-TH');
      
      // Escape commas in names if any
      const safeName = (b.name || '').includes(',') ? `"${b.name}"` : (b.name || '');
      
      return `${b.empId || ''},${safeName},${b.bu || ''},${timeStr},${statusStr}`;
    }).join('\n');
    
    const csvContent = header + rows;
    
    // Add BOM for Excel UTF-8 compatibility
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    
    const safeDate = schedule.date || new Date(schedule.departureTime).toISOString().split('T')[0];
    const safeRoute = (schedule.route || 'Route').replace(/[/\\?%*:|"<>]/g, '-');
    link.download = `PassengerManifest_${safeRoute}_${safeDate}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddPassenger = async (e) => {
    e.preventDefault();
    if (!newPassenger.name || !newPassenger.bu) return;
    
    setIsSubmitting(true);
    try {
      await bookingsAPI.addBooking({
        scheduledTripId: scheduleId,
        empId: newPassenger.empId,
        name: newPassenger.name,
        bu: newPassenger.bu,
        isExtra: true
      });
      setShowAddPassengerModal(false);
      setNewPassenger({ empId: '', name: '', bu: '' });
      await loadDetailsOnly();
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการเพิ่มผู้โดยสาร');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAssignModal = async () => {
    setShowAssignModal(true);
    setPendingBookings([]);
    setSelectedPendingIds([]);
    try {
      const pending = await bookingsAPI.getBookings({ 
        routeId: schedule.routeId, 
        targetDate: schedule.date || schedule.departureTime.split(' ')[0],
        timeSlotId: schedule.timeSlotId, // Filter by time slot
        unassigned: true 
      });
      setPendingBookings(pending || []);
    } catch (err) {
      alert("โหลดรายชื่อที่รอจัดรถไม่สำเร็จ");
    }
  };

  const toggleSelectPending = (id) => {
    setSelectedPendingIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAssignPending = async () => {
    if (selectedPendingIds.length === 0) return;
    setIsAssigning(true);
    try {
      await bookingsAPI.assignBookingsToSchedule(scheduleId, selectedPendingIds);
      setShowAssignModal(false);
      await loadDetailsOnly();
    } catch (err) {
      alert(err.message || "เกิดข้อผิดพลาดในการจัดรถ");
    } finally {
      setIsAssigning(false);
    }
  };

  const boardedCount = bookings.filter(b => b.status === 'BOARDED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/admin/schedules')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-600 dark:text-gray-400"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">รายละเอียดรอบรถล่วงหน้า</h2>
          <p className="text-gray-500 dark:text-gray-400">เส้นทาง: {schedule.route}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button 
            onClick={handleOpenAssignModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            <Clock size={16} /> จัดคิวผู้โดยสาร
          </button>
          <button 
            onClick={() => setShowAddPassengerModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            <Users size={16} /> เพิ่มผู้โดยสาร
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors"
          >
            <Download size={16} /> ส่งออกรายชื่อ (CSV)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">เวลาออกเดินทาง</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {new Date(schedule.departureTime).toLocaleString('th-TH')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">ผู้จองทั้งหมด</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {bookings.length} / {schedule.capacity}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-lg">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">ขึ้นรถแล้ว (Boarded)</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {boardedCount} คน
            </p>
          </div>
        </div>
      </div>

      {/* Passengers List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-bold text-gray-900 dark:text-white">รายชื่อผู้ที่จองตั๋ว</h3>
        </div>
        
        {bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            ยังไม่มีผู้จองในรอบนี้
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white font-medium border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4">รหัสพนักงาน</th>
                  <th className="px-6 py-4">แผนก (BU)</th>
                  <th className="px-6 py-4">เวลาที่จอง</th>
                  <th className="px-6 py-4">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {booking.empId}
                    </td>
                    <td className="px-6 py-4">
                      {booking.bu}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(booking.bookedAt).toLocaleTimeString('th-TH')}
                    </td>
                    <td className="px-6 py-4">
                      {booking.status === 'BOARDED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                          <CheckCircle size={14} /> ขึ้นรถแล้ว
                        </span>
                      ) : booking.status === 'NO_SHOW' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                          <XCircle size={14} /> ไม่มาแสดงตัว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                          <Clock size={14} /> รอขึ้นรถ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddPassengerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              เพิ่มผู้โดยสารด้วยตนเอง
            </h3>
            <form onSubmit={handleAddPassenger} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  รหัสพนักงาน (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={newPassenger.empId}
                  onChange={e => setNewPassenger({ ...newPassenger, empId: e.target.value })}
                  placeholder="เช่น 1096902163"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ชื่อ - นามสกุล *
                </label>
                <input
                  type="text"
                  required
                  value={newPassenger.name}
                  onChange={e => setNewPassenger({ ...newPassenger, name: e.target.value })}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  สังกัด (แผนก/ฝ่าย) *
                </label>
                <input
                  type="text"
                  required
                  value={newPassenger.bu}
                  onChange={e => setNewPassenger({ ...newPassenger, bu: e.target.value })}
                  placeholder="เช่น OEM"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddPassengerModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'เพิ่มผู้โดยสาร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              รายชื่อผู้โดยสารที่รอจัดรถ
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              เส้นทาง: {schedule.route} | วันที่: {schedule.date || schedule.departureTime.split(' ')[0]}
            </p>
            
            <div className="flex-1 overflow-auto border border-gray-200 dark:border-gray-700 rounded-xl mb-4">
              {pendingBookings.length === 0 ? (
                <div className="p-8 text-center text-gray-500">ไม่มีผู้โดยสารที่รอจัดรถในเส้นทางและวันนี้</div>
              ) : (
                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white sticky top-0">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedPendingIds.length === pendingBookings.length && pendingBookings.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedPendingIds(pendingBookings.map(b => b.id));
                            else setSelectedPendingIds([]);
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3">รหัสพนักงาน</th>
                      <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                      <th className="px-4 py-3">แผนก (BU)</th>
                      <th className="px-4 py-3">เวลาที่จอง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {pendingBookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedPendingIds.includes(booking.id)}
                            onChange={() => toggleSelectPending(booking.id)}
                            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{booking.empId || '-'}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{booking.name}</td>
                        <td className="px-4 py-3">{booking.bu}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(booking.bookedAt).toLocaleTimeString('th-TH')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500">
                เลือกแล้ว <span className="font-bold text-gray-900 dark:text-white">{selectedPendingIds.length}</span> คน 
                (จากความจุที่ว่าง {schedule.capacity - bookings.length} ที่นั่ง)
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleAssignPending}
                  disabled={isAssigning || selectedPendingIds.length === 0}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-sm disabled:opacity-50"
                >
                  {isAssigning ? 'กำลังจัดสรร...' : 'จัดสรรลงรถรอบนี้'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleDetails;
