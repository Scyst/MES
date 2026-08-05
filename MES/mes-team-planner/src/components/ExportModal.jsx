import React, { useState } from 'react';
import { FiX, FiDownload, FiFileText } from 'react-icons/fi';
import { exportTasksToExcel, exportTasksToPDF } from '../utils/exportUtils';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { isTaskOwner } from '../utils/permissions';

export default function ExportModal({ isOpen, onClose, tasks, projects, currentUser }) {
  const [exportFormat, setExportFormat] = useState('excel');
  const [exportDataset, setExportDataset] = useState('all_tasks');
  const [exportAssignee, setExportAssignee] = useState('all');
  const [customAssignee, setCustomAssignee] = useState('');
  const [exportDateRange, setExportDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Extract unique assignees properly by splitting commas
  const allAssignees = [...new Set(tasks.flatMap(t => 
    (t.Assignee || '').split(',').map(a => a.trim()).filter(Boolean)
  ))].sort();

  if (!isOpen) return null;

  const handleExport = () => {
    let dataset = tasks;

    // 1. Filter by Assignee
    if (exportAssignee === 'me' && currentUser) {
      dataset = dataset.filter(t => {
        const isOwner = isTaskOwner(currentUser, t);
        const isCreator = t.CreatedBy === (currentUser.username || '');
        return isOwner || isCreator;
      });
    } else if (exportAssignee === 'custom' && customAssignee) {
      dataset = dataset.filter(t => {
        const assignees = (t.Assignee || '').split(',').map(a => a.trim().toLowerCase());
        return assignees.includes(customAssignee.toLowerCase());
      });
    }

    // 2. Filter by Status
    if (exportDataset === 'todo_tasks') {
      dataset = dataset.filter(t => t.Status === 'todo');
    } else if (exportDataset === 'inprogress_tasks') {
      dataset = dataset.filter(t => t.Status === 'in-progress');
    } else if (exportDataset === 'done_tasks') {
      dataset = dataset.filter(t => t.Status === 'done');
    }

    // 3. Filter by Date Range (using dueDate)
    if (exportDateRange !== 'all') {
      const today = new Date();
      let start = null;
      let end = null;
      if (exportDateRange === 'this_week') {
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
      } else if (exportDateRange === 'this_month') {
        start = startOfMonth(today);
        end = endOfMonth(today);
      } else if (exportDateRange === 'custom') {
        if (customStartDate) start = new Date(customStartDate);
        if (customEndDate) {
          end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
        }
      }
      
      if (start && end) {
        dataset = dataset.filter(t => {
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          return d >= start && d <= end;
        });
      }
    }

    if (exportFormat === 'excel') {
      exportTasksToExcel(dataset, `mes_report_${new Date().getTime()}.xlsx`);
    } else {
      exportTasksToPDF(dataset, `mes_report_${new Date().getTime()}.pdf`);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FiDownload className="text-indigo-500" />
            ออกรายงาน (Export & Report)
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
            <FiX className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ข้อมูลผู้รับผิดชอบ</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <button
                onClick={() => setExportAssignee('all')}
                className={`py-2 px-3 text-xs rounded-lg border transition-colors ${exportAssignee === 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                ทุกคน
              </button>
              <button
                onClick={() => setExportAssignee('me')}
                className={`py-2 px-3 text-xs rounded-lg border transition-colors ${exportAssignee === 'me' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                งานของฉัน
              </button>
              <button
                onClick={() => setExportAssignee('custom')}
                className={`py-2 px-3 text-xs rounded-lg border transition-colors ${exportAssignee === 'custom' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                ระบุชื่อ
              </button>
            </div>
            {exportAssignee === 'custom' && (
              <select 
                value={customAssignee}
                onChange={e => setCustomAssignee(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 text-sm mb-3 animate-fade-in"
              >
                <option value="">-- เลือกรายชื่อ --</option>
                {allAssignees.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            )}

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 mt-4">ช่วงเวลา (Date Range)</label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <button
                onClick={() => setExportDateRange('all')}
                className={`py-2 px-1 text-xs rounded-lg border transition-colors ${exportDateRange === 'all' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setExportDateRange('this_week')}
                className={`py-2 px-1 text-xs rounded-lg border transition-colors ${exportDateRange === 'this_week' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                สัปดาห์นี้
              </button>
              <button
                onClick={() => setExportDateRange('this_month')}
                className={`py-2 px-1 text-xs rounded-lg border transition-colors ${exportDateRange === 'this_month' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                เดือนนี้
              </button>
              <button
                onClick={() => setExportDateRange('custom')}
                className={`py-2 px-1 text-xs rounded-lg border transition-colors ${exportDateRange === 'custom' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                กำหนดเอง
              </button>
            </div>
            {exportDateRange === 'custom' && (
              <div className="flex gap-2 mb-3 animate-fade-in items-center">
                <input 
                  type="date" 
                  value={customStartDate} 
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 text-sm"
                />
                <span className="text-slate-500">-</span>
                <input 
                  type="date" 
                  value={customEndDate} 
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200 text-sm"
                />
              </div>
            )}

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 mt-4">สถานะงาน</label>
            <select 
              value={exportDataset}
              onChange={(e) => setExportDataset(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="all_tasks">งานทั้งหมด (All Tasks)</option>
              <option value="todo_tasks">งานที่ต้องทำ (To Do)</option>
              <option value="inprogress_tasks">งานที่กำลังทำ (In Progress)</option>
              <option value="done_tasks">งานที่เสร็จแล้ว (Done)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">รูปแบบไฟล์ (Format)</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportFormat('excel')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                  exportFormat === 'excel' 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-200'
                }`}
              >
                <FiFileText className="text-lg" />
                <span className="font-semibold text-sm">Excel (.xlsx)</span>
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all ${
                  exportFormat === 'pdf' 
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-200'
                }`}
              >
                <FiFileText className="text-lg" />
                <span className="font-semibold text-sm">PDF (.pdf)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors">
            ยกเลิก
          </button>
          <button 
            onClick={handleExport}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-indigo-200 dark:shadow-none transition-colors flex items-center gap-2"
          >
            <FiDownload />
            ส่งออก (Export)
          </button>
        </div>
      </div>
    </div>
  );
}
