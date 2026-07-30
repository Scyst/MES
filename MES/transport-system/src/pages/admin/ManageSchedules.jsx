import { useState, useEffect } from 'react';
import { Plus, Clock, Users, ArrowRight, Trash2, CalendarDays } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">จัดรอบรถล่วงหน้า (Pre-book)</h2>
          <p className="text-gray-500 dark:text-gray-400">สร้างรอบรถเพื่อให้พนักงานจองที่นั่งล่วงหน้า</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus size={20} />
          เพิ่มรอบรถ
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 mb-4">
            <CalendarDays size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">ยังไม่มีรอบรถ</h3>
          <p className="text-gray-500 dark:text-gray-400">คลิก "เพิ่มรอบรถ" เพื่อเปิดให้พนักงานจองที่นั่ง</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {schedules.map((schedule) => (
            <div 
              key={schedule.id}
              onClick={() => navigate(`/admin/schedules/${schedule.id}`)}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full text-xs font-semibold mb-2">
                    {schedule.status}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{schedule.route}</h3>
                </div>
                <button
                  onClick={(e) => handleDelete(e, schedule.id)}
                  className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="ลบรอบรถ"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Clock size={18} className="mr-3 text-gray-400" />
                  <span>เวลาออก: <strong className="text-gray-900 dark:text-white">{new Date(schedule.departureTime).toLocaleString('th-TH')}</strong></span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <Users size={18} className="mr-3 text-gray-400" />
                  <span>ผู้จอง: <strong className="text-gray-900 dark:text-white">{schedule.bookedCount} / {schedule.capacity}</strong> ที่นั่ง</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <div className="w-[18px] mr-3 flex justify-center text-gray-400">🚗</div>
                  <span>ทะเบียน: <span className="text-gray-900 dark:text-white">{schedule.vehicleName}</span></span>
                </div>
              </div>
              
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                  ดูรายชื่อผู้จอง <ArrowRight size={16} className="ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
