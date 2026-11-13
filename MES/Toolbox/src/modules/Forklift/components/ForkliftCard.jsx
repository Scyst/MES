import React from 'react';
import { 
  Truck, Battery, BatteryCharging, BatteryWarning, MapPin, 
  User, Play, RotateCcw, Calendar, AlertTriangle, QrCode
} from 'lucide-react';

export default function ForkliftCard({ 
  forklift, 
  currentUserId, 
  isAdmin, 
  onInstantUse, 
  onReserve, 
  onReturn, 
  onOpenQr,
  onReportIssue
}) {
  const status = (forklift.status || 'AVAILABLE').toUpperCase();
  const battery = parseInt(forklift.current_battery != null ? forklift.current_battery : 100, 10);
  const activeBooking = forklift.active_booking;
  const isMyBooking = activeBooking && (activeBooking.user_id == currentUserId || isAdmin);

  // Status Badge Styling
  const getStatusBadge = () => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            พร้อมใช้งาน
          </span>
        );
      case 'IN_USE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            กำลังใช้งาน
          </span>
        );
      case 'CHARGING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <BatteryCharging className="w-3.5 h-3.5 text-blue-600 animate-bounce" />
            กำลังชาร์จไฟ
          </span>
        );
      case 'MAINTENANCE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            ซ่อมบำรุง
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  // Battery bar color
  const getBatteryColor = () => {
    if (battery >= 60) return 'bg-emerald-500';
    if (battery >= 20) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getBatteryTextColor = () => {
    if (battery >= 60) return 'text-emerald-700';
    if (battery >= 20) return 'text-amber-700';
    return 'text-rose-700 font-bold';
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
      status === 'IN_USE' 
        ? 'border-amber-200 ring-1 ring-amber-100' 
        : status === 'CHARGING'
        ? 'border-blue-200'
        : 'border-slate-200/90 hover:border-slate-300'
    }`}>
      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              status === 'IN_USE'
                ? 'bg-amber-100 text-amber-700'
                : status === 'CHARGING'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-700'
            }`}>
              <Truck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-base leading-tight truncate" title={forklift.code}>
                {forklift.code}
              </h3>
              <p className="text-xs text-slate-500 truncate" title={forklift.name}>
                {forklift.name || 'รถโฟล์คลิฟท์โรงงาน'}
              </p>
            </div>
          </div>
          <div className="shrink-0">{getStatusBadge()}</div>
        </div>

        {/* Battery Bar Gauge */}
        <div className="mt-3.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              {status === 'CHARGING' ? (
                <BatteryCharging className="w-3.5 h-3.5 text-blue-600" />
              ) : battery < 20 ? (
                <BatteryWarning className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-slate-500" />
              )}
              ระดับแบตเตอรี่
            </span>
            <span className={`font-mono text-xs font-semibold ${getBatteryTextColor()}`}>
              {battery}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${getBatteryColor()}`}
              style={{ width: `${Math.min(100, Math.max(5, battery))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Info Body */}
      <div className="p-4 sm:p-5 space-y-2.5 text-xs flex-grow">
        <div className="flex items-center justify-between text-slate-600">
          <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
            <MapPin className="w-3.5 h-3.5" />
            ตำแหน่งล่าสุด:
          </span>
          <span className="font-medium text-slate-800 truncate ml-2 text-right">
            {forklift.last_location || 'จุดชาร์จ'}
          </span>
        </div>

        {status === 'IN_USE' && (
          <>
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                <User className="w-3.5 h-3.5" />
                ผู้ใช้งานปัจจุบัน:
              </span>
              <span className="font-semibold text-amber-700 truncate ml-2 text-right">
                {forklift.current_driver || '-'}
              </span>
            </div>

            {activeBooking?.usage_details && (
              <div className="p-2 bg-amber-50/60 rounded-lg border border-amber-100 text-[11px] text-amber-900 leading-tight">
                <span className="font-semibold">งาน: </span>
                {activeBooking.usage_details}
              </div>
            )}
          </>
        )}

        {/* Upcoming bookings indicator */}
        {forklift.upcoming_bookings && forklift.upcoming_bookings.length > 0 && status !== 'IN_USE' && (
          <div className="pt-1 flex items-center gap-1 text-[11px] text-slate-500">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>มีคิวจองล่วงหน้า {forklift.upcoming_bookings.length} รายการ</span>
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
        {status === 'AVAILABLE' && (
          <>
            <button
              onClick={() => onInstantUse(forklift)}
              className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 text-white rounded-xl font-medium text-xs hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>เริ่มใช้ทันที</span>
            </button>
            <button
              onClick={() => onReserve(forklift)}
              className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-medium text-xs hover:bg-slate-100 active:scale-95 transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>จองล่วงหน้า</span>
            </button>
          </>
        )}

        {status === 'IN_USE' && (
          <button
            onClick={() => onReturn(forklift)}
            disabled={!isMyBooking && !isAdmin}
            className={`flex-1 min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-medium text-xs transition-all ${
              isMyBooking || isAdmin
                ? 'bg-amber-600 text-white hover:bg-amber-700 active:scale-95 shadow-xs'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isMyBooking || isAdmin ? 'บันทึกคืนรถ (Return)' : `ใช้งานโดย ${forklift.current_driver}`}</span>
          </button>
        )}

        {status === 'CHARGING' && (
          <button
            onClick={() => onInstantUse(forklift)}
            className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl font-medium text-xs hover:bg-blue-100 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>ดึงออกจากจุดชาร์จเพื่อใช้งาน</span>
          </button>
        )}

        {status === 'MAINTENANCE' && (
          <div className="flex-1 text-center py-1 text-slate-400 text-xs italic">
            อยู่ระหว่างการซ่อมบำรุง
          </div>
        )}

        <button
          type="button"
          onClick={() => onOpenQr?.(forklift)}
          title="แสดง QR Code ประจำรถ"
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors"
        >
          <QrCode className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onReportIssue?.(forklift)}
          title="แจ้งปัญหา / รถเสีย"
          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
