import { useParams, Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { ArrowLeft, Users, CheckCircle2, DollarSign, Building2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const TripDetails = () => {
  const { tripId } = useParams();
  const { data } = useStore();
  const trip = data.tripBillings.find(t => t.id === tripId);
  const vehicle = trip ? data.vehicles.find(v => v.id === trip.vehicleId) : null;

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-500 dark:text-gray-400">
        <Building2 size={64} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-xl font-bold">ไม่พบข้อมูลรอบการเดินทาง</h2>
        <Link to="/admin/trips" className="mt-4 text-blue-600 dark:text-blue-400 hover:underline">กลับไปหน้าจัดการรอบรถ</Link>
      </div>
    );
  }

  // Cost calculation
  const totalCost = trip.cost;
  const totalPassengers = trip.passengers.length;
  const costPerPerson = totalPassengers > 0 ? totalCost / totalPassengers : 0;

  // Group by BU
  const buCounts = {};
  trip.passengers.forEach(p => {
    buCounts[p.bu] = (buCounts[p.bu] || 0) + 1;
  });

  const chartData = Object.keys(buCounts).map(bu => ({
    name: bu,
    value: buCounts[bu] * costPerPerson,
    count: buCounts[bu]
  }));

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm shadow-lg">
          <p className="font-bold text-gray-900 dark:text-gray-100 mb-1">{payload[0].name}</p>
          <p className="text-emerald-600 dark:text-emerald-400">ค่าใช้จ่าย: ฿{payload[0].value.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
        <Link to="/admin/trips" className="p-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-full transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-2">
            รายละเอียดรอบรถ <span className="text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md text-xl">{trip.id}</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{vehicle?.name} ({trip.date} | {trip.startTime} - {trip.endTime})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-5 group flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ราคาเหมารวม</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">฿{totalCost.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign size={24} />
          </div>
        </div>
        
        <div className="card p-5 group flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">คนขึ้นรถจริง</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totalPassengers} <span className="text-base font-normal text-gray-500">คน</span></h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
        </div>
        
        <div className="card p-5 group flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">เฉลี่ยต่อหัว (Cost/Head)</p>
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-500 mt-1">
              ฿{costPerPerson.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BU Chart */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4">
            <Building2 size={20} className="text-blue-600 dark:text-blue-500" /> สรุปค่าใช้จ่ายแยกตาม BU
          </h2>
          {totalPassengers > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => <span className="text-gray-700 dark:text-gray-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              ไม่มีข้อมูลผู้โดยสาร
            </div>
          )}
          
          <div className="mt-6 space-y-3">
            {chartData.map((d, i) => (
              <div key={d.name} className="flex justify-between items-center p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{d.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                    {d.count} คน
                  </span>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ฿{d.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Passenger List */}
        <div className="card p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4">
            <Users size={20} className="text-emerald-600 dark:text-emerald-500" /> รายชื่อคนสแกนขึ้นรถ
          </h2>
          <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
            {trip.passengers.length > 0 ? trip.passengers.map((p, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                      {new Date(p.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-md border border-blue-100 dark:border-blue-800/30">
                  {p.bu}
                </span>
              </div>
            )) : (
              <div className="text-center py-16 text-gray-500 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                ยังไม่มีข้อมูลคนขึ้นรถในช่วงเวลาดังกล่าว
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetails;
