import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, AlertCircle, CalendarDays } from 'lucide-react';
// For a real app, you would use FullCalendar react wrapper here.
// We'll simulate a clean UI for the calendar list for now.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

export default function HolidayCalendar() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL(`${API_BASE_URL}/manpower/holiday.php`, window.location.href);
      url.searchParams.append('action', 'read');
      // Fetching entire year for simplicity
      url.searchParams.append('start', `${new Date().getFullYear()}-01-01`);
      url.searchParams.append('end', `${new Date().getFullYear()}-12-31`);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const json = await response.json();
      
      if (json.success || Array.isArray(json)) {
        setHolidays(json.data || json || []);
      } else {
        throw new Error(json.message || 'Failed to fetch holidays');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  return (
    <div className="h-full flex flex-col space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="text-rose-500" />
            Holiday Settings
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage public and company holidays</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={16} />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
        {loading ? (
           <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : error ? (
           <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
            <AlertCircle size={20} /> Error: {error}
          </div>
        ) : holidays.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-16 text-slate-500 dark:text-slate-400">
            <CalendarDays size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium">No Holidays Declared</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {holidays.map((h, i) => (
              <div key={i} className="flex items-center gap-4 p-4 border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-900/10 rounded-xl hover:border-rose-300 transition-colors cursor-pointer">
                <div className="bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-600 rounded-lg w-14 h-14 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs text-slate-500 font-bold uppercase">{new Date(h.start).toLocaleString('default', { month: 'short' })}</span>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-400 leading-none">{new Date(h.start).getDate()}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{h.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{new Date(h.start).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
