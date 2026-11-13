import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Wifi, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { forkliftApi } from '../../../shared/services/forkliftApi';

export default function ApZoneModal({ isOpen, onClose, initialZone, existingZone, onSaved }) {
  const [zoneName, setZoneName] = useState('');
  const [svgX, setSvgX] = useState(500);
  const [svgY, setSvgY] = useState(500);
  const [bssid1, setBssid1] = useState('');
  const [rssi1, setRssi1] = useState(-50);
  const [bssid2, setBssid2] = useState('');
  const [rssi2, setRssi2] = useState(-65);
  const [bssid3, setBssid3] = useState('');
  const [rssi3, setRssi3] = useState(-75);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    if (existingZone) {
      setZoneName(existingZone.zone_name || '');
      setSvgX(existingZone.svg_x ?? 500);
      setSvgY(existingZone.svg_y ?? 500);
      setBssid1(existingZone.bssid_1 || '');
      setRssi1(existingZone.rssi_1 ?? -50);
      setBssid2(existingZone.bssid_2 || '');
      setRssi2(existingZone.rssi_2 ?? -65);
      setBssid3(existingZone.bssid_3 || '');
      setRssi3(existingZone.rssi_3 ?? -75);
    } else if (initialZone) {
      setZoneName(initialZone.zoneName || '');
      setSvgX(initialZone.centerX ?? 500);
      setSvgY(initialZone.centerY ?? 500);
      setBssid1('');
      setRssi1(-50);
      setBssid2('');
      setRssi2(-65);
      setBssid3('');
      setRssi3(-75);
    }
  }, [isOpen, initialZone, existingZone]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!zoneName.trim() || !bssid1.trim()) {
      setErrorMsg('กรุณาระบุชื่อโซนและ BSSID #1 (MAC Address ของ Access Point หลัก)');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await forkliftApi.saveZone({
        zone_name: zoneName.trim(),
        svg_x: Number(svgX),
        svg_y: Number(svgY),
        bssid_1: bssid1.trim(),
        rssi_1: Number(rssi1),
        bssid_2: bssid2.trim(),
        rssi_2: Number(rssi2),
        bssid_3: bssid3.trim(),
        rssi_3: Number(rssi3)
      });

      if (res?.success) {
        onSaved?.(res.message || 'บันทึกพิกัด Wi-Fi AP Zone สำเร็จ');
        onClose();
      } else {
        setErrorMsg(res?.message || 'ไม่สามารถบันทึกพิกัดโซนได้');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                ลงทะเบียนจุด Wi-Fi Site Survey (AP Zone)
              </h3>
              <p className="text-[11px] text-slate-500">
                ปรับเทียบค่า BSSID/RSSI สำหรับระบบระบุพิกัด Indoor
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="text-xs font-medium text-slate-700 block mb-1">ชื่อโซน (Zone)</label>
              <input
                type="text"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">พิกัด X (0-1000)</label>
              <input
                type="number"
                min={0}
                max={1000}
                value={svgX}
                onChange={(e) => setSvgX(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">พิกัด Y (0-1000)</label>
              <input
                type="number"
                min={0}
                max={1000}
                value={svgY}
                onChange={(e) => setSvgY(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ค่าสัญญาณ Access Point (MAC / BSSID & RSSI dBm)
            </p>

            {[
              { idx: 1, bssid: bssid1, setBssid: setBssid1, rssi: rssi1, setRssi: setRssi1, req: true },
              { idx: 2, bssid: bssid2, setBssid: setBssid2, rssi: rssi2, setRssi: setRssi2, req: false },
              { idx: 3, bssid: bssid3, setBssid: setBssid3, rssi: rssi3, setRssi: setRssi3, req: false }
            ].map((slot) => (
              <div key={slot.idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-8">
                  <input
                    type="text"
                    value={slot.bssid}
                    onChange={(e) => slot.setBssid(e.target.value)}
                    placeholder={`BSSID #${slot.idx} ${slot.req ? '(จำเป็น)' : '(ตัวเลือก)'}`}
                    required={slot.req}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-4">
                  <input
                    type="number"
                    min={-120}
                    max={0}
                    value={slot.rssi}
                    onChange={(e) => slot.setRssi(e.target.value)}
                    placeholder="RSSI"
                    className="w-full px-2.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'กำลังบันทึก...' : 'บันทึกพิกัด AP Zone'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
