// PaintChemEntryPage.jsx — Main entry page for recording chemical check sheet per slot

// NOTE: Intentionally >50 lines — complex multi-station form with async state management
// across 10 stations x 6 time slots requires inline orchestration for clarity.

import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Save, SendHorizonal, Loader2, WifiOff, Wind, FileText } from 'lucide-react';
import SheetHeader from '../components/SheetHeader';
import PaintChemHistoryDrawer from '../components/PaintChemHistoryDrawer';
import StationCard from '../components/StationCard';
import {
  isOutOfRange,
  STATIONS, SHIFT_SLOTS, SLOT_EXTRAS_STATION_NO, SLOT_EXTRA_KEYS,
  detectCurrentShift, detectCurrentSlot,
} from '../paintChemConfig';

const API_BASE = '/iot-toolbox/sandbox-b9/MES/MES/page/paintChem/api';
const EMPTY_EXTRAS = { note: '' };

// Build empty slot values: { [stationNo]: { [paramKey]: { before, after, kg, isOverflow } } }
function buildEmptySlotValues() {
  return STATIONS.reduce((acc, station) => {
    acc[station.no] = station.params.reduce((pAcc, p) => {
      pAcc[p.key] = { before: '', after: '', kg: '', isOverflow: false };
      return pAcc;
    }, {});
    return acc;
  }, {});
}

// Hydrate slot values from API logs array for a specific time_slot
function hydrateSlotValues(logs, selectedSlot) {
  const hydrated = buildEmptySlotValues();
  logs
    .filter((l) => l.time_slot === selectedSlot)
    .forEach((l) => {
      if (hydrated[l.station_no]?.[l.parameter_key] !== undefined) {
        hydrated[l.station_no][l.parameter_key] = {
          before: l.before_value ?? '',
          after:  l.after_value  ?? '',
          kg:     l.chemical_added_kg ?? '',
          isOverflow: !!l.is_overflow,
        };
      }
    });
  return hydrated;
}

// Collect per-slot extras (conveyor speed + note): { [timeSlot]: { conveyorSpeed, note } }
function buildExtrasBySlot(logs) {
  const bySlot = {};
  logs
    .filter((l) => Number(l.station_no) === SLOT_EXTRAS_STATION_NO)
    .forEach((l) => {
      const entry = bySlot[l.time_slot] ?? { ...EMPTY_EXTRAS };
      if (l.parameter_key === SLOT_EXTRA_KEYS.note) entry.note = l.note ?? '';
      bySlot[l.time_slot] = entry;
    });
  return bySlot;
}

export default function PaintChemEntryPage() {
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift]         = useState(detectCurrentShift());
  const [selectedSlot, setSlot]   = useState(() => detectCurrentSlot(detectCurrentShift()));
  const [slotExtras, setSlotExtras] = useState(EMPTY_EXTRAS);
  const [extrasBySlot, setExtrasBySlot] = useState({});
  const [slotValues, setSlotVals] = useState(buildEmptySlotValues());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [header, setHeader]       = useState(null);
  const [allLogs, setAllLogs]     = useState([]);
  const [saving, setSaving]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]         = useState(null);   // { type: 'success'|'error', msg }
  const [isOnline, setIsOnline]   = useState(navigator.onLine);
  const [csrfToken, setCsrf]      = useState('');

  // Online/offline detection
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Fetch CSRF token from window object (set by AuthContext)
  useEffect(() => {
    if (window.csrf_token) setCsrf(window.csrf_token);
  }, []);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch sheet data whenever date or shift changes
  const fetchSheet = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/get_sheet.php`, { params: { date, shift } });
      if (res.data.success) {
        setHeader(res.data.data.header);
        setAllLogs(res.data.data.logs);
        setExtrasBySlot(buildExtrasBySlot(res.data.data.logs));
        setSlotVals(hydrateSlotValues(res.data.data.logs, selectedSlot));
      }
    } catch {
      showToast('error', 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่');
    }
  }, [date, shift]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSheet(); }, [fetchSheet]);

  // Re-hydrate slot values when selected slot changes
  useEffect(() => {
    setSlotVals(hydrateSlotValues(allLogs, selectedSlot));
  }, [selectedSlot, allLogs]);

  // Re-hydrate conveyor speed + note for the selected slot (persisted values only)
  useEffect(() => {
    setSlotExtras(extrasBySlot[selectedSlot] ?? EMPTY_EXTRAS);
  }, [selectedSlot, extrasBySlot]);

  const previousNotes = useMemo(
    () => (SHIFT_SLOTS[shift] ?? [])
      .filter((slot) => slot !== selectedSlot && (extrasBySlot[slot]?.note ?? '').trim() !== '')
      .map((slot) => ({ slot, note: extrasBySlot[slot].note })),
    [shift, selectedSlot, extrasBySlot],
  );

  const handleValueChange = (stationNo, paramKey, field, val) => {
    setSlotVals((prev) => ({
      ...prev,
      [stationNo]: {
        ...prev[stationNo],
        [paramKey]: { ...prev[stationNo][paramKey], [field]: val },
      },
    }));
  };

  const buildSlotFormData = (stationNo, paramKey) => {
    const formData = new FormData();
    formData.append('csrf_token',    csrfToken);
    formData.append('log_date',      date);
    formData.append('shift',         shift);
    formData.append('time_slot',     selectedSlot);
    formData.append('station_no',    stationNo);
    formData.append('parameter_key', paramKey);
    return formData;
  };

  // Persist conveyor speed + note of the selected slot (two hourly rows on the oven station)
  const buildExtraRequests = () => {
    const noteForm = buildSlotFormData(SLOT_EXTRAS_STATION_NO, SLOT_EXTRA_KEYS.note);
    noteForm.append('note', slotExtras.note ?? '');
    return [axios.post(`${API_BASE}/save_slot.php`, noteForm)];
  };

  // Auto-save conveyor speed + note when leaving the field so they can be edited all day
  const handleExtraBlur = async () => {
    if (!isOnline || isReadOnly) return;
    const persisted = extrasBySlot[selectedSlot] ?? EMPTY_EXTRAS;
    const unchanged = (persisted.note ?? '') === (slotExtras.note ?? '');
    if (unchanged) return;
    try {
      await Promise.all(buildExtraRequests());
      setExtrasBySlot((prev) => ({ ...prev, [selectedSlot]: { ...slotExtras } }));
    } catch {
      showToast('error', 'บันทึกหมายเหตุหรือความเร็วสายพานไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const handleShiftChange = (newShift) => {
    setShift(newShift);
    setSlot(detectCurrentSlot(newShift));
  };

  // Save current slot — iterate all station params and POST each
  const handleSave = async () => {
    if (!isOnline) { showToast('error', 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต'); return; }
    setSaving(true);
    try {
      const requests = [];
      for (const station of STATIONS) {
        for (const param of station.params) {
          const val = slotValues[station.no]?.[param.key];
          const formData = buildSlotFormData(station.no, param.key);
          if (!param.isOverflow) {
            formData.append('before_value', val?.before ?? '');
            formData.append('after_value',  val?.after  ?? '');
            if (param.hasKg) formData.append('chemical_added_kg', val?.kg ?? '');
          } else {
            formData.append('is_overflow', val?.isOverflow ? '1' : '0');
          }
          requests.push(axios.post(`${API_BASE}/save_slot.php`, formData));
        }
      }
      await Promise.all([...requests, ...buildExtraRequests()]);
      showToast('success', `บันทึก Time Slot ${selectedSlot} สำเร็จ`);
      await fetchSheet();
    } catch {
      showToast('error', 'บันทึกไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setSaving(false);
    }
  };

  // Submit sheet (DRAFT -> SUBMITTED)
  const handleSubmit = async () => {
    if (!isOnline) { showToast('error', 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต'); return; }
    if (!header?.header_id) { showToast('error', 'กรุณาบันทึกข้อมูลอย่างน้อย 1 Slot ก่อนส่ง'); return; }
    if (!window.confirm('กรุณายืนยันการปิดกะ หลังจากปิดกะแล้วจะไม่สามารถแก้ไขข้อมูลได้')) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('csrf_token', csrfToken);
      formData.append('header_id',  header.header_id);
      const res = await axios.post(`${API_BASE}/submit_sheet.php`, formData);
      if (res.data.success) {
        showToast('success', res.data.message);
        fetchSheet();
      } else {
        showToast('error', res.data.message);
      }
    } catch {
      showToast('error', 'ส่งบันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  // Time-Lock Constraint: Lock if the sheet date is older than the next day 12:00 PM (noon)
  const isTimeLocked = useMemo(() => {
    if (!date) return false;
    const now = new Date();
    const [y, m, d] = date.split('-').map(Number);

    // Cutoff is 12:00 PM the day AFTER the sheet date
    const cutoff = new Date(y, m - 1, d);
    cutoff.setDate(cutoff.getDate() + 1);
    cutoff.setHours(12, 0, 0, 0);

    return now > cutoff;
  }, [date]);

  const isReadOnly = header?.status === 'APPROVED' || header?.status === 'SUBMITTED' || isTimeLocked;
  const speedOutOfRange = isOutOfRange('ConveyorSpeed', slotExtras.conveyorSpeed);


  return (
    <div className="w-full px-3 md:px-6 py-4 pb-24">
      {/* Time-Lock Banner */}
      {isTimeLocked && header?.status === 'DRAFT' && (
        <div className="flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-lg mb-4 shadow-sm">
          <span>🔒 เอกสารนี้ถูกล็อกเนื่องจากหมดเวลาบันทึก (เกิน 12:00 น. ของวันถัดไป) หากต้องการแก้ไข กรุณาติดต่อหัวหน้างาน</span>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-3 rounded-lg mb-4 shadow-sm">
          <WifiOff size={18} /> ไม่มีการเชื่อมต่ออินเทอร์เน็ต — กรุณาอย่ากรอกข้อมูลจนกว่าจะกลับมาออนไลน์
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <SheetHeader
        onHistoryClick={() => setIsHistoryOpen(true)}
        date={date} shift={shift} sheetStatus={header?.status}
        slotExtras={slotExtras} previousNotes={previousNotes}
        onDateChange={(d) => { setDate(d); }}
        onShiftChange={handleShiftChange}
        onExtraChange={(key, value) => setSlotExtras((prev) => ({ ...prev, [key]: value }))}
        onExtraBlur={handleExtraBlur}
        selectedSlot={selectedSlot}
        onSlotChange={setSlot}
        timeSlots={SHIFT_SLOTS[shift]}
        disabled={isReadOnly || !isOnline}
      />

      {/* Station Cards in a responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3 md:gap-4">
        {STATIONS.map((station) => (
          <StationCard
            key={station.no}
            station={station}
            slotValues={slotValues[station.no]}
            onChange={handleValueChange}
            disabled={isReadOnly || !isOnline}
          />
        ))}
        {/* Station 12: Note */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm mb-3 h-full flex flex-col">
          <div className="w-full flex items-center justify-between px-4 py-3 text-left flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">12</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Note</p>
                <p className="text-xs text-gray-500">หมายเหตุของช่วงเวลานี้</p>
              </div>
            </div>
          </div>
          <div className="px-4 pb-4 border-t border-gray-100 flex-1 flex flex-col">
            <div className="py-2 flex flex-col gap-2 flex-1">
              <textarea maxLength={500} className="w-full h-full min-h-[100px] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none" value={slotExtras.note ?? ''} onChange={(e) => setSlotExtras(prev => ({...prev, note: e.target.value}))} onBlur={handleExtraBlur} disabled={isReadOnly || !isOnline} placeholder={`หมายเหตุช่วงเวลา ${selectedSlot} (ถ้ามี)`} />
              {previousNotes.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1 text-[12px] text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  {previousNotes.map(({ slot, note }) => (
                    <li key={slot} className="flex gap-2">
                      <span className="font-semibold text-blue-800 flex-shrink-0">[{slot}]</span> 
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

{/* Action Bar */}
      {!isReadOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="w-full px-2 md:px-6 flex gap-3 justify-center md:justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isOnline}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 min-h-[44px] rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              บันทึกข้อมูล
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !isOnline || !header?.header_id}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2.5 px-6 min-h-[44px] rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <SendHorizonal size={18} />}
              ล็อกเอกสาร
              </button>
          </div>
        </div>
      )}
      <PaintChemHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectRecord={(selectedDate, selectedShift) => {
          setDate(selectedDate);
          setShift(selectedShift);
          setIsHistoryOpen(false);
        }}
      />
    </div>
  );
}
