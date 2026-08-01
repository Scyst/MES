import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, CheckCircle2, Search, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { schedulesAPI, bookingsAPI, masterAPI } from '../../services/api';

const DriverTripDetails = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  
  const [trip, setTrip] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState('waiting');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [walkinForm, setWalkinForm] = useState({ empId: '', name: '', bu: '' });
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [tripId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allSchedules, tripBookings, deptData] = await Promise.all([
        schedulesAPI.getSchedules(),
        bookingsAPI.getBookings({ scheduleId: tripId }),
        masterAPI.getDepartments(),
      ]);
      const currentTrip = (allSchedules || []).find(t => t.id === tripId);
      setTrip(currentTrip || null);
      setPassengers(tripBookings || []);
      setDepartments(deptData || []);
    } catch (err) {
      setPassengers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckIn = async (bookingId) => {
    try {
      await bookingsAPI.boardPassenger(bookingId);
      setPassengers(prev =>
        prev.map(p => p.id === bookingId
          ? { ...p, status: 'BOARDED', boardedAt: new Date().toISOString() }
          : p
        )
      );
    } catch (err) {
      // Silent fail — passenger stays in waiting list
    }
  };

  const handleAddWalkin = async (e) => {
    e.preventDefault();
    if (!walkinForm.empId || !walkinForm.name) return;
    setWalkinSubmitting(true);
    try {
      await bookingsAPI.addBooking({
        scheduledTripId: tripId,
        empId: walkinForm.empId,
        name: walkinForm.name,
        bu: walkinForm.bu || '',
        isExtra: true,
      });
      setWalkinForm({ empId: '', name: '', bu: '' });
      setShowWalkinModal(false);
      setActiveTab('boarded');
      await loadData();
    } catch (err) {
      // Silent fail — modal stays open so driver can retry
    } finally {
      setWalkinSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!trip) return null;

  const waitingList = passengers.filter(p => p.status === 'BOOKED');
  const boardedList = passengers.filter(p => p.status === 'BOARDED');

  const filteredList = (activeTab === 'waiting' ? waitingList : boardedList).filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.empId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const capacity = trip.capacity || 1;
  const percent = Math.round((boardedList.length / capacity) * 100);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col font-sans transition-colors duration-300">
      
      {/* Header (Sticky) */}
      <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm px-4 py-4 flex flex-col gap-4">
        
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center flex-1 px-2">
            <h1 className="font-black text-gray-900 dark:text-white truncate">{trip.route}</h1>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-0.5">
              {trip.departureTime ? trip.departureTime.split(' ')[1].substring(0, 5) : ''} น.
            </p>
          </div>
          <div className="w-10"></div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-gray-600 dark:text-gray-400">ขึ้นรถแล้ว {boardedList.length} / ความจุ {trip.capacity}</span>
            <span className={percent >= 100 ? 'text-red-500' : 'text-blue-600'}>{percent}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all duration-500 ${percent >= 100 ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('waiting')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
              activeTab === 'waiting' 
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            รอขึ้นรถ ({waitingList.length})
          </button>
          <button 
            onClick={() => setActiveTab('boarded')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
              activeTab === 'boarded' 
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            ขึ้นรถแล้ว ({boardedList.length})
          </button>
        </div>
        
        {/* Search & Walk-in */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือรหัส..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-none rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
            />
          </div>
          <button 
            onClick={() => setShowWalkinModal(true)}
            className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            <UserPlus size={18} />
            <span className="hidden sm:inline">เสริม</span>
          </button>
        </div>
      </div>

      {/* Passenger List */}
      <div className="flex-1 p-4 pb-20">
        <div className="space-y-3">
          {filteredList.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <AlertCircle size={40} className="mx-auto mb-3 opacity-50" />
              <p className="font-bold text-sm">ไม่พบรายชื่อในหมวดหมู่นี้</p>
            </div>
          ) : (
            filteredList.map(p => (
              <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    {p.name}
                    {p.isExtra && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-black">
                        Walk-in
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">{p.empId} • {p.bu}</p>
                </div>
                
                {activeTab === 'waiting' ? (
                  <button 
                    onClick={() => handleManualCheckIn(p.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl shadow-sm transition-colors active:scale-90"
                  >
                    <CheckCircle2 size={20} />
                  </button>
                ) : (
                  <div className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                    <CheckCircle2 size={20} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Walk-in Modal */}
      <AnimatePresence>
        {showWalkinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowWalkinModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl overflow-hidden shadow-xl z-10 border border-gray-200 dark:border-gray-700"
            >
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="text-emerald-500" size={20} /> เพิ่มผู้โดยสารเสริม
                </h3>
                <button 
                  onClick={() => setShowWalkinModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleAddWalkin} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">รหัสพนักงาน</label>
                  <input 
                    type="text" 
                    required 
                    value={walkinForm.empId}
                    onChange={(e) => setWalkinForm({...walkinForm, empId: e.target.value})}
                    placeholder="เช่น 100234"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">ชื่อ-สกุล</label>
                  <input 
                    type="text" 
                    required 
                    value={walkinForm.name}
                    onChange={(e) => setWalkinForm({...walkinForm, name: e.target.value})}
                    placeholder="นาย สมชาย ใจดี"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">สังกัด / BU</label>
                  <select
                    value={walkinForm.bu}
                    onChange={(e) => setWalkinForm({...walkinForm, bu: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none appearance-none"
                  >
                    <option value="">-- ระบุหรือไม่ก็ได้ --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit"
                  disabled={walkinSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl mt-4 shadow-sm active:scale-95 transition-transform"
                >
                  {walkinSubmitting ? 'กำลังบันทึก...' : 'ยืนยันเพิ่มและเช็คอิน'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DriverTripDetails;
