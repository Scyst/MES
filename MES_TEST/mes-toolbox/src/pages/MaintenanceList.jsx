import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Play, CheckCircle, Plus } from 'lucide-react';

const API_BASE_URL = './api/v1';

export default function MaintenanceList() {
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({ sumTotal: 0, sumCompleted: 0, sumPending: 0, sumAvgTime: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('Active');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const [resRequests, resSummary] = await Promise.all([
        fetch(`${API_BASE_URL}/maintenance.php?action=get_requests&status=${filterStatus}`),
        fetch(`${API_BASE_URL}/maintenance.php?action=get_maintenance_summary`)
      ]);
      
      if (!resRequests.ok) throw new Error('Network response was not ok');
      const json = await resRequests.json();
      
      if (resSummary.ok) {
        const sumJson = await resSummary.json();
        if (sumJson.success && sumJson.data) setSummary(sumJson.data);
      }
      
      if (json.success) {
        setRequests(json.data || []);
      } else {
        throw new Error(json.message || 'Failed to fetch maintenance requests');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'Pending': return { color: 'text-red-600 bg-red-100', icon: <AlertTriangle size={14} /> };
      case 'In Progress': return { color: 'text-blue-600 bg-blue-100', icon: <Play size={14} /> };
      case 'Completed': return { color: 'text-green-600 bg-green-100', icon: <CheckCircle size={14} /> };
      default: return { color: 'text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700', icon: <Clock size={14} /> };
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Dashboard Summary Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-l-4 border-blue-600 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Requests</p>
            <p className="text-2xl font-bold text-blue-600">{summary.sumTotal || 0}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-l-4 border-green-600 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-green-600">{summary.sumCompleted || 0}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-l-4 border-yellow-500 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-yellow-500">{summary.sumPending || 0}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border-l-4 border-cyan-500 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Avg Repair Time</p>
            <p className="text-2xl font-bold text-cyan-500">{summary.sumAvgTime || 0} <span className="text-sm">min</span></p>
          </div>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Maintenance Requests</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">Manage and track machine breakdowns</p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="Active">Active (Pending + In Progress)</option>
            <option value="">All Status</option>
            <option value="Pending">Pending Only</option>
            <option value="In Progress">In Progress Only</option>
            <option value="Completed">Completed</option>
          </select>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">New Request</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
          Error: {error}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 dark:border-slate-700">
          <CheckCircle size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium">No maintenance requests found</p>
          <p className="text-sm">Everything is running smoothly.</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {requests.map(req => {
            const statusConfig = getStatusConfig(req.status);
            return (
              <div key={req.job_id} className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 dark:border-slate-700 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{req.job_id}</span>
                    <h3 className="font-bold text-gray-900 dark:text-white mt-1">{req.machine_name || req.machine_id}</h3>
                  </div>
                  <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}>
                    {statusConfig.icon}
                    {req.status}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-slate-300 mb-4 line-clamp-2 min-h-[2.5rem]">
                  {req.issue_description}
                </p>

                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-slate-400 pt-3 border-t border-gray-100 dark:border-slate-800 dark:border-slate-700">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700 dark:text-slate-300">{req.requester_name || req.request_by}</span>
                    <span>{new Date(req.request_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {req.line && (
                    <span className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded font-medium">
                      Line: {req.line}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
