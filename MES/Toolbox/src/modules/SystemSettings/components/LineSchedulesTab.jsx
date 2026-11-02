import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, RefreshCw, Edit2, Trash2, CheckCircle2, XCircle, Search, Clock, Calendar } from 'lucide-react';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import DataTable from '../../../shared/components/DataTable';
import ScheduleEditModal from './ScheduleEditModal';

export default function LineSchedulesTab({ lines = [] }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLine, setSelectedLine] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemSettingsApi.getSchedules();
      if (res && res.success) {
        setSchedules(res.data || []);
      } else {
        showToast(res?.message || 'ไม่สามารถโหลดข้อมูลตารางกะได้', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการโหลดตารางกะ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const matchesSearch =
        !searchTerm ||
        s.line?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.shift_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLine = selectedLine === 'ALL' || s.line === selectedLine;

      return matchesSearch && matchesLine;
    });
  }, [schedules, searchTerm, selectedLine]);

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingSchedule(s);
    setModalOpen(true);
  };

  const handleSave = async (formData) => {
    try {
      const res = await systemSettingsApi.saveSchedule(formData);
      if (res && res.success) {
        showToast(res.message || 'บันทึกตารางกะเรียบร้อย', 'success');
        fetchSchedules();
      } else {
        showToast(res?.message || 'บันทึกไม่สำเร็จ', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  };

  const handleDelete = async (s) => {
    const confirmed = await confirm({
      title: 'ยืนยันลบตารางกะ',
      message: `คุณต้องการลบกะ "${s.shift_name}" ของไลน์ "${s.line}" ใช่หรือไม่?`,
      type: 'warning',
      confirmText: 'ลบตารางกะ',
    });

    if (confirmed) {
      try {
        const res = await systemSettingsApi.deleteSchedule(s.id);
        if (res && res.success) {
          showToast(res.message || 'ลบตารางกะเรียบร้อย', 'success');
          fetchSchedules();
        } else {
          showToast(res?.message || 'ลบตารางกะไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
    }
  };

  const calculateNetMinutes = (start, end, breakMin) => {
    if (!start || !end) return 0;
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let diffMinutes = eh * 60 + em - (sh * 60 + sm);
      if (diffMinutes < 0) diffMinutes += 24 * 60; // Overnight shift
      return Math.max(0, diffMinutes - (Number(breakMin) || 0));
    } catch {
      return 0;
    }
  };

  const columns = [
    {
      key: 'line',
      label: 'Production Line',
      sortable: true,
      render: (s) => (
        <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
          {s.line}
        </span>
      ),
    },
    {
      key: 'shift_name',
      label: 'Shift Name',
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">{s.shift_name}</span>
        </div>
      ),
    },
    {
      key: 'working_hours',
      label: 'Shift Hours',
      render: (s) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono font-medium">
            {s.start_time ? s.start_time.substring(0, 5) : '--:--'} - {s.end_time ? s.end_time.substring(0, 5) : '--:--'}
          </span>
        </div>
      ),
    },
    {
      key: 'planned_break_minutes',
      label: 'Break (Min)',
      sortable: true,
      render: (s) => (
        <span className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
          {s.planned_break_minutes} นาที
        </span>
      ),
    },
    {
      key: 'net_working_minutes',
      label: 'Net Work Time',
      render: (s) => {
        const netMin = calculateNetMinutes(s.start_time, s.end_time, s.planned_break_minutes);
        const hours = Math.floor(netMin / 60);
        const mins = netMin % 60;
        return (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {hours} ชม. {mins > 0 ? `${mins} นาที` : ''} ({netMin} นาที)
          </span>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (s) =>
        s.is_active == 1 ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700">
            <XCircle className="w-3 h-3" /> Inactive
          </span>
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (s) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenEdit(s)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="แก้ไข"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(s)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="ลบ"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อกะ หรือไลน์..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">ทุกไลน์ผลิต (All Lines)</option>
            {lines.map((ln) => (
              <option key={ln} value={ln}>
                {ln}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSchedules}
            disabled={loading}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            เพิ่มตารางกะผลิต
          </button>
        </div>
      </div>

      {/* Schedules DataTable */}
      <DataTable
        columns={columns}
        rows={filteredSchedules}
        data={filteredSchedules}
        rowKey={(s) => s.id || `${s.line}-${s.shift_date}`}
        loading={loading}
        defaultSortKey="line"
        emptyMessage="ไม่พบข้อมูลตารางกะการผลิต"
      />

      {/* Modal */}
      <ScheduleEditModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        schedule={editingSchedule}
        lines={lines}
      />
    </div>
  );
}

