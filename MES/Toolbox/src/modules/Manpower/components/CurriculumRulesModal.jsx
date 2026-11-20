import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Plus, Trash2, X, Layers, RefreshCw } from 'lucide-react';
import { learningCurriculumApi } from '../../../shared/services/manpowerApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { courses as catalogCourses } from '../../LearningHub/data/courses';
import { getCustomCourses } from '../../LearningHub/data/communityStore';

const TIER_OPTIONS = [
  { value: 'ALL', label: 'ทุกระดับตำแหน่ง (ALL Tiers)' },
  { value: 'TIER_1', label: 'Tier 1: ปฏิบัติการทั่วไป' },
  { value: 'TIER_2', label: 'Tier 2: หัวหน้างาน / เทคนิค / QC' },
  { value: 'TIER_3', label: 'Tier 3: บริหาร / วิศวกร / QA' },
];

const CYCLE_OPTIONS = [
  { value: 'MONTHLY', label: 'รีเซ็ททุก 1 เดือน (Monthly)' },
  { value: 'QUARTERLY', label: 'รีเซ็ททุก 3 เดือน (Quarterly)' },
  { value: 'NONE', label: 'สะสมถาวร (Permanent Credit)' },
];

export default function CurriculumRulesModal({ isOpen, onClose, isOnline, onRulesUpdated }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState([]);
  const [filters, setFilters] = useState({ hc_groups: [], departments: [], lines: [], tiers: [] });
  const [cycles, setCycles] = useState({ monthly: '', quarterly: '' });

  const allCourses = useMemo(() => [...catalogCourses, ...(getCustomCourses() || [])], []);

  const [form, setForm] = useState({
    rule_id: 0,
    course_id: catalogCourses[0]?.id || 'c-iso-45001',
    course_title: catalogCourses[0]?.title || '',
    hc_group_filter: 'ALL',
    department_filter: 'ALL',
    line_filter: 'ALL',
    tier_filter: 'ALL',
    requirement_type: 'MANDATORY',
    reset_cycle: 'MONTHLY',
    credits: 1.0,
    pass_score_pct: 80,
    notes: '',
  });

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await learningCurriculumApi.getRules();
      const data = res?.data || {};
      setRules(Array.isArray(data.rules) ? data.rules : []);
      setFilters(data.filters || { hc_groups: [], departments: [], lines: [] });
      setCycles({
        monthly: data.current_monthly_cycle || '',
        quarterly: data.current_quarterly_cycle || '',
      });
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดกฎหลักสูตรบังคับได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      loadRules();
    }
  }, [isOpen, loadRules]);

  if (!isOpen) return null;

  const handleSelectCourse = (cid) => {
    const found = allCourses.find((c) => c.id === cid);
    setForm((f) => ({
      ...f,
      course_id: cid,
      course_title: found ? found.title : cid,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isOnline) return;
    setSaving(true);
    try {
      const res = await learningCurriculumApi.saveRule(form);
      showToast(res?.message || 'บันทึกกติกาหลักสูตรเรียบร้อยแล้ว', 'success');
      setForm((f) => ({ ...f, rule_id: 0, notes: '' }));
      await loadRules();
      onRulesUpdated?.();
    } catch (err) {
      showToast(err.message || 'บันทึกกติกาหลักสูตรไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!isOnline) return;
    try {
      const res = await learningCurriculumApi.deleteRule(ruleId);
      showToast(res?.message || 'ลบกฎหลักสูตรเรียบร้อยแล้ว', 'success');
      await loadRules();
      onRulesUpdated?.();
    } catch (err) {
      showToast(err.message || 'ลบกฎหลักสูตรไม่สำเร็จ', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-fuchsia-600" />
            <div>
              <h4 className="text-base font-bold text-slate-800 dark:text-white">
                จัดการหลักสูตรบังคับแยกกลุ่มผู้เรียน & รอบรีเซ็ท (ระบบหน่วยกิตมหาวิทยาลัย)
              </h4>
              <p className="text-[11px] text-slate-500">
                รอบปัจจุบัน: รายเดือน <strong className="font-mono">{cycles.monthly}</strong> · ราย 3 เดือน <strong className="font-mono">{cycles.quarterly}</strong> — หากค้างวิชาบังคับ เกรด Learning จะถูกจำกัดสูงสุดที่ C จนกว่าจะสอบผ่านครบ
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Add/Edit Rule Form */}
          <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold">หลักสูตร (Learning Hub Catalog)</label>
                <select
                  value={form.course_id}
                  onChange={(e) => handleSelectCourse(e.target.value)}
                  className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900"
                >
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">ประเภทวิชา</label>
                <select
                  value={form.requirement_type}
                  onChange={(e) => setForm((f) => ({ ...f, requirement_type: e.target.value }))}
                  className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="MANDATORY">วิชาบังคับ (Mandatory Core)</option>
                  <option value="ELECTIVE">วิชาเลือก (Elective Bonus)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">รอบทบทวน & รีเซ็ทคะแนน</label>
                <select
                  value={form.reset_cycle}
                  onChange={(e) => setForm((f) => ({ ...f, reset_cycle: e.target.value }))}
                  className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900"
                >
                  {CYCLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mixed Group Targeting Filters */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
              <div>
                <label className="mb-1 block text-xs font-semibold">กลุ่มกำลังคน (HC Group)</label>
                <select
                  value={form.hc_group_filter}
                  onChange={(e) => setForm((f) => ({ ...f, hc_group_filter: e.target.value }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="ALL">ทั้งหมด (ALL)</option>
                  {(filters.hc_groups || []).map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">แผนก (Department)</label>
                <select
                  value={form.department_filter}
                  onChange={(e) => setForm((f) => ({ ...f, department_filter: e.target.value }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="ALL">ทั้งหมด (ALL)</option>
                  {(filters.departments || []).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">สายการผลิต (Line)</label>
                <select
                  value={form.line_filter}
                  onChange={(e) => setForm((f) => ({ ...f, line_filter: e.target.value }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="ALL">ทั้งหมด (ALL)</option>
                  {(filters.lines || []).map((ln) => <option key={ln} value={ln}>{ln}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">ระดับตำแหน่ง (Tier)</label>
                <select
                  value={form.tier_filter}
                  onChange={(e) => setForm((f) => ({ ...f, tier_filter: e.target.value }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                >
                  {TIER_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">หน่วยกิต (Credits)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="10"
                  value={form.credits}
                  onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-2.5 text-center font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">เกณฑ์ผ่าน (%)</label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={form.pass_score_pct}
                  onChange={(e) => setForm((f) => ({ ...f, pass_score_pct: Number(e.target.value) }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-2.5 text-center font-mono text-xs dark:border-slate-600 dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              {form.rule_id > 0 && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rule_id: 0 }))}
                  className="min-h-[40px] rounded-lg border px-3 text-xs font-semibold"
                >
                  ยกเลิกการแก้ไข
                </button>
              )}
              <button
                type="submit"
                disabled={saving || !isOnline}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-600 px-4 text-xs font-bold text-white hover:bg-fuchsia-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {saving ? 'กำลังบันทึก...' : (form.rule_id ? 'อัปเดตกติกา' : 'เพิ่มกติกาหลักสูตร')}
              </button>
            </div>
          </form>

          {/* Existing Rules Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2.5">หลักสูตร</th>
                  <th className="px-3 py-2.5">กลุ่มเป้าหมายแบบผสม</th>
                  <th className="px-2 py-2.5 text-center">ประเภท</th>
                  <th className="px-2 py-2.5 text-center">รอบรีเซ็ท</th>
                  <th className="px-2 py-2.5 text-center">หน่วยกิต</th>
                  <th className="px-3 py-2.5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">กำลังโหลด...</td></tr>
                ) : rules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      <Layers className="h-6 w-6 mx-auto mb-1 text-slate-300" />
                      ยังไม่ได้กำหนดกติกาหลักสูตรบังคับ (ระบบจะคิดจากหน่วยกิตสะสมรวม)
                    </td>
                  </tr>
                ) : (
                  rules.map((r) => (
                    <tr key={r.rule_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-800 dark:text-white">{r.course_title}</div>
                        <div className="text-[10px] font-mono text-slate-400">{r.course_id} (ผ่าน ≥ {r.pass_score_pct}%)</div>
                      </td>
                      <td className="px-3 py-2.5 text-[11px]">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">HC: {r.hc_group_filter}</span>
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">Dept: {r.department_filter}</span>
                          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5">Line: {r.line_filter}</span>
                          <span className="rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.5 font-semibold">{r.tier_filter}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          r.requirement_type === 'MANDATORY'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                        }`}>
                          {r.requirement_type === 'MANDATORY' ? 'วิชาบังคับ' : 'วิชาเลือก'}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono text-[11px]">
                        {r.reset_cycle === 'MONTHLY' ? 'ทุก 1 เดือน' : (r.reset_cycle === 'QUARTERLY' ? 'ทุก 3 เดือน' : 'ถาวร')}
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-bold">
                        {Number(r.credits || 1).toFixed(1)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setForm({
                              rule_id: r.rule_id,
                              course_id: r.course_id,
                              course_title: r.course_title,
                              hc_group_filter: r.hc_group_filter,
                              department_filter: r.department_filter,
                              line_filter: r.line_filter,
                              tier_filter: r.tier_filter,
                              requirement_type: r.requirement_type,
                              reset_cycle: r.reset_cycle,
                              credits: Number(r.credits || 1),
                              pass_score_pct: Number(r.pass_score_pct || 80),
                              notes: r.notes || '',
                            })}
                            className="rounded px-2 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50"
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.rule_id)}
                            className="rounded p-1.5 text-rose-500 hover:bg-rose-50"
                            title="ลบ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3 dark:border-slate-700">
          <button
            type="button"
            onClick={loadRules}
            className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold dark:border-slate-600"
          >
            <RefreshCw className="h-3.5 w-3.5" /> รีเฟรชรายการ
          </button>
          <button type="button" onClick={onClose} className="min-h-[40px] rounded-lg bg-slate-800 px-5 text-xs font-bold text-white hover:bg-slate-900">
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
