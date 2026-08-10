import { NavLink, useLocation } from 'react-router-dom';
import { Home, Ticket, User } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();
  const navItems = [
    { name: 'หน้าหลัก', path: '/booking', icon: Home, exact: true },
    { 
      name: 'ประวัติจองรถ', 
      path: '/booking/history', 
      icon: Ticket
    },
    { name: 'โปรไฟล์', path: '/booking/profile', icon: User }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe transition-colors">
      <div className="w-full md:max-w-4xl mx-auto px-6 py-2 flex justify-between items-center">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.exact 
            ? location.pathname === item.path 
            : location.pathname.startsWith(item.path) && item.path !== '#';

          if (item.disabled) {
            return (
              <div key={index} className="flex flex-col items-center justify-center w-16 p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed">
                <Icon size={24} />
                <span className="text-[10px] mt-1 font-semibold">{item.name}</span>
              </div>
            );
          }

          return (
            <NavLink 
              key={index}
              to={item.path}
              className={`flex flex-col items-center justify-center w-16 p-2 transition-colors ${
                isActive 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <Icon size={24} className={isActive ? 'mb-1 scale-110 transition-transform' : 'mb-1'} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-semibold'}`}>{item.name}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
