import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Coins,
  Info,
  Package,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { managementExecApi, managementPlanApi } from '../../../shared/services/managementApi';
import { formatMoney } from '../utils/managementHelpers';

const EXPLAINER_MAP = {
  sale: {
    title: 'Total Revenue (รายได้รวม)',
    formula: 'SUM(FG_Qty × StandardPrice หรือ Price_USD × ExRate)',
    desc: 'คำนวณมูลค่าผลผลิตสินค้าสำเร็จรูป (sap_no ขึ้นต้น 40%) โดยใช้อัตราแลกเปลี่ยนที่กำหนดบนแถบเครื่องมือ',
    sources: ['STOCK_TRANSACTIONS (PRODUCTION_FG)', 'ITEMS (Price_USD, StandardPrice)'],
  },
  cost: {
    title: 'Total Cost (ต้นทุนรวมจริง)',
    formula: 'RM + Actual Labor (DL+OT) + OH + Scrap',
    desc: 'รวมต้นทุนวัตถุดิบ ค่าแรงจริงจากการสแกนนิ้ว ค่าโสหุ้ยจัดสรร และมูลค่างานเสียเทียบกับต้นทุนมาตรฐาน (BOM Std)',
    sources: ['ITEMS', 'MES_MANUAL_DAILY_COSTS', 'STOCK_TRANSACTIONS (SCRAP)'],
  },
  gp: {
    title: 'Gross Profit (กำไรขั้นต้น)',
    formula: 'Total Revenue - Total Cost',
    desc: 'กำไรขั้นต้นจากการผลิตก่อนหักค่าใช้จ่ายขายและบริหาร (SG&A) พร้อมแสดงสัดส่วน Margin (%)',
    sources: ['Calculated Runtime Metric'],
  },
  rm: {
    title: 'Material Cost (วัตถุดิบและบรรจุภัณฑ์)',
    formula: 'SUM(FG_Qty × (Cost_RM + Cost_PKG + Cost_SUB))',
    desc: 'ต้นทุนวัตถุดิบทางทฤษฎีตามสูตร BOM ต่อหน่วยสินค้าที่ผลิตเสร็จ',
    sources: ['ITEMS (Cost_RM, Cost_PKG, Cost_SUB)'],
  },
  labor: {
    title: 'Labor Cost (ค่าแรงจริง DL + OT)',
    formula: 'SUM(Actual DL + Actual OT จาก Manpower)',
    desc: 'ค่าแรงรวมจากระบบสแกนนิ้วประจำวันเปรียบเทียบกับค่าแรงมาตรฐาน BOM Std DL',
    sources: ['MES_MANUAL_DAILY_COSTS (DIRECT_LABOR, OVERTIME)'],
  },
  oh: {
    title: 'Factory Overhead (โสหุ้ยการผลิต)',
    formula: 'SUM(FG_Qty × (Machine + Utilities + Indirect + Staff + Acc + Others))',
    desc: 'ค่าโสหุ้ยการผลิตจัดสรรตามปริมาณผลผลิต',
    sources: ['ITEMS (Cost_OH_*)'],
  },
};

export function MetricExplainerModal({ metricKey, onClose }) {
  if (!metricKey || !EXPLAINER_MAP[metricKey]) return null;
  const info = EXPLAINER_MAP[metricKey];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <Info className="h-5 w-5 text-blue-600" />
            <span>{info.title}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5 text-sm">
          <div>
            <div className="mb-1 text-xs font-bold uppercase text-slate-400">Formula</div>
            <div className="rounded-xl border-l-4 border-l-blue-500 bg-slate-900 p-3 font-mono text-xs text-slate-100">
              {info.formula}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-bold uppercase text-slate-400">คำอธิบาย</div>
            <p className="text-slate-600 dark:text-slate-300">{info.desc}</p>
          </div>
          <div>
            <div className="mb-1 text-xs font-bold uppercase text-slate-400">แหล่งข้อมูล</div>
            <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {info.sources.map((src) => (
                <li key={src} className="rounded-lg bg-slate-50 px-3 py-1.5 font-mono dark:bg-slate-800">
                  {src}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex justify-end border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

export function LineDetailModal({ lineName, date, onClose }) {
  const [activeTab, setActiveTab] = useState('hourly');
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState({ hourly: [], downtime: [], scrap: [], manpower: [] });

  useEffect(() => {
    if (!lineName) return;
    let active = true;
    setLoading(true);
    managementExecApi
      .getLineDetails(lineName, date)
      .then((res) => {
        if (active && res?.success && res.data) {
          setDetails(res.data);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [lineName, date]);

  if (!lineName) return null;

  const hourlyMap = {};
  (details.hourly || []).forEach((h) => {
    hourlyMap[Number(h.hr)] = Number(h.qty || 0);
  });
  const hourlySeries = Array.from({ length: 24 }, (_, i) => {
    const hr = (8 + i) % 24;
    return { hour: `${String(hr).padStart(2, '0')}:00`, qty: hourlyMap[hr] || 0 };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between bg-blue-600 px-5 py-3.5 text-white">
          <div>
            <h3 className="text-base font-bold">{lineName} — Line Performance Drilldown</h3>
            <p className="text-xs text-blue-100">ข้อมูลประจำวันที่ {date} (กะการทำงาน 08:00 – 08:00)</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/80 hover:bg-blue-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
          {[
            { id: 'hourly', label: 'ผลผลิตรายชั่วโมง (Output)' },
            { id: 'downtime', label: `เครื่องจักรหยุด (${details.downtime?.length || 0})` },
            { id: 'scrap', label: `ของเสีย (${details.scrap?.length || 0})` },
            { id: 'manpower', label: `พนักงานสแกนเข้า (${details.manpower?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] flex-1 border-b-2 px-3 py-2 text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'border-blue-600 bg-white text-blue-700 dark:bg-slate-900 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">กำลังโหลดข้อมูลไลน์ผลิต...</div>
          ) : activeTab === 'hourly' ? (
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlySeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Output (PCS)']} />
                  <Bar dataKey="qty" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : activeTab === 'downtime' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">เวลา</th>
                    <th className="p-2.5">เครื่องจักร</th>
                    <th className="p-2.5">สาเหตุ</th>
                    <th className="p-2.5 text-right">นาที</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {details.downtime?.length ? details.downtime.map((d, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-mono">{d.start_time}-{d.end_time}</td>
                      <td className="p-2.5 font-bold">{d.machine}</td>
                      <td className="p-2.5 text-rose-600 dark:text-rose-400">{d.cause}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{d.duration}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">ไม่มีบันทึกเครื่องจักรหยุด</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'scrap' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">Part No</th>
                    <th className="p-2.5">รายละเอียด</th>
                    <th className="p-2.5 text-right">จำนวน</th>
                    <th className="p-2.5 text-right">มูลค่าสูญเสีย (฿)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {details.scrap?.length ? details.scrap.map((s, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-mono font-semibold">{s.part_no}</td>
                      <td className="p-2.5">{s.part_description}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{Number(s.qty || 0).toLocaleString()}</td>
                      <td className="p-2.5 text-right font-mono text-rose-600">{formatMoney(s.lost_val)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">ไม่มีรายการของเสีย</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="p-2.5">รหัส</th>
                    <th className="p-2.5">ชื่อ-สกุล</th>
                    <th className="p-2.5">ตำแหน่ง</th>
                    <th className="p-2.5 text-right">เวลาสแกนเข้า</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {details.manpower?.length ? details.manpower.map((m, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-mono">{m.emp_id}</td>
                      <td className="p-2.5 font-semibold">{m.name_th}</td>
                      <td className="p-2.5">{m.position}</td>
                      <td className="p-2.5 text-right font-mono">{m.check_in}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">ไม่พบข้อมูลพนักงานสแกนเข้างาน</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlanEditModal({ open, initialPlan, lines = [], isOffline, onClose, onSaved, onDelete }) {
  const [form, setForm] = useState({
    plan_id: 0,
    plan_date: new Date().toISOString().split('T')[0],
    line: '',
    shift: 'DAY',
    item_id: '',
    item_label: '',
    original_planned_quantity: '',
    note: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialPlan) {
      setForm({
        plan_id: initialPlan.plan_id || 0,
        plan_date: initialPlan.plan_date || new Date().toISOString().split('T')[0],
        line: initialPlan.line || lines[0] || '',
        shift: initialPlan.shift || 'DAY',
        item_id: initialPlan.item_id || '',
        item_label: `${initialPlan.sap_no || '-'} / ${initialPlan.part_no || '-'} — ${initialPlan.part_description || ''}`,
        original_planned_quantity: String(initialPlan.original_planned_quantity ?? ''),
        note: initialPlan.note || '',
      });
      setSearchQuery(initialPlan.sap_no || initialPlan.part_no || '');
    } else {
      setForm({
        plan_id: 0,
        plan_date: new Date().toISOString().split('T')[0],
        line: lines.find((l) => l.toUpperCase() === 'ASSEMBLY') || lines[0] || '',
        shift: 'DAY',
        item_id: '',
        item_label: '',
        original_planned_quantity: '',
        note: '',
      });
      setSearchQuery('');
    }
    setSearchResults([]);
  }, [open, initialPlan, lines]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!open || q.length < 2 || form.plan_id > 0) {
      setSearchResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await managementPlanApi.searchItems(q);
        if (res?.success) {
          setSearchResults(res.data || []);
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, open, form.plan_id]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isOffline || saving) return;
    if (!form.item_id || Number(form.original_planned_quantity) < 0) return;
    setSaving(true);
    try {
      const res = await managementPlanApi.savePlan({
        plan_id: form.plan_id,
        plan_date: form.plan_date,
        line: form.line,
        shift: form.shift,
        item_id: Number(form.item_id),
        original_planned_quantity: Number(form.original_planned_quantity),
        note: form.note,
      });
      if (res?.success) {
        onSaved(res.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <Package className="h-5 w-5 text-blue-600" />
            <span>{form.plan_id > 0 ? 'แก้ไขแผนการผลิต' : 'เพิ่มแผนการผลิตใหม่'}</span>
          </h3>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">วันที่แผน (Plan Date)</label>
              <input
                type="date"
                required
                disabled={form.plan_id > 0}
                value={form.plan_date}
                onChange={(e) => setForm((p) => ({ ...p, plan_date: e.target.value }))}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">ไลน์ผลิต (Line)</label>
              <select
                required
                disabled={form.plan_id > 0}
                value={form.line}
                onChange={(e) => setForm((p) => ({ ...p, line: e.target.value }))}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">-- เลือกไลน์ --</option>
                {lines.map((ln) => <option key={ln} value={ln}>{ln}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">กะการทำงาน (Shift)</label>
            <div className="grid grid-cols-2 gap-2">
              {['DAY', 'NIGHT'].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={form.plan_id > 0}
                  onClick={() => setForm((p) => ({ ...p, shift: s }))}
                  className={`min-h-[44px] rounded-xl border text-xs font-bold transition ${
                    form.shift === s
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {s === 'DAY' ? 'DAY (กะเช้า)' : 'NIGHT (กะดึก)'}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">ชิ้นงาน (SAP / Part No.)</label>
            {form.plan_id > 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                {form.item_label}
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="พิมพ์อย่างน้อย 2 ตัวอักษร เพื่อค้นหา SAP หรือ Part No..."
                    className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                {form.item_label && (
                  <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{form.item_label}</span>
                  </div>
                )}
                {(searching || searchResults.length > 0) && (
                  <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    {searching ? (
                      <div className="p-3 text-xs text-slate-400">กำลังค้นหา...</div>
                    ) : searchResults.map((it) => (
                      <button
                        key={it.item_id}
                        type="button"
                        onClick={() => {
                          setForm((p) => ({
                            ...p,
                            item_id: it.item_id,
                            item_label: `${it.sap_no || '-'} / ${it.part_no || '-'} — ${it.part_description || ''}`,
                          }));
                          setSearchQuery(`${it.sap_no || ''} / ${it.part_no || ''}`);
                          setSearchResults([]);
                        }}
                        className="flex w-full flex-col border-b border-slate-100 px-3 py-2 text-left text-xs hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-700"
                      >
                        <div className="flex justify-between font-bold text-blue-600 dark:text-blue-400">
                          <span>{it.sap_no || '-'}</span>
                          <span className="text-slate-600 dark:text-slate-300">{it.part_no || '-'}</span>
                        </div>
                        <span className="truncate text-[11px] text-slate-500">{it.part_description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">จำนวนแผน (Qty)</label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={form.original_planned_quantity}
                onChange={(e) => setForm((p) => ({ ...p, original_planned_quantity: e.target.value }))}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-right font-mono text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">หมายเหตุ (Note)</label>
              <input
                type="text"
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                placeholder="ระบุหมายเหตุ (ถ้ามี)"
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          {form.plan_id > 0 ? (
            <button
              type="button"
              disabled={isOffline}
              onClick={() => onDelete(form.plan_id)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              <span>ลบรายการ</span>
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving || isOffline || !form.item_id}
              className="min-h-[44px] rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกแผน'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function ApsAutoPlanModal({ open, isOffline, onClose, onCompleted }) {
  const [form, setForm] = useState({
    filterType: 'WEEK',
    startDate: '',
    endDate: '',
    startWeek: '',
    endWeek: '',
    setupTime: '0.5',
    otHours: '0',
    shiftMode: 'DAY',
    allowedOTDays: ['1', '2', '3', '4', '5'],
    planStartDate: new Date().toISOString().split('T')[0],
    planRangeMode: 'OPEN',
    planEndDate: '',
    workOnSunday: false,
    overwrite: false,
  });
  const [running, setRunning] = useState(false);

  if (!open) return null;

  const toggleOtDay = (val) => {
    setForm((prev) => ({
      ...prev,
      allowedOTDays: prev.allowedOTDays.includes(val)
        ? prev.allowedOTDays.filter((d) => d !== val)
        : [...prev.allowedOTDays, val],
    }));
  };

  const handleRun = async (e) => {
    e.preventDefault();
    if (isOffline || running) return;
    setRunning(true);
    try {
      const res = await managementPlanApi.autoCreatePlan({
        ...form,
        setupTime: Number(form.setupTime || 0),
        otHours: Number(form.otHours || 0),
        allowedOTDays: form.allowedOTDays.join(','),
      });
      if (res?.success) {
        onCompleted(res.message);
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <form
        onSubmit={handleRun}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between bg-blue-600 px-5 py-3.5 text-white">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <Bot className="h-5 w-5" />
            <span>APS Auto-Plan Wizard</span>
          </h3>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-blue-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5 text-xs dark:bg-slate-950/60">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-100">1. กรองออเดอร์ (Source Filter)</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
                {['WEEK', 'DATE'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, filterType: t }))}
                    className={`rounded-md px-3 py-1 font-bold ${
                      form.filterType === t ? 'bg-blue-600 text-white' : 'text-slate-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {form.filterType === 'WEEK' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-slate-500">Shipping Week ตั้งแต่</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 46.26"
                    value={form.startWeek}
                    onChange={(e) => setForm((p) => ({ ...p, startWeek: e.target.value }))}
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-500">Shipping Week ถึง</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 50.26"
                    value={form.endWeek}
                    onChange={(e) => setForm((p) => ({ ...p, endWeek: e.target.value }))}
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-slate-500">SO Date ตั้งแต่</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-slate-500">SO Date ถึง</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 font-bold text-slate-800 dark:text-slate-100">2. ตัวแปรการผลิต (Production Factors)</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-slate-500">Loss เปลี่ยนรุ่น (ชม.)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.setupTime}
                  onChange={(e) => setForm((p) => ({ ...p, setupTime: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 text-right dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-500">เวลา OT / กะ (ชม.)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={form.otHours}
                  onChange={(e) => setForm((p) => ({ ...p, otHours: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 text-right dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-500">การกระจายกะ</label>
                <select
                  value={form.shiftMode}
                  onChange={(e) => setForm((p) => ({ ...p, shiftMode: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="DAY">เฉพาะ DAY</option>
                  <option value="NIGHT">เฉพาะ NIGHT</option>
                  <option value="SPLIT">กระจาย 2 กะ</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1.5 text-slate-500">อนุญาตแทรก OT วัน:</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: '1', label: 'จ.' },
                  { id: '2', label: 'อ.' },
                  { id: '3', label: 'พ.' },
                  { id: '4', label: 'พฤ.' },
                  { id: '5', label: 'ศ.' },
                  { id: '6', label: 'ส.' },
                  { id: '7', label: 'อา.' },
                ].map((d) => {
                  const active = form.allowedOTDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleOtDay(d.id)}
                      className={`min-h-[38px] rounded-lg border px-3 font-bold ${
                        active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 font-bold text-slate-800 dark:text-slate-100">3. กรอบเวลาจัดแผน</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-slate-500">เริ่มจัดแผนวันที่</label>
                <input
                  type="date"
                  required
                  value={form.planStartDate}
                  onChange={(e) => setForm((p) => ({ ...p, planStartDate: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-slate-500">โหมดกรอบเวลา</label>
                <select
                  value={form.planRangeMode}
                  onChange={(e) => setForm((p) => ({ ...p, planRangeMode: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="OPEN">เปิดกว้าง (จนกว่าจะหมด)</option>
                  <option value="CLOSED">กำหนดวันสิ้นสุด</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-slate-500">วันสิ้นสุด (Cut-off)</label>
                <input
                  type="date"
                  disabled={form.planRangeMode !== 'CLOSED'}
                  value={form.planEndDate}
                  onChange={(e) => setForm((p) => ({ ...p, planEndDate: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={form.workOnSunday}
                  onChange={(e) => setForm((p) => ({ ...p, workOnSunday: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <span>อนุญาตให้จัดแผนลงวันอาทิตย์ (Sunday OT)</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-bold text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                <input
                  type="checkbox"
                  checked={form.overwrite}
                  onChange={(e) => setForm((p) => ({ ...p, overwrite: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
                <span>ล้างแผน Auto เดิมแล้วเขียนทับ (ไม่ลบแผนที่เพิ่มด้วยมือ)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={running || isOffline}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            <span>{running ? 'กำลังประมวลผล...' : 'เริ่มประมวลผล APS'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export function FinancialAssessmentModal({ row, exchangeRate = 32, onClose }) {
  if (!row) return null;
  const priceThb = Number(row.price_usd || 0) > 0
    ? Number(row.price_usd) * exchangeRate
    : Number(row.standard_price || 0);
  const costThb = Number(row.cost_total || 0);
  const planQty = Number(row.adjusted_planned_quantity || 0);
  const actQty = Number(row.actual_quantity || 0);

  const planSales = planQty * priceThb;
  const actSales = actQty * priceThb;
  const planCost = planQty * costThb;
  const actCost = actQty * costThb;
  const actGp = actSales - actCost;
  const planGp = planSales - planCost;
  const progressPct = planSales > 0 ? Math.min(100, (actSales / planSales) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Coins className="h-4 w-4 text-amber-500" />
              <span>Financial Assessment</span>
            </h3>
            <p className="text-[11px] text-slate-500">{row.plan_date} • {row.line} • {row.part_no}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-blue-50 p-4 text-center dark:bg-blue-950/30">
          <div className="text-[11px] font-bold uppercase text-slate-500">Estimated Profit (GP)</div>
          <div className={`text-2xl font-black font-mono ${actGp >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-rose-600'}`}>
            {formatMoney(actGp)}
          </div>
          <div className="text-xs text-slate-500">Target GP: {formatMoney(planGp)}</div>
        </div>
        <div className="p-4 text-xs">
          <table className="w-full border-collapse border border-slate-200 dark:border-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="border border-slate-200 p-2 text-left dark:border-slate-700">Metric</th>
                <th className="border border-slate-200 p-2 text-right dark:border-slate-700">Plan</th>
                <th className="border border-slate-200 p-2 text-right dark:border-slate-700">Actual</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              <tr>
                <td className="border border-slate-200 p-2 font-sans font-bold dark:border-slate-700">Quantity</td>
                <td className="border border-slate-200 p-2 text-right dark:border-slate-700">{planQty.toLocaleString()}</td>
                <td className="border border-slate-200 p-2 text-right font-bold dark:border-slate-700">{actQty.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2 font-sans font-bold dark:border-slate-700">Sales</td>
                <td className="border border-slate-200 p-2 text-right dark:border-slate-700">{formatMoney(planSales)}</td>
                <td className="border border-slate-200 p-2 text-right font-bold text-emerald-600 dark:border-slate-700">{formatMoney(actSales)}</td>
              </tr>
              <tr>
                <td className="border border-slate-200 p-2 font-sans font-bold dark:border-slate-700">Total Cost</td>
                <td className="border border-slate-200 p-2 text-right dark:border-slate-700">{formatMoney(planCost)}</td>
                <td className="border border-slate-200 p-2 text-right font-bold text-rose-600 dark:border-slate-700">{formatMoney(actCost)}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[11px] font-bold">
              <span className="text-slate-500">Revenue Achievement</span>
              <span>{progressPct.toFixed(1)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-emerald-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <div className="mt-3 flex justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-slate-800">
            <span>Unit Price: {formatMoney(priceThb)}</span>
            <span>Unit Cost: {formatMoney(costThb)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DeleteRangeModal({ open, lines = [], isOffline, onClose, onDeleted }) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [line, setLine] = useState('ALL');
  const [deleting, setDeleting] = useState(false);

  if (!open) return null;

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (isOffline || deleting) return;
    setDeleting(true);
    try {
      const res = await managementPlanApi.deletePlansByRange({ startDate, endDate, line });
      if (res?.success) {
        onDeleted(res.message);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <form onSubmit={handleConfirm} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2 text-rose-600">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-base font-bold">ลบแผนการผลิตตามช่วงเวลา</h3>
        </div>
        <p className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          ข้อมูลแผนการผลิตในช่วงวันที่และไลน์ที่เลือกจะถูกลบถาวร (ไม่สามารถกู้คืนได้)
        </p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="mb-1 block font-bold text-slate-600 dark:text-slate-300">ตั้งแต่</label>
            <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="mb-1 block font-bold text-slate-600 dark:text-slate-300">ถึง</label>
            <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800" />
          </div>
        </div>
        <div className="mt-3 text-xs">
          <label className="mb-1 block font-bold text-slate-600 dark:text-slate-300">ไลน์ผลิต (Line)</label>
          <select value={line} onChange={(e) => setLine(e.target.value)} className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3 dark:border-slate-700 dark:bg-slate-800">
            <option value="ALL">ทั้งหมด (ALL Lines)</option>
            {lines.map((ln) => <option key={ln} value={ln}>{ln}</option>)}
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
            ยกเลิก
          </button>
          <button type="submit" disabled={deleting || isOffline} className="min-h-[44px] rounded-xl bg-rose-600 px-5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50">
            {deleting ? 'กำลังลบ...' : 'ยืนยันลบแผน'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ExecHelpModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
            <Users className="h-5 w-5 text-blue-600" />
            <span>คู่มือการใช้งาน Executive Overview</span>
          </h3>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-5 text-xs text-slate-600 dark:text-slate-300">
          <p><strong>Sale:</strong> ยอดขายตามผลผลิตจริง (FG Qty × Price × USD Exchange Rate)</p>
          <p><strong>Cost:</strong> ต้นทุนรวม (RM + Actual Labor จาก Manpower + Overhead + Scrap Loss)</p>
          <p><strong>Working Date Logic:</strong> นับตามวันที่เริ่มกะ (08:00 – 08:00 วันถัดไป) กะดึกจะถูกนับเข้ายอดของวันเริ่มกะ</p>
          <p><strong>AI Forecast:</strong> พยากรณ์ยอดขายล่วงหน้า 7 วันด้วย Hybrid Weighted Linear Regression</p>
        </div>
      </div>
    </div>
  );
}
