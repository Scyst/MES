import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, Battery, MapPin, AlertTriangle, RefreshCw, CheckCircle2, BatteryCharging } from 'lucide-react';
import { forkliftApi } from '../../../shared/services/forkliftApi';

export default function ReturnModal({ 
  isOpen, 
  onClose, 
  forklift, 
  onSuccess 
}) {
  if (!isOpen || !forklift) return null;

  const [endBattery, setEndBattery] = useState(forklift.current_battery || 80);
  const [parkLocation, setParkLocation] = useState('จุดชาร์จ');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const activeBooking = forklift.active_booking;

  useEffect(() => {
    setEndBattery(forklift.current_battery != null ? forklift.current_battery : 80);
    setParkLocation('จุดชาร์จ');
    setErrorMsg('');
    setSuccessMsg('');
  }, [isOpen, forklift]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeBooking?.booking_id) {
      setErrorMsg('ไม่พบข้อมูลรายการใช้งานที่เปิดอยู่');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        booking_id: activeBooking.booking_id,
        forklift_id: forklift.id,
        end_battery: parseInt(endBattery, 10),
        location: parkLocation.trim() || 'จุดชาร์จ'
      };

      const res = await forkliftApi.returnForklift(payload);
      if (res?.success) {
        setSuccessMsg(res.message || 'บันทึกการคืนรถสำเร็จ');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        setErrorMsg(res?.message || 'เกิดข้อผิดพลาดในการคืนรถ');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const isLowBattery = endBattery < 20;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">บันทึกคืนรถโฟล์คลิฟท์ (Return)</h3>
              <p className="text-xs text-slate-500 font-medium">
                {forklift.code} · ผู้ใช้งาน: {activeBooking?.user_name || forklift.current_driver}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Trip Summary Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">เริ่มใช้งาน:</span>
              <span className="font-mono font-medium text-slate-700">
                {activeBooking?.start_time ? new Date(activeBooking.start_time).toLocaleString('th-TH') : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">แบตเตอรี่ตอนเริ่ม:</span>
              <span className="font-mono font-semibold text-slate-800">
                {activeBooking?.start_battery != null ? `${activeBooking.start_battery}%` : '-'}
              </span>
            </div>
            {activeBooking?.usage_details && (
              <div className="flex justify-between">
                <span className="text-slate-500">งานที่ทำ:</span>
                <span className="text-slate-800 font-medium truncate max-w-[200px]">
                  {activeBooking.usage_details}
                </span>
              </div>
            )}
          </div>

          <form id="return-form" onSubmit={handleSubmit} className="space-y-4">
            {/* End Battery Gauge Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Battery className="w-4 h-4 text-slate-600" />
                  ระดับแบตเตอรี่ขณะคืน (%) <span className="text-rose-500">*</span>
                </label>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  isLowBattery ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-800'
                }`}>
                  {endBattery}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={endBattery}
                  onChange={(e) => setEndBattery(e.target.value)}
                  className={`flex-grow cursor-pointer h-2 bg-slate-200 rounded-lg ${
                    isLowBattery ? 'accent-rose-600' : 'accent-emerald-600'
                  }`}
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={endBattery}
                  onChange={(e) => setEndBattery(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                  className="w-16 px-2 py-1 text-center font-mono text-xs font-bold border border-slate-300 rounded-lg"
                />
              </div>

              {isLowBattery ? (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 mt-2">
                  <BatteryCharging className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    แบตเตอรี่ต่ำกว่า 20% กรุณานำรถเข้าจอดที่จุดชาร์จ ระบบจะเปลี่ยนสถานะเป็น <b>กำลังชาร์จไฟ</b> อัตโนมัติ
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1">
                  * ตรวจสอบว่าตรงกับเกจวัดที่หน้าปัดรถก่อนส่งคืน
                </p>
              )}
            </div>

            {/* Parking Location */}
            <div>
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                จุดที่จอดรถส่งคืน (Park Location) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={parkLocation}
                onChange={(e) => setParkLocation(e.target.value)}
                placeholder="เช่น จุดชาร์จ, หน้าสโตร B10, ลานโหลดตู้..."
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['จุดชาร์จ', 'หน้าสโตร B10', 'B10 ท้ายโรง', 'ลานจอดกลาง', 'ลานโหลดตู้'].map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setParkLocation(loc)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="return-form"
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-amber-600 text-white hover:bg-amber-700 active:scale-95 transition-all shadow-xs shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ยืนยันการคืนรถ</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
