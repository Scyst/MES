import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings, Menu, X, LogOut, Sun, UserCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function AppLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMenu = () => setIsMobileMenuOpen(false);

  // Auto-close menu when route changes
  useEffect(() => {
    closeMenu();
  }, [location.pathname]);

  // Update date
  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      setCurrentDate(now.toLocaleDateString('en-GB', options));
    };
    updateDate();
    const timer = setInterval(updateDate, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 z-30 shadow-sm flex-shrink-0">
        
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={`${import.meta.env.BASE_URL}assets/logo.webp`} alt="SNC Logo" className="h-8 object-contain" />
          </Link>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-gray-800 leading-tight">TOOLBOX OS</h1>
            <p className="text-xs text-gray-500">บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน)</p>
          </div>
        </div>

          {/* Right: Desktop Tools & Profile */}
          <div className="hidden md:flex items-center gap-2">
            {/* Theme & Date */}
            <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
              <button className="p-2 text-gray-500 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-colors" title="Toggle Theme">
                <Sun size={20} />
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full text-sm font-medium text-gray-600 border border-gray-100" title="Current Date">
                <Clock size={16} className="text-blue-500" />
                <span>{currentDate}</span>
              </div>
            </div>
            
            {/* Profile Pill & Logout */}
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full py-1 pl-1 pr-2 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {user?.fullname ? user.fullname.charAt(0) : 'U'}
                </div>
                <div className="hidden lg:block text-sm pr-2">
                  <p className="font-bold text-gray-800 leading-none">{user?.fullname || 'Admin User'}</p>
                </div>
              </div>
              
              <div className="h-5 w-px bg-gray-200"></div>
              
              <button 
                onClick={handleLogout}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

        {/* Right: Mobile Menu Toggle */}
        <button onClick={toggleMenu} className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Slide-down Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-20 flex flex-col p-4 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4 p-3 border-b border-gray-100 mb-2">
             <UserCircle size={32} className="text-gray-400" />
             <div>
               <p className="font-bold text-gray-800">{user?.fullname || 'User'}</p>
               <p className="text-xs text-gray-500">{currentDate}</p>
             </div>
          </div>
          <div className="mt-2">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-3 rounded-lg text-red-600 font-medium hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              <span>ออกจากระบบ (Logout)</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 top-16 bg-black/20 z-10 backdrop-blur-sm"
          onClick={closeMenu}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 h-full overflow-auto relative z-0">
        <div className="p-4 lg:p-6 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
