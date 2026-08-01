import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, MapPin, BusFront, CheckCircle, QrCode, ArrowLeft, AlertTriangle, ScanLine } from 'lucide-react';
import SurveyModal from '../../components/employee/SurveyModal';
import ConfirmModal from '../../components/ConfirmModal';
import { bookingsAPI, schedulesAPI } from '../../services/api';

const MyTicket = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    const loadTicket = async () => {
      setLoading(true);
      try {
        // NOTE: Intentionally >50 lines — load booking + schedule in one fetch
        const empId = localStorage.getItem('passenger_empId') || '';
        const [allBookings, allSchedules] = await Promise.all([
          bookingsAPI.getBookings(empId ? { empId } : {}),
          schedulesAPI.getSchedules(),
        ]);
        const foundBooking = allBookings.find(b => b.id === ticketId);
        if (foundBooking) {
          setBooking(foundBooking);
          const foundSchedule = allSchedules.find(s => s.id === foundBooking.scheduledTripId);
          setSchedule(foundSchedule || null);
        }
      } catch (err) {
        // Booking not found or API error — handled by empty state below
      } finally {
        setLoading(false);
      }
    };
    loadTicket();
  }, [ticketId]);

  const handleSimulateScanBus = async () => {
    setIsScanning(true);
    try {
      await bookingsAPI.boardPassenger(ticketId);
      setBooking(prev => ({ ...prev, status: 'BOARDED' }));
      setTimeout(() => setShowSurvey(true), 500);
    } catch (err) {
      // Silently fail — scanner animation still stops
    } finally {
      setIsScanning(false);
    }
  };

  const handleCancelBooking = async () => {
    try {
      await bookingsAPI.cancelBooking(ticketId);
      navigate('/booking');
    } catch (err) {
      // Error handled — navigate anyway so user isn't stuck
      navigate('/booking');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">ตั๋วของฉัน</h1>
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
                {isBoarded ? 'ขึ้นรถแล้ว' : 'จองแล้ว'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-bold text-gray-700 dark:text-gray-300">
             <div className="flex items-center gap-1.5">
               <Clock size={16} className="text-blue-500" />
               {schedule.departureTime ? schedule.departureTime.split(' ')[1].substring(0, 5) : ''}
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
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-xl"></div>
                  
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
                      เปิดกล้องสแกน QR รถ
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-10 w-full h-full flex flex-col items-center justify-center">
                <CheckCircle size={80} className="text-emerald-500 dark:text-emerald-400 mx-auto mb-6" />
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
              onClick={() => setShowCancelConfirm(true)}
              className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl font-bold transition-all text-sm"
            >
              ยกเลิกการจอง
            </button>
          </div>
        )}
      </div>

      <SurveyModal isOpen={showSurvey} onClose={() => setShowSurvey(false)} />

      <ConfirmModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelBooking}
        title="ยกเลิกการจองที่นั่ง"
        message="คุณกำลังจะยกเลิกการจองรถรอบนี้ ที่นั่งจะถูกคืนให้ผู้อื่นได้จองต่อ"
        details={schedule ? [
          { label: 'สายรถ', value: schedule.route },
          { label: 'วันที่', value: schedule.departureTime ? schedule.departureTime.split(' ')[0] : '' },
          { label: 'เวลา', value: schedule.departureTime ? schedule.departureTime.split(' ')[1].substring(0, 5) : '' },
        ] : []}
        variant="danger"
        confirmText="ยืนยันยกเลิก"
        cancelText="เก็บการจองไว้"
      />
      
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
