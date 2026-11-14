import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wrench, Plus, Search, FileSpreadsheet, Table2, LayoutGrid, Kanban,
  Trash2, RotateCcw, Edit3, Package, Printer, Play, CheckCircle2, UserCheck,
  Clock, ShieldAlert, X, Camera, RefreshCw
} from 'lucide-react';
import { peApi, compressPeImageToBase64 } from '../../../shared/services/peApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import PeImage from './PeImage';
import WoPartsModal from './WoPartsModal';
import {
  WO_STATUS_META, PRIORITY_META, WO_TYPES,
  getLocalIsoDate, formatPeDateTime, formatBaht, calcElapsedText,
  exportWorkOrdersExcel, printWorkOrderSheet
} from '../utils/peFormatters';

const BOARD_COLUMNS = [
  { id: 'Open', title: 'แจ้งใหม่ / รอมอบหมาย', match: (s) => s === 'Open' || s === 'Pending', accent: 'border-red-500' },
  { id: 'Assigned', title: 'มอบหมายช่างแล้ว', match: (s) => s === 'Assigned', accent: 'border-sky-500' },
  { id: 'In Progress', title: 'กำลังซ่อมบำรุง', match: (s) => s === 'In Progress', accent: 'border-indigo-500' },
  { id: 'Completed', title: 'ซ่อมเสร็จสิ้น', match: (s) => s === 'Completed', accent: 'border-emerald-500' },
];

export default function WorkOrdersTab({ isOffline = false, onOpenCountChange }) {
  const showToast = useToast();
  const confirm = useConfirm();

  const [workOrders, setWorkOrders] = useState([]);
  const [summary, setSummary] = useState({ total: 0, open_count: 0, completed_count: 0, avg_repair: 0, total_parts_cost: 0 });
  const [machines, setMachines] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & view state
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [lineFilter, setLineFilter] = useState('');
  const [dateType, setDateType] = useState('requested_at');
  const [startDate, setStartDate] = useState(() => getLocalIsoDate(-30));
  const [endDate, setEndDate] = useState(() => getLocalIsoDate(0));

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWo, setEditingWo] = useState(null);
  const [partsModalWo, setPartsModalWo] = useState(null);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    wo_type: 'Corrective',
    machine_id: '',
    machine_name: '',
    line: '',
    priority: 'Normal',
    issue_title: '',
    issue_detail: '',
    image_base64: '',
  });

  // Edit form state
  const [editForm, setEditForm] = useState(null);

  const loadMetadata = useCallback(async () => {
    try {
      const res = await peApi.getMachinesAndTechnicians();
      setMachines(res?.data || []);
      setTechnicians(res?.technicians || []);
      setLines(res?.lines || []);
    } catch {
      // Handled by apiClient toast
    }
  }, []);

  const loadWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await peApi.getWorkOrders({
        status: statusFilter,
        priority: priorityFilter,
        line: lineFilter,
        dateType,
        startDate,
        endDate,
      });
      setWorkOrders(res?.data || []);
      const sum = res?.summary || { total: 0, open_count: 0, completed_count: 0, avg_repair: 0, total_parts_cost: 0 };
      setSummary(sum);
      if (onOpenCountChange) {
        onOpenCountChange(Number(sum.open_count || 0));
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, lineFilter, dateType, startDate, endDate, onOpenCountChange]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  useEffect(() => {
    loadWorkOrders();
  }, [loadWorkOrders]);

  const filteredWorkOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return workOrders;
    return workOrders.filter(
      (w) =>
        (w.wo_number || '').toLowerCase().includes(q) ||
        (w.machine_display_name || w.machine_name || '').toLowerCase().includes(q) ||
        (w.machine_code || '').toLowerCase().includes(q) ||
        (w.issue_title || '').toLowerCase().includes(q) ||
        (w.assigned_to || '').toLowerCase().includes(q) ||
        (w.requested_by || '').toLowerCase().includes(q)
    );
  }, [workOrders, searchQuery]);

  const openEditModal = (wo) => {
    const toLocalInput = (val) => (val ? String(val).replace(' ', 'T').slice(0, 16) : '');
    setEditForm({
      wo_id: wo.wo_id,
      wo_number: wo.wo_number,
      wo_type: wo.wo_type || 'Corrective',
      machine_id: wo.machine_id ? String(wo.machine_id) : '',
      machine_name: wo.machine_display_name || wo.machine_name || '',
      line: wo.line || '',
      priority: wo.priority || 'Normal',
      status: wo.status || 'Open',
      assigned_to: wo.assigned_to || '',
      assigned_at: toLocalInput(wo.assigned_at),
      started_at: toLocalInput(wo.started_at),
      completed_at: toLocalInput(wo.completed_at),
      repair_minutes: wo.repair_minutes ?? '',
      issue_title: wo.issue_title || '',
      issue_detail: wo.issue_detail || '',
      root_cause: wo.root_cause || '',
      action_taken: wo.action_taken || '',
      image_path: wo.image_path || '',
      photo_after: wo.photo_after || '',
      photo_after_base64: '',
    });
    setEditingWo(wo);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    if (!createForm.issue_title.trim()) {
      showToast('กรุณาระบุหัวข้อปัญหา / อาการเสีย', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await peApi.createWorkOrder({
        wo_type: createForm.wo_type,
        machine_id: createForm.machine_id || null,
        machine_name: createForm.machine_name,
        line: createForm.line,
        priority: createForm.priority,
        issue_title: createForm.issue_title.trim(),
        issue_detail: createForm.issue_detail.trim(),
        image_base64: createForm.image_base64 || undefined,
      });
      showToast(res?.message || 'สร้างใบแจ้งซ่อมเรียบร้อยแล้ว', 'success');
      setShowCreateModal(false);
      setCreateForm({
        wo_type: 'Corrective',
        machine_id: '',
        machine_name: '',
        line: '',
        priority: 'Normal',
        issue_title: '',
        issue_detail: '',
        image_base64: '',
      });
      await loadWorkOrders();
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isOffline || !editForm) return;
    setSaving(true);
    try {
      const res = await peApi.updateWorkOrder({
        wo_id: editForm.wo_id,
        wo_type: editForm.wo_type,
        machine_id: editForm.machine_id || null,
        machine_name: editForm.machine_name,
        line: editForm.line,
        priority: editForm.priority,
        status: editForm.status,
        assigned_to: editForm.assigned_to,
        assigned_at: editForm.assigned_at || undefined,
        started_at: editForm.started_at || undefined,
        completed_at: editForm.completed_at || undefined,
        repair_minutes: editForm.repair_minutes === '' ? undefined : Number(editForm.repair_minutes),
        issue_title: editForm.issue_title,
        issue_detail: editForm.issue_detail,
        root_cause: editForm.root_cause,
        action_taken: editForm.action_taken,
        photo_after_base64: editForm.photo_after_base64 || undefined,
      });
      showToast(res?.message || 'อัปเดตใบงานสำเร็จ', 'success');
      setEditingWo(null);
      setEditForm(null);
      await loadWorkOrders();
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAction = async (wo, actionType) => {
    if (isOffline) return;
    if (actionType === 'accept') {
      const res = await peApi.quickAcceptWorkOrder(wo.wo_id);
      showToast(res?.message || 'รับงานเรียบร้อยแล้ว', 'success');
    } else if (actionType === 'start') {
      const res = await peApi.quickStartWorkOrder(wo.wo_id);
      showToast(res?.message || 'เริ่มดำเนินการซ่อมแล้ว', 'success');
    } else if (actionType === 'delete') {
      const ok = await confirm({
        title: 'ยืนยันการลบใบแจ้งซ่อม',
        message: `ต้องการย้ายใบแจ้งซ่อม ${wo.wo_number} ไปยังรายการที่ลบหรือไม่?`,
        confirmText: 'ย้ายไปถังขยะ',
        danger: true,
      });
      if (!ok) return;
      const res = await peApi.deleteWorkOrder(wo.wo_id);
      showToast(res?.message || 'ลบใบงานสำเร็จ', 'success');
    } else if (actionType === 'restore') {
      const res = await peApi.restoreWorkOrder(wo.wo_id);
      showToast(res?.message || 'กู้คืนใบงานสำเร็จ', 'success');
    } else if (actionType === 'print') {
      const partsRes = await peApi.getWoParts(wo.wo_id);
      printWorkOrderSheet(wo, partsRes?.data?.parts_used || []);
      return;
    }
    await loadWorkOrders();
  };

  const handleCompressImage = async (file, onSuccess) => {
    if (!file) return;
    try {
      const base64 = await compressPeImageToBase64(file, { maxSide: 1200, quality: 0.82 });
      onSuccess(base64);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถประมวลผลรูปภาพได้', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">ใบแจ้งซ่อมทั้งหมด</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{summary.total || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">งานค้าง / กำลังซ่อม</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{summary.open_count || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">ปิดงานสำเร็จ</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{summary.completed_count || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">เวลาซ่อมเฉลี่ย (MTTR)</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">
            {Math.round(Number(summary.avg_repair || 0))} <span className="text-xs font-medium text-slate-500">นาที</span>
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm col-span-2 md:col-span-1">
          <div className="text-xs text-slate-500 font-medium">มูลค่าอะไหล่เบิกใช้</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatBaht(summary.total_parts_cost || 0)}</div>
        </div>
      </div>

      {/* Filters & Action Bar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isOffline}
              onClick={() => setShowCreateModal(true)}
              className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              สร้างใบแจ้งซ่อมใหม่
            </button>
            <button
              type="button"
              onClick={() => exportWorkOrdersExcel(filteredWorkOrders)}
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-sm font-medium inline-flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              ส่งออก Excel
            </button>
            <button
              type="button"
              onClick={loadWorkOrders}
              className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-600 inline-flex items-center justify-center"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-slate-100 dark:bg-slate-800 self-start">
            {[
              { id: 'table', icon: Table2, label: 'ตาราง' },
              { id: 'cards', icon: LayoutGrid, label: 'การ์ด' },
              { id: 'board', icon: Kanban, label: 'บอร์ด' },
            ].map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewMode(v.id)}
                  className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                    viewMode === v.id ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาเลขที่ WO, เครื่องจักร, อาการเสีย, ช่าง..."
              className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="">สถานะ: ทั้งหมด</option>
            <option value="Active">งานค้างทั้งหมด (Active)</option>
            <option value="Open">แจ้งใหม่ (Open)</option>
            <option value="Pending">รอดำเนินการ (Pending)</option>
            <option value="Assigned">มอบหมายแล้ว (Assigned)</option>
            <option value="In Progress">กำลังซ่อม (In Progress)</option>
            <option value="Completed">เสร็จสิ้น (Completed)</option>
            <option value="Deleted">รายการที่ลบ (Trash)</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="">ความสำคัญ: ทั้งหมด</option>
            <option value="Critical">Critical (ฉุกเฉิน)</option>
            <option value="High">High (ด่วน)</option>
            <option value="Normal">Normal (ปกติ)</option>
          </select>

          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="">ไลน์ผลิต: ทั้งหมด</option>
            {lines.map((ln) => (
              <option key={ln} value={ln}>{ln}</option>
            ))}
          </select>

          <div className="flex gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 min-h-[44px] px-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 min-h-[44px] px-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>กรองตามวันที่:</span>
          {[
            { id: 'requested_at', label: 'วันที่แจ้งซ่อม' },
            { id: 'assigned_at', label: 'วันที่รับงาน' },
            { id: 'completed_at', label: 'วันที่เสร็จสิ้น' },
          ].map((dt) => (
            <button
              key={dt.id}
              type="button"
              onClick={() => setDateType(dt.id)}
              className={`px-2.5 py-1 rounded-lg font-medium ${
                dateType === dt.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {dt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
          กำลังโหลดรายการใบแจ้งซ่อม...
        </div>
      ) : filteredWorkOrders.length === 0 ? (
        <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400">
          ไม่พบใบแจ้งซ่อมตามเงื่อนไขที่เลือก
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3 py-3">เลขที่ใบงาน</th>
                <th className="px-3 py-3">รูป</th>
                <th className="px-3 py-3">เครื่องจักร / ไลน์</th>
                <th className="px-3 py-3">อาการเสีย</th>
                <th className="px-3 py-3">ความสำคัญ</th>
                <th className="px-3 py-3">สถานะ</th>
                <th className="px-3 py-3">ผู้แจ้ง / ช่างซ่อม</th>
                <th className="px-3 py-3 text-right">เวลา / ค่าอะไหล่</th>
                <th className="px-3 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredWorkOrders.map((wo) => {
                const pMeta = PRIORITY_META[wo.priority] || PRIORITY_META.Normal;
                const sMeta = WO_STATUS_META[wo.status] || WO_STATUS_META.Open;
                return (
                  <tr key={wo.wo_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{wo.wo_number}</div>
                      <div className="text-[11px] text-slate-500">{wo.wo_type}</div>
                    </td>
                    <td className="px-3 py-3">
                      <PeImage path={wo.image_path || wo.photo_before} alt={wo.wo_number} className="w-10 h-10 rounded-lg object-cover" />
                    </td>
                    <td className="px-3 py-3 max-w-[200px]">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">
                        {wo.machine_display_name || wo.machine_name || '-'}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        {wo.machine_code && <span className="font-mono">{wo.machine_code}</span>}
                        <span>• {wo.line || '-'}</span>
                        {Number(wo.is_loto) === 1 && (
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">LOTO</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 max-w-[240px]">
                      <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{wo.issue_title}</div>
                      {wo.issue_detail && <div className="text-xs text-slate-500 line-clamp-1">{wo.issue_detail}</div>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${pMeta.cls}`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sMeta.cls}`}>
                        {wo.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs">
                      <div className="text-slate-700 dark:text-slate-300">แจ้ง: {wo.requested_by || '-'}</div>
                      <div className="text-slate-500">ช่าง: {wo.assigned_to || 'ยังไม่มอบหมาย'}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right text-xs">
                      <div className="font-medium text-slate-700 dark:text-slate-300">
                        {wo.status === 'Completed' ? `${wo.repair_minutes ?? '-'} นาที` : calcElapsedText(wo.requested_at)}
                      </div>
                      <div className="text-emerald-700 dark:text-emerald-400 font-semibold">{formatBaht(wo.total_cost)}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        {Number(wo.is_active) === 1 ? (
                          <>
                            {(wo.status === 'Open' || wo.status === 'Pending') && (
                              <button
                                type="button"
                                disabled={isOffline}
                                onClick={() => handleQuickAction(wo, 'accept')}
                                className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-sky-600 hover:bg-sky-50"
                                title="รับงาน (Accept)"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}
                            {wo.status === 'Assigned' && (
                              <button
                                type="button"
                                disabled={isOffline}
                                onClick={() => handleQuickAction(wo, 'start')}
                                className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50"
                                title="เริ่มซ่อม (Start)"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setPartsModalWo(wo)}
                              className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-amber-600 hover:bg-amber-50"
                              title="เบิก/ดูอะไหล่"
                            >
                              <Package className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(wo)}
                              className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                              title="แก้ไข / ปิดงาน"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAction(wo, 'print')}
                              className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                              title="พิมพ์ใบงาน"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isOffline}
                              onClick={() => handleQuickAction(wo, 'delete')}
                              className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                              title="ลบใบงาน"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={isOffline}
                            onClick={() => handleQuickAction(wo, 'restore')}
                            className="min-h-[36px] px-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            กู้คืน
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
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredWorkOrders.map((wo) => {
            const pMeta = PRIORITY_META[wo.priority] || PRIORITY_META.Normal;
            const sMeta = WO_STATUS_META[wo.status] || WO_STATUS_META.Open;
            return (
              <div key={wo.wo_id} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-3">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        {wo.wo_number}
                        {Number(wo.is_loto) === 1 && (
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] inline-flex items-center gap-0.5">
                            <ShieldAlert className="w-3 h-3" /> LOTO
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{formatPeDateTime(wo.requested_at)}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${pMeta.cls}`}>{wo.priority}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sMeta.cls}`}>{wo.status}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <PeImage path={wo.image_path || wo.photo_before} alt={wo.wo_number} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {wo.machine_display_name || wo.machine_name || '-'}
                      </div>
                      <div className="text-xs text-slate-500">{wo.machine_code || '-'} · {wo.line || '-'}</div>
                      <div className="text-sm text-slate-700 dark:text-slate-300 mt-1 line-clamp-2">{wo.issue_title}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>ช่าง: <strong className="text-slate-700 dark:text-slate-300">{wo.assigned_to || 'ยังไม่มอบหมาย'}</strong></span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatBaht(wo.total_cost)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {Number(wo.is_active) === 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(wo)}
                        className="flex-1 min-h-[44px] px-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold inline-flex items-center justify-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> แก้ไข / ปิดงาน
                      </button>
                      <button
                        type="button"
                        onClick={() => setPartsModalWo(wo)}
                        className="min-h-[44px] px-3 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold inline-flex items-center justify-center gap-1"
                      >
                        <Package className="w-3.5 h-3.5" /> อะไหล่
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAction(wo, 'print')}
                        className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 flex items-center justify-center"
                        title="พิมพ์ใบงาน"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => handleQuickAction(wo, 'restore')}
                      className="w-full min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4" /> กู้คืนใบงาน
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 4-Column Kanban Board */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {BOARD_COLUMNS.map((col) => {
            const items = filteredWorkOrders.filter((w) => col.match(w.status));
            return (
              <div key={col.id} className={`rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 border-t-4 ${col.accent} p-3 space-y-2.5`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">{col.title}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-0.5">
                  {items.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">ไม่มีรายการ</div>
                  ) : (
                    items.map((wo) => {
                      const pMeta = PRIORITY_META[wo.priority] || PRIORITY_META.Normal;
                      return (
                        <div
                          key={wo.wo_id}
                          onClick={() => openEditModal(wo)}
                          className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">{wo.wo_number}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pMeta.cls}`}>{wo.priority}</span>
                          </div>
                          <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 truncate">
                            {wo.machine_display_name || wo.machine_name || '-'} ({wo.line || '-'})
                          </div>
                          <div className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{wo.issue_title}</div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span>{wo.assigned_to || 'รอช่างรับงาน'}</span>
                            <span className="inline-flex items-center gap-0.5"><Clock className="w-3 h-3" /> {calcElapsedText(wo.requested_at)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Work Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 dark:text-white">สร้างใบแจ้งซ่อมใหม่ (Work Order)</h3>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ประเภทงาน *</label>
                  <select
                    value={createForm.wo_type}
                    onChange={(e) => setCreateForm((p) => ({ ...p, wo_type: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    {WO_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ระดับความสำคัญ *</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="Normal">Normal (ปกติ)</option>
                    <option value="High">High (ด่วน)</option>
                    <option value="Critical">Critical (ฉุกเฉิน)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">เลือกเครื่องจักรจากทะเบียน</label>
                <select
                  value={createForm.machine_id}
                  onChange={(e) => {
                    const id = e.target.value;
                    const found = machines.find((m) => String(m.machine_id) === id);
                    setCreateForm((p) => ({
                      ...p,
                      machine_id: id,
                      machine_name: found ? found.machine_name : p.machine_name,
                      line: found ? found.line : p.line,
                    }));
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                >
                  <option value="">-- ไม่ระบุจากทะเบียน (กรอกเองด้านล่าง) --</option>
                  {machines.map((m) => (
                    <option key={m.machine_id} value={m.machine_id}>
                      [{m.line}] {m.machine_code} — {m.machine_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ชื่ออุปกรณ์/เครื่องจักร</label>
                  <input
                    type="text"
                    value={createForm.machine_name}
                    onChange={(e) => setCreateForm((p) => ({ ...p, machine_name: e.target.value }))}
                    placeholder="ชื่อเครื่องจักร..."
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">ไลน์ผลิต / แผนก</label>
                  <input
                    type="text"
                    list="peCreateLineList"
                    value={createForm.line}
                    onChange={(e) => setCreateForm((p) => ({ ...p, line: e.target.value }))}
                    placeholder="ระบุไลน์ผลิต..."
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                  <datalist id="peCreateLineList">
                    {lines.map((ln) => <option key={ln} value={ln} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">อาการเสีย / หัวข้อปัญหา *</label>
                <input
                  type="text"
                  required
                  value={createForm.issue_title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, issue_title: e.target.value }))}
                  placeholder="สรุปอาการที่พบ..."
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">รายละเอียดเพิ่มเติม</label>
                <textarea
                  rows={3}
                  value={createForm.issue_detail}
                  onChange={(e) => setCreateForm((p) => ({ ...p, issue_detail: e.target.value }))}
                  placeholder="รายละเอียดอาการ / ตำแหน่ง..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">รูปภาพก่อนซ่อม (บีบอัดอัตโนมัติ)</label>
                <label className="min-h-[44px] px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
                  <Camera className="w-4 h-4" />
                  <span>{createForm.image_base64 ? 'เปลี่ยนรูปภาพที่เลือกแล้ว' : 'แนบรูปภาพหน้างาน'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleCompressImage(e.target.files?.[0], (b64) => setCreateForm((p) => ({ ...p, image_base64: b64 })))}
                  />
                </label>
                {createForm.image_base64 && (
                  <img src={createForm.image_base64} alt="Preview" className="mt-2 h-32 rounded-xl object-cover mx-auto border" />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm font-medium">
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving || isOffline}
                  className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'ส่งใบแจ้งซ่อม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Complete Work Order Modal */}
      {editingWo && editForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={() => setEditingWo(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">จัดการใบงานซ่อม — {editForm.wo_number}</h3>
                <p className="text-xs text-slate-500">มอบหมายช่าง บันทึกผลการซ่อม (Root Cause / Action Taken) และปิดงาน</p>
              </div>
              <button type="button" onClick={() => setEditingWo(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">สถานะงาน</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="Open">Open</option>
                    <option value="Pending">Pending</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ความสำคัญ</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ช่างผู้รับผิดชอบ</label>
                  <input
                    type="text"
                    list="peTechDatalist"
                    value={editForm.assigned_to}
                    onChange={(e) => setEditForm((p) => ({ ...p, assigned_to: e.target.value }))}
                    placeholder="เลือกหรือพิมพ์ชื่อช่าง..."
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                  <datalist id="peTechDatalist">
                    {technicians.map((name) => <option key={name} value={name} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">อาการเสีย / หัวข้อ</label>
                  <input
                    type="text"
                    required
                    value={editForm.issue_title}
                    onChange={(e) => setEditForm((p) => ({ ...p, issue_title: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">เวลาที่ใช้ซ่อมจริง (นาที)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.repair_minutes}
                    onChange={(e) => setEditForm((p) => ({ ...p, repair_minutes: e.target.value }))}
                    placeholder="ระบุจำนวนนาที"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">สาเหตุรากเหง้า (Root Cause / 5-Why)</label>
                  <textarea
                    rows={3}
                    value={editForm.root_cause}
                    onChange={(e) => setEditForm((p) => ({ ...p, root_cause: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">วิธีแก้ไขดำเนินการ (Action Taken)</label>
                  <textarea
                    rows={3}
                    value={editForm.action_taken}
                    onChange={(e) => setEditForm((p) => ({ ...p, action_taken: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">ภาพปัญหา (Before)</div>
                  <PeImage path={editForm.image_path} alt="Before Repair" className="w-full h-32 rounded-xl object-cover border" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">ภาพหลังซ่อมเสร็จ (After)</div>
                  {editForm.photo_after_base64 ? (
                    <img src={editForm.photo_after_base64} alt="After Preview" className="w-full h-32 rounded-xl object-cover border mb-1.5" />
                  ) : (
                    <PeImage path={editForm.photo_after} alt="After Repair" className="w-full h-32 rounded-xl object-cover border mb-1.5" />
                  )}
                  <label className="min-h-[40px] px-3 rounded-xl border border-dashed border-slate-300 flex items-center justify-center gap-1.5 text-xs text-slate-600 cursor-pointer hover:bg-slate-50">
                    <Camera className="w-3.5 h-3.5" />
                    <span>อัปโหลดรูปหลังซ่อม</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCompressImage(e.target.files?.[0], (b64) => setEditForm((p) => ({ ...p, photo_after_base64: b64 })))}
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPartsModalWo(editingWo)}
                  className="min-h-[44px] px-4 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-sm font-semibold inline-flex items-center gap-1.5"
                >
                  <Package className="w-4 h-4" /> เบิก / ดูอะไหล่ ({formatBaht(editingWo.total_cost)})
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditingWo(null)} className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm font-medium">
                    ปิด
                  </button>
                  <button
                    type="submit"
                    disabled={saving || isOffline}
                    className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared Spare Parts Modal */}
      {partsModalWo && (
        <WoPartsModal
          wo={partsModalWo}
          isOffline={isOffline}
          onClose={() => setPartsModalWo(null)}
          onCostUpdated={() => loadWorkOrders()}
        />
      )}
    </div>
  );
}
