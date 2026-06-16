import React, { useState, useEffect } from 'react';
import { Package, PauseCircle, AlertTriangle, Activity, CheckCircle, Clock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/dashboard.php`);
        const json = await response.json();
        if (json.success) {
          setMetrics(json.data);
        } else {
          throw new Error(json.message || 'Failed to fetch dashboard data');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-800">
        <h3 className="font-bold flex items-center gap-2"><AlertTriangle size={20}/> Error Loading Dashboard</h3>
        <p>{error}</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total FG Produced',
      value: metrics?.total_fg?.toLocaleString() || '0',
      icon: <Package size={24} className="text-emerald-500" />,
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      color: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      title: 'Total Hold',
      value: metrics?.total_hold?.toLocaleString() || '0',
      icon: <PauseCircle size={24} className="text-amber-500" />,
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      color: 'text-amber-700 dark:text-amber-400',
    },
    {
      title: 'Total Scrap',
      value: metrics?.total_scrap?.toLocaleString() || '0',
      icon: <AlertTriangle size={24} className="text-rose-500" />,
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      color: 'text-rose-700 dark:text-rose-400',
    },
    {
      title: 'Active Machines',
      value: metrics?.active_machines || '0',
      icon: <Activity size={24} className="text-indigo-500" />,
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      color: 'text-indigo-700 dark:text-indigo-400',
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Overview</h1>
          <p className="text-slate-500 dark:text-slate-400">Today's production summary</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* System Status Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Database Connection</span>
              </div>
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Shift</span>
              </div>
              <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                {new Date().getHours() >= 8 && new Date().getHours() < 20 ? 'Day Shift' : 'Night Shift'}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="font-medium text-slate-700 dark:text-slate-300">Machines on Hold</span>
              </div>
              <span className="text-sm text-amber-600 dark:text-amber-400 font-bold">{metrics?.hold_machines || 0}</span>
            </div>
          </div>
        </div>

        {/* Welcome Panel */}
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-md p-6 text-white relative overflow-hidden">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Welcome to MES Toolbox</h2>
              <p className="text-indigo-100 max-w-sm">
                Your centralized command center for manufacturing execution, machine status, and maintenance.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex items-center gap-2 text-indigo-100 text-sm font-medium">
                <CheckCircle size={16} /> All systems operational
              </div>
              <div className="flex items-center gap-2 text-indigo-100 text-sm font-medium">
                <Clock size={16} /> Data synced live
              </div>
            </div>
          </div>
          {/* Decorative shapes */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-900/20 rounded-full blur-3xl"></div>
        </div>

      </div>
    </div>
  );
}
