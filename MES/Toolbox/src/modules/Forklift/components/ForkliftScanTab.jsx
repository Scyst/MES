import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  QrCode, Camera, CameraOff, Search, Play, RotateCcw, Calendar,
  AlertTriangle, Battery, MapPin, User, Wrench, CheckCircle2, RefreshCw
} from 'lucide-react';
import { forkliftApi } from '../../../shared/services/forkliftApi';
import { getVehicleVisualMeta, parseScannedForkliftCode } from '../utils/forkliftSpatialHelpers';

const SCANNER_REGION_ID = 'forklift-qr-scanner-region';

export default function ForkliftScanTab({
  initialCode = '',
  forklifts = [],
  currentUserId = 0,
  isAdmin = false,
  onInstantUse,
  onReserve,
  onReturn,
  onReportIssue,
  onOpenQr
}) {
  const [codeInput, setCodeInput] = useState(initialCode);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);

  const stopCamera = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState?.();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      }
    } catch {
      // Ignore cleanup errors when camera stream already closed
    } finally {
      setCameraActive(false);
    }
  }, []);

  const lookupForklift = useCallback(async (rawCode) => {
    const clean = parseScannedForkliftCode(rawCode);
    if (!clean) {
      setErrorMsg('กรุณากรอกหรือสแกนรหัสรถโฟล์คลิฟท์');
      return;
    }

    setCodeInput(clean);
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await forkliftApi.getSingleForklift({ code: clean });
      if (res?.success && res.data) {
        setVehicle(res.data);
      } else {
        setVehicle(null);
        setErrorMsg(res?.message || `ไม่พบข้อมูลรถรหัส "${clean}"`);
      }
    } catch (err) {
      setVehicle(null);
      setErrorMsg(err.response?.data?.message || err.message || 'ไม่พบข้อมูลรถโฟล์คลิฟท์ในระบบ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCode) {
      lookupForklift(initialCode);
    }
  }, [initialCode, lookupForklift]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = async () => {
    setCameraError('');
    setCameraActive(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 60));
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_REGION_ID);
      }
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          stopCamera();
          lookupForklift(decodedText);
        },
        () => {
          // Ignore per-frame scan misses
        }
      );
    } catch (err) {
      setCameraActive(false);
      setCameraError(
        err?.message || 'ไม่สามารถเปิดกล้องได้ (กรุณาใช้งานผ่าน HTTPS หรืออนุญาตสิทธิ์กล้อง)'
      );
    }
  };

  const status = String(vehicle?.status || 'AVAILABLE').toUpperCase();
  const battery = Number(vehicle?.current_battery ?? 100);
  const activeBooking = vehicle?.active_booking;
  const isMyBooking = Boolean(activeBooking && (activeBooking.user_id == currentUserId || isAdmin));
  const statusMeta = getVehicleVisualMeta(vehicle);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Scanner & Lookup Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              สแกน QR Code ประจำรถ (Driver Check-Out / Return)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              สแกนป้าย QR บนตัวรถ กรอกรหัสรถ หรือแตะเลือกรถจากรายการด้านล่าง
            </p>
          </div>

          <button
            type="button"
            onClick={() => (cameraActive ? stopCamera() : startCamera())}
            className={`min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              cameraActive
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {cameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            <span>{cameraActive ? 'ปิดกล้องสแกน' : 'เปิดกล้องสแกน QR'}</span>
          </button>
        </div>

        {/* Camera Viewport */}
        {cameraActive && (
          <div className="bg-slate-950 rounded-2xl p-3 overflow-hidden">
            <div id={SCANNER_REGION_ID} className="w-full max-w-sm mx-auto rounded-xl overflow-hidden" />
          </div>
        )}

        {cameraError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            {cameraError}
          </div>
        )}

        {/* Manual / Handheld Scanner Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookupForklift(codeInput);
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="กรอกรหัสรถ หรือวาง URL ที่สแกนได้..."
              className="w-full min-h-[44px] pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'ค้นหา...' : 'ตรวจสอบรถ'}
          </button>
        </form>

        {/* Quick Fleet Pills */}
        {forklifts.length > 0 && (
          <div className="pt-1">
            <p className="text-[11px] font-medium text-slate-400 mb-2">แตะเพื่อเลือกรถด่วน:</p>
            <div className="flex flex-wrap gap-1.5">
              {forklifts.map((fl) => (
                <button
                  key={fl.id}
                  type="button"
                  onClick={() => lookupForklift(fl.code)}
                  className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                    vehicle?.id === fl.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {fl.code}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Selected Vehicle Mobile Card (scan.php Parity) */}
      {vehicle && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                ข้อมูลรถโฟล์คลิฟท์
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">{vehicle.code}</h3>
              <p className="text-xs text-slate-500">{vehicle.name || 'รถโฟล์คลิฟท์โรงงาน'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
              <button
                type="button"
                onClick={() => lookupForklift(vehicle.code)}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800"
                title="รีเฟรชข้อมูลรถ"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Battery Gauge */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                  <Battery className="w-4 h-4 text-slate-500" />
                  แบตเตอรี่คงเหลือ
                </span>
                <span className="font-mono font-bold text-slate-900">{battery}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    battery >= 60 ? 'bg-emerald-500' : battery >= 20 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(4, battery))}%` }}
                />
              </div>
            </div>

            {/* Metadata Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400">ตำแหน่งล่าสุด</p>
                  <p className="font-semibold text-slate-800">{vehicle.last_location || 'จุดชาร์จ'}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                <User className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400">ผู้ใช้งานปัจจุบัน</p>
                  <p className="font-semibold text-slate-800">{vehicle.current_driver || 'ว่าง (ไม่มีผู้ขับ)'}</p>
                </div>
              </div>
            </div>

            {activeBooking?.usage_details && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <strong>รายละเอียดงานปัจจุบัน:</strong> {activeBooking.usage_details}
              </div>
            )}

            {/* Primary Driver Action Buttons */}
            <div className="pt-2 space-y-2.5">
              {(status === 'AVAILABLE' || status === 'CHARGING') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => onInstantUse?.(vehicle)}
                    className="min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-xs"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>เริ่มใช้งานทันที (Instant Start)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onReserve?.(vehicle)}
                    className="min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-white text-slate-700 border border-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>จองล่วงหน้า</span>
                  </button>
                </div>
              )}

              {status === 'IN_USE' && isMyBooking && (
                <button
                  type="button"
                  onClick={() => onReturn?.(vehicle)}
                  className="w-full min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 shadow-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>บันทึกคืนรถ (Return Vehicle)</span>
                </button>
              )}

              {status === 'IN_USE' && !isMyBooking && (
                <button
                  type="button"
                  onClick={() => onReserve?.(vehicle)}
                  className="w-full min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                >
                  <Calendar className="w-4 h-4" />
                  <span>กำลังใช้งานโดย {vehicle.current_driver} · จองคิวถัดไป</span>
                </button>
              )}

              {status === 'MAINTENANCE' && (
                <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-600 text-xs font-semibold flex items-center justify-center gap-2">
                  <Wrench className="w-4 h-4 text-slate-500" />
                  <span>รถคันนี้ปิดปรับปรุงชั่วคราว (Maintenance) ไม่สามารถเบิกใช้งานได้</span>
                </div>
              )}

              {/* Secondary Report Issue & Show QR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onReportIssue?.(vehicle)}
                  className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold hover:bg-rose-100"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>แจ้งปัญหา / รถเสีย</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenQr?.(vehicle)}
                  className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-200"
                >
                  <QrCode className="w-4 h-4" />
                  <span>แสดง QR Code ประจำรถ</span>
                </button>
              </div>

              {vehicle.upcoming_bookings?.length > 0 && (
                <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>มีคิวจองล่วงหน้า {vehicle.upcoming_bookings.length} รายการสำหรับรถคันนี้</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
