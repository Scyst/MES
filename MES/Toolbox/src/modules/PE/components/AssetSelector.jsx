import React, { useEffect, useMemo, useState } from 'react';
import { QrCode, Search } from 'lucide-react';

/**
 * Compact, mobile-first cascading selector (Line -> Quick Search -> Machine)
 * with optional General/Outdoor equipment mode and QR machine lock support.
 * Displays human-friendly machine names first so general operators don't struggle with codes.
 */
export default function AssetSelector({
  machines = [],
  lines = [],
  generalAreas = [],
  generalCategories = [],
  value,
  onChange,
  accent = 'blue', // 'blue' | 'red' | 'amber' | 'emerald'
  allowGeneral = true,
  preselectedMachine = null,
  leftSlot = null,
}) {
  const [filterLine, setFilterLine] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrLocked, setQrLocked] = useState(Boolean(preselectedMachine?.machine_id));

  useEffect(() => {
    if (preselectedMachine?.machine_id) {
      setFilterLine(preselectedMachine.line || '');
      setSearchQuery('');
      setQrLocked(true);
    }
  }, [preselectedMachine]);

  const filteredMachines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return machines.filter((m) => {
      if (filterLine && String(m.line || '').trim() !== filterLine) return false;
      if (q) {
        const hay = `${m.machine_name || ''} ${m.machine_code || ''} ${m.line || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [machines, filterLine, searchQuery]);

  const activePillCls =
    accent === 'red'
      ? 'bg-red-600 text-white shadow-xs'
      : accent === 'amber'
        ? 'bg-amber-600 text-white shadow-xs'
        : accent === 'emerald'
          ? 'bg-emerald-600 text-white shadow-xs'
          : 'bg-blue-600 text-white shadow-xs';

  const mode = value?.asset_mode || 'machine';

  const handleSelectMachine = (nextId) => {
    const found = machines.find((m) => String(m.machine_id) === String(nextId));
    onChange({
      ...value,
      asset_mode: 'machine',
      machine_id: found ? String(found.machine_id) : '',
      machine_code: found ? found.machine_code : '',
      machine_name: found ? found.machine_name : '',
      line: found ? found.line : '',
    });
  };

  return (
    <div className="space-y-2.5">
      {allowGeneral && (
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onChange({ ...value, asset_mode: 'machine' })}
            className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors ${
              mode === 'machine' ? activePillCls : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            เครื่องจักรในระบบ
          </button>
          <button
            type="button"
            disabled={qrLocked}
            onClick={() => onChange({ ...value, asset_mode: 'general', machine_id: '', machine_code: '' })}
            className={`min-h-[38px] rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
              mode === 'general' ? activePillCls : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            ทั่วไป / นอกอาคาร
          </button>
        </div>
      )}

      {mode === 'machine' ? (
        <div className="space-y-2.5">
          {qrLocked && preselectedMachine && (
            <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 truncate">
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <strong className="truncate">{preselectedMachine.machine_name}</strong>
                <span className="opacity-75">({preselectedMachine.machine_code})</span>
              </span>
              <button
                type="button"
                onClick={() => setQrLocked(false)}
                className="px-2 py-0.5 rounded-lg border border-emerald-300 bg-white text-emerald-700 font-semibold shrink-0"
              >
                เปลี่ยน
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {leftSlot ? (
              <>
                <div>{leftSlot}</div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ไลน์ / พื้นที่</label>
                  <select
                    disabled={qrLocked}
                    value={filterLine}
                    onChange={(e) => {
                      setFilterLine(e.target.value);
                      handleSelectMachine('');
                    }}
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm disabled:bg-slate-50"
                  >
                    <option value="">ทั้งหมด</option>
                    {lines.map((ln) => (
                      <option key={ln} value={ln}>{ln}</option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ไลน์ / พื้นที่</label>
                  <select
                    disabled={qrLocked}
                    value={filterLine}
                    onChange={(e) => {
                      setFilterLine(e.target.value);
                      handleSelectMachine('');
                    }}
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm disabled:bg-slate-50"
                  >
                    <option value="">ทั้งหมด</option>
                    {lines.map((ln) => (
                      <option key={ln} value={ln}>{ln}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ค้นหาเครื่องจักร</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      readOnly={qrLocked}
                      value={searchQuery}
                      onChange={(e) => {
                        const q = e.target.value;
                        setSearchQuery(q);
                        const ql = q.trim().toLowerCase();
                        if (ql) {
                          const matches = machines.filter((m) => {
                            if (filterLine && String(m.line || '').trim() !== filterLine) return false;
                            return `${m.machine_name || ''} ${m.machine_code || ''} ${m.line || ''}`.toLowerCase().includes(ql);
                          });
                          if (matches.length === 1) handleSelectMachine(matches[0].machine_id);
                        }
                      }}
                      placeholder="ชื่อเครื่อง / รหัส..."
                      className="w-full min-h-[44px] pl-8 pr-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {leftSlot && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                readOnly={qrLocked}
                value={searchQuery}
                onChange={(e) => {
                  const q = e.target.value;
                  setSearchQuery(q);
                  const ql = q.trim().toLowerCase();
                  if (ql) {
                    const matches = machines.filter((m) => {
                      if (filterLine && String(m.line || '').trim() !== filterLine) return false;
                      return `${m.machine_name || ''} ${m.machine_code || ''} ${m.line || ''}`.toLowerCase().includes(ql);
                    });
                    if (matches.length === 1) handleSelectMachine(matches[0].machine_id);
                  }
                }}
                placeholder="พิมพ์ชื่อเครื่องที่เรียกกัน เช่น ปั้มลม, เตาอบ, Spot..."
                className="w-full min-h-[42px] pl-8 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">เลือกเครื่องจักร *</label>
              <span className="text-[11px] text-slate-400">{filteredMachines.length} เครื่อง</span>
            </div>
            <select
              required
              disabled={qrLocked}
              value={value?.machine_id || ''}
              onChange={(e) => handleSelectMachine(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm disabled:bg-slate-50"
            >
              <option value="">-- เลือกเครื่องจักร --</option>
              {filteredMachines.map((m) => (
                <option key={m.machine_id} value={m.machine_id}>
                  {filterLine ? `${m.machine_name} (${m.machine_code})` : `[${m.line}] ${m.machine_name} (${m.machine_code})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">พื้นที่ / แผนก *</label>
              <select
                required
                value={value?.general_line || ''}
                onChange={(e) => onChange({ ...value, general_line: e.target.value })}
                className="w-full min-h-[44px] px-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">-- เลือกพื้นที่ --</option>
                {generalAreas.map((ga) => (
                  <option key={ga} value={ga}>{ga}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">หมวดอุปกรณ์ *</label>
              <select
                required
                value={value?.general_category || ''}
                onChange={(e) => onChange({ ...value, general_category: e.target.value })}
                className="w-full min-h-[44px] px-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">-- เลือกหมวด --</option>
                {generalCategories.map((gc) => (
                  <option key={gc} value={gc}>{gc}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ชื่ออุปกรณ์ / จุดที่พบปัญหา *</label>
            <input
              type="text"
              required
              value={value?.general_name || ''}
              onChange={(e) => onChange({ ...value, general_name: e.target.value })}
              placeholder="เช่น พัดลมเสา B3, ปืนยิง M10, ประตูม้วน..."
              className="w-full min-h-[44px] px-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}
