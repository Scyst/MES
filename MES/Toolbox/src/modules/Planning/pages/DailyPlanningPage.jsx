import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ListOrdered, Users, AlertTriangle, Truck, Plus, Save, History, RefreshCw,
  Search, CheckCircle2, WifiOff, X, Trash2, Package
} from 'lucide-react';
import { planningApi } from '../../../shared/services/manpowerApi';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { formatNumber, getTodayIso } from '../../Manpower/utils/manpowerHelpers';

function safeParseArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function DailyPlanningPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const role = String(user?.role || '').toLowerCase();
  const canEdit = ['creator', 'admin', 'manager', 'supervisor'].includes(role);

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [date, setDate] = useState(getTodayIso);
  const [shift, setShift] = useState('DAY');
  const [loading, setLoading] = useState(false);
  const [savingMeeting, setSavingMeeting] = useState(false);

  const [plans, setPlans] = useState([]);
  const [manpowerMap, setManpowerMap] = useState({});
  const [loadingPlans, setLoadingPlans] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [history, setHistory] = useState([]);
  const [masterLines, setMasterLines] = useState([]);

  const [brief, setBrief] = useState({
    meeting_type: 'MORNING_BRIEF',
    meeting_time: '08:00',
    safety_talk: '',
    manpower_update: '',
    production_plan: '',
    machine_status: '',
    general_note: '',
  });
  const [actions, setActions] = useState([]);

  // Add Plan Modal
  const [addPlanOpen, setAddPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ line: '', shift: 'DAY', item_id: 0, item_label: '', qty: 0, note: '' });
  const [itemQuery, setItemQuery] = useState('');
  const [itemResults, setItemResults] = useState([]);
  const [savingPlan, setSavingPlan] = useState(false);

  // History Drawer
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const fetchMeeting = useCallback(async () => {
    setLoading(true);
    try {
      const res = await planningApi.getMeeting(date, shift);
      const d = res?.data || {};
      setPlans(Array.isArray(d.plans) ? d.plans : []);
      setManpowerMap(d.manpower_map && typeof d.manpower_map === 'object' ? d.manpower_map : {});
      setLoadingPlans(Array.isArray(d.loading_plans) ? d.loading_plans : []);
      setShortages(Array.isArray(d.shortages) ? d.shortages : []);
      setHistory(Array.isArray(d.history) ? d.history : []);

      const m = d.meeting;
      if (m) {
        setBrief({
          meeting_type: m.meeting_type || 'MORNING_BRIEF',
          meeting_time: m.meeting_time || '08:00',
          safety_talk: m.safety_talk || '',
          manpower_update: m.manpower_update || '',
          production_plan: m.production_plan || '',
          machine_status: m.machine_status || '',
          general_note: m.general_note || '',
        });
        setActions(safeParseArray(m.action_plan_json));
      } else {
        setBrief({
          meeting_type: 'MORNING_BRIEF',
          meeting_time: shift === 'NIGHT' ? '20:00' : '08:00',
          safety_talk: '',
          manpower_update: '',
          production_plan: '',
          machine_status: '',
          general_note: '',
        });
        setActions([]);
      }
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดข้อมูล Daily Command Center ได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [date, shift, showToast]);

  useEffect(() => {
    fetchMeeting();
  }, [fetchMeeting]);

  useEffect(() => {
    planningApi.getMasterLines().then((res) => {
      if (Array.isArray(res?.data?.lines)) {
        setMasterLines(res.data.lines);
      }
    }).catch(() => {});
  }, []);

  // Debounced item autocomplete search
  useEffect(() => {
    if (!addPlanOpen) return undefined;
    const timer = setTimeout(async () => {
      try {
        const res = await planningApi.searchItems(itemQuery);
        setItemResults(Array.isArray(res?.data) ? res.data : []);
      } catch {
        setItemResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [itemQuery, addPlanOpen]);

  const planTotals = useMemo(() => {
    return plans.reduce((acc, p) => {
      acc.plan += Number(p.adj_qty || p.plan_qty || 0);
      acc.actual += Number(p.actual_qty || 0);
      return acc;
    }, { plan: 0, actual: 0 });
  }, [plans]);

  const handleSaveMeeting = async () => {
    if (!canEdit || !isOnline) return;
    setSavingMeeting(true);
    try {
      const targetShift = shift === 'ALL' ? 'DAY' : shift;
      const res = await planningApi.saveMeeting({
        meeting_date: date,
        shift: targetShift,
        ...brief,
        actions,
      });
      showToast(res?.message || 'บันทึกบันทึกการประชุมเรียบร้อยแล้ว', 'success');
      fetchMeeting();
    } catch (err) {
      showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleUpdatePlanQty = async (planId, rawQty) => {
    if (!canEdit || !isOnline) return;
    const qty = Number(rawQty);
    if (!Number.isFinite(qty) || qty < 0) return;
    try {
      await planningApi.updatePlanQty({ plan_id: planId, original_qty: qty });
      showToast('อัปเดตยอดแผนผลิตเรียบร้อยแล้ว', 'success');
      fetchMeeting();
    } catch (err) {
      showToast(err.message || 'อัปเดตยอดแผนไม่สำเร็จ', 'error');
    }
  };

  const handleAddPlan = async (e) => {
    e.preventDefault();
    if (!canEdit || !isOnline) return;
    setSavingPlan(true);
    try {
      const res = await planningApi.addPlan({
        plan_date: date,
        line: planForm.line,
        shift: planForm.shift,
        item_id: planForm.item_id,
        qty: Number(planForm.qty),
        note: planForm.note,
      });
      showToast(res?.message || 'เพิ่มแผนการผลิตเรียบร้อยแล้ว', 'success');
      setAddPlanOpen(false);
      fetchMeeting();
    } catch (err) {
      showToast(err.message || 'เพิ่มแผนไม่สำเร็จ', 'error');
    } finally {
      setSavingPlan(false);
    }
  };

  const addActionRow = () => {
    setActions((prev) => [...prev, { topic: '', owner: '', due_date: date, status: 'OPEN' }]);
  };

  const updateActionRow = (idx, key, val) => {
    setActions((prev) => prev.map((a, i) => (i === idx ? { ...a, [key]: val } : a)));
  };

  const removeActionRow = (idx) => {
    setActions((prev) => prev.filter((_, i) => i !== idx));
  };

  const progressPct = planTotals.plan > 0 ? ((planTotals.actual / planTotals.plan) * 100).toFixed(1) : '0.0';

  return (
    <div className="w-full space-y-5 p-3 sm:p-5">
      {!isOnline && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
          <WifiOff className="h-5 w-5 shrink-0" />
          อยู่ในโหมดออฟไลน์ — ปิดการแก้ไขและบันทึกข้อมูลชั่วคราว
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-sm">
            <ListOrdered className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">
                Daily Command Center (Morning Meeting &amp; Production Plan)
              </h1>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                SPA Ported
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ติดตามกำลังคน แผนผลิต vs ผลิตจริง โหลดตู้สินค้า 7 วัน และบันทึก Action Plan ประจำวัน
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />

          <select
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="DAY">กะเช้า (DAY)</option>
            <option value="NIGHT">กะดึก (NIGHT)</option>
            <option value="ALL">ทุกกะ (ALL)</option>
          </select>

          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            <History className="h-4 w-4 text-indigo-500" />
            ประวัติ ({history.length})
          </button>

          <button
            type="button"
            onClick={fetchMeeting}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
            title="รีเฟรช"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          </button>

          {canEdit && (
            <button
              type="button"
              disabled={savingMeeting || !isOnline}
              onClick={handleSaveMeeting}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white shadow-2xs hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingMeeting ? 'กำลังบันทึก...' : 'บันทึกการประชุม'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>แผนผลิต vs ผลิตจริง</span>
            <Package className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-1.5 text-xl font-bold text-slate-800 dark:text-white">
            {formatNumber(planTotals.actual)} / {formatNumber(planTotals.plan)}
          </div>
          <div className="text-xs font-semibold text-emerald-600">Progress: {progressPct}% ({plans.length} รายการ)</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>กำลังพลประจำสาย</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1.5 text-xl font-bold text-slate-800 dark:text-white">
            {Object.keys(manpowerMap).length} สายผลิต
          </div>
          <div className="text-xs text-slate-500">
            รวมมาทำงาน {Object.values(manpowerMap).reduce((s, v) => s + Number(v.act || 0), 0)} คน
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-2xs dark:border-amber-800/60 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-600">
            <span>สต็อกต่ำกว่า Min Stock</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-amber-600">{shortages.length} รายการ</div>
          <div className="text-xs text-slate-500">ต้องเฝ้าระวังเติมสต็อก</div>
        </div>

        <div className="rounded-xl border border-sky-200 bg-white p-4 shadow-2xs dark:border-sky-800/60 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-600">
            <span>แผนโหลดตู้ 7 วันข้างหน้า</span>
            <Truck className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-sky-600">{loadingPlans.length} PO</div>
          <div className="text-xs text-slate-500">Sales Order Loading Schedule</div>
        </div>
      </div>

      {/* Live Line Manpower Pills */}
      {Object.keys(manpowerMap).length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-800">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 self-center mr-1">Manpower Actual/Req:</span>
          {Object.entries(manpowerMap).map(([ln, mp]) => (
            <span
              key={ln}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                mp.act >= mp.req
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {ln}: {mp.act}/{mp.req}
            </span>
          ))}
        </div>
      )}

      {/* Main Content Split */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Production Plan vs Actual + Morning Brief Notes (2 cols) */}
        <div className="space-y-5 xl:col-span-2">
          {/* Production Plan Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                แผนการผลิต vs ผลผลิตจริง ({date} — {shift})
              </h3>
              {canEdit && (
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => {
                    setPlanForm({
                      line: masterLines[0] || '',
                      shift: shift === 'ALL' ? 'DAY' : shift,
                      item_id: 0,
                      item_label: '',
                      qty: 0,
                      note: '',
                    });
                    setItemQuery('');
                    setAddPlanOpen(true);
                  }}
                  className="min-h-[38px] inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> เพิ่มแผนผลิต
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-2.5">สาย / กะ</th>
                    <th className="px-3 py-2.5">Part No / รายละเอียด</th>
                    <th className="px-3 py-2.5 text-center">คน (Act/Req)</th>
                    <th className="px-3 py-2.5 text-right">แผนเดิม (Plan)</th>
                    <th className="px-3 py-2.5 text-right">ปรับสุทธิ (Adj)</th>
                    <th className="px-3 py-2.5 text-right">ผลิตได้จริง (Actual)</th>
                    <th className="px-4 py-2.5 text-right">คงคลัง (Onhand)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {plans.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">ยังไม่มีแผนผลิตในวันที่และกะที่เลือก</td></tr>
                  ) : (
                    plans.map((p) => (
                      <tr key={p.plan_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-2.5 font-semibold">
                          <div>{p.line}</div>
                          <div className="text-[10px] text-slate-400">{p.shift}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.part_no}</div>
                          <div className="max-w-[240px] truncate text-[11px] text-slate-500">{p.part_description || p.sap_no}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono">
                          {p.mp_act}/{p.mp_req}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {canEdit ? (
                            <input
                              type="number"
                              defaultValue={p.plan_qty}
                              onBlur={(e) => {
                                const val = Number(e.target.value);
                                if (val !== Number(p.plan_qty)) {
                                  handleUpdatePlanQty(p.plan_id, val);
                                }
                              }}
                              className="min-h-[34px] w-20 rounded border border-slate-300 px-2 text-right font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
                            />
                          ) : (
                            <span className="font-mono">{formatNumber(p.plan_qty)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold">{formatNumber(p.adj_qty)}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatNumber(p.actual_qty)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">{formatNumber(p.current_stock)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Morning Brief Form & Action Plan */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                บันทึกสรุปการประชุมเช้าและข้อสั่งการ (Morning Brief Notes)
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <input
                  type="time"
                  value={brief.meeting_time}
                  onChange={(e) => setBrief((b) => ({ ...b, meeting_time: e.target.value }))}
                  className="min-h-[36px] rounded border border-slate-300 px-2 dark:border-slate-600 dark:bg-slate-900"
                />
                <input
                  type="text"
                  value={brief.meeting_type}
                  onChange={(e) => setBrief((b) => ({ ...b, meeting_type: e.target.value }))}
                  className="min-h-[36px] w-36 rounded border border-slate-300 px-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                { key: 'safety_talk', label: 'Safety Talk (ความปลอดภัย / อุบัติเหตุ)' },
                { key: 'manpower_update', label: 'Manpower Update (กำลังคน / ขาด-ลา-สลับตำแหน่ง)' },
                { key: 'production_plan', label: 'Production Plan Summary (โฟกัสงานเร่งด่วน)' },
                { key: 'machine_status', label: 'Machine & Quality Status (สถานะเครื่องจักร / คุณภาพ)' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{f.label}</label>
                  <textarea
                    rows={3}
                    disabled={!canEdit}
                    value={brief[f.key]}
                    onChange={(e) => setBrief((b) => ({ ...b, [f.key]: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">บันทึกเพิ่มเติมทั่วไป (General Note)</label>
              <textarea
                rows={2}
                disabled={!canEdit}
                value={brief.general_note}
                onChange={(e) => setBrief((b) => ({ ...b, general_note: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>

            {/* Structured Action Plan */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-200">
                  Action Plan Tracking ({actions.length})
                </h4>
                {canEdit && (
                  <button
                    type="button"
                    onClick={addActionRow}
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                  >
                    <Plus className="h-3.5 w-3.5" /> เพิ่ม Action
                  </button>
                )}
              </div>

              {actions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700">
                  ยังไม่มีรายการติดตามผล (Action Items)
                </div>
              ) : (
                <div className="space-y-2">
                  {actions.map((act, idx) => (
                    <div key={idx} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 p-2.5 md:grid-cols-12 dark:border-slate-700">
                      <input
                        type="text"
                        placeholder="หัวข้อ / สิ่งที่ต้องดำเนินการ"
                        value={act.topic || ''}
                        onChange={(e) => updateActionRow(idx, 'topic', e.target.value)}
                        className="min-h-[36px] rounded border border-slate-300 px-2 text-xs md:col-span-5 dark:border-slate-600 dark:bg-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="ผู้รับผิดชอบ"
                        value={act.owner || ''}
                        onChange={(e) => updateActionRow(idx, 'owner', e.target.value)}
                        className="min-h-[36px] rounded border border-slate-300 px-2 text-xs md:col-span-3 dark:border-slate-600 dark:bg-slate-900"
                      />
                      <input
                        type="date"
                        value={act.due_date || date}
                        onChange={(e) => updateActionRow(idx, 'due_date', e.target.value)}
                        className="min-h-[36px] rounded border border-slate-300 px-2 text-xs md:col-span-2 dark:border-slate-600 dark:bg-slate-900"
                      />
                      <div className="flex items-center gap-1 md:col-span-2">
                        <select
                          value={act.status || 'OPEN'}
                          onChange={(e) => updateActionRow(idx, 'status', e.target.value)}
                          className="min-h-[36px] flex-1 rounded border border-slate-300 px-1.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900"
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">DOING</option>
                          <option value="DONE">DONE</option>
                        </select>
                        {canEdit && (
                          <button type="button" onClick={() => removeActionRow(idx)} className="p-1.5 text-rose-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side Panels: Loading Schedule & Stock Shortages */}
        <div className="space-y-5">
          {/* 7-Day Container Loading */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
              <Truck className="h-4 w-4 text-sky-500" />
              แผนโหลดตู้สินค้า 7 วัน ({loadingPlans.length})
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {loadingPlans.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">ไม่มีตารางโหลดตู้ใน 7 วันข้างหน้า</div>
              ) : (
                loadingPlans.map((lp) => (
                  <div key={lp.id} className="rounded-lg border border-slate-200 p-2.5 text-xs dark:border-slate-700">
                    <div className="flex items-center justify-between font-bold">
                      <span className="font-mono text-indigo-600 dark:text-indigo-400">{lp.po_number}</span>
                      <span className="font-mono text-slate-500">{lp.loading_date}</span>
                    </div>
                    <div className="mt-0.5 truncate text-slate-700 dark:text-slate-200">{lp.part_no || lp.sku} — {lp.description}</div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Order: <strong>{formatNumber(lp.quantity)}</strong></span>
                      <span>Stock: <strong className={Number(lp.onhand_qty) >= Number(lp.quantity) ? 'text-emerald-600' : 'text-rose-600'}>{formatNumber(lp.onhand_qty)}</strong></span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold dark:bg-slate-700">{lp.loading_status || 'WAIT'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stock Shortages Watchlist */}
          <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-2xs dark:border-amber-800/60 dark:bg-slate-800">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              รายการสต็อกต่ำกว่าเกณฑ์ Min Stock ({shortages.length})
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {shortages.length === 0 ? (
                <div className="flex items-center justify-center gap-1.5 py-6 text-xs text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> สินค้าทุกรายการมีสต็อกเพียงพอ
                </div>
              ) : (
                shortages.map((s) => (
                  <div key={s.item_id} className="rounded-lg border border-amber-100 bg-amber-50/40 p-2.5 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="font-mono font-bold text-slate-800 dark:text-white">{s.part_no}</div>
                    <div className="truncate text-[11px] text-slate-500">{s.part_description}</div>
                    <div className="mt-1 flex justify-between font-mono text-[11px]">
                      <span className="text-rose-600 font-bold">Onhand: {formatNumber(s.onhand_qty)}</span>
                      <span className="text-slate-500">Min: {formatNumber(s.min_stock)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Production Plan Modal */}
      {addPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form onSubmit={handleAddPlan} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <h4 className="text-base font-bold">เพิ่มแผนการผลิต ({date})</h4>
              <button type="button" onClick={() => setAddPlanOpen(false)} className="p-1 text-slate-400"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">สายการผลิต *</label>
                <input
                  type="text"
                  required
                  value={planForm.line}
                  onChange={(e) => setPlanForm((f) => ({ ...f, line: e.target.value }))}
                  list="plan-lines-list"
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
                <datalist id="plan-lines-list">
                  {masterLines.map((ln) => <option key={ln} value={ln} />)}
                </datalist>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">กะผลิต</label>
                <select
                  value={planForm.shift}
                  onChange={(e) => setPlanForm((f) => ({ ...f, shift: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="DAY">DAY</option>
                  <option value="NIGHT">NIGHT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold">ค้นหาสินค้า (Part No / SAP / Description) *</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                  placeholder="พิมพ์อย่างน้อย 2 ตัวอักษร..."
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              {planForm.item_id > 0 && (
                <div className="mt-1 rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  เลือกแล้ว: {planForm.item_label}
                </div>
              )}
              <div className="mt-1.5 max-h-36 overflow-y-auto rounded-lg border border-slate-200 divide-y dark:border-slate-700 dark:divide-slate-700">
                {itemResults.map((it) => (
                  <button
                    key={it.item_id}
                    type="button"
                    onClick={() => setPlanForm((f) => ({ ...f, item_id: it.item_id, item_label: `${it.part_no} — ${it.part_description}` }))}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-indigo-50 dark:hover:bg-slate-800"
                  >
                    <div className="font-mono font-bold text-indigo-600">{it.part_no} <span className="text-slate-400">({it.sap_no})</span></div>
                    <div className="truncate text-slate-600 dark:text-slate-300">{it.part_description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold">จำนวนแผนผลิต (Qty) *</label>
              <input
                type="number"
                required
                min="1"
                step="0.001"
                value={planForm.qty}
                onChange={(e) => setPlanForm((f) => ({ ...f, qty: e.target.value }))}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm font-mono dark:border-slate-600 dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAddPlanOpen(false)} className="min-h-[44px] rounded-lg border px-4 text-sm font-semibold dark:border-slate-600">ยกเลิก</button>
              <button
                type="submit"
                disabled={savingPlan || !planForm.item_id || !isOnline}
                className="min-h-[44px] rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingPlan ? 'กำลังบันทึก...' : 'เพิ่มแผนผลิต'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Meeting History Drawer Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b px-5 py-4 dark:border-slate-700">
              <h4 className="text-base font-bold">ประวัติบันทึกการประชุมล่าสุด</h4>
              <button type="button" onClick={() => setHistoryOpen(false)} className="p-1 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {history.map((h) => (
                <button
                  key={h.meeting_id}
                  type="button"
                  onClick={() => {
                    setDate(h.meeting_date);
                    setShift(h.shift || 'DAY');
                    setHistoryOpen(false);
                  }}
                  className="w-full rounded-xl border border-slate-200 p-3 text-left text-xs hover:border-indigo-400 hover:bg-indigo-50/40 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-white">
                    <span>{h.meeting_date} ({h.shift})</span>
                    <span className="font-mono text-indigo-600">{h.meeting_time || '08:00'}</span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-slate-500">{h.general_note || 'ไม่มีบันทึกเพิ่มเติม'}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
