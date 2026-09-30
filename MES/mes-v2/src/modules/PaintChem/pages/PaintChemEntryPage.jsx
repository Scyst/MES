// PaintChemEntryPage.jsx โ€” Main entry page for recording chemical check sheet per slot

// NOTE: Intentionally >50 lines โ€” complex multi-station form with async state management
// across 9 stations x 6 time slots requires inline orchestration for clarity.

import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Save, SendHorizonal, Loader2, WifiOff } from 'lucide-react';
import { History } from 'lucide-react';
import SheetHeader from '../components/SheetHeader';
import PaintChemHistoryDrawer from '../components/PaintChemHistoryDrawer';
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
      showToast('error', 'เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเนเธ”เน เธเธฃเธธเธ“เธฒเธฅเธญเธเนเธซเธกเน');
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

  // Save current slot โ€” iterate all station params and POST each
  const handleSave = async () => {
    if (!isOnline) { showToast('error', 'เนเธกเนเธกเธตเธเธฒเธฃเน€เธเธทเนเธญเธกเธ•เนเธญเธญเธดเธเน€เธ—เธญเธฃเนเน€เธเนเธ•'); return; }
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
      showToast('success', `เธเธฑเธเธ—เธถเธ Time Slot ${selectedSlot} เธชเธณเน€เธฃเนเธ`);
      await fetchSheet();
    } catch {
      showToast('error', 'เธเธฑเธเธ—เธถเธเนเธกเนเธชเธณเน€เธฃเนเธ เธเธฃเธธเธ“เธฒเธฅเธญเธเนเธซเธกเน');
    } finally {
      setSaving(false);
    }
  };

  // Submit sheet (DRAFT -> SUBMITTED)
  const handleSubmit = async () => {
    if (!isOnline) { showToast('error', 'เนเธกเนเธกเธตเธเธฒเธฃเน€เธเธทเนเธญเธกเธ•เนเธญเธญเธดเธเน€เธ—เธญเธฃเนเน€เธเนเธ•'); return; }
    if (!header?.header_id) { showToast('error', 'เธเธฃเธธเธ“เธฒเธเธฑเธเธ—เธถเธเธเนเธญเธกเธนเธฅเธญเธขเนเธฒเธเธเนเธญเธข 1 Slot เธเนเธญเธเธชเนเธเนเธ'); return; }
    if (!window.confirm('เธขเธทเธเธขเธฑเธเธเธฒเธฃเธชเนเธเนเธเธเธฑเธเธ—เธถเธเธเธตเน? เธซเธฅเธฑเธเธเธฒเธเธเธตเนเธเธฐเนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธเนเนเธเนเธ”เน')) return;
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
      showToast('error', 'เธชเนเธเนเธเธเธฑเธเธ—เธถเธเนเธกเนเธชเธณเน€เธฃเนเธ');
    } finally {
      setSubmitting(false);
    }
  };

    // Time-Lock Constraint: Lock if the sheet date is older than today 12:00 PM (noon)
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

  return (
    <div className="w-full px-3 md:px-6 py-4 pb-24">
      {/* Time-Lock Banner */}
      {isTimeLocked && header?.status === 'DRAFT' && (
        <div className="flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-lg mb-4 shadow-sm">
          <span>๐”’ เน€เธญเธเธชเธฒเธฃเธเธตเนเธ–เธนเธเธฅเนเธญเธเน€เธเธทเนเธญเธเธเธฒเธเธซเธกเธ”เน€เธงเธฅเธฒเธเธฑเธเธ—เธถเธ (เน€เธเธดเธ 12:00 เธ. เธเธญเธเธงเธฑเธเธ–เธฑเธ”เนเธ) เธซเธฒเธเธ•เนเธญเธเธเธฒเธฃเนเธเนเนเธ เธเธฃเธธเธ“เธฒเธ•เธดเธ”เธ•เนเธญเธซเธฑเธงเธซเธเนเธฒเธเธฒเธ</span>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-3 rounded-lg mb-4 shadow-sm">
          <WifiOff size={18} /> เนเธกเนเธกเธตเธเธฒเธฃเน€เธเธทเนเธญเธกเธ•เนเธญเธญเธดเธเน€เธ—เธญเธฃเนเน€เธเนเธ• โ€” เธเธฃเธธเธ“เธฒเธญเธขเนเธฒเธเธฃเธญเธเธเนเธญเธกเธนเธฅเธเธเธเธงเนเธฒเธเธฐเธญเธญเธเนเธฅเธเน
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
        date={date} shift={shift} paintingCond={paintingCond} sheetStatus={header?.status}
        onDateChange={(d) => { setDate(d); }}
        onShiftChange={handleShiftChange}
        onCondChange={(k, v) => setPCond((p) => ({ ...p, [k]: v }))}
          selectedSlot={selectedSlot}
          onSlotChange={setSlot}
          timeSlots={SHIFT_SLOTS[shift]}
        disabled={isReadOnly}
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
      </div>

      {/* Action Bar */}
      {!isReadOnly && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="w-full px-2 md:px-6 flex gap-3 justify-center md:justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isOnline}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              เธเธฑเธเธ—เธถเธ Slot {selectedSlot}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !isOnline || !header?.header_id}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <SendHorizonal size={18} />}
              เธชเนเธเนเธ
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

