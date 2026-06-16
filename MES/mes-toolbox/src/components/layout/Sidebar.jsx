import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart2, Settings, Users, Server, Wrench, 
  MonitorPlay, History, QrCode, LogOut, ClipboardList,
  Package, ShieldAlert, TrendingUp, Truck, Map, Archive, X, CalendarDays
} from 'lucide-react';

export default function Sidebar({ isOpen, toggleSidebar }) {
  const menuGroups = [
    {
      title: 'Production & Analytics',
      items: [
        { name: 'Core Dashboard', path: '/', icon: <BarChart2 size={20} /> },
        { name: 'Daily Meeting', path: '/planning', icon: <CalendarDays size={20} /> },
        { name: 'Manpower Live', path: '/manpower', icon: <Users size={20} /> },
        { name: 'Holiday Calendar', path: '/manpower/holiday', icon: <CalendarDays size={20} /> },
        { name: 'Machine Cockpit', path: '/production', icon: <MonitorPlay size={20} /> },
        { name: 'Global History', path: '/production/history', icon: <History size={20} /> },
      ]
    },
    {
      title: 'Maintenance & Assets',
      items: [
        { name: 'Work Orders', path: '/work-orders', icon: <ClipboardList size={20} /> },
        { name: 'Spare Parts', path: '/spare-parts', icon: <Package size={20} /> },
        { name: 'Stop Causes', path: '/stop-causes', icon: <ClipboardList size={20} /> },
      ]
    },
    {
      title: 'Quality (QMS)',
      items: [
        { name: 'QMS Dashboard', path: '/qms', icon: <ShieldAlert size={20} /> },
      ]
    },
    {
      title: 'Sales & Logistics',
      items: [
        { name: 'Sales Dashboard', path: '/sales', icon: <TrendingUp size={20} /> },
        { name: 'Shipping Report', path: '/sales/shipping', icon: <Truck size={20} /> },
        { name: 'Forklift Booking', path: '/logistics/forklift', icon: <Map size={20} /> },
      ]
    },
    {
      title: 'Inventory & Store',
      items: [
        { name: 'Store Management', path: '/inventory', icon: <Archive size={20} /> },
      ]
    },
    {
      title: 'Administration',
      items: [
        { name: 'User Management', path: '/admin/users', icon: <Users size={20} /> }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white dark:bg-slate-900 
        border-r border-slate-200 dark:border-slate-800
        transform transition-transform duration-300 ease-in-out
        flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Sidebar Header (Logo) */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-sm">
              <Settings size={20} />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">MES Toolbox</span>
          </div>
          <button 
            onClick={toggleSidebar}
            className="lg:hidden p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {menuGroups.map((group, idx) => (
            <div key={idx}>
              <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth < 1024) toggleSidebar();
                    }}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`
                    }
                  >
                    {item.icon}
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        
        {/* Footer info if needed */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center">
             <span className="text-xs font-medium text-slate-500 dark:text-slate-400">v2.0 Stand-alone</span>
          </div>
        </div>

      </aside>
    </>
  );
}
