import { useNavigate } from 'react-router-dom';
import { Bus, Users, ShieldCheck, ArrowRight } from 'lucide-react';

const Portal = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 mb-4">
          <Bus size={32} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          SNC Transport System
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
          เลือกระบบที่คุณต้องการเข้าใช้งาน
        </p>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        
        {/* Passenger App */}
        <button
          onClick={() => navigate('/booking')}
          className="flex flex-col text-left bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-blue-500 dark:hover:border-blue-500 transition-all group relative overflow-hidden"
        >
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ระบบพนักงาน</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-1">
            สำหรับพนักงานเพื่อจองตั๋วรถล่วงหน้า ดูประวัติการเดินทาง และจัดการข้อมูลส่วนตัว
          </p>
          <div className="flex items-center text-blue-600 dark:text-blue-400 font-bold text-sm">
            เข้าใช้งาน <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Driver App */}
        <button
          onClick={() => navigate('/driver')}
          className="flex flex-col text-left bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:amber-500 dark:hover:border-amber-500 transition-all group relative overflow-hidden"
        >
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Bus size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ระบบคนขับรถ</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-1">
            สำหรับพนักงานขับรถเพื่อดูรอบวิ่ง สแกนรับผู้โดยสารขึ้นรถ และจัดการสถานะการเดินรถ
          </p>
          <div className="flex items-center text-amber-600 dark:text-amber-400 font-bold text-sm">
            เข้าใช้งาน <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Admin App */}
        <button
          onClick={() => navigate('/admin')}
          className="flex flex-col text-left bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:emerald-500 dark:hover:border-emerald-500 transition-all group relative overflow-hidden"
        >
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ระบบผู้ดูแล (Admin)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex-1">
            สำหรับส่วนกลางเพื่อจัดการรอบรถ ดูภาพรวม จัดคิวผู้โดยสารตกค้าง และตรวจสอบต้นทุน
          </p>
          <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
            เข้าใช้งาน <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

      </div>
      
      <div className="mt-12 text-sm text-gray-400 font-medium">
        &copy; {new Date().getFullYear()} SNC FORMER PUBLIC COMPANY LIMITED
      </div>
    </div>
  );
};

export default Portal;
