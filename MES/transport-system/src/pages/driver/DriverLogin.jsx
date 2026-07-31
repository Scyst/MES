import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, KeyRound } from 'lucide-react';

/**
 * DriverLogin — Mock login for drivers.
 * Drivers select their vehicle (from Master Data) to identify themselves.
 */
const DriverLogin = () => {
  const [fleet, setFleet] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already logged in
    const savedVehicleId = localStorage.getItem('driver_vehicle_id');
    if (savedVehicleId) {
      navigate('/driver/trips', { replace: true });
    }

    // Load fleet from Master Data
    const savedFleet = JSON.parse(localStorage.getItem('fleet')) || [];
    setFleet(savedFleet);
  }, [navigate]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    localStorage.setItem('driver_vehicle_id', selectedVehicle);
    navigate('/driver/trips', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 text-gray-900 dark:text-gray-100">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-sm w-full text-center">
        
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Bus size={32} />
        </div>
        
        <h1 className="text-2xl font-black mb-2">เข้าสู่ระบบคนขับรถ</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
          เลือกรถที่คุณประจำการในวันนี้
        </p>

        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ยานพาหนะ</label>
            <select
              required
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
            >
              <option value="" disabled>-- เลือกรถของคุณ --</option>
              {fleet.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.licensePlate})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 mt-4 text-white font-bold text-base bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition-colors flex justify-center items-center gap-2"
          >
            <KeyRound size={20} />
            เข้าสู่ระบบ
          </button>
        </form>

        {fleet.length === 0 && (
          <p className="mt-6 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
            ยังไม่มีข้อมูลยานพาหนะในระบบ กรุณาติดต่อ Admin ให้เพิ่มข้อมูลใน Master Data ก่อน
          </p>
        )}
      </div>
    </div>
  );
};

export default DriverLogin;
