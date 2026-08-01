import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, BusFront, Clock, MapPin, AlertTriangle, ChevronRight, X } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';
import { bookingsAPI, schedulesAPI } from '../../services/api';

const BookingHistory = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState({ isOpen: false, booking: null });

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      const empId = localStorage.getItem('passenger_empId') || '';
      try {
        const [myBookings, allSchedules] = await Promise.all([
          bookingsAPI.getBookings(empId ? { empId } : {}),
          schedulesAPI.getSchedules(),
        ]);
        const sorted = [...(myBookings || [])].sort(
          (a, b) => new Date(b.bookedAt) - new Date(a.bookedAt)
        );
        setBookings(sorted);
        setSchedules(allSchedules || []);
      } catch (err) {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  const getSchedule = (scheduledTripId) => schedules.find(s => s.id === scheduledTripId);

  const handleCancelBooking = async () => {
    const { booking } = cancelConfirm;
    if (!booking) return;
    try {
      await bookingsAPI.cancelBooking(booking.id);
      setBookings(prev =>
        prev.map(b => b.id === booking.id ? { ...b, status: 'CANCELLED' } : b)
      );
    } catch (err) {
      // Silent fail — UI still closes modal
    } finally {
      setCancelConfirm({ isOpen: false, booking: null });
    }
  };

  const statusConfig = {
    BOOKED: { label: 'จองแล้ว', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    BOARDED: { label: 'ขึ้นรถแล้ว', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    CANCELLED: { label: 'ยกเลิกแล้ว', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500' },
  };

  const canCancel = (booking) => {
    const sched = getSchedule(booking.scheduledTripId);
    if (!sched || booking.status !== 'BOOKED') return false;
    const depTime = new Date(sched.departureTime).getTime();
    return Date.now() < depTime - 60 * 60 * 1000;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 pt-6 pb-6">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">การจองของฉัน</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {bookings.length > 0 ? `พบ ${bookings.length} รายการ` : 'ยังไม่มีประวัติการจอง'}
        </p>
      </div>

      {/* Empty state */}
      {bookings.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Ticket size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">ยังไม่มีการจอง</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">เริ่มจองรถเพื่อดูประวัติที่นี่</p>
          <button
            onClick={() => navigate('/booking')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors"
          >
            จองรถเลย
          </button>
        </div>
      )}

      {/* Booking List */}
      <div className="space-y-3">
        {bookings.map(booking => {
          const sched = getSchedule(booking.scheduledTripId);
          const status = statusConfig[booking.status] || statusConfig.CANCELLED;
          const allowCancel = canCancel(booking);

          return (
            <div
              key={booking.id}
              onClick={() => booking.status === 'BOOKED' && navigate(`/booking/ticket/${booking.id}`)}
              className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm transition-all ${
                booking.status === 'BOOKED' ? 'cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 active:scale-[0.99]' : 'opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  booking.status === 'BOARDED'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : booking.status === 'BOOKED'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                }`}>
                  {booking.status === 'BOARDED' ? <BusFront size={20} /> : <Ticket size={20} />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                    {booking.isExtra && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">ผู้โดยสารเพิ่ม</span>
                    )}
                  </div>
                  {sched ? (
                    <>
                      <p className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                        <MapPin size={13} className="text-blue-500 flex-shrink-0" />
                        {sched.route}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <Clock size={12} className="flex-shrink-0" />
                        {sched.departureTime ? sched.departureTime.split(' ')[0] : ''}
                        {' · '}
                        {sched.departureTime ? sched.departureTime.split(' ')[1].substring(0, 5) : ''} น.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      รอบรถถูกลบแล้ว
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">
                    จองเมื่อ {new Date(booking.bookedAt).toLocaleDateString('th-TH')}
                  </p>
                </div>

                {/* Action */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {booking.status === 'BOOKED' && (
                    <ChevronRight size={18} className="text-gray-400 dark:text-gray-500" />
                  )}
                  {allowCancel && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelConfirm({ isOpen: true, booking });
                      }}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="ยกเลิกการจอง"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cancel Confirm Modal */}
      <ConfirmModal
        isOpen={cancelConfirm.isOpen}
        onClose={() => setCancelConfirm({ isOpen: false, booking: null })}
        onConfirm={handleCancelBooking}
        title="ยกเลิกการจองที่นั่ง"
        message="ยกเลิกแล้วจะไม่สามารถกู้คืนได้ ที่นั่งจะคืนให้ผู้อื่น"
        details={cancelConfirm.booking ? (() => {
          const s = getSchedule(cancelConfirm.booking.scheduledTripId);
          return s ? [
            { label: 'สายรถ', value: s.route },
            { label: 'วันที่', value: s.departureTime ? s.departureTime.split(' ')[0] : '' },
          ] : [];
        })() : []}
        variant="danger"
        confirmText="ยืนยันยกเลิก"
        cancelText="ไม่ยกเลิก"
      />
    </div>
  );
};

export default BookingHistory;
