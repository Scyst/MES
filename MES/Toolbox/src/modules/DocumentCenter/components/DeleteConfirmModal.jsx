import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertTriangle, Lock } from 'lucide-react';
import { documentCenterApi } from '../../../shared/services/documentCenterApi';

export default function DeleteConfirmModal({ items = [], isOpen, onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || items.length === 0) return null;

  const count = items.length;
  const hasFolder = items.some((it) => it.is_folder || it.file_type === 'folder');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('กรุณาระบุรหัสผ่านเข้าสู่ระบบเพื่อยืนยันสิทธิ์การลบ');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const docIds = items.map((it) => it.id).filter(Boolean);
      if (docIds.length === 0) {
        setError('ไม่พบรหัสเอกสารที่ต้องการลบ');
        return;
      }

      const res = await documentCenterApi.deleteDocuments(docIds, password);
      if (res.success) {
        onSuccess(res.message || 'ลบรายการสำเร็จแล้ว');
        onClose();
      } else {
        setError(res.message || 'เกิดข้อผิดพลาดในการลบ');
      }
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการลบเอกสาร');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 dark:border-red-950/60 bg-red-50/70 dark:bg-red-950/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Trash2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
                ยืนยันการลบ {count} รายการ
              </h3>
              <p className="text-[11px] text-red-600/80 dark:text-red-400/80">
                การดำเนินการนี้ไม่สามารถเรียกคืนได้
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
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto space-y-1">
            {items.map((it, idx) => (
              <p key={idx} className="text-xs text-slate-700 dark:text-slate-300 truncate">
                • {it.is_folder ? '📁 โฟลเดอร์: ' : '📄 '} {it.file_name}
              </p>
            ))}
          </div>

          {hasFolder && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px]">
              <AlertTriangle size={14} className="shrink-0" />
              <span>การลบโฟลเดอร์จะลบไฟล์และโฟลเดอร์ย่อยทั้งหมดที่อยู่ภายในโดยอัตโนมัติ</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ยืนยันด้วยรหัสผ่านของคุณ (Admin Password)
            </label>
            <div className="relative">
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ป้อนรหัสผ่านเพื่อยืนยัน"
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500/30 focus:border-red-500 outline-none text-slate-800 dark:text-slate-100"
              />
              <Lock size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
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
              disabled={loading || !password}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>กำลังลบ...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>ลบอย่างถาวร</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
