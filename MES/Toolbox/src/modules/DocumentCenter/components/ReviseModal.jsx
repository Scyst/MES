import React, { useState, useRef, useEffect } from 'react';
import { X, RefreshCw, FileText, AlertCircle, Upload } from 'lucide-react';
import { documentCenterApi } from '../../../shared/services/documentCenterApi';

export default function ReviseModal({ item, isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('กรุณาเลือกไฟล์เวอร์ชันใหม่ที่ต้องการอัปเดต');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('document_id', item.id);
      formData.append('doc_file', file);

      const res = await documentCenterApi.reviseDocument(formData);
      if (res.success) {
        onSuccess(res.message || 'อัปเดตเวอร์ชันเอกสารสำเร็จแล้ว');
        onClose();
      } else {
        setError(res.message || 'เกิดข้อผิดพลาดในการอัปเดตเวอร์ชัน');
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการอัปเดตเวอร์ชัน');
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
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <RefreshCw size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                อัปเดตเวอร์ชันเอกสาร (Revise Document)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
                ไฟล์เดิม: {item.file_name}
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

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold truncate max-w-[240px] text-slate-800 dark:text-slate-100">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • คลิกเพื่อเลือกใหม่
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload size={24} className="mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  คลิกเพื่อเลือกไฟล์เวอร์ชันใหม่
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ไฟล์เดิมจะถูกแทนที่ด้วยไฟล์นี้ และคงประวัติการเข้าดูไว้
                </p>
              </div>
            )}
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
              disabled={loading || !file}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังอัปเดต...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  <span>ยืนยัน Revision ใหม่</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
