import React, { useState } from 'react';
import { FiX, FiDownload, FiFileText } from 'react-icons/fi';
import { exportTasksToExcel, exportTasksToPDF } from '../utils/exportUtils';

export default function ExportModal({ isOpen, onClose, tasks, projects }) {
  const [exportFormat, setExportFormat] = useState('excel');
  const [exportDataset, setExportDataset] = useState('all_tasks');

  if (!isOpen) return null;

  const handleExport = () => {
    let dataset = [];
    if (exportDataset === 'all_tasks') {
      dataset = tasks;
    } else if (exportDataset === 'todo_tasks') {
      dataset = tasks.filter(t => t.Status === 'todo');
    } else if (exportDataset === 'inprogress_tasks') {
      dataset = tasks.filter(t => t.Status === 'in-progress');
    } else if (exportDataset === 'done_tasks') {
      dataset = tasks.filter(t => t.Status === 'done');
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">เลือกข้อมูลที่ต้องการออกรายงาน</label>
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
