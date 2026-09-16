// PaintChemEntryPage.jsx — Main entry page for recording chemical check sheet per slot

// NOTE: Intentionally >50 lines — complex multi-station form with async state management
// across 9 stations x 6 time slots requires inline orchestration for clarity.

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Save, SendHorizonal, Loader2, WifiOff } from 'lucide-react';
import SheetHeader from '../components/SheetHeader';
import TimeSlotSelector from '../components/TimeSlotSelector';
import StationCard from '../components/StationCard';
import { STATIONS, SHIFT_SLOTS, detectCurrentShift, detectCurrentSlot } from '../paintChemConfig';

const API_BASE = '/iot-toolbox/sandbox-b9/MES/MES/page/paintChem/api';

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

export default function PaintChemEntryPage() {
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift]         = useState(detectCurrentShift());
  const [selectedSlot, setSlot]   = useState(() => detectCurrentSlot(detectCurrentShift()));
  const [paintingCond, setPCond]  = useState({ conveyorSpeed: '', bakeOvenTemp: '', dryOvenTemp: '' });
  const [slotValues, setSlotVals] = useState(buildEmptySlotValues());
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

  // Fetch CSRF token from meta tag (injected by PHP session)
  useEffect(() => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) setCsrf(meta.getAttribute('content'));
  }, []);

  // Fetch sheet data whenever date or shift changes
  const fetchSheet = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/get_sheet.php`, { params: { date, shift } });
      if (res.data.success) {
        setHeader(res.data.data.header);
        setAllLogs(res.data.data.logs);
        if (res.data.data.header) {
          setPCond({
            conveyorSpeed: res.data.data.header.conveyor_speed ?? '',
            bakeOvenTemp:  res.data.data.header.bake_oven_temp ?? '',
            dryOvenTemp:   res.data.data.header.dry_oven_temp  ?? '',
          });
        }
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

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleValueChange = (stationNo, paramKey, field, val) => {
    setSlotVals((prev) => ({
      ...prev,
      [stationNo]: {
        ...prev[stationNo],
        [paramKey]: { ...prev[stationNo][paramKey], [field]: val },
      },
    }));
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
          const formData = new FormData();
          formData.append('csrf_token',    csrfToken);
          formData.append('log_date',      date);
          formData.append('shift',         shift);
          formData.append('time_slot',     selectedSlot);
          formData.append('station_no',    station.no);
          formData.append('parameter_key', param.key);
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
      await Promise.all(requests);
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
    if (!header?.header_id) { showToast('error', 'กรุณาบันทึกข้อมูลอย่างน้อย 1 Slot ก่อนส่งใบ'); return; }
    if (!window.confirm('ยืนยันการส่งใบบันทึกนี้? หลังจากนี้จะไม่สามารถแก้ไขได้')) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('csrf_token',    csrfToken);
      formData.append('header_id',     header.header_id);
      formData.append('conveyor_speed', paintingCond.conveyorSpeed);
      formData.append('bake_oven_temp', paintingCond.bakeOvenTemp);
      formData.append('dry_oven_temp',  paintingCond.dryOvenTemp);
      const res = await axios.post(`${API_BASE}/submit_sheet.php`, formData);
      if (res.data.success) {
        showToast('success', res.data.message);
        fetchSheet();
      } else {
        showToast('error', res.data.message);
      }
    } catch {
      showToast('error', 'ส่งใบบันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const isReadOnly = header?.status === 'APPROVED' || header?.status === 'SUBMITTED';

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-24">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-red-600 text-white text-sm px-4 py-2 rounded-lg mb-3">
          <WifiOff size={16} /> ไม่มีการเชื่อมต่อ — กรุณาอย่ากรอกข้อมูลจนกว่าจะออนไลน์
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
        date={date} shift={shift} paintingCond={paintingCond} sheetStatus={header?.status}
        onDateChange={(d) => { setDate(d); }}
        onShiftChange={handleShiftChange}
        onCondChange={(k, v) => setPCond((p) => ({ ...p, [k]: v }))}
        disabled={isReadOnly}
      />

      {/* Time Slot Selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 pt-3 pb-2 mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">เลือก Time Slot</p>
        <TimeSlotSelector
          slots={SHIFT_SLOTS[shift]}
          selected={selectedSlot}
          onChange={setSlot}
        />
      </div>

      {/* Station Cards */}
      {STATIONS.map((station) => (
        <StationCard
          key={station.no}
          station={station}
          slotValues={slotValues[station.no]}
          onChange={handleValueChange}
          disabled={isReadOnly || !isOnline}
        />
      ))}

      {/* Action Bar */}
      {!isReadOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 z-40">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isOnline}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            บันทึก Slot {selectedSlot}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !isOnline || !header?.header_id}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <SendHorizonal size={16} />}
            ส่งใบ
          </button>
        </div>
      )}
    </div>
  );
}
