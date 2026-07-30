import { useStore } from '../../store/useStore';
import { Bus, Users, DollarSign, Activity, Hexagon } from 'lucide-react';

const AdminDashboard = () => {
  const { data } = useStore();

  const totalCost = data.tripBillings.reduce((sum, trip) => sum + trip.cost, 0);
  const totalPassengers = data.tripBillings.reduce((sum, trip) => sum + trip.passengers.length, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-end border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-3">
            <Hexagon className="text-blue-600 dark:text-blue-500" size={28} />
            ภาพรวมระบบ
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">สรุปข้อมูลการใช้บริการรถขนส่งพนักงานแบบเรียลไทม์</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="card p-5 group flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">รถขนส่งทั้งหมด</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{data.vehicles.length} <span className="text-base font-normal text-gray-500">คัน</span></h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Bus size={24} />
          </div>
        </div>
        
        <div className="card p-5 group flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">รอบบิลสรุปยอด</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{data.tripBillings.length} <span className="text-base font-normal text-gray-500">บิล</span></h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity size={24} />
          </div>
        </div>

        <div className="card p-5 group flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ผู้โดยสารรวม</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">{totalPassengers} <span className="text-base font-normal text-gray-500">คน</span></h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
        </div>

        <div className="card p-5 group flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ค่าใช้จ่ายรวมทั้งหมด</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
              ฿{totalCost.toLocaleString()}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      <div className="card mt-8 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity size={20} className="text-emerald-500" /> 
            สถานะการขึ้นรถล่าสุด (Recent Scans)
          </h2>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Live</span>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {data.scans.slice(-5).reverse().map(scan => {
            const v = data.vehicles.find(vh => vh.id === scan.vehicleId);
            return (
              <div key={scan.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{scan.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-1"><Bus size={12} className="text-blue-500" /> {v ? v.name : 'Unknown'}</span>
                      <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[10px] font-semibold border border-blue-100 dark:border-blue-800/50">{scan.bu}</span>
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {new Date(scan.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
          {data.scans.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              ยังไม่มีประวัติการขึ้นรถ
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
