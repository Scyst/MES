import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Send, AlertCircle } from 'lucide-react';
import { forkliftApi } from '../../../shared/services/forkliftApi';

export default function ReportIssueModal({ isOpen, onClose, forklift, onReported }) {
  const [issueDetail, setIssueDetail] = useState('');
  const [setMaintenance, setSetMaintenance] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setIssueDetail('');
    setSetMaintenance(true);
    setErrorMsg('');
  }, [isOpen, forklift]);

  if (!isOpen || !forklift) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueDetail.trim()) {
      setErrorMsg('กรุณาระบุรายละเอียดอาการเสียหรือความผิดปกติของรถ');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await forkliftApi.reportIssue({
        forklift_id: forklift.id,
        issue_detail: issueDetail.trim(),
        set_maintenance: setMaintenance
      });
      if (res?.success) {
        onReported?.(res.message || 'แจ้งปัญหาเรียบร้อยแล้ว');
        onClose();
      } else {
        setErrorMsg(res?.message || 'ไม่สามารถบันทึกการแจ้งปัญหาได้');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                แจ้งรถเสีย / พบปัญหาผิดปกติ
              </h3>
              <p className="text-[11px] text-slate-600">
                รถ: <span className="font-bold">{forklift.code}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-rose-100/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1.5">
              รายละเอียดอาการเสีย / ข้อบกพร่อง <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={issueDetail}
              onChange={(e) => setIssueDetail(e.target.value)}
              placeholder="เช่น ระบบไฮดรอลิครั่ว, แบตเตอรี่ชาร์จไม่เข้า, ยางรั่ว..."
              required
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={setMaintenance}
              onChange={(e) => setSetMaintenance(e.target.checked)}
              className="mt-0.5 rounded border-amber-400 text-rose-600 focus:ring-rose-500"
            />
            <span className="text-xs text-amber-900 leading-relaxed">
              เปลี่ยนสถานะรถเป็น <strong>ปิดปรับปรุง (MAINTENANCE)</strong> ทันที เพื่อป้องกันผู้ใช้งานอื่นเบิกรถออกใช้งาน
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'กำลังส่งข้อมูล...' : 'ยืนยันแจ้งปัญหา'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
