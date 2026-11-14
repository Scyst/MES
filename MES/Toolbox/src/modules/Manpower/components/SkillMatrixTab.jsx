import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Award, Settings, Search, Download, Plus, Trash2, Power, X, RefreshCw } from 'lucide-react';
import { skillMatrixApi } from '../../../shared/services/manpowerApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import { exportRowsToExcel } from '../utils/manpowerHelpers';

const LEVEL_META = [
  { level: 0, label: 'L0 ยังไม่มีทักษะ', short: 'L0', cls: 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700' },
  { level: 1, label: 'L1 กำลังฝึกหัด', short: 'L1', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' },
  { level: 2, label: 'L2 ปฏิบัติงานได้', short: 'L2', cls: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800' },
  { level: 3, label: 'L3 ชำนาญการ', short: 'L3', cls: 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' },
  { level: 4, label: 'L4 ผู้ฝึกสอน (Trainer)', short: 'L4', cls: 'bg-emerald-100 text-emerald-800 border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700' },
];

export default function SkillMatrixTab({ hcGroup, structure, canEdit, isOnline }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [lineFilter, setLineFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [skills, setSkills] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [skillData, setSkillData] = useState({});
  const [categories, setCategories] = useState([]);

  // Cell edit modal
  const [cellModal, setCellModal] = useState(null);
  const [cellForm, setCellForm] = useState({ level: 0, notes: '' });
  const [savingCell, setSavingCell] = useState(false);

  // Skill Definitions CRUD modal
  const [defModalOpen, setDefModalOpen] = useState(false);
  const [definitions, setDefinitions] = useState([]);
  const [defForm, setDefForm] = useState({
    skill_id: 0,
    skill_code: '',
    skill_name: '',
    category: 'General',
    line: '',
    display_order: 0,
  });
  const [savingDef, setSavingDef] = useState(false);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await skillMatrixApi.getMatrix({
        line: lineFilter,
        hcGroup,
        category: categoryFilter,
      });
      const d = res?.data || {};
      setSkills(Array.isArray(d.skills) ? d.skills : []);
      setEmployees(Array.isArray(d.employees) ? d.employees : []);
      setSkillData(d.skill_data && typeof d.skill_data === 'object' ? d.skill_data : {});
      setCategories(Array.isArray(d.categories) ? d.categories : []);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดตาราง Skill Matrix ได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [lineFilter, hcGroup, categoryFilter, showToast]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      String(e.emp_id || '').toLowerCase().includes(q)
      || String(e.name_th || '').toLowerCase().includes(q)
      || String(e.line || '').toLowerCase().includes(q)
    );
  }, [employees, search]);

  const openCellEditor = (emp, skill) => {
    if (!canEdit) return;
    const existing = skillData[emp.emp_id]?.[skill.skill_id] || null;
    setCellModal({ emp, skill });
    setCellForm({
      level: existing ? Number(existing.level || 0) : 0,
      notes: existing?.notes || '',
    });
  };

  const handleSaveCell = async (e) => {
    e.preventDefault();
    if (!canEdit || !isOnline || !cellModal) return;
    setSavingCell(true);
    try {
      await skillMatrixApi.updateEmpSkill({
        emp_id: cellModal.emp.emp_id,
        skill_id: cellModal.skill.skill_id,
        level: Number(cellForm.level),
        notes: cellForm.notes,
      });
      showToast('บันทึกระดับทักษะเรียบร้อยแล้ว', 'success');
      setCellModal(null);
      fetchMatrix();
    } catch (err) {
      showToast(err.message || 'บันทึกระดับทักษะไม่สำเร็จ', 'error');
    } finally {
      setSavingCell(false);
    }
  };

  const openDefinitionsModal = async () => {
    setDefModalOpen(true);
    try {
      const res = await skillMatrixApi.getDefinitions();
      setDefinitions(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      showToast(err.message || 'โหลดรายการหัวข้อทักษะไม่สำเร็จ', 'error');
    }
  };

  const refreshDefinitions = async () => {
    const res = await skillMatrixApi.getDefinitions();
    setDefinitions(Array.isArray(res?.data) ? res.data : []);
    fetchMatrix();
  };

  const handleSaveDef = async (e) => {
    e.preventDefault();
    if (!canEdit || !isOnline) return;
    setSavingDef(true);
    try {
      await skillMatrixApi.saveDefinition(defForm);
      showToast('บันทึกหัวข้อทักษะเรียบร้อยแล้ว', 'success');
      setDefForm({ skill_id: 0, skill_code: '', skill_name: '', category: 'General', line: '', display_order: 0 });
      await refreshDefinitions();
    } catch (err) {
      showToast(err.message || 'บันทึกหัวข้อทักษะไม่สำเร็จ', 'error');
    } finally {
      setSavingDef(false);
    }
  };

  const handleToggleDef = async (def) => {
    if (!canEdit || !isOnline) return;
    try {
      await skillMatrixApi.toggleActive(def.skill_id, !Number(def.is_active));
      await refreshDefinitions();
    } catch (err) {
      showToast(err.message || 'อัปเดตสถานะไม่สำเร็จ', 'error');
    }
  };

  const handleDeleteDef = async (def) => {
    if (!canEdit || !isOnline) return;
    const ok = await confirm({
      title: 'ลบหัวข้อทักษะ',
      message: `ต้องการลบหัวข้อทักษะ ${def.skill_code} (${def.skill_name}) หรือไม่?`,
      confirmText: 'ลบหัวข้อ',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await skillMatrixApi.deleteDefinition(def.skill_id);
      showToast('ลบหัวข้อทักษะเรียบร้อยแล้ว', 'success');
      await refreshDefinitions();
    } catch (err) {
      showToast(err.message || 'ลบหัวข้อไม่สำเร็จ', 'error');
    }
  };

  const handleExport = () => {
    if (!filteredEmployees.length) return;
    const rows = filteredEmployees.map((emp) => {
      const obj = {
        'Emp ID': emp.emp_id,
        Name: emp.name_th,
        Line: emp.line,
        Position: emp.position,
      };
      for (const s of skills) {
        const entry = skillData[emp.emp_id]?.[s.skill_id];
        obj[`${s.skill_code} (${s.skill_name})`] = entry ? `L${entry.level}` : 'L0';
      }
      return obj;
    });
    exportRowsToExcel(rows, 'SkillMatrix', `Skill_Matrix_${lineFilter}.xlsx`);
    showToast('ส่งออก Skill Matrix สำเร็จ', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาพนักงาน..."
              className="min-h-[44px] w-48 rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">ทุกสายผลิต</option>
            {(structure?.lines || []).map((ln) => <option key={ln} value={ln}>{ln}</option>)}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">ทุกหมวดทักษะ</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={openDefinitionsModal}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              <Settings className="h-4 w-4" />
              จัดการหัวข้อทักษะ (Skill Master)
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs dark:border-slate-700 dark:bg-slate-800/60">
        <span className="font-bold text-slate-600 dark:text-slate-300">เกณฑ์ระดับทักษะ:</span>
        {LEVEL_META.map((m) => (
          <span key={m.level} className={`rounded-md border px-2 py-0.5 font-semibold ${m.cls}`}>
            {m.label}
          </span>
        ))}
      </div>

      {/* Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Award className="h-4 w-4 text-indigo-500" />
            Skill Matrix ({filteredEmployees.length} คน × {skills.length} ทักษะ)
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />}
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 text-[11px] font-bold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <tr>
                <th className="sticky left-0 z-30 min-w-[200px] border-r border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                  พนักงาน / สายผลิต
                </th>
                {skills.map((s) => (
                  <th key={s.skill_id} className="min-w-[110px] border-r border-slate-200 px-2 py-2.5 text-center dark:border-slate-700">
                    <div className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">{s.skill_code}</div>
                    <div className="line-clamp-2 font-semibold">{s.skill_name}</div>
                    <div className="text-[10px] font-normal text-slate-400">{s.category}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(2, skills.length + 1)} className="px-4 py-8 text-center text-slate-400">
                    ไม่พบรายชื่อพนักงาน
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.emp_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                    <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
                      <div className="font-semibold text-slate-800 dark:text-white">{emp.name_th}</div>
                      <div className="text-[11px] text-slate-500">{emp.emp_id} • {emp.line}</div>
                    </td>
                    {skills.map((s) => {
                      const entry = skillData[emp.emp_id]?.[s.skill_id];
                      const lvl = entry ? Number(entry.level || 0) : 0;
                      const meta = LEVEL_META[lvl] || LEVEL_META[0];
                      return (
                        <td key={s.skill_id} className="border-r border-slate-100 p-1.5 text-center dark:border-slate-700/50">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => openCellEditor(emp, s)}
                            title={entry?.notes ? `${meta.label}: ${entry.notes}` : meta.label}
                            className={`min-h-[36px] w-full rounded-md border px-2 font-mono text-xs font-bold transition hover:scale-[1.03] disabled:cursor-default ${meta.cls}`}
                          >
                            {meta.short}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Emp Skill Cell Modal */}
      {cellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form
            onSubmit={handleSaveCell}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">ประเมินระดับทักษะ</h4>
                <p className="text-xs text-slate-500">
                  {cellModal.emp.name_th} ({cellModal.emp.emp_id}) — {cellModal.skill.skill_name}
                </p>
              </div>
              <button type="button" onClick={() => setCellModal(null)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              {LEVEL_META.map((m) => (
                <button
                  key={m.level}
                  type="button"
                  onClick={() => setCellForm((f) => ({ ...f, level: m.level }))}
                  className={`flex min-h-[44px] w-full items-center justify-between rounded-lg border px-3.5 text-xs font-bold transition ${
                    Number(cellForm.level) === m.level ? 'ring-2 ring-indigo-500 ' + m.cls : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{m.label}</span>
                  <span>{m.short}</span>
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold">หมายเหตุ / วันประเมิน</label>
              <textarea
                rows={2}
                value={cellForm.notes}
                onChange={(e) => setCellForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCellModal(null)}
                className="min-h-[44px] rounded-lg border border-slate-300 px-4 text-sm font-semibold dark:border-slate-600"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savingCell || !isOnline}
                className="min-h-[44px] rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingCell ? 'กำลังบันทึก...' : 'บันทึกทักษะ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Skill Definitions Master Modal */}
      {defModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
              <h4 className="text-base font-bold text-slate-800 dark:text-white">จัดการหัวข้อทักษะ (SKILL_DEFINITIONS)</h4>
              <button type="button" onClick={() => setDefModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDef} className="grid grid-cols-2 gap-2.5 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-6 dark:border-slate-700 dark:bg-slate-800/50">
              <input
                type="text"
                required
                placeholder="รหัส (เช่น WELD_01)"
                value={defForm.skill_code}
                onChange={(e) => setDefForm((f) => ({ ...f, skill_code: e.target.value.toUpperCase() }))}
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs uppercase dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <input
                type="text"
                required
                placeholder="ชื่อทักษะ"
                value={defForm.skill_name}
                onChange={(e) => setDefForm((f) => ({ ...f, skill_name: e.target.value }))}
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs md:col-span-2 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="หมวดหมู่ (General)"
                value={defForm.category}
                onChange={(e) => setDefForm((f) => ({ ...f, category: e.target.value }))}
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <input
                type="text"
                placeholder="Line (เว้นว่าง=ทุกสาย)"
                value={defForm.line}
                onChange={(e) => setDefForm((f) => ({ ...f, line: e.target.value }))}
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={savingDef || !isOnline}
                className="min-h-[40px] inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {defForm.skill_id ? 'อัปเดต' : 'เพิ่มทักษะ'}
              </button>
            </form>

            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2">รหัส</th>
                    <th className="px-3 py-2">ชื่อทักษะ</th>
                    <th className="px-3 py-2">หมวดหมู่</th>
                    <th className="px-3 py-2">สายผลิต</th>
                    <th className="px-3 py-2">สถานะ</th>
                    <th className="px-3 py-2 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {definitions.map((d) => (
                    <tr key={d.skill_id}>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-600">{d.skill_code}</td>
                      <td className="px-3 py-2 font-semibold">{d.skill_name}</td>
                      <td className="px-3 py-2">{d.category}</td>
                      <td className="px-3 py-2">{d.line || 'ALL'}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${Number(d.is_active) === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {Number(d.is_active) === 1 ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setDefForm({
                            skill_id: d.skill_id,
                            skill_code: d.skill_code,
                            skill_name: d.skill_name,
                            category: d.category,
                            line: d.line || '',
                            display_order: d.display_order || 0,
                          })}
                          className="rounded border px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-600"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleDef(d)}
                          className="inline-flex items-center rounded border px-2 py-1 text-[11px] hover:bg-slate-100 dark:border-slate-600"
                          title="เปิด/ปิดการใช้งาน"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDef(d)}
                          className="inline-flex items-center rounded border border-rose-200 px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 dark:border-rose-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
