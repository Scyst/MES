import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, DollarSign, Network, Plus, Save, Target, Trash2, X } from 'lucide-react';
import { dailyPlApi, dailyPlMasterApi } from '../../../shared/services/dailyPlApi';
import { formatPlNumber } from '../utils/plFormulaEngine';

const AUTO_SOURCE_GROUPS = [
  { label: '─── REVENUE ───', options: [{ value: 'AUTO_STOCK', text: '📦 Revenue (ยอดขายจากการผลิต FG)' }] },
  {
    label: '─── LABOR (MANPOWER) ───',
    options: [
      { value: 'AUTO_LABOR', text: '👷 Direct Labor (ค่าแรงฝ่ายผลิต - Base)' },
      { value: 'AUTO_LABOR_OT', text: '🕒 Overtime DL (ค่าล่วงเวลาฝ่ายผลิต - OT)' },
      { value: 'AUTO_INDIRECT', text: '👨‍💼 Indirect Labor (ค่าแรงทีมซัพพอร์ต - Base)' },
      { value: 'AUTO_INDIRECT_OT', text: '🌇 Indirect OT (ค่าล่วงเวลาทีมซัพพอร์ต - OT)' },
      { value: 'AUTO_STD_LABOR', text: '📋 Standard DL (ค่าแรงมาตรฐานตาม BOM)' },
    ],
  },
  {
    label: '─── MATERIAL & SCRAP ───',
    options: [
      { value: 'AUTO_MAT', text: '🧱 Material Cost (Standard - ต้นทุนมาตรฐาน)' },
      { value: 'AUTO_MAT_ACTUAL', text: '🏗️ Material Cost (Actual - เบิกจ่ายจริง)' },
      { value: 'AUTO_SCRAP', text: '🗑️ Scrap Cost (มูลค่าของเสีย)' },
    ],
  },
  {
    label: '─── STANDARD OVERHEADS & UTILITY ───',
    options: [
      { value: 'AUTO_OH_MACHINE', text: '⚙️ Machine OH (ค่าโสหุ้ยเครื่องจักร)' },
      { value: 'AUTO_OH_UTILITY', text: '⚡ Utilities (ค่าไฟ/น้ำ ตามมาตรฐาน)' },
      { value: 'AUTO_UTILITY_ACTUAL', text: '🔌 Utility Cost (Actual - ค่าไฟจากมิเตอร์จริง)' },
      { value: 'AUTO_UTILITY_LPG_ACTUAL', text: '🔥 Utility Cost (LPG - ค่าแก๊สใช้งานจริง)' },
      { value: 'AUTO_OH_INDIRECT_STD', text: '🏢 Indirect OH (โสหุ้ยทางอ้อม)' },
      { value: 'AUTO_OH_STAFF', text: '👔 Staff Cost (ต้นทุนพนักงานรายเดือน)' },
      { value: 'AUTO_OH_ACCESSORY', text: '🔩 Accessories (วัสดุสิ้นเปลือง)' },
      { value: 'AUTO_OH_OTHER', text: '📦 Other OH (โสหุ้ยอื่นๆ)' },
    ],
  },
  {
    label: '─── OTHERS ───',
    options: [
      { value: 'AUTO_LOGISTICS', text: '🚚 Logistics Cost (ค่าขนส่ง/ตู้)' },
      { value: 'AUTO_MAINTENANCE', text: '🔧 Maintenance Cost (ค่าซ่อมบำรุง)' },
      { value: 'AUTO_FORKLIFT', text: '🚜 Forklift Cost (ค่าเช่า/แก๊ส)' },
    ],
  },
];

export function MonthlyBudgetModal({ open, section, entryItems = [], isOffline, onClose, onSaved, onOpenRate, onOpenCalendar }) {
  const [monthStr, setMonthStr] = useState(() => new Date().toISOString().slice(0, 7));
  const [workingDays, setWorkingDays] = useState(24);
  const [exRate, setExRate] = useState(32.0);
  const [containerRate, setContainerRate] = useState('3000.00');
  const [budgets, setBudgets] = useState({});
  const [saving, setSaving] = useState(false);

  const loadModalData = useCallback(async () => {
    if (!open || !monthStr) return;
    const [y, m] = monthStr.split('-').map(Number);
    const [wdRes, exRes, ctnRes, tgtRes] = await Promise.all([
      dailyPlApi.getWorkingDays(y, m),
      dailyPlApi.getExchangeRate(y, m),
      dailyPlApi.getContainerRate(y, m),
      dailyPlApi.getTargetData(y, m, section),
    ]);
    if (wdRes?.success) setWorkingDays(Number(wdRes.data?.days || 24));
    if (exRes?.success) setExRate(Number(exRes.data?.rate || 32.0));
    if (ctnRes?.success) setContainerRate(String(ctnRes.data?.rate ?? 3000));
    if (tgtRes?.success && tgtRes.data) setBudgets(tgtRes.data);
  }, [open, monthStr, section]);

  useEffect(() => {
    loadModalData();
  }, [loadModalData]);

  if (!open) return null;

  const handleSaveContainer = async () => {
    if (isOffline) return;
    const [y, m] = monthStr.split('-').map(Number);
    await dailyPlApi.saveContainerRate(y, m, Number(containerRate || 0));
  };

  const handleSaveBudget = async () => {
    if (isOffline || saving) return;
    setSaving(true);
    try {
      const [y, m] = monthStr.split('-').map(Number);
      const payload = entryItems
        .filter((it) => it.data_source !== 'CALCULATED')
        .map((it) => ({
          item_id: it.item_id,
          amount: Number(budgets[String(it.item_id)] ?? it.monthly_budget ?? 0),
        }));
      const res = await dailyPlApi.saveTarget(y, m, section, payload);
      if (res?.success) {
        onSaved(res.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 bg-cyan-50 px-5 py-3.5 dark:border-slate-700 dark:bg-cyan-950/30">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-cyan-900 dark:text-cyan-200">
              <Target className="h-5 w-5" />
              <span>Set Monthly Budget ({section})</span>
            </h3>
            <p className="text-xs text-cyan-700 dark:text-cyan-400">กำหนดงบประมาณรายเดือน ระบบจะหารตามวันทำงานให้อัตโนมัติ</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-white/60">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 text-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">Target Month:</span>
            <input
              type="month"
              value={monthStr}
              onChange={(e) => setMonthStr(e.target.value)}
              className="min-h-[38px] rounded-lg border border-cyan-300 px-2.5 font-bold dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenRate}
              className="min-h-[38px] rounded-lg border border-amber-300 bg-amber-50 px-3 font-bold text-amber-800"
            >
              USD Rate: {exRate}
            </button>
            <div className="flex items-center gap-1 rounded-lg border border-cyan-300 bg-cyan-50 px-2.5 py-1">
              <span className="font-bold text-cyan-800">CTN:</span>
              <input
                type="number"
                step="0.01"
                value={containerRate}
                onChange={(e) => setContainerRate(e.target.value)}
                onBlur={handleSaveContainer}
                className="w-20 bg-transparent text-right font-mono font-bold text-cyan-900 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onOpenCalendar}
              className="min-h-[38px] rounded-lg bg-emerald-600 px-3 font-bold text-white hover:bg-emerald-700"
            >
              Working Days: {workingDays}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="p-3">Account Item</th>
                <th className="p-3 text-right">Monthly Budget (฿)</th>
                <th className="p-3 text-right">~ Daily ({workingDays}d)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entryItems.filter((it) => it.data_source !== 'CALCULATED').map((it) => {
                const monthly = Number(budgets[String(it.item_id)] ?? it.monthly_budget ?? 0);
                const daily = workingDays > 0 ? monthly / workingDays : 0;
                return (
                  <tr key={it.item_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-2.5" style={{ paddingLeft: `${12 + Number(it.item_level || 0) * 16}px` }}>
                      <span className="font-semibold">{it.item_name}</span>
                      <span className="ml-2 font-mono text-[10px] text-slate-400">[{it.account_code}]</span>
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={budgets[String(it.item_id)] ?? ''}
                        placeholder={String(it.monthly_budget || 0)}
                        onChange={(e) => setBudgets((prev) => ({ ...prev, [String(it.item_id)]: e.target.value }))}
                        className="w-36 rounded-lg border border-slate-200 px-2.5 py-1.5 text-right font-mono font-bold dark:border-slate-700 dark:bg-slate-800"
                      />
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-500">{formatPlNumber(daily)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-xs font-bold">ยกเลิก</button>
          <button
            type="button"
            disabled={saving || isOffline}
            onClick={handleSaveBudget}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-cyan-600 px-5 text-xs font-bold text-white hover:bg-cyan-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'กำลังบันทึก...' : 'Save Budget'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExchangeRateModal({ open, isOffline, onClose, onSaved }) {
  const [monthStr, setMonthStr] = useState(() => new Date().toISOString().slice(0, 7));
  const [rate, setRate] = useState('32.00');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !monthStr) return;
    const [y, m] = monthStr.split('-').map(Number);
    dailyPlApi.getExchangeRate(y, m).then((res) => {
      if (res?.success) setRate(String(res.data?.rate ?? 32));
    });
  }, [open, monthStr]);

  if (!open) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (isOffline || saving) return;
    setSaving(true);
    try {
      const [y, m] = monthStr.split('-').map(Number);
      const res = await dailyPlApi.saveExchangeRate(y, m, Number(rate));
      if (res?.success) onSaved(res.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <form onSubmit={handleSave} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            <span>Set Exchange Rate</span>
          </h3>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <label className="mb-1 block font-bold text-slate-500">เดือน (Month)</label>
            <input type="month" value={monthStr} onChange={(e) => setMonthStr(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3 font-bold dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="mb-1 block font-bold text-slate-500">อัตราแลกเปลี่ยน (THB / USD)</label>
            <input type="number" step="0.01" required value={rate} onChange={(e) => setRate(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3 text-right font-mono text-base font-black dark:border-slate-700 dark:bg-slate-800" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-xs font-bold">ปิด</button>
          <button type="submit" disabled={saving || isOffline} className="min-h-[44px] rounded-xl bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'กำลังบันทึก...' : 'Save Rate'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function HolidayCalendarModal({ open, isOffline, onClose, onChanged }) {
  const [monthStr, setMonthStr] = useState(() => new Date().toISOString().slice(0, 7));
  const [days, setDays] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    day_type: 'HOLIDAY',
    description: '',
    work_rate: '2.0',
    ot_rate: '3.0',
  });

  const loadCalendar = useCallback(async () => {
    if (!open || !monthStr) return;
    const [y, m] = monthStr.split('-').map(Number);
    const start = `${monthStr}-01`;
    const end = new Date(y, m, 0).toISOString().split('T')[0];
    const res = await dailyPlApi.calendarRead(start, end);
    if (res?.success) setDays(res.data || []);
  }, [open, monthStr]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  if (!open) return null;

  const handleSaveDay = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    const res = await dailyPlApi.calendarSave({
      ...form,
      work_rate: Number(form.work_rate || 2),
      ot_rate: Number(form.ot_rate || 3),
    });
    if (res?.success) {
      loadCalendar();
      onChanged(res.message);
    }
  };

  const handleDeleteDay = async (dateStr) => {
    if (isOffline) return;
    const res = await dailyPlApi.calendarDelete(dateStr);
    if (res?.success) {
      loadCalendar();
      onChanged(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between bg-blue-600 px-5 py-3.5 text-white">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Calendar className="h-5 w-5" />
            <span>Holiday &amp; Working Calendar Settings</span>
          </h3>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-blue-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 overflow-y-auto p-5 md:grid-cols-12">
          <form onSubmit={handleSaveDay} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs md:col-span-5 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="font-bold text-slate-800 dark:text-slate-100">บันทึก/แก้ไขวันหยุด</div>
            <div>
              <label className="mb-1 block text-slate-500">วันที่</label>
              <input type="date" required value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-2.5 dark:border-slate-700 dark:bg-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-slate-500">ประเภทวัน</label>
              <select value={form.day_type} onChange={(e) => setForm((p) => ({ ...p, day_type: e.target.value }))} className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-2.5 dark:border-slate-700 dark:bg-slate-900">
                <option value="HOLIDAY">HOLIDAY (นักขัตฤกษ์)</option>
                <option value="OFFDAY">OFFDAY (หยุดบริษัท)</option>
                <option value="SUNDAY">SUNDAY (วันอาทิตย์)</option>
                <option value="NORMAL">NORMAL (ทำงานปกติ)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-slate-500">รายละเอียด</label>
              <input type="text" required value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="เช่น วันหยุดชดเชย..." className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-2.5 dark:border-slate-700 dark:bg-slate-900" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-slate-500">Work Rate</label>
                <input type="number" step="0.5" value={form.work_rate} onChange={(e) => setForm((p) => ({ ...p, work_rate: e.target.value }))} className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-2.5 dark:border-slate-700 dark:bg-slate-900" />
              </div>
              <div>
                <label className="mb-1 block text-slate-500">OT Rate</label>
                <input type="number" step="0.5" value={form.ot_rate} onChange={(e) => setForm((p) => ({ ...p, ot_rate: e.target.value }))} className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-2.5 dark:border-slate-700 dark:bg-slate-900" />
              </div>
            </div>
            <button type="submit" disabled={isOffline} className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 disabled:opacity-50">
              <Plus className="h-4 w-4" />
              <span>บันทึกวันหยุด</span>
            </button>
          </form>

          <div className="space-y-3 md:col-span-7">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">รายการปฏิทินประจำเดือน</span>
              <input type="month" value={monthStr} onChange={(e) => setMonthStr(e.target.value)} className="min-h-[38px] rounded-lg border border-slate-200 px-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 text-xs dark:divide-slate-800 dark:border-slate-700">
              {days.length === 0 ? (
                <div className="py-10 text-center text-slate-400">ไม่มีรายการวันหยุดพิเศษในเดือนนี้</div>
              ) : days.map((d) => (
                <div key={d.calendar_date} className="flex items-center justify-between p-2.5">
                  <div>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {d.calendar_date} <span className="ml-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700">{d.day_type}</span>
                    </div>
                    <div className="text-slate-500">{d.description || '-'} (x{d.work_rate_holiday} / OT x{d.ot_rate_holiday})</div>
                  </div>
                  <button type="button" disabled={isOffline} onClick={() => handleDeleteDay(d.calendar_date)} className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlStructureItemModal({ open, item, allItems = [], isOffline, onClose, onSaved }) {
  const [form, setForm] = useState({
    id: 0,
    account_code: '',
    item_name: '',
    parent_id: '',
    item_type: 'EXPENSE',
    row_order: 10,
    mode: 'MANUAL',
    calculation_formula: '',
    auto_source: 'AUTO_STOCK',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      const src = String(item.data_source || 'MANUAL');
      const mode = src === 'CALCULATED' ? 'CALCULATED' : src.startsWith('AUTO') ? 'AUTO' : 'MANUAL';
      setForm({
        id: item.id || 0,
        account_code: item.account_code || '',
        item_name: item.item_name || '',
        parent_id: item.parent_id ? String(item.parent_id) : '',
        item_type: item.item_type || 'EXPENSE',
        row_order: item.row_order ?? 10,
        mode,
        calculation_formula: item.calculation_formula || '',
        auto_source: src.startsWith('AUTO') ? src : 'AUTO_STOCK',
      });
    } else {
      setForm({
        id: 0,
        account_code: '',
        item_name: '',
        parent_id: '',
        item_type: 'EXPENSE',
        row_order: (allItems.length + 1) * 10,
        mode: 'MANUAL',
        calculation_formula: '',
        auto_source: 'AUTO_STOCK',
      });
    }
  }, [open, item, allItems.length]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isOffline || saving) return;
    setSaving(true);
    try {
      const dataSource = form.mode === 'CALCULATED'
        ? 'CALCULATED'
        : form.mode === 'AUTO'
          ? form.auto_source
          : 'MANUAL';
      const res = await dailyPlMasterApi.saveItem({
        id: form.id,
        account_code: form.account_code,
        item_name: form.item_name,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        item_type: form.item_type,
        row_order: Number(form.row_order || 10),
        data_source: dataSource,
        calculation_formula: form.mode === 'CALCULATED' ? form.calculation_formula : '',
      });
      if (res?.success) onSaved(res.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <form onSubmit={handleSubmit} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
          <h3 className="flex items-center gap-2 text-base font-bold text-blue-700 dark:text-blue-400">
            <Network className="h-5 w-5" />
            <span>{form.id ? 'แก้ไขรายการโครงสร้างบัญชี P&L' : 'เพิ่มรายการบัญชี P&L ใหม่'}</span>
          </h3>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-bold text-slate-600 dark:text-slate-300">Account Code</label>
              <input type="text" required value={form.account_code} onChange={(e) => setForm((p) => ({ ...p, account_code: e.target.value.toUpperCase() }))} placeholder="เช่น 41001" className="min-h-[42px] w-full rounded-xl border border-slate-200 px-3 font-mono font-bold dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="mb-1 block font-bold text-slate-600 dark:text-slate-300">Display Order</label>
              <input type="number" value={form.row_order} onChange={(e) => setForm((p) => ({ ...p, row_order: e.target.value }))} className="min-h-[42px] w-full rounded-xl border border-slate-200 px-3 font-mono dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>

          <div>
            <label className="mb-1 block font-bold text-slate-600 dark:text-slate-300">Item Name</label>
            <input type="text" required value={form.item_name} onChange={(e) => setForm((p) => ({ ...p, item_name: e.target.value }))} className="min-h-[42px] w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-bold text-slate-600 dark:text-slate-300">Parent Group</label>
              <select value={form.parent_id} onChange={(e) => setForm((p) => ({ ...p, parent_id: e.target.value }))} className="min-h-[42px] w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800">
                <option value="">-- รายการหลัก (Root) --</option>
                {allItems.filter((it) => it.id !== form.id).map((it) => (
                  <option key={it.id} value={it.id}>{'— '.repeat(Number(it.item_level || 0))}[{it.account_code}] {it.item_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-bold text-slate-600 dark:text-slate-300">Type</label>
              <select value={form.item_type} onChange={(e) => setForm((p) => ({ ...p, item_type: e.target.value }))} className="min-h-[42px] w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800">
                <option value="EXPENSE">EXPENSE (ค่าใช้จ่าย)</option>
                <option value="REVENUE">REVENUE (รายได้)</option>
                <option value="COGS">COGS (ต้นทุนขาย)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block font-bold text-slate-600 dark:text-slate-300">Data Source</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'MANUAL', label: 'MANUAL (คีย์มือ)' },
                { id: 'AUTO', label: 'AUTO (ดึงระบบอัตโนมัติ)' },
                { id: 'CALCULATED', label: 'FORMULA (สูตรคำนวณ)' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, mode: m.id }))}
                  className={`min-h-[42px] rounded-xl border font-bold ${
                    form.mode === m.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {form.mode === 'CALCULATED' && (
            <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 dark:border-blue-900 dark:bg-blue-950/30">
              <div className="font-bold text-blue-700 dark:text-blue-300">Calculation Formula</div>
              <input
                type="text"
                value={form.calculation_formula}
                onChange={(e) => setForm((p) => ({ ...p, calculation_formula: e.target.value }))}
                placeholder="เช่น SUM_CHILDREN, USE_TARGET, หรือ [REVENUES]-[COGS]"
                className="min-h-[42px] w-full rounded-xl border border-blue-200 bg-white px-3 font-mono font-bold dark:border-blue-800 dark:bg-slate-900"
              />
              <div className="flex flex-wrap gap-1.5">
                {['SUM_CHILDREN', 'USE_TARGET', ' + ', ' - ', ' * ', ' / ', '(', ')'].map((tok) => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => setForm((p) => ({
                      ...p,
                      calculation_formula: ['SUM_CHILDREN', 'USE_TARGET'].includes(tok) ? tok : `${p.calculation_formula}${tok}`,
                    }))}
                    className="rounded-lg border border-blue-200 bg-white px-2.5 py-1 font-mono font-bold text-blue-700 hover:bg-blue-100"
                  >
                    {tok.trim()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.mode === 'AUTO' && (
            <div className="space-y-2 rounded-xl border border-cyan-200 bg-cyan-50/70 p-3.5 dark:border-cyan-900 dark:bg-cyan-950/30">
              <div className="font-bold text-cyan-800 dark:text-cyan-300">Auto Data Source Mapping</div>
              <select
                value={form.auto_source}
                onChange={(e) => setForm((p) => ({ ...p, auto_source: e.target.value }))}
                className="min-h-[42px] w-full rounded-xl border border-cyan-200 bg-white px-3 font-bold dark:border-cyan-800 dark:bg-slate-900"
              >
                {AUTO_SOURCE_GROUPS.map((grp) => (
                  <optgroup key={grp.label} label={grp.label}>
                    {grp.options.map((opt) => <option key={opt.value} value={opt.value}>{opt.text}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-xs font-bold">ปิด</button>
          <button type="submit" disabled={saving || isOffline} className="min-h-[44px] rounded-xl bg-blue-600 px-5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'กำลังบันทึก...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
