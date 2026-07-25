import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

  // Auto-close menu when route changes
  React.useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      
      {/* Mobile Header */}
      <header className="md:hidden absolute top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-4 z-20 shadow-md">
        <Link to="/" className="flex items-center">
            <img src={`${import.meta.env.BASE_URL}assets/logo.webp`} alt="SNC Logo" className="h-8 object-contain" />
        </Link>
        <button onClick={toggleMenu} className="p-2 -mr-2 rounded-lg hover:bg-slate-800 transition-colors" aria-label="Toggle menu">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar (Desktop fixed, Mobile slide-over) */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col z-40 transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img src={`${import.meta.env.BASE_URL}assets/logo.webp`} alt="SNC Logo" className="h-8 object-contain" />
          </Link>
          <button onClick={closeMenu} className="md:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
             <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link to="/" className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors ${location.pathname === '/' ? 'bg-slate-800' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link to="/qms" className={`flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition-colors text-blue-400 ${location.pathname.startsWith('/qms') ? 'bg-slate-800' : ''}`}>
            <Settings size={20} />
            <span>QMS Module</span>
          </Link>
        </nav>
        
        {/* User / Logout section */}
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-red-900/50 text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-auto pt-16 md:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 h-full max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
