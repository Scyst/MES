import { Outlet, NavLink } from 'react-router-dom';
import { Settings, Wrench, Factory } from 'lucide-react';

export default function MainLayout() {
  const navItems = [
    { name: 'Maintenance', path: '/maintenance', icon: <Wrench size={20} /> },
    { name: 'Stop Causes', path: '/stop-causes', icon: <Factory size={20} /> },
    { name: 'Production', path: '/production', icon: <Factory size={20} /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
      {/* Sidebar for PC */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Settings className="text-primary" />
            MES Toolbox
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Settings size={20} className="text-primary" />
            MES Toolbox
          </h1>
        </header>

        <div className="p-4 md:p-6 h-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-20 pb-safe">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center p-2 rounded-lg min-w-[4rem] ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`
            }
          >
            {item.icon}
            <span className="text-[10px] mt-1 font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
