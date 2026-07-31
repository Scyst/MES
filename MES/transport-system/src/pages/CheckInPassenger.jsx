import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bus, CheckCircle2, User, Building2, AlertTriangle, Clock, MapPin, QrCode } from 'lucide-react';

/**
 * CheckInPassenger — QR landing page for driver-side scanning.
 *
 * Supports two QR formats:
 *   1. Legacy: ?vehicleId=xxx   (old Zustand-based QR codes)
 *   2. New:    ?tripId=xxx      (scheduled trip QR codes from ManageVehicles/ScheduleDetails)
 *
 * Data source: localStorage keys "fleet" and "scheduledTrips" + "bookings"
 * — fully decoupled from the old Zustand store.
 */
const CheckInPassenger = () => {
  const [searchParams] = useSearchParams();
  const vehicleId = searchParams.get('vehicleId');
  const tripId = searchParams.get('tripId');

  // Resolved context
  const [vehicle, setVehicle] = useState(null);
  const [trip, setTrip] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [bookedPassengers, setBookedPassengers] = useState([]);

  // Form state
  const [name, setName] = useState('');
  const [bu, setBu] = useState('');
  const [empId, setEmpId] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [matchedBooking, setMatchedBooking] = useState(null);
  const [isExtra, setIsExtra] = useState(false);

  useEffect(() => {
    // Load departments from Master Data
    const savedDepts = JSON.parse(localStorage.getItem('departments')) || [];
    setDepartments(savedDepts);

    // Pre-fill name from last visit
    const savedName = localStorage.getItem('passenger_name');
    const savedBu = localStorage.getItem('passenger_bu');
    const savedEmpId = localStorage.getItem('passenger_empId');
    if (savedName) setName(savedName);
    if (savedBu) setBu(savedBu);
    if (savedEmpId) setEmpId(savedEmpId);

    // Resolve vehicle + trip from localStorage
    const fleet = JSON.parse(localStorage.getItem('fleet')) || [];
    const allTrips = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
    const allBookings = JSON.parse(localStorage.getItem('bookings')) || [];

    if (tripId) {
      // New-format QR: tripId
      const foundTrip = allTrips.find(t => t.id === tripId);
      if (foundTrip) {
        setTrip(foundTrip);
        const foundVehicle = fleet.find(v => v.id === foundTrip.vehicleId);
        setVehicle(foundVehicle || null);
        // Get passengers who booked this trip
        const tripBookings = allBookings.filter(b => b.scheduledTripId === tripId && b.status !== 'CANCELLED');
        setBookedPassengers(tripBookings);
      }
    } else if (vehicleId) {
      // Legacy-format QR: vehicleId only
      const foundVehicle = fleet.find(v => v.id === vehicleId);
      setVehicle(foundVehicle || null);
    }
  }, [tripId, vehicleId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !bu) return;

    // Save for next time
    localStorage.setItem('passenger_name', name);
    localStorage.setItem('passenger_bu', bu);
    if (empId) localStorage.setItem('passenger_empId', empId);

    const allBookings = JSON.parse(localStorage.getItem('bookings')) || [];

    if (trip) {
      // Try to find a matching pre-booked ticket
      const booking = allBookings.find(b =>
        b.scheduledTripId === trip.id &&
        b.status === 'BOOKED' &&
        (b.empId === empId || b.name === name)
      );

      if (booking) {
        // Mark as BOARDED
        const updatedBookings = allBookings.map(b =>
          b.id === booking.id ? { ...b, status: 'BOARDED', boardedAt: new Date().toISOString() } : b
        );
        localStorage.setItem('bookings', JSON.stringify(updatedBookings));
        setMatchedBooking(booking);
        setIsExtra(false);
      } else {
        // Extra passenger (walk-in / no pre-booking)
        const extraBooking = {
          id: `BKG-EXTRA-${Date.now()}`,
          scheduledTripId: trip.id,
          empId: empId || `WALK-${Date.now()}`,
          name,
          bu,
          status: 'BOARDED',
          bookedAt: new Date().toISOString(),
          boardedAt: new Date().toISOString(),
          isExtra: true,
        };
        const updatedBookings = [...allBookings, extraBooking];
        // Also bump bookedCount on trip
        const allTrips = JSON.parse(localStorage.getItem('scheduledTrips')) || [];
        const updatedTrips = allTrips.map(t =>
          t.id === trip.id ? { ...t, bookedCount: (t.bookedCount || 0) + 1 } : t
        );
        localStorage.setItem('bookings', JSON.stringify(updatedBookings));
        localStorage.setItem('scheduledTrips', JSON.stringify(updatedTrips));
        setMatchedBooking(extraBooking);
        setIsExtra(true);
      }
    }

    setIsSubmitted(true);
  };

  // ─── Error: QR not recognized ───────────────────────────────────────────────
  if (!vehicleId && !tripId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-sm w-full text-center">
          <AlertTriangle className="mx-auto text-amber-400 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">QR Code ไม่ถูกต้อง</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">ไม่พบข้อมูลรอบรถในลิงก์นี้ กรุณาสแกน QR ใหม่อีกครั้ง</p>
        </div>
      </div>
    );
  }

  // ─── Error: trip/vehicle not found in localStorage ────────────────────────
  if ((tripId && !trip) || (vehicleId && !vehicle && !trip)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-sm w-full text-center">
          <Bus className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">ไม่พบข้อมูลรถ</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">QR Code นี้อาจหมดอายุแล้ว หรือรอบรถถูกยกเลิก</p>
        </div>
      </div>
    );
  }

  // ─── Success Screen ─────────────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">เช็คอินสำเร็จ!</h2>
          {isExtra && (
            <span className="inline-block mb-3 px-3 py-1 text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
              ผู้โดยสารเพิ่มเติม (ไม่ได้จองล่วงหน้า)
            </span>
          )}
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">บันทึกการขึ้นรถของคุณเรียบร้อยแล้ว</p>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 text-left border border-gray-100 dark:border-gray-700 mb-6 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">ชื่อ</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">สังกัด</span>
              <span className="font-bold text-gray-800 dark:text-gray-200">{bu}</span>
            </div>
            {trip && (
              <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-2.5">
                <span className="text-sm text-gray-500 dark:text-gray-400">สายรถ</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{trip.route}</span>
              </div>
            )}
            {vehicle && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">ทะเบียน</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">{vehicle.licensePlate}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">เวลาที่บันทึก</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400">{new Date().toLocaleTimeString('th-TH')}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setIsSubmitted(false);
              setName('');
              setBu('');
              setEmpId('');
              setMatchedBooking(null);
            }}
            className="w-full py-3 text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
          >
            สแกนพนักงานคนถัดไป
          </button>
        </div>
      </div>
    );
  }

  // ─── Check-in Form ──────────────────────────────────────────────────────────
  const boardedCount = bookedPassengers.filter(b => b.status === 'BOARDED').length;
  const bookedCount = bookedPassengers.filter(b => b.status === 'BOOKED').length;
  const capacity = trip?.capacity || vehicle?.capacity || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 text-gray-900 dark:text-gray-100">
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
            <QrCode size={28} />
          </div>
          <h1 className="text-xl font-bold mb-1">เช็คอินขึ้นรถพนักงาน</h1>

          {/* Trip / Vehicle Info Badge */}
          <div className="inline-flex flex-col items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl mt-2 w-full">
            {trip ? (
              <>
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-200">
                  <MapPin size={14} className="text-blue-500" />
                  {trip.route}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(trip.departureTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                  </span>
                  {vehicle && (
                    <span className="flex items-center gap-1">
                      <Bus size={12} />
                      {vehicle.licensePlate}
                    </span>
                  )}
                </div>
                {capacity > 0 && (
                  <div className="w-full mt-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">ขึ้นรถแล้ว {boardedCount} / {capacity}</span>
                      <span className="text-amber-500">รอขึ้น {bookedCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${Math.min((boardedCount / capacity) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : vehicle ? (
              <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {vehicle.licensePlate}
              </div>
            ) : null}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee ID (optional but recommended) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">รหัสพนักงาน <span className="text-gray-400 font-normal">(ถ้ามี)</span></label>
            <input
              type="text"
              value={empId}
              onChange={e => setEmpId(e.target.value)}
              placeholder="เช่น 1096902163"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">ชื่อ - นามสกุล <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400 dark:text-gray-500" />
              </div>
              <input
                required
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ระบุชื่อ-นามสกุล"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* BU */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">สังกัด (แผนก/ฝ่าย) <span className="text-red-500">*</span></label>
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
                <option value="" disabled>เลือกแผนก/ฝ่ายของคุณ</option>
                {departments.length > 0 ? (
                  departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name} {d.code ? `(${d.code})` : ''}</option>
                  ))
                ) : (
                  // Fallback if Master Data not set up yet
                  ['Toolbox', 'OEM', 'Pipe', 'Sheet Metal', 'Plastic', 'Corporate'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 text-white font-bold text-base bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition-colors mt-4 flex justify-center items-center gap-2"
          >
            <CheckCircle2 size={20} />
            ยืนยันการขึ้นรถ
          </button>
        </form>
      </div>

      <div className="mt-6 text-center text-gray-400 dark:text-gray-500 text-xs tracking-wider">
        <p>SNC FORMER PUBLIC COMPANY LIMITED</p>
      </div>
    </div>
  );
};

export default CheckInPassenger;
