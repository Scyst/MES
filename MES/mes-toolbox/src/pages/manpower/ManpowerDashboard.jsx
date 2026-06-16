import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, BarChart2, ShieldAlert, CheckCircle, Clock, CalendarDays, Download, Server } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

export default function ManpowerDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hcGroup, setHcGroup] = useState('ALL');
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

  const fetchManpowerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL(`${API_BASE_URL}/manpower/daily_operations.php`, window.location.href);
      url.searchParams.append('action', 'read_kpi_summary');
      url.searchParams.append('startDate', date);
      url.searchParams.append('endDate', date);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const json = await response.json();
      
      if (json.success) {
        let filteredData = json.data || [];
        if (hcGroup !== 'ALL') {
           filteredData = filteredData.filter(d => d.team_group === hcGroup);
        }
        setData(filteredData);
        setLastUpdate(new Date().toLocaleTimeString());
      } else {
        throw new Error(json.message || 'Failed to fetch manpower data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManpowerData();
    // Auto refresh every 5 mins
    const interval = setInterval(fetchManpowerData, 300000);
    return () => clearInterval(interval);
  }, [date, hcGroup]);

  // Aggregate Stats
  const totalHc = data.length;
  const totalPresent = data.filter(d => d.count_present > 0).length;
  const totalLate = data.filter(d => d.count_late > 0).length;
  const totalAbsent = data.filter(d => d.count_absent > 0).length;
  
  const attendanceRate = totalHc > 0 ? Math.round(((totalPresent + totalLate) / totalHc) * 100) : 0;

  return (
    <div className="h-full flex flex-col space-y-4 lg:space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="text-indigo-500" />
            Manpower Live
          </h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
             <p className="text-sm text-slate-500 dark:text-slate-400">Real-time attendance tracking • Last updated: {lastUpdate}</p>
          </div>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3 flex-wrap">
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <select 
            value={hcGroup}
            onChange={(e) => setHcGroup(e.target.value)}
            className="border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">All Groups</option>
            <option value="TEAM 1">Team 1</option>
            <option value="TEAM 2">Team 2</option>
          </select>
          <button onClick={fetchManpowerData} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-2.5 rounded-xl shadow-sm transition-colors" title="Reload">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors" title="Sync from Cloud">
            <Server size={18} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/50 rounded-lg"><Users size={20} className="text-indigo-600 dark:text-indigo-400" /></div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Total HC</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalHc}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/50 rounded-lg"><CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400" /></div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Present + Late</h3>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalPresent + totalLate}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-900/50 rounded-lg"><ShieldAlert size={20} className="text-rose-600 dark:text-rose-400" /></div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Absent</h3>
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalAbsent}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg"><BarChart2 size={20} className="text-blue-600 dark:text-blue-400" /></div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Attendance Rate</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{attendanceRate}%</p>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
        {loading && data.length === 0 ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="m-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
            <ShieldAlert size={20} /> Error: {error}
          </div>
        ) : data.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-slate-500 dark:text-slate-400 p-8 text-center">
            <Users size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium">No Data Found</p>
            <p className="text-sm max-w-md mt-1">There is no attendance data for this date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 sticky top-0 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">Emp ID</th>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Line</th>
                  <th className="px-6 py-4 font-semibold">Group</th>
                  <th className="px-6 py-4 font-semibold text-center">Present</th>
                  <th className="px-6 py-4 font-semibold text-center">Late</th>
                  <th className="px-6 py-4 font-semibold text-center">Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {data.map((emp, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{emp.emp_id}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{emp.name_th}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{emp.line}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{emp.team_group}</td>
                    <td className="px-6 py-4 text-center">
                      {emp.count_present > 0 ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">1</span> : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {emp.count_late > 0 ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs">1</span> : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {emp.count_absent > 0 ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-700 font-bold text-xs">1</span> : '-'}
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
