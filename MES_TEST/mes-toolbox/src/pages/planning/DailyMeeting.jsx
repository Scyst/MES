import React, { useState, useEffect } from 'react';
import { CalendarDays, Search, CheckCircle, Clock, AlertCircle, RefreshCw, BarChart2, CheckSquare } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

export default function DailyMeeting() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState({ production: [], loading: [], shortages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMeetingData = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL(`${API_BASE_URL}/planning.php`, window.location.href);
      url.searchParams.append('action', 'read');
      url.searchParams.append('date', date);
      url.searchParams.append('shift', 'ALL');
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const json = await response.json();
      
      if (json.success) {
        setData(json.data || { production: [], loading: [], shortages: [] });
      } else {
        throw new Error(json.message || 'Failed to fetch planning data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingData();
  }, [date]);

  return (
    <div className="h-full flex flex-col space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="text-indigo-500" />
            Daily Meeting
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Production Planning & Status Sync</p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button 
            onClick={fetchMeetingData}
            className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-2.5 rounded-xl shadow-sm transition-colors"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Production Sync */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart2 size={18} className="text-indigo-500" /> Production Control
            </h3>
            <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-semibold px-2 py-1 rounded-full">
              {data.production?.length || 0} Lines
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
            ) : data.production?.length === 0 ? (
              <p className="text-slate-500 p-8 text-center text-sm">No production plans for this date.</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b border-slate-100 dark:border-slate-700 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Line</th>
                    <th className="px-4 py-3 font-semibold">Model</th>
                    <th className="px-4 py-3 font-semibold text-right">Plan</th>
                    <th className="px-4 py-3 font-semibold text-right">Actual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {data.production.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{row.line}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.model}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{row.plan_qty}</td>
                      <td className="px-4 py-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">{row.act_qty || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Loading Sync */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <CheckSquare size={18} className="text-emerald-500" /> Outbound / Loading
            </h3>
            <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-2 py-1 rounded-full">
              {data.loading?.length || 0} Invoices
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
             {loading ? (
              <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div></div>
            ) : data.loading?.length === 0 ? (
              <p className="text-slate-500 p-8 text-center text-sm">No shipments planned for this date.</p>
            ) : (
              <div className="p-4 space-y-3">
                {data.loading.map((load, idx) => (
                  <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{load.customer_name}</div>
                      <div className="text-xs text-slate-500 mt-1">Inv: {load.invoice_no} | Container: {load.container_no || '-'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">{load.total_qty} PCS</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
