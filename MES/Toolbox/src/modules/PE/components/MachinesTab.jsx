import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Cpu, Plus, Search, LayoutGrid, Table2, Edit3, Trash2, RotateCcw,
  History, ShieldAlert, X, Camera, RefreshCw
} from 'lucide-react';
import { peApi, compressPeImageToBase64 } from '../../../shared/services/peApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import PeImage from './PeImage';
import { MACHINE_STATUS_META, formatPeDate, formatPeDateTime } from '../utils/peFormatters';

const EMPTY_MACHINE_FORM = {
  machine_id: '',
  machine_code: '',
  machine_name: '',
  line: '',
  area: '',
  machine_type: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  asset_no: '',
  install_date: '',
  status: 'Active',
  criticality: 'Medium',
  mqtt_topic: '',
  notes: '',
  image_base64: '',
  image_path: '',
};

export default function MachinesTab({ isOffline = false }) {
  const showToast = useToast();
  const confirm = useConfirm();

  const [machines, setMachines] = useState([]);
  const [stats, setStats] = useState({ total: 0, active_count: 0, repair_count: 0, inactive_count: 0, loto_count: 0 });
  const [lines, setLines] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'));
  const [searchQuery, setSearchQuery] = useState('');
  const [lineFilter, setLineFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [formState, setFormState] = useState(EMPTY_MACHINE_FORM);
  const [saving, setSaving] = useState(false);

  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadMachines = useCallback(async () => {
    setLoading(true);
    try {
      const res = await peApi.getMachines({
        line: lineFilter,
        status: statusFilter,
        machine_type: typeFilter,
      });
      setMachines(res?.data || []);
      setStats(res?.stats || { total: 0, active_count: 0, repair_count: 0, inactive_count: 0, loto_count: 0 });
      setLines(res?.filters?.lines || []);
      setTypes(res?.filters?.types || []);
    } finally {
      setLoading(false);
    }
  }, [lineFilter, statusFilter, typeFilter]);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const filteredMachines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return machines;
    return machines.filter(
      (m) =>
        (m.machine_code || '').toLowerCase().includes(q) ||
        (m.machine_name || '').toLowerCase().includes(q) ||
        (m.serial_number || '').toLowerCase().includes(q) ||
        (m.asset_no || '').toLowerCase().includes(q)
    );
  }, [machines, searchQuery]);

  const openForm = (machine = null) => {
    if (!machine) {
      setFormState(EMPTY_MACHINE_FORM);
    } else {
      setFormState({
        machine_id: String(machine.machine_id),
        machine_code: machine.machine_code || '',
        machine_name: machine.machine_name || '',
        line: machine.line || '',
        area: machine.area || '',
        machine_type: machine.machine_type || '',
        manufacturer: machine.manufacturer || '',
        model: machine.model || '',
        serial_number: machine.serial_number || '',
        asset_no: machine.asset_no || '',
        install_date: machine.install_date ? String(machine.install_date).slice(0, 10) : '',
        status: machine.status || 'Active',
        criticality: machine.criticality || 'Medium',
        mqtt_topic: machine.mqtt_topic || '',
        notes: machine.notes || '',
        image_base64: '',
        image_path: machine.image_path || machine.photo_path || '',
      });
    }
    setShowEditModal(true);
  };

  const openDetailModal = async (machineId) => {
    setDetailLoading(true);
    setDetailData({ data: { machine_id: machineId }, history: [], work_orders: [], downtimes: [] });
    try {
      const res = await peApi.getMachineDetail(machineId);
      setDetailData(res);
    } catch {
      setDetailData(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveMachine = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    setSaving(true);
    try {
      const res = await peApi.saveMachine({
        ...formState,
        machine_id: formState.machine_id || undefined,
        image_base64: formState.image_base64 || undefined,
      });
      showToast(res?.message || 'บันทึกข้อมูลเครื่องจักรเรียบร้อยแล้ว', 'success');
      setShowEditModal(false);
      await loadMachines();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (machine, nextStatus) => {
    if (isOffline || machine.status === nextStatus) return;
    const res = await peApi.toggleMachineStatus(machine.machine_id, nextStatus);
    showToast(res?.message || 'เปลี่ยนสถานะเครื่องจักรเรียบร้อยแล้ว', 'success');
    await loadMachines();
  };

  const handleDelete = async (machine) => {
    if (isOffline) return;
    const ok = await confirm({
      title: 'ยืนยันการลบข้อมูลเครื่องจักร',
      message: `ต้องการย้ายเครื่องจักร ${machine.machine_code} (${machine.machine_name}) ไปยังถังขยะหรือไม่?`,
      confirmText: 'ยืนยันการลบ',
      danger: true,
    });
    if (!ok) return;
    const res = await peApi.deleteMachine(machine.machine_id);
    showToast(res?.message || 'ย้ายเครื่องจักรไปยังถังขยะแล้ว', 'success');
    await loadMachines();
  };

  const handleRestore = async (machine) => {
    if (isOffline) return;
    const res = await peApi.restoreMachine(machine.machine_id);
    showToast(res?.message || 'กู้คืนเครื่องจักรสำเร็จ', 'success');
    await loadMachines();
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">เครื่องจักรทั้งหมด</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">พร้อมใช้งาน (Active)</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.active_count || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">อยู่ระหว่างซ่อม</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.repair_count || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">หยุดใช้งาน (Inactive)</div>
          <div className="text-2xl font-bold text-slate-500 mt-1">{stats.inactive_count || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-500 font-medium">ติดล็อกนิรภัย (LOTO)</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.loto_count || 0}</div>
        </div>
      </div>

      {/* Filters & Toolbar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isOffline}
              onClick={() => openForm(null)}
              className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              ลงทะเบียนเครื่องจักร
            </button>
            <button
              type="button"
              onClick={loadMachines}
              className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-100 dark:bg-slate-800 self-start">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" /> ตาราง
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${
                viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> การ์ด
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารหัสเครื่องจักร, ชื่อ, S/N, Asset No..."
              className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>
          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="">ไลน์ผลิต: ทั้งหมด</option>
            {lines.map((ln) => <option key={ln} value={ln}>{ln}</option>)}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="">ประเภทเครื่องจักร: ทั้งหมด</option>
            {types.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="">สถานะ: ทั้งหมด</option>
            <option value="Active">Active (ใช้งานปกติ)</option>
            <option value="Under Repair">Under Repair (กำลังซ่อม)</option>
            <option value="Inactive">Inactive (หยุดใช้งาน)</option>
            <option value="Deleted">Deleted (ถังขยะ)</option>
          </select>
        </div>
      </div>

      {/* Machine List */}
      {loading ? (
        <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
          กำลังโหลดทะเบียนเครื่องจักร...
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400">
          ไม่พบข้อมูลเครื่องจักรตามเงื่อนไขที่เลือก
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-3">รูป</th>
                <th className="px-3 py-3">รหัส / ชื่อเครื่องจักร</th>
                <th className="px-3 py-3">ไลน์ / พื้นที่</th>
                <th className="px-3 py-3">ประเภท / ยี่ห้อ</th>
                <th className="px-3 py-3">ความสำคัญ</th>
                <th className="px-3 py-3">สถานะ</th>
                <th className="px-3 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMachines.map((m) => {
                const sMeta = MACHINE_STATUS_META[m.status] || MACHINE_STATUS_META.Active;
                return (
                  <tr key={m.machine_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-3">
                      <PeImage path={m.image_path || m.photo_path} alt={m.machine_code} className="w-11 h-11 rounded-lg object-cover" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {m.machine_code}
                        {Number(m.is_loto) === 1 && (
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px]">LOTO</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">{m.machine_name}</div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="font-semibold text-slate-700 dark:text-slate-200">{m.line || '-'}</div>
                      <div className="text-slate-500">{m.area || '-'}</div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div>{m.machine_type || '-'}</div>
                      <div className="text-slate-500">{[m.manufacturer, m.model].filter(Boolean).join(' ') || '-'}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {m.criticality || 'Medium'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {Number(m.is_active) === 1 ? (
                        <select
                          disabled={isOffline}
                          value={m.status || 'Active'}
                          onChange={(e) => handleStatusChange(m, e.target.value)}
                          className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-semibold border ${sMeta.cls}`}
                        >
                          <option value="Active">Active</option>
                          <option value="Under Repair">Under Repair</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">Deleted</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openDetailModal(m.machine_id)}
                          className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
                          title="ดูประวัติและ Timeline เครื่องจักร"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {Number(m.is_active) === 1 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openForm(m)}
                              className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isOffline}
                              onClick={() => handleDelete(m)}
                              className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={isOffline}
                            onClick={() => handleRestore(m)}
                            className="min-h-[36px] px-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> กู้คืน
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredMachines.map((m) => {
            const sMeta = MACHINE_STATUS_META[m.status] || MACHINE_STATUS_META.Active;
            return (
              <div key={m.machine_id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-start gap-3">
                  <PeImage path={m.image_path || m.photo_path} alt={m.machine_code} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">{m.machine_code}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sMeta.cls}`}>{m.status}</span>
                    </div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{m.machine_name}</div>
                    <div className="text-xs text-slate-500">{m.line || '-'} · {m.machine_type || '-'}</div>
                  </div>
                </div>
                {Number(m.is_loto) === 1 && (
                  <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>LOTO: {m.loto_reason || 'ล็อกนิรภัย'}</span>
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => openDetailModal(m.machine_id)}
                    className="flex-1 min-h-[44px] rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold inline-flex items-center justify-center gap-1"
                  >
                    <History className="w-4 h-4" /> ประวัติ
                  </button>
                  {Number(m.is_active) === 1 ? (
                    <button
                      type="button"
                      onClick={() => openForm(m)}
                      className="flex-1 min-h-[44px] rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold inline-flex items-center justify-center gap-1"
                    >
                      <Edit3 className="w-4 h-4" /> แก้ไข
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => handleRestore(m)}
                      className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-semibold inline-flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-4 h-4" /> กู้คืน
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Machine Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {formState.machine_id ? 'แก้ไขข้อมูลเครื่องจักร' : 'ลงทะเบียนเครื่องจักรใหม่'}
                </h3>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMachine} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">รหัสเครื่องจักร (Code) *</label>
                  <input
                    type="text"
                    required
                    value={formState.machine_code}
                    onChange={(e) => setFormState((p) => ({ ...p, machine_code: e.target.value.toUpperCase() }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อเครื่องจักร (Name) *</label>
                  <input
                    type="text"
                    required
                    value={formState.machine_name}
                    onChange={(e) => setFormState((p) => ({ ...p, machine_name: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ไลน์ผลิต</label>
                  <input
                    type="text"
                    list="peMachineLines"
                    value={formState.line}
                    onChange={(e) => setFormState((p) => ({ ...p, line: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                  <datalist id="peMachineLines">
                    {lines.map((ln) => <option key={ln} value={ln} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ประเภทเครื่องจักร</label>
                  <input
                    type="text"
                    list="peMachineTypes"
                    value={formState.machine_type}
                    onChange={(e) => setFormState((p) => ({ ...p, machine_type: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                  <datalist id="peMachineTypes">
                    {types.map((tp) => <option key={tp} value={tp} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">พื้นที่ (Area)</label>
                  <input
                    type="text"
                    value={formState.area}
                    onChange={(e) => setFormState((p) => ({ ...p, area: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ยี่ห้อ (Manufacturer)</label>
                  <input
                    type="text"
                    value={formState.manufacturer}
                    onChange={(e) => setFormState((p) => ({ ...p, manufacturer: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">รุ่น (Model)</label>
                  <input
                    type="text"
                    value={formState.model}
                    onChange={(e) => setFormState((p) => ({ ...p, model: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={formState.serial_number}
                    onChange={(e) => setFormState((p) => ({ ...p, serial_number: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Asset No.</label>
                  <input
                    type="text"
                    value={formState.asset_no}
                    onChange={(e) => setFormState((p) => ({ ...p, asset_no: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่ติดตั้ง</label>
                  <input
                    type="date"
                    value={formState.install_date}
                    onChange={(e) => setFormState((p) => ({ ...p, install_date: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">สถานะ</label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState((p) => ({ ...p, status: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Under Repair">Under Repair</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ความสำคัญ</label>
                  <select
                    value={formState.criticality}
                    onChange={(e) => setFormState((p) => ({ ...p, criticality: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">MQTT Topic (IIoT Telemetry)</label>
                  <input
                    type="text"
                    value={formState.mqtt_topic}
                    onChange={(e) => setFormState((p) => ({ ...p, mqtt_topic: e.target.value }))}
                    placeholder="เช่น factory/b9/press/mc01"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">รูปภาพเครื่องจักร</label>
                  <label className="min-h-[44px] px-3 rounded-xl border border-dashed border-slate-300 flex items-center justify-center gap-1.5 text-xs text-slate-600 cursor-pointer hover:bg-slate-50">
                    <Camera className="w-4 h-4" />
                    <span>{formState.image_base64 ? 'เลือกรูปใหม่แล้ว' : 'อัปโหลดรูปภาพ'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const b64 = await compressPeImageToBase64(f);
                        setFormState((p) => ({ ...p, image_base64: b64 }));
                      }}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุ</label>
                <textarea
                  rows={2}
                  value={formState.notes}
                  onChange={(e) => setFormState((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm font-medium">
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving || isOffline}
                  className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลเครื่องจักร'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Machine Detail & History Modal */}
      {detailData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={() => setDetailData(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">
                  ประวัติเครื่องจักร — {detailData.data?.machine_code || '...'}
                </h3>
                <p className="text-xs text-slate-500">{detailData.data?.machine_name || ''}</p>
              </div>
              <button type="button" onClick={() => setDetailData(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {detailLoading ? (
                <div className="py-12 text-center text-sm text-slate-500">กำลังโหลดข้อมูลรายละเอียด...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                    <PeImage path={detailData.data?.image_path || detailData.data?.photo_path} alt={detailData.data?.machine_code} className="w-full h-36 rounded-xl object-cover" />
                    <div className="sm:col-span-2 grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-slate-500">ไลน์ผลิต:</span> <strong>{detailData.data?.line || '-'}</strong></div>
                      <div><span className="text-slate-500">พื้นที่:</span> <strong>{detailData.data?.area || '-'}</strong></div>
                      <div><span className="text-slate-500">ยี่ห้อ/รุ่น:</span> <strong>{[detailData.data?.manufacturer, detailData.data?.model].filter(Boolean).join(' ') || '-'}</strong></div>
                      <div><span className="text-slate-500">S/N:</span> <strong>{detailData.data?.serial_number || '-'}</strong></div>
                      <div><span className="text-slate-500">Asset No:</span> <strong>{detailData.data?.asset_no || '-'}</strong></div>
                      <div><span className="text-slate-500">วันที่ติดตั้ง:</span> <strong>{formatPeDate(detailData.data?.install_date)}</strong></div>
                      <div className="col-span-2"><span className="text-slate-500">MQTT:</span> <span className="font-mono">{detailData.data?.mqtt_topic || '-'}</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-2">งานซ่อมบำรุงล่าสุด ({detailData.work_orders?.length || 0})</h4>
                    {(detailData.work_orders || []).length === 0 ? (
                      <div className="text-xs text-slate-400">ไม่มีประวัติใบแจ้งซ่อม</div>
                    ) : (
                      <div className="space-y-1.5">
                        {detailData.work_orders.map((w) => (
                          <div key={w.wo_id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
                            <div>
                              <span className="font-mono font-bold mr-2">{w.wo_number}</span>
                              <span>{w.issue_title}</span>
                            </div>
                            <span className="text-slate-500 shrink-0">{w.status} ({formatPeDateTime(w.requested_at)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-2">ประวัติบันทึกเครื่องหยุด ({detailData.downtimes?.length || 0})</h4>
                    {(detailData.downtimes || []).length === 0 ? (
                      <div className="text-xs text-slate-400">ไม่มีประวัติเครื่องหยุด</div>
                    ) : (
                      <div className="space-y-1.5">
                        {detailData.downtimes.map((d) => (
                          <div key={d.downtime_id} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
                            <div>
                              <span className="font-semibold text-red-600 mr-2">{d.cause_category}</span>
                              <span>{d.cause_detail || '-'}</span>
                            </div>
                            <span className="text-slate-500 shrink-0">{formatPeDate(d.log_date)} · {d.duration_min ?? '-'} นาที</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-2">Timeline ทะเบียนเครื่องจักร ({detailData.history?.length || 0})</h4>
                    <div className="space-y-1.5">
                      {(detailData.history || []).map((h) => (
                        <div key={h.history_id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-xs flex items-center justify-between gap-2">
                          <div>
                            <span className="font-semibold mr-2">[{h.event_type}]</span>
                            <span>{h.event_detail}</span>
                          </div>
                          <span className="text-slate-500 shrink-0">{h.performed_by} · {formatPeDateTime(h.event_date)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
