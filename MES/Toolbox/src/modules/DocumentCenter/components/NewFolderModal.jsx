import React, { useState, useEffect } from 'react';
import { X, FolderPlus, AlertCircle } from 'lucide-react';
import { documentCenterApi } from '../../../shared/services/documentCenterApi';

export default function NewFolderModal({ isOpen, onClose, currentFolderPath, onSuccess }) {
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFolderName('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = folderName.trim();
    if (!name) {
      setError('กรุณาระบุชื่อโฟลเดอร์');
      return;
    }
    if (/[\\/:*?"<>|]/.test(name)) {
      setError('ชื่อโฟลเดอร์ต้องไม่มีอักขระพิเศษ: \\ / : * ? " < > |');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await documentCenterApi.createFolder(name, currentFolderPath || '');
      if (res.success) {
        onSuccess(res.message || 'สร้างโฟลเดอร์สำเร็จแล้ว');
        onClose();
      } else {
        setError(res.message || 'เกิดข้อผิดพลาดในการสร้างโฟลเดอร์');
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการสร้างโฟลเดอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FolderPlus size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                สร้างโฟลเดอร์ใหม่ (New Folder)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ตำแหน่ง: {currentFolderPath ? `/${currentFolderPath}` : 'Root (ราก)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ชื่อโฟลเดอร์ (Folder Name)
            </label>
            <input
              type="text"
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="เช่น WI, Drawing, SOP, 3D Models"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 outline-none text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading || !folderName.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังสร้าง...</span>
                </>
              ) : (
                <>
                  <FolderPlus size={14} />
                  <span>สร้างโฟลเดอร์</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
