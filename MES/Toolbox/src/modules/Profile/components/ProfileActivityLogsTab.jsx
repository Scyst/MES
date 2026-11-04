import React, { useState, useEffect } from 'react';
import { History, Clock, Globe, Shield, RefreshCw } from 'lucide-react';
import { profileApi } from '../../../shared/services/profileApi';

export default function ProfileActivityLogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await profileApi.getActivityLogs();
      if (res && res.success) {
        setLogs(res.data || []);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              ประวัติการใช้งานและกิจกรรม (Activity Logs)
            </h3>
            <p className="text-xs text-slate-400">ประวัติการเข้าสู่ระบบและแก้ไขข้อมูลส่วนตัวย้อนหลัง 20 รายการล่าสุด</p>
          </div>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="mes-btn-secondary p-1.5"
          title="รีเฟรชประวัติ"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">กำลังโหลดประวัติการใช้งาน...</div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">ยังไม่มีประวัติการใช้งานที่บันทึกไว้</div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="py-2 px-3 font-semibold w-40">วัน-เวลา</th>
                <th className="py-2 px-3 font-semibold w-32">การกระทำ (Action)</th>
                <th className="py-2 px-3 font-semibold w-28">โมดูล</th>
                <th className="py-2 px-3 font-semibold">รายละเอียด (Remark)</th>
                <th className="py-2 px-3 font-semibold w-36">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850/60">
                  <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {log.created_at || '-'}
                    </div>
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                    <span className="mes-badge bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {log.action || '-'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{log.module || '-'}</td>
                  <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{log.remark || '-'}</td>
                  <td className="py-2 px-3 font-mono text-slate-500">
                    <div className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-slate-400" />
                      {log.ip_address || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
