import React, { useState, useEffect } from 'react';

const ScheduleFormModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  initialData, 
  routes, 
  timeSlots, 
  fleet 
}) => {
  const [formData, setFormData] = useState({
    routeId: '',
    date: new Date().toISOString().split('T')[0],
    timeSlotId: '',
    vehicleId: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        routeId: '',
        date: new Date().toISOString().split('T')[0],
        timeSlotId: '',
        vehicleId: '',
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          {initialData?.id ? 'แก้ไขรอบรถ' : 'สร้างรอบรถใหม่'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              เส้นทาง
            </label>
            <select
              required
              value={formData.routeId}
              onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="">-- เลือกสายรถ --</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
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
              onClick={onClose}
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
  );
};

export default ScheduleFormModal;
