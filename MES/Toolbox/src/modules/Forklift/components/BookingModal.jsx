import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Calendar, MapPin, Battery, Clock, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { forkliftApi } from '../../../shared/services/forkliftApi';

export default function BookingModal({ 
  isOpen, 
  onClose, 
  forklift, 
  initialMode = 'INSTANT', 
  onSuccess 
}) {
  if (!isOpen || !forklift) return null;

  const [mode, setMode] = useState(initialMode); // 'INSTANT' or 'RESERVE'
  const [durationHours, setDurationHours] = useState(2);
  const [startBattery, setStartBattery] = useState(forklift.current_battery || 100);
  const [location, setLocation] = useState(forklift.last_location || 'Line 1');
  const [usageDetails, setUsageDetails] = useState('');

  // Reserve Mode State
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setStartBattery(forklift.current_battery != null ? forklift.current_battery : 100);
    setLocation(forklift.last_location || 'Line 1');
    setErrorMsg('');
    setSuccessMsg('');

    // Default reserve times: next hour
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const startStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    
    const end = new Date(now);
    end.setHours(end.getHours() + 2);
    const endStr = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setStartTime(startStr);
    setEndTime(endStr);
  }, [isOpen, forklift, initialMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!usageDetails.trim()) {
      setErrorMsg('กรุณากรอกรายละเอียดงานที่นำรถไปใช้');
      return;
    }

    if (!location.trim()) {
      setErrorMsg('กรุณาระบุพื้นที่ปฏิบัติงาน (เช่น Line 1, คลัง B)');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        forklift_id: forklift.id,
        booking_type: mode,
        usage_details: usageDetails.trim(),
        location: location.trim(),
        start_battery: parseInt(startBattery, 10)
      };

      if (mode === 'INSTANT') {
        payload.duration_hours = parseInt(durationHours, 10);
      } else {
        payload.start_time = startTime;
        payload.end_time_est = endTime;
      }

      const res = await forkliftApi.bookForklift(payload);
      if (res?.success) {
        setSuccessMsg(res.message || 'ทำรายการสำเร็จ');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1000);
      } else {
        setErrorMsg(res?.message || 'เกิดข้อผิดพลาดในการทำรายการ');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const commonAreas = ['Line 1 (Spot)', 'Line 2 (Bend)', 'Line 3 (Press)', 'คลังวัตถุดิบ (Store)', 'คลังสินค้าสำเร็จรูป (FG)', 'ลานโหลดตู้ (Loading)'];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
              mode === 'INSTANT' ? 'bg-emerald-600' : 'bg-blue-600'
            }`}>
              {mode === 'INSTANT' ? <Play className="w-5 h-5 fill-current" /> : <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">
                {mode === 'INSTANT' ? 'เริ่มใช้งานทันที (Walk-in Start)' : 'จองรถล่วงหน้า (Advance Booking)'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {forklift.code} · {forklift.name || 'รถโฟล์คลิฟท์'}
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

        {/* Mode Switch Tabs */}
        <div className="p-2 bg-slate-100/80 border-b border-slate-200 flex gap-1">
          <button
            type="button"
            onClick={() => setMode('INSTANT')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === 'INSTANT'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>เริ่มใช้งานทันที</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('RESERVE')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all ${
              mode === 'RESERVE'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>จองล่วงหน้าตามเวลา</span>
          </button>
        </div>

        {/* Modal Form */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form id="booking-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Battery Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                  <Battery className="w-4 h-4 text-emerald-600" />
                  ระดับแบตเตอรี่ก่อนใช้งาน (%)
                </label>
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                  {startBattery}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={startBattery}
                  onChange={(e) => setStartBattery(e.target.value)}
                  className="flex-grow accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={startBattery}
                  onChange={(e) => setStartBattery(Math.min(100, Math.max(1, parseInt(e.target.value) || 0)))}
                  className="w-16 px-2 py-1 text-center font-mono text-xs font-bold border border-slate-300 rounded-lg"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                * ตรวจสอบว่าตรงกับเกจวัดที่หน้าปัดรถก่อนนำออกไปใช้งาน
              </p>
            </div>

            {/* Time Settings based on Mode */}
            {mode === 'INSTANT' ? (
              <div>
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  ระยะเวลาที่คาดว่าจะใช้งาน
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 4, 8].map((hrs) => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setDurationHours(hrs)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        durationHours === hrs
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {hrs} ชั่วโมง
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    เริ่มเวลา
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    คืนเวลา (โดยประมาณ)
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Work Location */}
            <div>
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
                <MapPin className="w-4 h-4 text-slate-500" />
                พื้นที่ปฏิบัติงาน (Work Area)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น Line 1, คลัง B, ลานโหลดตู้..."
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {commonAreas.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setLocation(area)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            {/* Usage Details */}
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                รายละเอียดงานที่นำรถไปใช้ <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={usageDetails}
                onChange={(e) => setUsageDetails(e.target.value)}
                rows={2}
                placeholder="เช่น ยกพาเลทงาน FG ไปลานโหลดตู้, เคลื่อนย้ายแม่พิมพ์ Press..."
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
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
            form="booking-form"
            disabled={loading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white shadow-xs disabled:opacity-50 transition-all active:scale-95 ${
              mode === 'INSTANT'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : mode === 'INSTANT' ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>ยืนยันเริ่มใช้งาน</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5" />
                <span>ยืนยันการจอง</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
