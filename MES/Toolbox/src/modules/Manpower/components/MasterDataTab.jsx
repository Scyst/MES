import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Clock, DollarSign, Layers, Search, Plus, Edit3, UserMinus, UserCheck, Save, Trash2, X, RefreshCw
} from 'lucide-react';
import { manpowerMasterApi } from '../../../shared/services/manpowerApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import { getTodayIso } from '../utils/manpowerHelpers';

const SUB_TABS = [
  { id: 'employees', label: 'รายชื่อพนักงาน (Staff)', icon: Users },
  { id: 'shifts', label: 'ตั้งค่ากะประจำสาย (Team Shift)', icon: Clock },
  { id: 'mappings', label: 'ตำแหน่ง & ค่าจ้าง (Wage Mapping)', icon: DollarSign },
  { id: 'settings', label: 'กลุ่มกำลังคน (HC Group)', icon: Layers },
];

export default function MasterDataTab({ structure, canEdit, isOnline, onStructureUpdated }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [subTab, setSubTab] = useState('employees');
  const [loading, setLoading] = useState(false);

  // Staff Directory state
  const [empSearch, setEmpSearch] = useState('');
  const [empLine, setEmpLine] = useState('ALL');
  const [empStatus, setEmpStatus] = useState('1');
  const [employees, setEmployees] = useState([]);

  // Create / Edit Employee Modal
  const [empModal, setEmpModal] = useState(null);
  const [empForm, setEmpForm] = useState({
    emp_id: '',
    name_th: '',
    position: '',
    line: 'TOOLBOX_POOL',
    team_group: '',
    department_api: 'Toolbox_Manual',
    default_shift_id: 1,
    start_date: getTodayIso(),
    update_logs: false,
    effective_date: getTodayIso(),
  });
  const [savingEmp, setSavingEmp] = useState(false);

  // Team Shifts state
  const [teamShifts, setTeamShifts] = useState([]);
  const [shiftEdit, setShiftEdit] = useState(null);

  // Wage Mappings state
  const [mappings, setMappings] = useState([]);
  const [unmappedPositions, setUnmappedPositions] = useState([]);
  const [savingMappings, setSavingMappings] = useState(false);

  // Team Settings state
  const [teamSettings, setTeamSettings] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadSubTab = useCallback(async () => {
    setLoading(true);
    try {
      if (subTab === 'employees') {
        const res = await manpowerMasterApi.readEmployees({
          search: empSearch,
          line: empLine,
          status: empStatus,
        });
        setEmployees(Array.isArray(res?.data) ? res.data : []);
      } else if (subTab === 'shifts') {
        const res = await manpowerMasterApi.readTeamShifts();
        setTeamShifts(Array.isArray(res?.data) ? res.data : []);
      } else if (subTab === 'mappings') {
        const res = await manpowerMasterApi.readMappings();
        setMappings(Array.isArray(res?.data?.mappings) ? res.data.mappings : []);
        setUnmappedPositions(Array.isArray(res?.data?.unmapped) ? res.data.unmapped : []);
      } else if (subTab === 'settings') {
        const res = await manpowerMasterApi.readTeamSettings();
        setTeamSettings(Array.isArray(res?.data) ? res.data : []);
      }
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดข้อมูลตั้งค่าหลักได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [subTab, empSearch, empLine, empStatus, showToast]);

  useEffect(() => {
    loadSubTab();
  }, [loadSubTab]);

  const openCreateEmp = () => {
    setEmpModal('create');
    setEmpForm({
      emp_id: '',
      name_th: '',
      position: '',
      line: structure?.lines?.[0] || 'TOOLBOX_POOL',
      team_group: '',
      department_api: 'Toolbox_Manual',
      default_shift_id: 1,
      start_date: getTodayIso(),
      update_logs: false,
      effective_date: getTodayIso(),
    });
  };

  const openEditEmp = async (emp) => {
    setEmpModal('edit');
    setEmpForm({
      emp_id: emp.emp_id,
      name_th: emp.name_th || '',
      position: emp.position || '',
      line: emp.line || '',
      team_group: emp.team_group || '',
      department_api: emp.department_api || '',
      default_shift_id: Number(emp.default_shift_id || 1),
      start_date: emp.start_date || getTodayIso(),
      update_logs: false,
      effective_date: getTodayIso(),
      phone: emp.phone || '',
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
    });
    try {
      const res = await manpowerMasterApi.readSingleEmployee(emp.emp_id);
      if (res?.data) {
        const d = res.data;
        setEmpForm((prev) => ({
          ...prev,
          phone: d.phone || '',
          emergency_contact_name: d.emergency_contact_name || '',
          emergency_contact_phone: d.emergency_contact_phone || '',
        }));
      }
    } catch {
      // Optional personal join info
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!canEdit || !isOnline) return;
    setSavingEmp(true);
    try {
      if (empModal === 'create') {
        await manpowerMasterApi.createEmployee(empForm);
        showToast('เพิ่มพนักงานใหม่เรียบร้อยแล้ว', 'success');
      } else {
        await manpowerMasterApi.updateEmployee(empForm);
        showToast('อัปเดตข้อมูลพนักงานเรียบร้อยแล้ว', 'success');
      }
      setEmpModal(null);
      loadSubTab();
      onStructureUpdated?.();
    } catch (err) {
      showToast(err.message || 'บันทึกข้อมูลพนักงานไม่สำเร็จ', 'error');
    } finally {
      setSavingEmp(false);
    }
  };

  const handleToggleTerminate = async (emp) => {
    if (!canEdit || !isOnline) return;
    const isCurrentlyActive = Number(emp.is_active) === 1;
    const ok = await confirm({
      title: isCurrentlyActive ? 'ยืนยันบันทึกพ้นสภาพพนักงาน' : 'ยืนยันรับกลับเข้าทำงาน',
      message: isCurrentlyActive
        ? `ต้องการปรับสถานะ ${emp.emp_id} (${emp.name_th}) เป็นลาออก / พ้นสภาพ และลบ Log ล่วงหน้าที่ยังไม่ Verify ใช่หรือไม่?`
        : `ต้องการรับ ${emp.emp_id} (${emp.name_th}) กลับเข้าสู่สถานะ Active ใช่หรือไม่?`,
      confirmText: isCurrentlyActive ? 'บันทึกพ้นสภาพ' : 'เปิดใช้งานอีกครั้ง',
      variant: isCurrentlyActive ? 'danger' : 'info',
    });
    if (!ok) return;
    try {
      if (isCurrentlyActive) {
        await manpowerMasterApi.terminateEmployee(emp.emp_id, getTodayIso());
      } else {
        await manpowerMasterApi.reactivateEmployee(emp.emp_id);
      }
      showToast('อัปเดตสถานะพนักงานเรียบร้อยแล้ว', 'success');
      loadSubTab();
      onStructureUpdated?.();
    } catch (err) {
      showToast(err.message || 'อัปเดตสถานะไม่สำเร็จ', 'error');
    }
  };

  const handleSaveTeamShift = async (e) => {
    e.preventDefault();
    if (!canEdit || !isOnline || !shiftEdit) return;
    try {
      await manpowerMasterApi.updateTeamShift(shiftEdit);
      showToast('เปลี่ยนกะสายผลิตเรียบร้อยแล้ว', 'success');
      setShiftEdit(null);
      loadSubTab();
      onStructureUpdated?.();
    } catch (err) {
      showToast(err.message || 'เปลี่ยนกะไม่สำเร็จ', 'error');
    }
  };

  const handleSaveMappings = async () => {
    if (!canEdit || !isOnline) return;
    setSavingMappings(true);
    try {
      await manpowerMasterApi.saveMappings(mappings);
      showToast('บันทึกข้อมูลจับคู่ตำแหน่งและค่าแรงเรียบร้อยแล้ว', 'success');
      loadSubTab();
    } catch (err) {
      showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
      setSavingMappings(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!canEdit || !isOnline) return;
    setSavingSettings(true);
    try {
      await manpowerMasterApi.saveTeamSettings(teamSettings);
      showToast('บันทึกกลุ่ม HC Group เรียบร้อยแล้ว', 'success');
      onStructureUpdated?.();
    } catch (err) {
      showToast(err.message || 'บันทึกกลุ่มไม่สำเร็จ', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap gap-1.5">
          {SUB_TABS.map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSubTab(t.id)}
                className={`min-h-[42px] inline-flex items-center gap-2 rounded-lg px-3.5 text-xs font-bold transition ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
        {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin text-indigo-500" />}
      </div>

      {/* Sub-Tab 1: Employees */}
      {subTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={empSearch}
                  onChange={(e) => setEmpSearch(e.target.value)}
                  placeholder="รหัส / ชื่อ / ตำแหน่ง..."
                  className="min-h-[44px] w-56 rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <select
                value={empLine}
                onChange={(e) => setEmpLine(e.target.value)}
                className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="ALL">ทุกสายผลิต</option>
                {(structure?.lines || []).map((ln) => <option key={ln} value={ln}>{ln}</option>)}
              </select>
              <select
                value={empStatus}
                onChange={(e) => setEmpStatus(e.target.value)}
                className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="1">พนักงานปัจจุบัน (Active)</option>
                <option value="0">พ้นสภาพแล้ว (Resigned)</option>
                <option value="OUTSIDER">สาย/แผนกภายนอก (Outsider)</option>
                <option value="ALL">ทั้งหมด</option>
              </select>
            </div>

            {canEdit && (
              <button
                type="button"
                disabled={!isOnline}
                onClick={openCreateEmp}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                เพิ่มพนักงานใหม่
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-xs">
                <thead className="bg-slate-50 font-bold uppercase text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3">รหัส / ชื่อ-สกุล</th>
                    <th className="px-3 py-3">ตำแหน่ง / กลุ่มค่าแรง</th>
                    <th className="px-3 py-3">สายผลิต / ทีม</th>
                    <th className="px-3 py-3">กะเริ่มต้น</th>
                    <th className="px-3 py-3">วันเริ่มงาน</th>
                    <th className="px-3 py-3">สถานะ</th>
                    {canEdit && <th className="px-4 py-3 text-right">จัดการ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {employees.map((e) => (
                    <tr key={e.emp_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-800 dark:text-white">{e.name_th}</div>
                        <div className="text-[11px] font-mono text-slate-500">{e.emp_id} {e.phone ? `• ${e.phone}` : ''}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div>{e.position || '-'}</div>
                        <div className="text-[10px] text-slate-400">{e.emp_type} ({e.hc_group})</div>
                      </td>
                      <td className="px-3 py-2.5 font-medium">{e.line || '-'} ({e.team_group || '-'})</td>
                      <td className="px-3 py-2.5">{e.shift_name || `Shift #${e.default_shift_id}`}</td>
                      <td className="px-3 py-2.5 font-mono">{e.start_date || '-'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          Number(e.is_active) === 1
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {Number(e.is_active) === 1 ? 'ACTIVE' : `RESIGNED (${e.resign_date || '-'})`}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2.5 text-right whitespace-nowrap space-x-1">
                          <button
                            type="button"
                            disabled={!isOnline}
                            onClick={() => openEditEmp(e)}
                            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-600"
                            title="แก้ไขข้อมูลพนักงาน"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={!isOnline}
                            onClick={() => handleToggleTerminate(e)}
                            className={`min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border ${
                              Number(e.is_active) === 1
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800'
                            }`}
                            title={Number(e.is_active) === 1 ? 'พ้นสภาพ' : 'รับกลับเข้าทำงาน'}
                          >
                            {Number(e.is_active) === 1 ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Team Shift Planner */}
      {subTab === 'shifts' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">ตารางกะการทำงานประจำสายผลิต (Team Shift Rotation)</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold dark:bg-slate-900/70">
                <tr>
                  <th className="px-4 py-3">สายการผลิต (Line)</th>
                  <th className="px-3 py-3">กะเริ่มต้นปัจจุบัน</th>
                  <th className="px-3 py-3 text-right">จำนวนพนักงาน</th>
                  {canEdit && <th className="px-4 py-3 text-right">เปลี่ยนกะทั้งสาย</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {teamShifts.map((ts, idx) => (
                  <tr key={`${ts.line}-${ts.shift_id}-${idx}`}>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{ts.line}</td>
                    <td className="px-3 py-3">{ts.shift_name || `Shift #${ts.shift_id}`}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold">{ts.emp_count} คน</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={!isOnline}
                          onClick={() => setShiftEdit({
                            line: ts.line,
                            shift_id: Number(ts.shift_id || 1),
                            effective_date: getTodayIso(),
                          })}
                          className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                        >
                          สลับกะสายนี้
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Position & Wage Mappings */}
      {subTab === 'mappings' && (
        <div className="space-y-4">
          {unmappedPositions.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200 mb-2">
                พบตำแหน่งที่ยังไม่ได้จับคู่อัตราค่าแรง ({unmappedPositions.length} ตำแหน่ง — คลิกเพื่อเพิ่ม):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {unmappedPositions.map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setMappings((prev) => [
                      ...prev,
                      { keyword: pos, category_name: 'พนักงานผลิต', hourly_rate: 363, rate_type: 'DAILY', display_order: prev.length + 1 },
                    ])}
                    className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 dark:bg-slate-800 dark:text-amber-200"
                  >
                    + {pos}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">ตารางจับคู่คำค้นตำแหน่งและฐานค่าจ้าง (Wage Rate Mapping)</h4>
              {canEdit && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMappings((prev) => [
                      ...prev,
                      { keyword: '', category_name: 'พนักงานผลิต', hourly_rate: 363, rate_type: 'DAILY', display_order: prev.length + 1 },
                    ])}
                    className="min-h-[40px] inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold dark:border-slate-600"
                  >
                    <Plus className="h-4 w-4" /> เพิ่มแถว
                  </button>
                  <button
                    type="button"
                    disabled={savingMappings || !isOnline}
                    onClick={handleSaveMappings}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {savingMappings ? 'กำลังบันทึก...' : 'บันทึกทั้งหมด'}
                  </button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="bg-slate-50 font-bold dark:bg-slate-900/70">
                  <tr>
                    <th className="px-3 py-2.5">Keyword ตำแหน่ง</th>
                    <th className="px-3 py-2.5">กลุ่มแสดงผล (Category)</th>
                    <th className="px-3 py-2.5">ฐานค่าจ้าง (บาท/วัน หรือ /เดือน)</th>
                    <th className="px-3 py-2.5">ประเภทการจ่าย</th>
                    <th className="px-3 py-2.5 w-20">ลำดับ</th>
                    {canEdit && <th className="px-3 py-2.5 text-right w-16">ลบ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {mappings.map((m, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={m.keyword || ''}
                          onChange={(e) => setMappings((prev) => prev.map((x, i) => i === idx ? { ...x, keyword: e.target.value } : x))}
                          className="min-h-[38px] w-full rounded border border-slate-300 px-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={m.category_name || ''}
                          onChange={(e) => setMappings((prev) => prev.map((x, i) => i === idx ? { ...x, category_name: e.target.value } : x))}
                          className="min-h-[38px] w-full rounded border border-slate-300 px-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={m.hourly_rate ?? 0}
                          onChange={(e) => setMappings((prev) => prev.map((x, i) => i === idx ? { ...x, hourly_rate: Number(e.target.value) } : x))}
                          className="min-h-[38px] w-32 rounded border border-slate-300 px-2 text-xs font-mono dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={m.rate_type || 'DAILY'}
                          onChange={(e) => setMappings((prev) => prev.map((x, i) => i === idx ? { ...x, rate_type: e.target.value } : x))}
                          className="min-h-[38px] rounded border border-slate-300 px-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        >
                          <option value="DAILY">DAILY (รายวัน)</option>
                          <option value="MONTHLY">MONTHLY (รายเดือน)</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={m.display_order ?? idx + 1}
                          onChange={(e) => setMappings((prev) => prev.map((x, i) => i === idx ? { ...x, display_order: Number(e.target.value) } : x))}
                          className="min-h-[38px] w-16 rounded border border-slate-300 px-2 text-xs font-mono dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setMappings((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Team HC Group Settings */}
      {subTab === 'settings' && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white">กำหนดกลุ่มกำลังคน (MAIN / TEAM 1 / EXCLUDE)</h4>
            {canEdit && (
              <button
                type="button"
                disabled={savingSettings || !isOnline}
                onClick={handleSaveSettings}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {savingSettings ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold dark:bg-slate-900/70">
                <tr>
                  <th className="px-4 py-3">Department API Key</th>
                  <th className="px-3 py-3">กลุ่มกำลังคน (HC Group)</th>
                  <th className="px-3 py-3 text-right">น้ำหนัก 4D (IPH / 5S / ATT / LRN)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {teamSettings.map((ts, idx) => (
                  <tr key={ts.department_api}>
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-800 dark:text-white">{ts.department_api}</td>
                    <td className="px-3 py-2.5">
                      <select
                        disabled={!canEdit}
                        value={ts.hc_group || 'MAIN'}
                        onChange={(e) => setTeamSettings((prev) => prev.map((x, i) => i === idx ? { ...x, hc_group: e.target.value } : x))}
                        className="min-h-[38px] rounded border border-slate-300 px-2.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="MAIN">MAIN (กำลังพลหลัก Toolbox)</option>
                        <option value="TEAM 1">TEAM 1 (กลุ่มสนับสนุน/เฉพาะกิจ)</option>
                        <option value="EXCLUDE">EXCLUDE (ยกเว้นจากยอดผลิตหลัก)</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                      {ts.weight_iph}% / {ts.weight_5s}% / {ts.weight_attendance}% / {ts.weight_learning}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Create/Edit Modal */}
      {empModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEmployee}
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
              <h4 className="text-base font-bold text-slate-800 dark:text-white">
                {empModal === 'create' ? 'เพิ่มพนักงานใหม่เข้าสู่ระบบกำลังคน' : `แก้ไขข้อมูลพนักงาน: ${empForm.emp_id}`}
              </h4>
              <button type="button" onClick={() => setEmpModal(null)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            {empModal === 'edit' && (empForm.phone || empForm.emergency_contact_name) && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <div>เบอร์โทรติดต่อ: <strong>{empForm.phone || '-'}</strong></div>
                <div>ผู้ติดต่อฉุกเฉิน: <strong>{empForm.emergency_contact_name || '-'}</strong> ({empForm.emergency_contact_phone || '-'})</div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">รหัสพนักงาน *</label>
                <input
                  type="text"
                  required
                  disabled={empModal === 'edit'}
                  value={empForm.emp_id}
                  onChange={(e) => setEmpForm((f) => ({ ...f, emp_id: e.target.value.toUpperCase() }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm uppercase disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">ชื่อ-สกุล *</label>
                <input
                  type="text"
                  required
                  value={empForm.name_th}
                  onChange={(e) => setEmpForm((f) => ({ ...f, name_th: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">ตำแหน่ง (Position)</label>
                <input
                  type="text"
                  value={empForm.position}
                  onChange={(e) => setEmpForm((f) => ({ ...f, position: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">สายการผลิต (Line)</label>
                <input
                  type="text"
                  value={empForm.line}
                  onChange={(e) => setEmpForm((f) => ({ ...f, line: e.target.value }))}
                  list="mp-master-lines"
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <datalist id="mp-master-lines">
                  {(structure?.lines || []).map((ln) => <option key={ln} value={ln} />)}
                </datalist>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">ทีม (Team Group)</label>
                <input
                  type="text"
                  value={empForm.team_group}
                  onChange={(e) => setEmpForm((f) => ({ ...f, team_group: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">กะการทำงานเริ่มต้น</label>
                <select
                  value={empForm.default_shift_id}
                  onChange={(e) => setEmpForm((f) => ({ ...f, default_shift_id: Number(e.target.value) }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  {(structure?.shifts || []).map((s) => (
                    <option key={s.shift_id} value={s.shift_id}>{s.shift_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {empModal === 'edit' && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-800 dark:bg-indigo-950/30 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
                  <input
                    type="checkbox"
                    checked={empForm.update_logs}
                    onChange={(e) => setEmpForm((f) => ({ ...f, update_logs: e.target.checked }))}
                    className="h-4 w-4 rounded"
                  />
                  อัปเดตสายผลิต/ทีม/กะ ย้อนหลังในประวัติลงเวลาด้วย (Retroactive Sync)
                </label>
                {empForm.update_logs && (
                  <div className="flex items-center gap-2 text-xs">
                    <span>มีผลตั้งแต่วันที่:</span>
                    <input
                      type="date"
                      value={empForm.effective_date}
                      onChange={(e) => setEmpForm((f) => ({ ...f, effective_date: e.target.value }))}
                      className="min-h-[36px] rounded border border-slate-300 px-2 dark:border-slate-600 dark:bg-slate-900"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEmpModal(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 text-sm font-semibold dark:border-slate-600">
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savingEmp || !isOnline}
                className="min-h-[44px] rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingEmp ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Shift Swap Modal */}
      {shiftEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form
            onSubmit={handleSaveTeamShift}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
              <h4 className="text-base font-bold text-slate-800 dark:text-white">สลับกะประจำสายผลิต: {shiftEdit.line}</h4>
              <button type="button" onClick={() => setShiftEdit(null)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">กะใหม่</label>
              <select
                value={shiftEdit.shift_id}
                onChange={(e) => setShiftEdit((s) => ({ ...s, shift_id: Number(e.target.value) }))}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {(structure?.shifts || []).map((sh) => (
                  <option key={sh.shift_id} value={sh.shift_id}>{sh.shift_name} ({sh.start_time}-{sh.end_time})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">วันที่มีผล (Effective Date)</label>
              <input
                type="date"
                value={shiftEdit.effective_date}
                onChange={(e) => setShiftEdit((s) => ({ ...s, effective_date: e.target.value }))}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShiftEdit(null)} className="min-h-[44px] rounded-lg border border-slate-300 px-4 text-sm font-semibold dark:border-slate-600">
                ยกเลิก
              </button>
              <button type="submit" disabled={!isOnline} className="min-h-[44px] rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700">
                ยืนยันเปลี่ยนกะ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
