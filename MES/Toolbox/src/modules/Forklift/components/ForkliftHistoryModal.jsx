import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, History, Search, RefreshCw, Truck, Battery, Clock, User, MapPin } from 'lucide-react';
import { forkliftApi } from '../../../shared/services/forkliftApi';

export default function ForkliftHistoryModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await forkliftApi.getHistory(150);
      if (res?.success) {
        setHistory(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch forklift history:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => {
    const q = search.toLowerCase();
    return (
      (item.forklift_code || '').toLowerCase().includes(q) ||
      (item.user_name || '').toLowerCase().includes(q) ||
      (item.usage_details || '').toLowerCase().includes(q) ||
      (item.last_location || '').toLowerCase().includes(q)
    );
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">ประวัติการใช้งานรถโฟล์คลิฟท์ (Usage History)</h3>
              <p className="text-xs text-slate-500">บันทึกประวัติการเบิกใช้ คืนรถ และปริมาณการใช้แบตเตอรี่</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-white">
          <div className="relative flex-grow max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อผู้ใช้, รหัสรถ, งานที่ทำ..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
        </div>

        {/* History Table / List */}
        <div className="overflow-y-auto flex-grow p-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
              <span>กำลังโหลดประวัติการใช้งาน...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              ไม่พบประวัติการใช้งานตามเงื่อนไขที่ค้นหา
            </div>
          ) : (
            <div className="space-y-2">
              {filteredHistory.map((h) => {
                const start = h.start_time ? new Date(h.start_time) : null;
                const end = h.end_time_actual ? new Date(h.end_time_actual) : null;
                let durationMinutes = '-';
                if (start && end) {
                  durationMinutes = Math.round((end - start) / (1000 * 60)) + ' นาที';
                }

                return (
                  <div
                    key={h.booking_id}
                    className="p-3 bg-slate-50/70 hover:bg-slate-100/70 rounded-xl border border-slate-200/70 text-xs transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Left Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                          {h.forklift_code}
                        </span>
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {h.user_name}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                          {h.booking_type || 'INSTANT'}
                        </span>
                      </div>
                      <div className="text-slate-600 font-medium">
                        {h.usage_details || 'ใช้งานทั่วไป'}
                      </div>
                    </div>

                    {/* Right Stats */}
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 shrink-0">
                      <div>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>เวลาใช้งาน ({durationMinutes})</span>
                        </div>
                        <div className="font-mono text-slate-700 font-medium">
                          {start ? start.toLocaleDateString('th-TH') : ''} {start ? start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''} - {end ? end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-slate-400 justify-end">
                          <Battery className="w-3 h-3" />
                          <span>แบตเตอรี่</span>
                        </div>
                        <div className="font-mono font-semibold text-slate-700">
                          {h.start_battery != null ? `${h.start_battery}%` : '-'} ➔ {h.end_battery != null ? `${h.end_battery}%` : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>แสดง {filteredHistory.length} รายการล่าสุด</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-700 font-medium transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
