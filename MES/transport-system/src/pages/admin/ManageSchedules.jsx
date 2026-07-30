import { useState, useEffect } from 'react';
import { Plus, Clock, Users, ArrowRight, Trash2, CalendarDays, Download, Filter, MapPin, BusFront } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManageSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    route: '',
    departureTime: '',
    vehicleId: '',
  });
  
  const [selectedRoute, setSelectedRoute] = useState('ทั้งหมด');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Load mock data
    const savedSchedules = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
    const savedVehicles = JSON.parse(localStorage.getItem('vehicles')) || [];
    setSchedules(savedSchedules);
    setVehicles(savedVehicles);
  }, []);

  const handleAddSchedule = (e) => {
    e.preventDefault();
    const vehicle = vehicles.find(v => v.id === formData.vehicleId);
    if (!vehicle) return;

    const newSchedule = {
      id: Date.now().toString(),
      route: formData.route,
      departureTime: formData.departureTime,
      date: formData.departureTime.split('T')[0],
      vehicleId: vehicle.id,
      vehicleName: vehicle.licensePlate,
      capacity: vehicle.type === 'VAN' ? 12 : 40,
      bookedCount: 0,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };

    const updatedSchedules = [...schedules, newSchedule];
    setSchedules(updatedSchedules);
    localStorage.setItem('scheduledTrips', JSON.stringify(updatedSchedules));
    setShowAddModal(false);
    setFormData({ route: '', departureTime: '', vehicleId: '' });
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('ยืนยันการลบรอบรถนี้? การลบจะไม่สามารถกู้คืนได้')) {
      const updatedSchedules = schedules.filter(s => s.id !== id);
      setSchedules(updatedSchedules);
      localStorage.setItem('scheduledTrips', JSON.stringify(updatedSchedules));
    }
  };

  // Generate next 14 days for Date Picker (Admins might need to look further ahead)
  const dateStrip = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      dateStr: d.toISOString().split('T')[0],
      dayName: d.toLocaleDateString('th-TH', { weekday: 'short' }),
      dayNum: d.getDate(),
      isToday: i === 0
    };
  });

  const routesList = ['ทั้งหมด', ...Array.from(new Set(schedules.map(s => s.route)))];

  const filteredSchedules = schedules.filter(schedule => {
    const tripDate = schedule.departureTime.split('T')[0];
    const matchesDate = tripDate === selectedDate || schedule.date === selectedDate;
    const matchesRoute = selectedRoute === 'ทั้งหมด' || schedule.route === selectedRoute;
    return matchesDate && matchesRoute;
  });

  return (
    <div className="space-y-6 w-full">
      
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        
        <div className="flex-1 w-full sm:w-auto relative max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter size={18} className="text-gray-400" />
          </div>
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900 dark:text-white transition-all appearance-none"
          >
            {routesList.map(route => (
              <option key={route} value={route}>{route}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium shadow-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">เพิ่มรอบรถ</span>
          </button>
        </div>
      </div>

      {/* Date Strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
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

      {/* Compact Grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSchedules.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 mb-4">
              <CalendarDays size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">ยังไม่มีรอบรถในวันที่เลือก</h3>
            <p className="text-gray-500 dark:text-gray-400">คลิก "เพิ่มรอบรถ" เพื่อสร้างรอบรถใหม่</p>
          </div>
        ) : (
          filteredSchedules.map((schedule) => {
            const percent = (schedule.bookedCount / schedule.capacity) * 100;
            return (
              <div 
                key={schedule.id}
                onClick={() => navigate(`/admin/schedules/${schedule.id}`)}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between gap-4 transition-all hover:border-blue-300 cursor-pointer group"
              >
                
                {/* Info */}
                <div className="flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-gray-900 dark:text-white">{new Date(schedule.departureTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg">{schedule.route}</span>
                    <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-lg border border-blue-100 dark:border-blue-800/50 uppercase">
                      {schedule.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><MapPin size={12}/> {schedule.vehicleName}</span>
                    <span className="flex items-center gap-1">
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden flex">
                        <div className={`h-full ${percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                      </div>
                      จอง {schedule.bookedCount}/{schedule.capacity}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center text-blue-600 dark:text-blue-400 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    ดูรายชื่อผู้จอง <ArrowRight size={14} className="ml-1" />
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, schedule.id)}
                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                    title="ลบรอบรถ"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">สร้างรอบรถใหม่</h3>
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  เส้นทาง
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ระยอง - บ่อวิน"
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  เวลาออกเดินทาง
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.departureTime}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  เลือกรถ
                </label>
                <select
                  required
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">-- เลือกรถที่ต้องการใช้ --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} ({v.type === 'VAN' ? 'รถตู้' : 'รถบัส'} - {v.type === 'VAN' ? 12 : 40} ที่นั่ง)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSchedules;
