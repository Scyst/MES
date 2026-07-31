import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusFront, MapPin, Clock, Users, ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * DriverTrips — Dashboard for drivers showing their assigned trips for today.
 */
const DriverTrips = () => {
  const [vehicle, setVehicle] = useState(null);
  const [trips, setTrips] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const vehicleId = localStorage.getItem('driver_vehicle_id');
    if (!vehicleId) return;

    // Get vehicle info
    const fleet = JSON.parse(localStorage.getItem('fleet')) || [];
    const myVehicle = fleet.find(v => v.id === vehicleId);
    setVehicle(myVehicle);

    // Get today's trips for this vehicle
    const allTrips = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
    const today = new Date().toISOString().split('T')[0];
    
    // For testing/prototype, we might want to see all upcoming trips, 
    // but typically a driver only cares about today.
    // Let's show today's trips, sorted by time.
    const myTrips = allTrips
      .filter(t => t.vehicleId === vehicleId && t.date === today)
      .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
      
    setTrips(myTrips);
  }, []);

  if (!vehicle) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen px-4 pt-6 pb-6">
      
      {/* Header Info */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">รอบวิ่งวันนี้</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
          <BusFront size={16} /> 
          <span className="font-bold text-gray-700 dark:text-gray-300">{vehicle.licensePlate}</span>
          <span>·</span>
          <span>{vehicle.name}</span>
        </p>
      </div>

      {trips.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 text-center border border-gray-200 dark:border-gray-700 shadow-sm mt-8">
          <CheckCircle2 size={48} className="mx-auto text-emerald-400 dark:text-emerald-500 mb-4 opacity-50" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">ไม่มีรอบวิ่งแล้ว</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">คุณไม่มีรอบรถที่ต้องรับผิดชอบในวันนี้พักผ่อนได้เลย!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map(trip => {
            const isPast = new Date(trip.departureTime) < new Date();
            const percent = Math.round(((trip.bookedCount || 0) / (trip.capacity || 12)) * 100);

            return (
              <div 
                key={trip.id}
                onClick={() => navigate(`/driver/trips/${trip.id}`)}
                className={`bg-white dark:bg-gray-800 rounded-2xl border ${
                  isPast 
                    ? 'border-gray-200 dark:border-gray-700 opacity-60' 
                    : 'border-blue-200 dark:border-blue-800/50 shadow-md'
                } p-5 cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                    <MapPin size={16} className={isPast ? "text-gray-400" : "text-blue-500"} />
                    {trip.route}
                  </div>
                  <span className={`text-sm font-black px-2.5 py-1 rounded-lg ${
                    isPast 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-500' 
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  }`}>
                    {new Date(trip.departureTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Users size={14} /> ผู้โดยสารจองมาแล้ว {trip.bookedCount || 0} คน
                    </span>
                    <span>{percent}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        isPast ? 'bg-gray-400' : percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <span className={`text-xs font-bold ${isPast ? 'text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {isPast ? 'รอบรถเสร็จสิ้นแล้ว' : 'แตะเพื่อจัดการผู้โดยสาร'}
                  </span>
                  <ArrowRight size={16} className={isPast ? 'text-gray-400' : 'text-blue-500'} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DriverTrips;
