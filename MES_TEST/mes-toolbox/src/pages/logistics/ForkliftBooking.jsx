import React, { useState, useEffect } from 'react';
import { Map, Search, Plus, MapPin, Truck, AlertCircle, Clock, CheckCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

export default function ForkliftBooking() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL(`${API_BASE_URL}/forklift.php`, window.location.href);
      url.searchParams.append('action', 'get_tasks');
      url.searchParams.append('status', 'ALL'); // or 'PENDING'
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const json = await response.json();
      
      if (json.success) {
        setTasks(json.data || []);
      } else {
        throw new Error(json.message || 'Failed to fetch forklift tasks');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div className="h-full flex flex-col space-y-4 lg:space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Map className="text-indigo-500" />
            Forklift Booking
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Request and manage forklift logistics within the plant</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3">
          <button onClick={fetchTasks} className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium shadow-sm transition-colors">
            Refresh
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">New Request</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {loading && tasks.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
            <AlertCircle size={20} /> Error: {error}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-slate-500 dark:text-slate-400 p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <Truck size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium">No Tasks Found</p>
            <p className="text-sm max-w-md mt-1">There are currently no active forklift requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <div key={task.task_id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Task #{task.task_id}</h3>
                    <p className="text-xs text-slate-500">{new Date(task.created_at).toLocaleString()}</p>
                  </div>
                  {task.status === 'COMPLETED' ? (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold flex items-center gap-1"><CheckCircle size={12}/> Done</span>
                  ) : task.status === 'IN_PROGRESS' ? (
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold flex items-center gap-1"><Truck size={12}/> Running</span>
                  ) : (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full text-xs font-semibold flex items-center gap-1"><Clock size={12}/> Pending</span>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                  <MapPin size={16} className="text-rose-500 shrink-0" />
                  <div className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">
                    <span className="font-medium text-slate-900 dark:text-white">{task.pickup_location}</span>
                    <span className="mx-2 text-slate-400">→</span>
                    <span className="font-medium text-slate-900 dark:text-white">{task.dropoff_location}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
                   {task.task_description && <p className="truncate">Desc: {task.task_description}</p>}
                   <p>Requester: <span className="font-medium text-slate-900 dark:text-white">{task.requester_name}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
