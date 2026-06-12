import { useState, useEffect } from 'react';
import { User, LogOut, Moon, Sun, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const team = JSON.parse(localStorage.getItem('mes_active_team') || '[]');
    if (team.length > 0) {
      setUser(team[0]); // Primary user
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mes_active_team');
    // Redirect to main system logout
    window.location.href = '../../auth/logout.php';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 mt-6">
      <div className="flex justify-between items-center bg-gradient-to-r from-blue-900 to-indigo-900 p-6 rounded-3xl shadow-2xl">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Profile & Settings</h1>
          <p className="text-blue-200 text-sm">Manage your account</p>
        </div>
      </div>

      {user && (
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl shadow-lg flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 border-4 border-gray-800 flex items-center justify-center text-xl font-bold">
            {(user.name || user.fullname || user.username || 'U').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{user.name || user.fullname}</h2>
            <p className="text-gray-400 text-sm">{user.username}</p>
            {user.role && <p className="text-blue-400 text-xs mt-1 uppercase font-medium">{user.role}</p>}
          </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-3xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors">
          <div className="flex items-center space-x-3 text-gray-300">
            <Moon size={20} className="text-indigo-400" />
            <span className="font-medium">Dark Mode</span>
          </div>
          <div className="w-12 h-6 bg-blue-600 rounded-full relative">
            <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
          </div>
        </div>
        
        <div 
          onClick={handleLogout}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800 transition-colors text-red-400"
        >
          <div className="flex items-center space-x-3">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </div>
          <ChevronRight size={20} className="text-gray-600" />
        </div>
      </div>
    </div>
  );
}
