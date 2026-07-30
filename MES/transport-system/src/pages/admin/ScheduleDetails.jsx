import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Users, CheckCircle, XCircle } from 'lucide-react';

const ScheduleDetails = () => {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState(null);
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const savedSchedules = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
    const foundSchedule = savedSchedules.find(s => s.id === scheduleId);
    
    if (foundSchedule) {
      setSchedule(foundSchedule);
      // Fetch bookings for this schedule
      const allBookings = JSON.parse(localStorage.getItem('bookings')) || [];
      const scheduleBookings = allBookings.filter(b => b.scheduledTripId === scheduleId);
      setBookings(scheduleBookings);
    }
  }, [scheduleId]);

  if (!schedule) {
    return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>;
  }

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
    </div>
  );
};

export default ScheduleDetails;
