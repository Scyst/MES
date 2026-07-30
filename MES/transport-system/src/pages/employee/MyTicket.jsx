import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Ticket, Clock, MapPin, BusFront, CheckCircle, QrCode, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const MyTicket = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const allBookings = JSON.parse(localStorage.getItem('bookings')) || [];
    const foundBooking = allBookings.find(b => b.id === ticketId);
    
    if (foundBooking) {
      setBooking(foundBooking);
      const allSchedules = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
      const foundSchedule = allSchedules.find(s => s.id === foundBooking.scheduledTripId);
      setSchedule(foundSchedule);
    }
  }, [ticketId]);

  const handleSimulateScanBoard = () => {
    setIsScanning(true);
    // Simulate camera scanning delay
    setTimeout(() => {
      setIsScanning(false);
      // Update booking status
      const allBookings = JSON.parse(localStorage.getItem('bookings')) || [];
      const bookingIndex = allBookings.findIndex(b => b.id === ticketId);
      if (bookingIndex !== -1) {
        allBookings[bookingIndex].status = 'BOARDED';
        localStorage.setItem('bookings', JSON.stringify(allBookings));
        setBooking({ ...booking, status: 'BOARDED' });
        alert('สแกนขึ้นรถสำเร็จ! ขอให้เดินทางโดยสวัสดิภาพครับ');
      }
    }, 1500);
  };

  const handleCancelBooking = () => {
    if (confirm('คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?')) {
      const allBookings = JSON.parse(localStorage.getItem('bookings')) || [];
      const updatedBookings = allBookings.filter(b => b.id !== ticketId);
      localStorage.setItem('bookings', JSON.stringify(updatedBookings));

      // Decrease booked count
      const allSchedules = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
      const scheduleIndex = allSchedules.findIndex(s => s.id === booking.scheduledTripId);
      if (scheduleIndex !== -1) {
        allSchedules[scheduleIndex].bookedCount = Math.max(0, allSchedules[scheduleIndex].bookedCount - 1);
        localStorage.setItem('scheduledTrips', JSON.stringify(allSchedules));
      }

      localStorage.removeItem('my_ticket_id');
      alert('ยกเลิกการจองเรียบร้อยแล้ว');
      navigate('/booking');
    }
  };

  if (!booking || !schedule) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">ไม่พบข้อมูลตั๋ว หรือตั๋วถูกยกเลิกไปแล้ว</p>
          <button 
            onClick={() => navigate('/booking')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  const isBoarded = booking.status === 'BOARDED';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-md flex items-center gap-3 relative">
        <button onClick={() => navigate('/booking')} className="p-2 -ml-2 rounded-full hover:bg-white/10">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">ตั๋วเดินทางของฉัน</h1>
      </div>

      <div className="flex-1 p-4 flex flex-col max-w-lg w-full mx-auto pb-12">
        {/* Ticket Container */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden relative mt-4">
          
          {/* Status Banner */}
          <div className={`p-3 text-center text-sm font-bold text-white ${isBoarded ? 'bg-green-500' : 'bg-amber-500'}`}>
            {isBoarded ? 'คุณได้สแกนขึ้นรถแล้ว (Boarded)' : 'จองที่นั่งสำเร็จ รอขึ้นรถ (Booked)'}
          </div>

          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">เส้นทาง</p>
                <h2 className="text-2xl font-bold text-gray-900 mt-1">{schedule.route}</h2>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <BusFront size={28} />
              </div>
            </div>

            <div className="flex items-center gap-6 mb-6">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock size={14} /> เวลาออก
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {new Date(schedule.departureTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MapPin size={14} /> ทะเบียนรถ
                </p>
                <p className="text-lg font-bold text-gray-900">{schedule.vehicleName}</p>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-300 py-6 my-2 relative">
              {/* Notches for ticket effect */}
              <div className="absolute w-6 h-6 bg-gray-50 rounded-full -left-9 top-1/2 -translate-y-1/2 shadow-inner"></div>
              <div className="absolute w-6 h-6 bg-gray-50 rounded-full -right-9 top-1/2 -translate-y-1/2 shadow-inner"></div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">รหัสพนักงาน</p>
                  <p className="text-lg font-bold text-gray-900">{booking.empId}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-bold uppercase">แผนก (BU)</p>
                  <p className="text-lg font-bold text-gray-900">{booking.bu}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500 font-bold uppercase">Ticket ID</p>
                <p className="text-sm font-mono text-gray-600 mt-1">{booking.id}</p>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center justify-center pt-2 pb-4">
              <div className="bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm mb-3">
                <QRCodeSVG value={booking.id} size={140} level="M" />
              </div>
              <p className="text-xs text-gray-500 text-center max-w-[250px]">
                {isBoarded 
                  ? 'ตั๋วใบนี้ถูกใช้งานแล้ว' 
                  : 'แสดง QR Code นี้ให้คนขับดู หรือกดปุ่มด้านล่างเพื่อสแกน QR บนรถด้วยตนเอง'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          {!isBoarded ? (
            <>
              <button 
                onClick={handleSimulateScanBoard}
                disabled={isScanning}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-lg transition-all"
              >
                {isScanning ? (
                  <span className="animate-pulse">กำลังสแกน...</span>
                ) : (
                  <>
                    <QrCode size={22} />
                    สแกน QR หน้าประตูรถเพื่อเช็คอิน
                  </>
                )}
              </button>
              <button 
                onClick={handleCancelBooking}
                className="w-full py-3 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-2xl font-bold transition-all"
              >
                ยกเลิกการจอง
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                localStorage.removeItem('my_ticket_id');
                navigate('/booking');
              }}
              className="w-full py-4 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} className="text-green-500" />
              ปิดและกลับหน้าหลัก
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyTicket;
