import React, { useState, useEffect } from 'react';
import { ClipboardList, Search, Plus, Filter, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

export default function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/workorders.php?action=get_work_orders&status=Active`);
      if (!response.ok) throw new Error('Network response was not ok');
      const json = await response.json();
      
      if (json.success) {
        setWorkOrders(json.data || []);
        setSummary(json.summary);
      } else {
        throw new Error(json.message || 'Failed to fetch work orders');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Critical': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'High': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Normal': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Open': return 'text-rose-600 bg-rose-50';
      case 'In Progress': return 'text-indigo-600 bg-indigo-50';
      case 'Completed': return 'text-emerald-600 bg-emerald-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 lg:space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="text-indigo-500" />
            Work Orders
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage maintenance tasks and repairs</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search WO..." 
              className="w-full sm:w-64 border border-slate-200 dark:border-slate-600 rounded-xl pl-9 pr-3 py-2 sm:py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            />
          </div>
          <button className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">New WO</span>
          </button>
        </div>
      </div>

      {/* Summary KPI (Optional) */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
             <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400"><ClipboardList size={24} /></div>
             <div><p className="text-sm text-slate-500">Total Active</p><p className="text-xl font-bold">{summary.total || 0}</p></div>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
             <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400"><Clock size={24} /></div>
             <div><p className="text-sm text-slate-500">Open/Progress</p><p className="text-xl font-bold">{summary.open_count || 0}</p></div>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
             <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={24} /></div>
             <div><p className="text-sm text-slate-500">Completed (Avg)</p><p className="text-xl font-bold">{summary.completed_count || 0} <span className="text-xs font-normal">({Math.round(summary.avg_repair || 0)}m)</span></p></div>
           </div>
        </div>
      )}

      {/* Table Content */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="m-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
            <AlertCircle size={20} /> Error: {error}
          </div>
        ) : workOrders.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-slate-500 dark:text-slate-400">
            <ClipboardList size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium">No active work orders</p>
            <p className="text-sm">Great job! Everything is running smoothly.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">WO Number</th>
                  <th className="px-6 py-4 font-semibold">Machine / Line</th>
                  <th className="px-6 py-4 font-semibold">Issue</th>
                  <th className="px-6 py-4 font-semibold">Priority</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Requested At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {workOrders.map(wo => (
                  <tr key={wo.wo_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600 dark:text-indigo-400">
                      {wo.wo_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 dark:text-white font-medium">{wo.machine_display_name || wo.machine_name || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{wo.line || 'No Line'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 dark:text-white">{wo.issue_title}</div>
                      <div className="text-xs text-slate-500 truncate max-w-xs">{wo.issue_detail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(wo.priority)}`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(wo.status)}`}>
                        {wo.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {wo.requested_at ? new Date(wo.requested_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
