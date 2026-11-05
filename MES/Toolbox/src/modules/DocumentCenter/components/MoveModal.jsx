import React, { useState, useEffect } from 'react';
import { X, FolderInput, AlertCircle } from 'lucide-react';
import { documentCenterApi } from '../../../shared/services/documentCenterApi';

export default function MoveModal({ item, isOpen, onClose, folderTree = [], onSuccess }) {
  const [targetCategory, setTargetCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      setTargetCategory(item.category || '');
      setDescription(item.file_description || '');
      setError('');
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const res = await documentCenterApi.updateDocument({
        document_id: item.id,
        category: targetCategory.trim(),
        description: description.trim(),
      });

      if (res.success) {
        onSuccess(res.message || 'ย้ายเอกสารเรียบร้อยแล้ว');
        onClose();
      } else {
        setError(res.message || 'เกิดข้อผิดพลาดในการย้ายเอกสาร');
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการย้ายเอกสาร');
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
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <FolderInput size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                ย้ายเอกสาร (Move Document)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                {item.file_name}
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
              โฟลเดอร์ปลายทาง (Target Folder)
            </label>
            <div className="relative">
              <input
                type="text"
                list="moveFolderList"
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                placeholder="เว้นว่างเพื่อย้ายไประดับราก (Root) หรือระบุโฟลเดอร์"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none text-slate-800 dark:text-slate-100"
              />
              <datalist id="moveFolderList">
                {folderTree.map((f, idx) => (
                  <option key={idx} value={f} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              คำอธิบาย (Description)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 outline-none text-slate-800 dark:text-slate-100 resize-none"
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
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังย้าย...</span>
                </>
              ) : (
                <>
                  <FolderInput size={14} />
                  <span>ยืนยันการย้าย</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
