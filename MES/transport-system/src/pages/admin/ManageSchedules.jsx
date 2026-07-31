import { useState, useEffect } from 'react';
import { Plus, Clock, Users, ArrowRight, Trash2, CalendarDays, Download, Filter, MapPin, BusFront, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ManageSchedules = () => {
  const [schedules, setSchedules] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [routes, setRoutes] = useState([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    route: '',
    date: new Date().toISOString().split('T')[0],
    timeSlotId: '',
    vehicleId: '',
  });
  
  const [selectedRoute, setSelectedRoute] = useState('ทั้งหมด');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('ทั้งหมด');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Load mock data
    const savedSchedules = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
    const savedFleet = JSON.parse(localStorage.getItem('fleet')) || [];
    const savedTimeSlots = JSON.parse(localStorage.getItem('timeSlots')) || [];
    const savedRoutes = JSON.parse(localStorage.getItem('routes')) || [];
    
    setSchedules(savedSchedules);
    setFleet(savedFleet);
    setTimeSlots(savedTimeSlots);
    setRoutes(savedRoutes);
  }, []);

  const handleAddSchedule = (e) => {
    e.preventDefault();
    const vehicle = fleet.find(v => v.id === formData.vehicleId);
    const timeSlot = timeSlots.find(ts => ts.id === formData.timeSlotId);
    if (!vehicle || !timeSlot) return;

    // Construct exact ISO departure time from date + timeSlot
    const departureTimeStr = `${formData.date}T${timeSlot.time}:00.000Z`;

    let updatedSchedules;

    if (editingId) {
      updatedSchedules = schedules.map(s => {
        if (s.id === editingId) {
          return {
            ...s,
            route: formData.route,
            departureTime: departureTimeStr,
            date: formData.date,
            timeSlotId: timeSlot.id,
            timeSlotName: timeSlot.name,
            vehicleId: vehicle.id,
            vehicleName: vehicle.licensePlate,
            capacity: vehicle.capacity,
            driverName: vehicle.driverName,
            driverPhone: vehicle.driverPhone,
            driverEmpId: vehicle.driverEmpId
          };
        }
        return s;
      });
    } else {
      const newSchedule = {
        id: Date.now().toString(),
        route: formData.route,
        departureTime: departureTimeStr,
        date: formData.date,
        timeSlotId: timeSlot.id,
        timeSlotName: timeSlot.name,
        vehicleId: vehicle.id,
        vehicleName: vehicle.licensePlate,
        capacity: vehicle.capacity,
        driverName: vehicle.driverName,
        driverPhone: vehicle.driverPhone,
        driverEmpId: vehicle.driverEmpId,
        bookedCount: 0,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        baseCost: vehicle.type === 'VAN' ? 1500 : 3500
      };
      updatedSchedules = [...schedules, newSchedule];
    }

    setSchedules(updatedSchedules);
    localStorage.setItem('scheduledTrips', JSON.stringify(updatedSchedules));
    setShowAddModal(false);
    setEditingId(null);
    
    // Reset form
    setFormData({ route: '', date: selectedDate, timeSlotId: '', vehicleId: '' });
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm('ยืนยันการลบรอบรถนี้? การลบจะไม่สามารถกู้คืนได้')) {
      const updatedSchedules = schedules.filter(s => s.id !== id);
      setSchedules(updatedSchedules);
      localStorage.setItem('scheduledTrips', JSON.stringify(updatedSchedules));
    }
  };

  const handleEditSchedule = (e, schedule) => {
    e.stopPropagation();
    setFormData({
      route: schedule.route,
      date: schedule.date || schedule.departureTime.split('T')[0],
      timeSlotId: schedule.timeSlotId,
      vehicleId: schedule.vehicleId
    });
    setEditingId(schedule.id);
    setShowAddModal(true);
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

  const filterRoutesList = ['ทั้งหมด', ...routes.map(r => r.name)];

  const filteredSchedules = schedules.filter(schedule => {
    // Some mock data might not have date field initialized properly if created before the change, so fallback to split
    const tripDate = schedule.date || schedule.departureTime.split('T')[0];
    const tripTime = new Date(schedule.departureTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'});
    
    const matchesDate = tripDate === selectedDate;
    const matchesRoute = selectedRoute === 'ทั้งหมด' || schedule.route === selectedRoute;
    const matchesTimeSlot = selectedTimeSlot === 'ทั้งหมด' || 
                            schedule.timeSlotName === selectedTimeSlot || 
                            tripTime === timeSlots.find(t => t.id === selectedTimeSlot)?.time;
    
    return matchesDate && matchesRoute && matchesTimeSlot;
  });

  return (
    <div className="space-y-6 w-full">
      
      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Route Filter */}
          <div className="relative flex-1 sm:w-48">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin size={16} className="text-gray-400" />
            </div>
            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900 dark:text-white transition-all appearance-none truncate"
            >
              {filterRoutesList.map(route => (
                <option key={route} value={route}>{route}</option>
              ))}
            </select>
          </div>

          {/* TimeSlot Filter */}
          <div className="relative flex-1 sm:w-48">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Clock size={16} className="text-gray-400" />
            </div>
            <select
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-900 dark:text-white transition-all appearance-none truncate"
            >
              <option value="ทั้งหมด">ทุกช่วงเวลา</option>
              {timeSlots.map(ts => (
                <option key={ts.id} value={ts.id}>{ts.name} ({ts.time})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => {
              setFormData({...formData, date: selectedDate});
              setShowAddModal(true);
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium shadow-sm"
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

      {/* Compact Grid - Changed to max 2 or 3 columns so cards have breathing room and don't squeeze */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredSchedules.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 mb-4">
              <CalendarDays size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">ยังไม่มีรอบรถ</h3>
            <p className="text-gray-500 dark:text-gray-400">ในวันที่และเงื่อนไขที่คุณเลือก คลิก "เพิ่มรอบรถ" เพื่อสร้างใหม่</p>
          </div>
        ) : (
          filteredSchedules.map((schedule) => {
            const percent = (schedule.bookedCount / schedule.capacity) * 100;
            return (
              <div 
                key={schedule.id}
                onClick={() => navigate(`/admin/schedules/${schedule.id}`)}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between gap-3 transition-all hover:border-blue-300 cursor-pointer group min-w-0"
              >
                
                {/* Info */}
                <div className="flex-1 flex flex-col gap-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-black text-gray-900 dark:text-white flex-shrink-0">
                      {new Date(schedule.departureTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-lg truncate max-w-[120px]">
                      {schedule.route}
                    </span>
                    {schedule.timeSlotName && (
                      <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-lg border border-amber-100 dark:border-amber-800/50 uppercase whitespace-nowrap">
                        {schedule.timeSlotName}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1 truncate"><MapPin size={12} className="flex-shrink-0"/> <span className="truncate">{schedule.vehicleName}</span></span>
                    <span className="flex items-center gap-1 flex-shrink-0">
                      <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden flex">
                        <div className={`h-full ${percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                      </div>
                      <span className="whitespace-nowrap">จอง {schedule.bookedCount}/{schedule.capacity}</span>
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 pl-2">
                  <button
                    onClick={(e) => handleEditSchedule(e, schedule)}
                    className="text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded-lg transition-colors"
                    title="แก้ไขรอบรถ"
                  >
                    <Pencil size={18} />
                  </button>
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
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              {editingId ? 'แก้ไขรอบรถ' : 'สร้างรอบรถใหม่'}
            </h3>
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  เส้นทาง
                </label>
                <select
                  required
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">-- เลือกสายรถ --</option>
                  {routes.map(r => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    วันที่วิ่ง
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ช่วงเวลา (กะ)
                  </label>
                  <select
                    required
                    value={formData.timeSlotId}
                    onChange={(e) => setFormData({ ...formData, timeSlotId: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="">-- เลือกเวลา --</option>
                    {timeSlots.map(ts => (
                      <option key={ts.id} value={ts.id}>{ts.name} ({ts.time})</option>
                    ))}
                  </select>
                </div>
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
                  {fleet.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} ({v.type === 'BUS' ? 'รถบัส' : v.type === 'CAR' ? 'รถส่วนบุคคล' : v.type === 'SONGTHAEW' ? 'รถสองแถว' : 'รถตู้'} - {v.capacity} ที่นั่ง) {v.driverName ? ` - พขร. ${v.driverName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                    setFormData({ route: '', date: selectedDate, timeSlotId: '', vehicleId: '' });
                  }}
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
