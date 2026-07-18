import { useState, useEffect } from 'react';
import { History, Search, Download, Plus } from 'lucide-react';

const API_BASE_URL = './api/v1';

export default function StopCauseList() {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStops = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/stopCause.php?action=get_stops`);
      if (!response.ok) throw new Error('Network response was not ok');
      const json = await response.json();
      
      if (json.success) {
        setStops(json.data || []);
      } else {
        throw new Error(json.message || 'Failed to fetch stop history');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStops();
  }, []);

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 dark:border-slate-700">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Stop Causes History</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">View and analyze machine downtime events</p>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Machine, Cause..." 
              className="w-full sm:w-64 border border-gray-300 dark:border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:bg-slate-800/50 text-gray-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Add Stop</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 dark:border-slate-700 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="m-4 bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
            Error: {error}
          </div>
        ) : stops.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-gray-500 dark:text-slate-400">
            <History size={48} className="text-gray-300 mb-4" />
            <p className="text-lg font-medium">No stop history found</p>
            <p className="text-sm">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-slate-400 uppercase bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Start - End</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Line / Machine</th>
                  <th className="px-4 py-3 font-medium">Cause</th>
                  <th className="px-4 py-3 font-medium">Recoverer</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stops.map(stop => (
                  <tr key={stop.id || stop.stop_id} className="hover:bg-gray-50 dark:bg-slate-800/50/50">
                    <td className="px-4 py-3">{stop.date || stop.stop_date}</td>
                    <td className="px-4 py-3">
                      {stop.start_time} - {stop.end_time || 'Running'}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {stop.duration ? `${stop.duration} min` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{stop.machine_name || stop.machine_id}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{stop.line}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                        {stop.cause_group || stop.cause}
                      </span>
                    </td>
                    <td className="px-4 py-3">{stop.recoverer || stop.resolved_by}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 max-w-xs truncate" title={stop.note}>{stop.note}</td>
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
