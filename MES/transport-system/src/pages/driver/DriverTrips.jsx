import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusFront, MapPin, Clock, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { schedulesAPI, masterAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const DriverTrips = () => {
  const { driverVehicleId } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDriverData = async () => {
      if (!driverVehicleId) {
        setLoading(false);
        navigate('/driver', { replace: true });
        return;
      }
      
      const vehicleId = driverVehicleId;

      try {
        const [allSchedules, fleetData] = await Promise.all([
          schedulesAPI.getSchedules(),
          masterAPI.getFleet(),
        ]);

        const myVehicle = fleetData.find(v => v.id === vehicleId);
        setVehicle(myVehicle || null);

        const today = new Date().toISOString().split('T')[0];
        const myTrips = (allSchedules || [])
          .filter(t => {
            const tripDate = t.date || (t.departureTime ? t.departureTime.split(' ')[0] : '');
            return t.vehicleId === vehicleId && tripDate === today;
          })
          .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));

        setTrips(myTrips);
      } catch (err) {
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };
    loadDriverData();
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
          <span>{vehicle.type}</span>
        </p>
      </div>

      {trips.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 text-center border border-gray-200 dark:border-gray-700 shadow-sm mt-8">
          <CheckCircle2 size={48} className="mx-auto text-emerald-400 dark:text-emerald-500 mb-4 opacity-50" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">ไม่มีรอบวิ่งแล้ว</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">คุณไม่มีรอบรถที่ต้องรับผิดชอบในวันนี้ พักผ่อนได้เลย!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map(trip => {
            const isPast = new Date(trip.departureTime) < new Date();
            const bookedCount = trip.bookedCount || 0;
            const capacity = trip.capacity || 1;
            const percent = Math.round((bookedCount / capacity) * 100);

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
                    {trip.departureTime ? trip.departureTime.split(' ')[1].substring(0, 5) : ''} น.
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <Users size={14} /> ผู้โดยสารจองมาแล้ว {bookedCount} คน
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
