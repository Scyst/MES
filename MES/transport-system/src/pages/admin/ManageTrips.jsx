import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Link } from 'react-router-dom';
import { Plus, Search, Calendar, Clock, DollarSign, Users, ExternalLink, X, Bus, CheckCircle2, Route } from 'lucide-react';

const ManageTrips = () => {
  const { data, addTripBilling, deleteTripBilling } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [vehicleId, setVehicleId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [cost, setCost] = useState('');

  const filteredTrips = data.tripBillings.filter(t => 
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    addTripBilling({
      vehicleId,
      date,
      startTime,
      endTime,
      cost: parseFloat(cost) || 0
    });

    setShowAddModal(false);
    // Reset
    setVehicleId(''); setDate(''); setStartTime(''); setEndTime(''); setCost('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-3">
            <Route className="text-emerald-600 dark:text-emerald-500" size={28} />
            ค่าใช้จ่ายรอบรถ
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">ดึงข้อมูลการสแกนและสรุปค่าใช้จ่ายแบ่งตาม BU อัตโนมัติ</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={20} />
          สร้างรอบรถใหม่
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="ค้นหารหัสรอบรถ..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
          {filteredTrips.slice().reverse().map(trip => {
            const vehicle = data.vehicles.find(v => v.id === trip.vehicleId);
            return (
              <div key={trip.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col group hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
                      {trip.id}
                    </span>
                    <button 
                      onClick={() => {
                        if(window.confirm('คุณแน่ใจหรือไม่ที่จะลบข้อมูลรอบรถนี้? (ไม่กระทบข้อมูลการสแกน)')) deleteTripBilling(trip.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-colors -mr-2 -mt-2"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                  <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-4 flex items-start gap-2">
                    <Bus className="text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" size={18} />
                    {vehicle ? vehicle.name : 'Unknown Vehicle'}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-3 py-1">
                      <Calendar className="text-gray-400" size={16} />
                      <span>{trip.date}</span>
                    </div>
                    <div className="flex items-center gap-3 py-1">
                      <Clock className="text-gray-400" size={16} />
                      <span>{trip.startTime} - {trip.endTime}</span>
                    </div>
                    <div className="flex items-center gap-3 py-1 text-emerald-700 dark:text-emerald-400 font-medium">
                      <DollarSign size={16} />
                      <span>฿{trip.cost.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-3 py-1 text-blue-700 dark:text-blue-400 font-medium">
                      <Users size={16} />
                      <span>ผู้โดยสาร: {trip.passengers.length} คน</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700">
                  <Link 
                    to={`/admin/trips/${trip.id}`}
                    className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-2 rounded-lg transition-colors"
                  >
                    <ExternalLink size={16} />
                    ดูรายละเอียด
                  </Link>
                </div>
              </div>
            );
          })}
          {filteredTrips.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
              <Route size={48} className="text-gray-300 dark:text-gray-600 mb-4" />
              <p>ยังไม่มีการบันทึกข้อมูลรอบรถ</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Plus className="text-emerald-600 dark:text-emerald-500" size={20} />
                สร้างรอบรถใหม่
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  ระบบจะทำการดึงข้อมูลคนที่สแกน QR Code ประจำรถคันที่เลือก <strong className="font-semibold text-emerald-900 dark:text-emerald-100">เฉพาะในช่วงวันที่และเวลาที่คุณระบุ</strong> มาคำนวณแยก Cost Center ให้อัตโนมัติ
                </p>
              </div>

              <form id="add-trip-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">เลือกรถที่ให้บริการ</label>
                  <select 
                    required 
                    value={vehicleId} 
                    onChange={e => setVehicleId(e.target.value)} 
                    className="input-field"
                  >
                    <option value="" disabled>เลือกรถขนส่ง...</option>
                    {data.vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">วันที่ให้บริการ</label>
                  <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">เวลาสแกน (เริ่ม)</label>
                    <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">เวลาสแกน (สิ้นสุด)</label>
                    <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-field" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">ราคาเหมารถต่อเที่ยว (บาท)</label>
                  <input required type="number" min="0" value={cost} onChange={e => setCost(e.target.value)} placeholder="เช่น 1500" className="input-field" />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">
                ยกเลิก
              </button>
              <button type="submit" form="add-trip-form" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
                บันทึกรอบรถ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageTrips;
