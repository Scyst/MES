import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertOctagon, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [stats, setStats] = useState({
    total_fg: 0,
    total_hold: 0,
    total_scrap: 0,
    active_machines: 0,
    hold_machines: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [activeTeam, setActiveTeam] = useState(() => {
    const saved = localStorage.getItem('mes_active_team');
    return saved ? JSON.parse(saved) : [];
  });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        let url = `${API_BASE_URL}/dashboard.php`;
        if (activeTeam.length > 0) {
          const userIds = activeTeam.map(u => u.id).join(',');
          url += `?user_ids=${userIds}`;
        }
        
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          setStats(json.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [API_BASE_URL, activeTeam]);

  const headerTitle = activeTeam.length > 0 ? "My Performance" : "Factory Overview";
  const headerSub = activeTeam.length > 0 
    ? `Today's Output for ${activeTeam.map(u => u.name || u.fullname).join(', ')}` 
    : "Today's Live Production Status";

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-4 mt-6">
      
      {/* Welcome Header */}
      <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 p-6 rounded-3xl shadow-2xl relative overflow-hidden transition-colors duration-300">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-white mb-1">{headerTitle}</h1>
          <p className="text-blue-100 dark:text-blue-200 text-sm">{headerSub}</p>
        </div>
        <TrendingUp className="text-blue-200/20 dark:text-blue-500/20 absolute -right-4 -bottom-4 w-32 h-32" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        
        <div className="col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl flex items-center justify-between shadow-lg transition-colors duration-300">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider mb-1">Total Good Parts (FG)</p>
            <p className="text-4xl font-black text-green-600 dark:text-green-400">
              {loading ? '...' : stats.total_fg.toLocaleString()}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-green-600 dark:text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-3xl shadow-lg transition-colors duration-300">
          <div className="flex items-center space-x-2 mb-3">
            <Clock size={20} className="text-yellow-600 dark:text-yellow-500" />
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase">Hold Parts</p>
          </div>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {loading ? '...' : stats.total_hold.toLocaleString()}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-3xl shadow-lg transition-colors duration-300">
          <div className="flex items-center space-x-2 mb-3">
            <AlertOctagon size={20} className="text-red-600 dark:text-red-500" />
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase">Scrap Parts</p>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {loading ? '...' : stats.total_scrap.toLocaleString()}
          </p>
        </div>
        
        <div className="col-span-2 grid grid-cols-2 gap-4 mt-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 p-5 rounded-2xl flex flex-col justify-center items-center text-center transition-colors duration-300">
            <Activity size={24} className="text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{loading ? '...' : stats.active_machines}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 uppercase font-medium">Active Machines</p>
          </div>
          
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-5 rounded-2xl flex flex-col justify-center items-center text-center transition-colors duration-300">
            <AlertOctagon size={24} className="text-red-600 dark:text-red-400 mb-2" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{loading ? '...' : stats.hold_machines}</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 uppercase font-medium">Machines Down</p>
          </div>
        </div>

      </div>

      {/* Quick Links */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 ml-2 transition-colors">Quick Links</h2>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => window.location.href = '../../dashboard.php'} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Activity size={24} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">OEE System</span>
          </button>
          <button onClick={() => window.location.href = '../../stop_causes.php'} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center space-y-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-300">
            <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl">
              <AlertOctagon size={24} />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stop Causes</span>
          </button>
        </div>
      </div>

      <button 
        onClick={() => navigate('/production/machines')}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-xl mt-4 transition-colors"
      >
        Go to Machine Selection
      </button>

    </div>
  );
}
