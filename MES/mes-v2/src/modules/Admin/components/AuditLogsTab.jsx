import React, { useState, useEffect } from 'react';
import { Search, History, Filter, Download } from 'lucide-react';
import { userManageApi } from '../../../shared/services/userManageApi';

export default function AuditLogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Default filters to today
  const todayStr = new Date().toISOString().split('T')[0];
  const [filters, setFilters] = useState({
    startDate: todayStr,
    endDate: todayStr,
    action_type: '',
    module: '',
    search: '',
    limit: 500
  });

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await userManageApi.getLogs(filters);
      if (res.success) {
        setLogs(res.data.logs || []);
        setTotal(res.data.total_found || 0);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []); // Only load initially, manual search after

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    loadLogs();
  };

  // Helper to safely render JSON text
  const renderJsonText = (jsonStr) => {
    if (!jsonStr) return '-';
    try {
      const obj = JSON.parse(jsonStr);
      return (
        <pre className="text-[10px] text-gray-500 overflow-x-auto max-w-[200px] whitespace-pre-wrap">
          {JSON.stringify(obj, null, 2)}
        </pre>
      );
    } catch {
      return <span className="text-xs text-gray-500">{jsonStr}</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Form */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Date Range</label>
            <div className="flex items-center gap-2">
              <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-2 outline-none" />
              <span className="text-gray-400">-</span>
              <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="border border-gray-200 rounded px-2 py-1.5 text-sm focus:ring-2 outline-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-gray-600">Action Type</label>
            <input type="text" name="action_type" value={filters.action_type} onChange={handleFilterChange} placeholder="e.g. LOGIN, UPDATE" className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:ring-2 outline-none w-full" />
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-gray-600">Module</label>
            <input type="text" name="module" value={filters.module} onChange={handleFilterChange} placeholder="e.g. AUTH" className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:ring-2 outline-none w-full" />
          </div>

          <div className="flex flex-col gap-1 flex-2 min-w-[200px]">
            <label className="text-xs font-medium text-gray-600">Keyword Search</label>
            <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search remarks, values..." className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:ring-2 outline-none w-full" />
          </div>

          <button type="submit" disabled={loading} className="bg-slate-800 text-white px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors flex items-center gap-2 h-[34px] disabled:opacity-70">
            {loading ? <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div> : <Search size={16} />}
            Search
          </button>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
            <History size={16} /> Found {total} log entries
          </div>
          {total > filters.limit && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">Showing latest {filters.limit}</span>
          )}
        </div>
        
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto relative">
          <table className="w-full text-left text-sm border-collapse min-w-[1000px]">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr className="border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider">
                <th className="py-2 px-3 font-semibold w-[140px]">Timestamp</th>
                <th className="py-2 px-3 font-semibold w-[120px]">User</th>
                <th className="py-2 px-3 font-semibold w-[120px]">Action</th>
                <th className="py-2 px-3 font-semibold w-[100px]">Module</th>
                <th className="py-2 px-3 font-semibold w-[100px]">Ref ID</th>
                <th className="py-2 px-3 font-semibold">Remark / Context</th>
                <th className="py-2 px-3 font-semibold w-[200px]">Old Value</th>
                <th className="py-2 px-3 font-semibold w-[200px]">New Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">ไม่พบประวัติ (No logs found)</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-xs text-gray-500">{log.created_at}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium text-gray-800">{log.username}</div>
                      <div className="text-[10px] text-gray-400">{log.ip_address}</div>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'API_ERROR' || log.action === 'SYSTEM_ERROR' ? 'bg-red-100 text-red-700' :
                        log.action === 'LOGIN' ? 'bg-emerald-100 text-emerald-700' :
                        log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        log.action === 'DELETE' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs font-mono text-indigo-700">{log.module}</td>
                    <td className="py-2 px-3 text-xs text-gray-600">{log.ref_id}</td>
                    <td className="py-2 px-3 text-xs text-gray-700 max-w-[200px] truncate" title={log.remark}>{log.remark || '-'}</td>
                    <td className="py-2 px-3">{renderJsonText(log.old_value)}</td>
                    <td className="py-2 px-3">{renderJsonText(log.new_value)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
