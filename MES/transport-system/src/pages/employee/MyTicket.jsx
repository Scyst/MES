import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, MapPin, BusFront, CheckCircle, QrCode, ArrowLeft, AlertTriangle, ScanLine } from 'lucide-react';
import SurveyModal from '../../components/employee/SurveyModal';

const MyTicket = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);

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

  const handleSimulateScanBus = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const allBookings = JSON.parse(localStorage.getItem('bookings')) || [];
      const bookingIndex = allBookings.findIndex(b => b.id === ticketId);
      if (bookingIndex !== -1) {
        allBookings[bookingIndex].status = 'BOARDED';
        localStorage.setItem('bookings', JSON.stringify(allBookings));
        setBooking({ ...booking, status: 'BOARDED' });
        
        // Randomly show survey (or 100% for demo)
        setTimeout(() => {
          setShowSurvey(true);
        }, 500);
      }
    }, 1500);
  };

  const handleCancelBooking = () => {
    if (confirm('ยืนยันการยกเลิกจองที่นั่ง?')) {
      const allBookings = JSON.parse(localStorage.getItem('bookings')) || [];
      const updatedBookings = allBookings.filter(b => b.id !== ticketId);
      localStorage.setItem('bookings', JSON.stringify(updatedBookings));

      const allSchedules = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
      const scheduleIndex = allSchedules.findIndex(s => s.id === booking.scheduledTripId);
      if (scheduleIndex !== -1) {
        allSchedules[scheduleIndex].bookedCount = Math.max(0, allSchedules[scheduleIndex].bookedCount - 1);
        localStorage.setItem('scheduledTrips', JSON.stringify(allSchedules));
      }

      localStorage.removeItem('my_ticket_id');
      navigate('/booking');
    }
  };

  if (!booking || !schedule) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
             <AlertTriangle className="text-gray-500 dark:text-gray-400" size={32} />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6 font-bold text-lg">ไม่พบข้อมูล หรือถูกยกเลิกไปแล้ว</p>
          <button 
            onClick={() => navigate('/booking')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  const isBoarded = booking.status === 'BOARDED';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans transition-colors duration-300">
      
      {/* Header */}
      <div className="pt-6 pb-4 px-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/booking')} 
          className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Boarding Scanner</h1>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 px-5 flex flex-col w-full mx-auto md:max-w-4xl pb-10">
        
        {/* Booking Context */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">รอบรถของคุณ</p>
              <h2 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{schedule.route}</h2>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${isBoarded ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                {isBoarded ? 'BOARDED' : 'CONFIRMED'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-bold text-gray-700 dark:text-gray-300">
             <div className="flex items-center gap-1.5">
               <Clock size={16} className="text-blue-500" />
               {new Date(schedule.departureTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
             </div>
             <div className="flex items-center gap-1.5">
               <BusFront size={16} className="text-blue-500" />
               {schedule.vehicleName}
             </div>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="relative drop-shadow-[0_10px_20px_rgba(0,0,0,0.05)] dark:drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] flex-1 flex flex-col">
          
          <div className={`rounded-3xl flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden border border-gray-200 dark:border-gray-700 ${isBoarded ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-gray-900'}`}>
            
            {!isBoarded ? (
              <>
                {/* Simulated Camera Viewfinder */}
                <div className="relative w-64 h-64 mb-8">
                  {/* Viewfinder Corners */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-xl"></div>
                  
                  {/* Scanning Animation */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-blue-500/20 flex flex-col">
                      <div className="w-full h-1 bg-blue-400 shadow-[0_0_8px_2px_rgba(59,130,246,0.8)] animate-[scan_1.5s_ease-in-out_infinite]"></div>
                    </div>
                  )}

                  {!isScanning && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ScanLine size={48} className="text-white/30" />
                    </div>
                  )}
                </div>
                
                <p className="text-white/80 font-medium text-center mb-6">
                  {isScanning ? 'กำลังตรวจสอบ QR Code ของรถ...' : 'เล็งกล้องไปที่ QR Code หน้ารถเพื่อเช็คอิน'}
                </p>

                <button 
                  onClick={handleSimulateScanBus}
                  disabled={isScanning}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-base transition-all shadow-sm active:scale-95"
                >
                  {isScanning ? (
                    <span className="animate-pulse flex items-center gap-2"><ScanLine className="animate-spin" /> กำลังสแกน...</span>
                  ) : (
                    <>
                      <ScanLine size={22} />
                      จำลองการสแกน (Demo)
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-10 w-full h-full flex flex-col items-center justify-center">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <CheckCircle size={80} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-6" />
                </motion.div>
                <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-400 mb-2">เช็คอินสำเร็จ</h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-500 font-bold mb-8">บันทึกข้อมูลการเดินทางของคุณแล้ว</p>
                
                <div className="w-full max-w-sm bg-white dark:bg-gray-800 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm text-left">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">รหัสการจอง</p>
                  <p className="text-gray-900 dark:text-white font-mono font-bold">{booking.id}</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Action Buttons */}
        {!isBoarded && (
          <div className="mt-6 text-center">
            <button 
              onClick={handleCancelBooking}
              className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl font-bold transition-all text-sm"
            >
              ยกเลิกการจอง
            </button>
          </div>
        )}
      </div>

      <SurveyModal isOpen={showSurvey} onClose={() => setShowSurvey(false)} />
      
      {/* Global Style for scanning animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(256px); }
          100% { transform: translateY(0); }
        }
      `}} />
    </div>
  );
};

export default MyTicket;
