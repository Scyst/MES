import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Factory, Wrench, Scan } from 'lucide-react';

export default function MobileNav() {
  const mobileItems = [
    { name: 'Home', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Production', path: '/production', icon: <Factory size={20} /> },
    { name: 'Scan', path: '/production/scan', icon: <Scan size={20} /> },
    { name: 'Maintain', path: '/maintenance', icon: <Wrench size={20} /> },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around p-2 z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {mobileItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-2 rounded-xl min-w-[4.5rem] transition-colors ${
              isActive 
                ? 'text-indigo-600 dark:text-indigo-400' 
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`
          }
        >
          {item.icon}
          <span className="text-[10px] mt-1 font-medium">{item.name}</span>
        </NavLink>
      ))}
    </nav>
  );
}
