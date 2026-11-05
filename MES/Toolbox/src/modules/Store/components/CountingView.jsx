import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Barcode, Volume2, VolumeX, Zap, CheckCircle2,
  AlertTriangle, RotateCcw, Send, Sparkles, Eye, EyeOff, Search
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';

// Synthesizer Audio Feedback (Web Audio API)
function playBeep(type = 'success') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08); // E6
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.setValueAtTime(240, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Ignore audio restrictions
  }
}

export default function CountingView({ session, onBack, onSessionFinished }) {
  const [tagInput, setTagInput] = useState('');
  const [qtyInput, setQtyInput] = useState('');
  const [isContinuous, setIsContinuous] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [blindCountMask, setBlindCountMask] = useState(true);
  const [loading, setLoading] = useState(false);
  const [countedItems, setCountedItems] = useState(session?.counted_items || []);
  const [expectedItems, setExpectedItems] = useState(session?.expected_items || []);
  const [errorBanner, setErrorBanner] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [isSubmittingFinish, setIsSubmittingFinish] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const triggerVibrate = (pattern) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  };

  const handleScanOrSubmit = async (e) => {
    e?.preventDefault();
    const tag = tagInput.trim();
    if (!tag) return;

    setErrorBanner('');
    setSuccessBanner('');
    setLoading(true);

    try {
      const actualQty = qtyInput ? parseFloat(qtyInput) : null;
      const res = await storeApi.scanTag({
        sessionId: session.session_id,
        tagSerialNo: tag,
        actualQty,
        confirmDiff: false
      });

      if (res.success) {
        if (soundEnabled) playBeep('success');
        triggerVibrate(60);

        // Update counted items
        const newItem = {
          tag_serial_no: tag,
          part_no: res.data?.part_no || res.part_no || 'TAG RECORD',
          part_description: res.data?.part_description || res.part_description || '',
          actual_qty: res.data?.actual_qty || res.actual_qty || actualQty || 1,
          system_qty: res.data?.system_qty,
          is_wrong_location: res.data?.is_wrong_location || false,
          counted_at: new Date().toLocaleTimeString('th-TH')
        };

        setCountedItems((prev) => [newItem, ...prev.filter((x) => x.tag_serial_no !== tag)]);
        setSuccessBanner(`สแกนแท็ก ${tag} สำเร็จ`);
        setTagInput('');
        setQtyInput('');
        inputRef.current?.focus();
      } else {
        if (soundEnabled) playBeep('error');
        triggerVibrate([100, 50, 100]);
        setErrorBanner(res.message || 'ไม่สามารถบันทึกข้อมูลการสแกนได้');
      }
    } catch (err) {
      if (soundEnabled) playBeep('error');
      triggerVibrate([100, 50, 100]);
      setErrorBanner(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (countedItems.length === 0) {
      if (!window.confirm('คุณยังไม่ได้นับรายการใดเลย ต้องการจบเซสชั่นจริงหรือไม่?')) {
        return;
      }
    }

    if (!window.confirm(`ยืนยันการจบการตรวจนับคลัง "${session.location_name}" (นับแล้ว ${countedItems.length} รายการ)? ระบบจะส่งยอดดิฟเข้าสู่คิวรออนุมัติโดยหัวหน้างาน`)) {
      return;
    }

    setIsSubmittingFinish(true);
    try {
      const res = await storeApi.finishCycleCountSession(session.session_id, 'จบงานผ่าน TOOLBOX OS');
      if (res.success) {
        alert('บันทึกผลการตรวจนับเสร็จสมบูรณ์ ยอดผลต่างถูกส่งเข้าคิวรออนุมัติเรียบร้อย');
        onSessionFinished();
      } else {
        alert(res.message || 'ไม่สามารถส่งสรุปผลได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการส่งสรุปผล');
    } finally {
      setIsSubmittingFinish(false);
    }
  };

  const handleResetSession = async () => {
    if (!window.confirm(`⚠️ คำเตือน: คุณต้องการยกเลิกและรีเซ็ตการนับคลัง "${session.location_name}" ทั้งหมดใช่หรือไม่?\n\nข้อมูลที่ตรวจนับไปแล้ว ${countedItems.length} รายการจะถูกล้างทิ้ง และเซสชั่นจะกลับเป็นสถานะเริ่มต้น (Pending)`)) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await storeApi.resetCycleCountSession(session.session_id);
      if (res.success) {
        setCountedItems([]);
        alert('รีเซ็ตเซสชั่นเรียบร้อย สามารถเริ่มต้นตรวจนับใหม่ได้ทันที');
      } else {
        alert(res.message || 'ไม่สามารถรีเซ็ตเซสชั่นได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการรีเซ็ตเซสชั่น');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fadeIn pb-12">
      {/* Top Banner & Location Pill */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {session.location_name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">
                โซน: {session.zone_name || 'ทั่วไป'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                IN PROGRESS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              เซสชั่น #{session.session_id} • ตรวจนับจริงหน้างาน (Blind Count Mode)
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
            className={`p-2.5 rounded-xl border transition-colors ${
              soundEnabled
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                : 'bg-red-50 text-red-600 border-red-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Continuous Scan Toggle */}
          <button
            onClick={() => setIsContinuous(!isContinuous)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              isContinuous
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>นับต่อเนื่อง: {isContinuous ? 'ON' : 'OFF'}</span>
          </button>

          {/* Blind Count Mask Toggle */}
          <button
            onClick={() => setBlindCountMask(!blindCountMask)}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={blindCountMask ? 'แสดงยอดคาดหวังในระบบ' : 'ซ่อนยอดคาดหวัง (Blind Count)'}
          >
            {blindCountMask ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Reset Session Button */}
          <button
            onClick={handleResetSession}
            disabled={isResetting || countedItems.length === 0}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">รีเซ็ต</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorBanner && (
        <div className="p-3 text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorBanner}</span>
        </div>
      )}
      {successBanner && (
        <div className="p-3 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Barcode Gun / Scanner Input Form */}
      <form
        onSubmit={handleScanOrSubmit}
        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm"
      >
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Barcode className="w-4 h-4 text-blue-600" />
            <span>ยิงบาร์โค้ดแท็กชิ้นงาน (Barcode / QR Scanner Gun)</span>
          </span>
          <span className="text-[11px] font-normal text-slate-400">
            นับแล้ว <strong className="text-blue-600 font-bold">{countedItems.length}</strong> รายการ
          </span>
        </label>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="สแกนแท็กพาเลท หรือพิมพ์รหัสแท็ก..."
            className="flex-1 text-sm font-mono font-bold px-4 py-3 rounded-xl border-2 border-blue-500/30 focus:border-blue-600 focus:outline-none bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100"
          />

          <input
            type="number"
            step="any"
            value={qtyInput}
            onChange={(e) => setQtyInput(e.target.value)}
            placeholder="จำนวน (ค่าเริ่มต้น 1)"
            className="w-32 text-sm font-mono px-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
          />

          <button
            type="submit"
            disabled={loading || !tagInput.trim()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {loading ? 'กำลังนับ...' : 'บันทึก'}
          </button>
        </div>
      </form>

      {/* Counted Items Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <span>รายการที่นับแล้วในเซสชั่นนี้</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[11px] font-mono">
              {countedItems.length}
            </span>
          </h3>

          <button
            onClick={handleFinish}
            disabled={isSubmittingFinish}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmittingFinish ? 'กำลังส่งข้อมูล...' : 'สรุปผลและส่งตรวจนับ'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {countedItems.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Barcode className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">ยังไม่มีรายการที่ตรวจนับ</p>
              <p className="text-xs text-slate-500 mt-1">
                ยิงบาร์โค้ดแท็กชิ้นงานบนพาเลท หรือพิมพ์รหัสแท็กเพื่อเริ่มนับชิ้นแรก
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-3">หมายเลขแท็ก (Tag Serial)</th>
                  <th className="py-2.5 px-3">รหัสและรายละเอียดชิ้นงาน</th>
                  <th className="py-2.5 px-3 text-right">จำนวนที่นับได้</th>
                  {!blindCountMask && <th className="py-2.5 px-3 text-right">ยอดในระบบ</th>}
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  <th className="py-2.5 px-4 text-right">เวลาที่นับ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {countedItems.map((item, idx) => {
                  const isWrong = item.is_wrong_location;
                  const hasDiff = item.system_qty !== undefined && item.actual_qty !== item.system_qty;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        isWrong
                          ? 'bg-amber-50/40 dark:bg-amber-950/20'
                          : hasDiff
                          ? 'bg-red-50/30 dark:bg-red-950/10'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.tag_serial_no}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        <div className="font-semibold">{item.part_no}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {item.part_description}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {Number(item.actual_qty).toLocaleString()}
                      </td>
                      {!blindCountMask && (
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {item.system_qty !== undefined ? Number(item.system_qty).toLocaleString() : '-'}
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-center">
                        {isWrong ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                            หลงคลัง
                          </span>
                        ) : hasDiff ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">
                            ยอดไม่ตรง
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                            ตรง
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-400 text-[11px]">
                        {item.counted_at}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
