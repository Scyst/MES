import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Bus, CheckCircle2, User, Building2 } from 'lucide-react';

const CheckInPassenger = () => {
  const [searchParams] = useSearchParams();
  const vehicleId = searchParams.get('vehicleId');
  
  const { data, checkInPassenger } = useStore();
  const vehicle = data.vehicles.find(v => v.id === vehicleId);

  // Form State
  const [name, setName] = useState('');
  const [bu, setBu] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load from local storage if previously used
  useEffect(() => {
    const savedName = localStorage.getItem('passenger_name');
    const savedBu = localStorage.getItem('passenger_bu');
    if (savedName) setName(savedName);
    if (savedBu) setBu(savedBu);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !bu) return;

    // Save for next time
    localStorage.setItem('passenger_name', name);
    localStorage.setItem('passenger_bu', bu);

    // Record check-in
    checkInPassenger(vehicleId, { name, bu });
    setIsSubmitted(true);
  };

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-sm w-full text-center">
          <Bus className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">ไม่พบข้อมูลรถ</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">QR Code อาจไม่ถูกต้อง โปรดสแกนใหม่อีกครั้ง</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-sm w-full text-center relative overflow-hidden">
          
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">เช็คอินสำเร็จ!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">บันทึกการขึ้นรถของคุณเรียบร้อยแล้ว</p>
          
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 text-left border border-gray-100 dark:border-gray-700 mb-8 space-y-3">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">รถขนส่ง</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">{vehicle.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">ทะเบียน</span>
              <span className="font-mono text-gray-700 dark:text-gray-300">{vehicle.licensePlate}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400">เวลาที่บันทึก</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">{new Date().toLocaleTimeString('th-TH')}</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsSubmitted(false)}
            className="w-full py-3 text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            แสกนให้พนักงานคนอื่น
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 relative overflow-hidden text-gray-900 dark:text-gray-100">
      
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md w-full animate-in slide-in-from-bottom-8 duration-500">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Bus size={28} />
          </div>
          <h1 className="text-xl font-bold mb-2">เช็คอินขึ้นรถพนักงาน</h1>
          <div className="inline-flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-3 py-1 rounded-full mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">{vehicle.name} <span className="text-gray-400 dark:text-gray-500 font-normal">({vehicle.licensePlate})</span></p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">ชื่อ - นามสกุล</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400 dark:text-gray-500" />
              </div>
              <input 
                required 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="ระบุชื่อ-นามสกุลของคุณ" 
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">สังกัด (BU)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Building2 size={18} className="text-gray-400 dark:text-gray-500" />
              </div>
              <select 
                required 
                value={bu} 
                onChange={e => setBu(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
              >
                <option value="" disabled>เลือก BU ของคุณ</option>
                {data.businessUnits.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-3.5 text-white font-medium text-base bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition-colors mt-6 flex justify-center items-center gap-2"
          >
            ยืนยันการขึ้นรถ
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center text-gray-500 dark:text-gray-400 text-xs tracking-wider">
        <p>SNC FORMER PUBLIC COMPANY LIMITED</p>
      </div>
    </div>
  );
};

export default CheckInPassenger;
