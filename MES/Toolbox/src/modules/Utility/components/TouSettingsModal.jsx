import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Zap, Flame, Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { utilityApi } from '../../../shared/services/utilityApi';

export default function TouSettingsModal({ isOpen, onClose, onSaved }) {
  if (!isOpen) return null;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Rate state
  const [elecPeak, setElecPeak] = useState('4.1839');
  const [elecOffPeak, setElecOffPeak] = useState('2.6037');
  const [elecHoliday, setElecHoliday] = useState('2.6037');
  const [lpgRate, setLpgRate] = useState('42.72');

  useEffect(() => {
    fetchRates();
  }, [isOpen]);

  const fetchRates = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await utilityApi.getTouRates();
      if (res?.success && Array.isArray(res.data)) {
        res.data.forEach((r) => {
          const price = String(r.rate_price ?? '');
          if (r.utility_type === 'ELECTRIC') {
            if (r.day_type === 'NORMAL' && r.start_time.startsWith('09')) {
              setElecPeak(price);
            } else if (r.day_type === 'NORMAL' && r.start_time.startsWith('22')) {
              setElecOffPeak(price);
            } else if (r.day_type === 'HOLIDAY' || r.day_type === 'SUNDAY') {
              setElecHoliday(price);
            }
          } else if (r.utility_type === 'LPG') {
            setLpgRate(price);
          }
        });
      }
    } catch (err) {
      setErrorMsg('ไม่สามารถโหลดข้อมูลอัตราค่าไฟได้: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const peakVal = parseFloat(elecPeak);
    const offPeakVal = parseFloat(elecOffPeak);
    const holidayVal = parseFloat(elecHoliday);
    const lpgVal = parseFloat(lpgRate);

    if (isNaN(peakVal) || peakVal < 0 || isNaN(offPeakVal) || offPeakVal < 0 ||
        isNaN(holidayVal) || holidayVal < 0 || isNaN(lpgVal) || lpgVal < 0) {
      setErrorMsg('กรุณากรอกตัวเลขอัตราค่าพลังงานให้ถูกต้อง (ต้องเป็นตัวเลขบวก)');
      setSaving(false);
      return;
    }

    const ratesPayload = [
      { utility_type: 'ELECTRIC', day_type: 'NORMAL', start_time: '09:00', end_time: '22:00', rate_price: peakVal },
      { utility_type: 'ELECTRIC', day_type: 'NORMAL', start_time: '22:00', end_time: '09:00', rate_price: offPeakVal },
      { utility_type: 'ELECTRIC', day_type: 'HOLIDAY', start_time: '00:00', end_time: '23:59', rate_price: holidayVal },
      { utility_type: 'ELECTRIC', day_type: 'SUNDAY', start_time: '00:00', end_time: '23:59', rate_price: holidayVal },
      { utility_type: 'LPG', day_type: 'NORMAL', start_time: '00:00', end_time: '23:59', rate_price: lpgVal },
      { utility_type: 'LPG', day_type: 'HOLIDAY', start_time: '00:00', end_time: '23:59', rate_price: lpgVal },
      { utility_type: 'LPG', day_type: 'SUNDAY', start_time: '00:00', end_time: '23:59', rate_price: lpgVal }
    ];

    try {
      const res = await utilityApi.saveTouRates(ratesPayload);
      if (res?.success) {
        setSuccessMsg(res.message || 'บันทึกอัตราและคำนวณต้นทุนใหม่เรียบร้อยแล้ว');
        setTimeout(() => {
          onSaved?.();
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res?.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSaving(false);
    }
  };

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
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">ตั้งค่าอัตราค่าไฟ & แก๊ส (Tariff Rates)</h3>
              <p className="text-xs text-slate-500">กำหนดอัตรา TOU Tariff สำหรับคำนวณต้นทุนพลังงานโรงงาน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">กำลังโหลดอัตราปัจจุบัน...</span>
            </div>
          ) : (
            <form id="tou-form" onSubmit={handleSave} className="space-y-5">
              {/* Electric Tariff Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>อัตราค่าไฟฟ้า TOU (Electricity Tariff)</span>
                </div>

                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70 space-y-3.5">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Peak Rate (วันจันทร์-เสาร์ 09:00 - 22:00)
                      </label>
                      <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-mono font-bold">
                        ฿ / kWh
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={elecPeak}
                      onChange={(e) => setElecPeak(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Off-Peak Rate (วันจันทร์-เสาร์ 22:00 - 09:00)
                      </label>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">
                        ฿ / kWh
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={elecOffPeak}
                      onChange={(e) => setElecOffPeak(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Holiday & Weekend (วันอาทิตย์ และวันหยุดนักขัตฤกษ์)
                      </label>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">
                        ฿ / kWh
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={elecHoliday}
                      onChange={(e) => setElecHoliday(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* LPG Tariff Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>อัตราค่าแก๊ส LPG (LPG Gas Tariff)</span>
                </div>

                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/70">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        อัตราค่าแก๊ส LPG (Flat Rate ทุกช่วงเวลา)
                      </label>
                      <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-mono font-bold">
                        ฿ / m³
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={lpgRate}
                      onChange={(e) => setLpgRate(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-[11px] text-amber-800 leading-relaxed">
                ℹ️ การบันทึกอัตราใหม่จะนำไปคำนวณสรุปต้นทุนชั่วโมงของวันนี้ (Today) ให้ทันที และมีผลกับการคำนวณในรอบถัดไป
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
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
            form="tou-form"
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all shadow-sm shadow-amber-500/20 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>บันทึกอัตราใหม่</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}