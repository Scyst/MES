import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, AlertCircle, ShieldAlert, FileWarning, CheckCircle, Clock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

export default function QMSDashboard() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL(`${API_BASE_URL}/qms.php`, window.location.href);
      url.searchParams.append('action', 'list');
      if (searchTerm) url.searchParams.append('search', searchTerm);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const json = await response.json();
      
      if (json.success) {
        setCases(json.data.list || []);
        setStats(json.data.stats);
      } else {
        throw new Error(json.message || 'Failed to fetch QMS cases');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCases();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'NCR_CREATED': 
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">New NCR</span>;
      case 'SENT_TO_CUSTOMER': 
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-200">Awaiting Reply</span>;
      case 'CUSTOMER_REPLIED': 
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">Customer Replied</span>;
      case 'CLOSED': 
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">Closed</span>;
      default: 
        return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 lg:space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="text-rose-500" />
            Quality Management (QMS)
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage NCR, CAR, and Customer Claims</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Case, CAR No, Customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72 border border-slate-200 dark:border-slate-600 rounded-xl pl-9 pr-3 py-2 sm:py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            />
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">New Case</span>
          </button>
        </div>
      </div>

      {/* Summary KPI */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
             <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-400"><FileWarning size={24} /></div>
             <div><p className="text-sm text-slate-500">New NCR</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.ncr_count || 0}</p></div>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
             <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400"><Clock size={24} /></div>
             <div><p className="text-sm text-slate-500">Awaiting Reply</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.car_count || 0}</p></div>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
             <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400"><AlertCircle size={24} /></div>
             <div><p className="text-sm text-slate-500">Replied</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.reply_count || 0}</p></div>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
             <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400"><CheckCircle size={24} /></div>
             <div><p className="text-sm text-slate-500">Closed</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.closed_count || 0}</p></div>
           </div>
        </div>
      )}

      {/* Table Content */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
        {loading && cases.length === 0 ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="m-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
            <AlertCircle size={20} /> Error: {error}
          </div>
        ) : cases.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-slate-500 dark:text-slate-400 p-8 text-center">
            <ShieldAlert size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium">No Cases Found</p>
            <p className="text-sm max-w-md mt-1">There are no quality cases matching your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">CAR No.</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Customer / Product</th>
                  <th className="px-6 py-4 font-semibold">Defect</th>
                  <th className="px-6 py-4 font-semibold">Created By</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {cases.map(c => (
                  <tr key={c.case_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600 dark:text-indigo-400">
                      {c.car_no || `CASE-${c.case_id}`}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                      {c.case_date ? new Date(c.case_date).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 dark:text-white font-medium">{c.customer_name || 'Internal'}</div>
                      <div className="text-xs text-slate-500">{c.product_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 dark:text-white">{c.defect_type || '-'}</div>
                      {c.defect_qty > 0 && <div className="text-xs text-rose-500 font-medium">{c.defect_qty} PCS Defective</div>}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {c.created_by_name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(c.current_status)}
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
