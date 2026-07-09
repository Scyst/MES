import React, { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiCheckSquare, FiLink, FiPieChart, FiBarChart2, FiBell, FiMenu, FiX, FiSun, FiMoon, FiLogOut, FiUser } from 'react-icons/fi';
import axios from 'axios';
import CalendarView from './components/CalendarView';
import TaskBoard from './components/TaskBoard';
import Dashboard from './components/Dashboard';
import GanttChart from './components/GanttChart';
import LinkHub from './components/LinkHub';
import NotificationManager from './components/NotificationManager';

// Reordered: Calendar first (default), then by usage importance
const navItems = [
  { tab: 'calendar', icon: FiCalendar, label: 'ปฏิทินทีม', sublabel: 'Calendar' },
  { tab: 'tasks', icon: FiCheckSquare, label: 'กระดานงาน', sublabel: 'Task Board' },
  { tab: 'gantt', icon: FiBarChart2, label: 'ตารางงาน', sublabel: 'Gantt Chart' },
  { tab: 'links', icon: FiLink, label: 'คลังข้อมูล', sublabel: 'Links' },
  { tab: 'dashboard', icon: FiPieChart, label: 'ภาพรวม', sublabel: 'Dashboard' },
];

function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // ══════════ Centralized State (Single Source of Truth) ══════════
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch all data once
  const refreshData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [resTasks, resEvents, resAct] = await Promise.all([
        axios.get('/api/tasks'),
        axios.get('/api/events'),
        axios.get('/api/activities')
      ]);
      setTasks(resTasks.data);
      setEvents(resEvents.data);
      setActivities(resAct.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // ══════════ Shared Handlers ══════════
  const handleSaveTask = useCallback(async (taskData) => {
    try {
      if (taskData.Id) {
        const res = await axios.put(`/api/tasks/${taskData.Id}`, taskData);
        setTasks(prev => prev.map(t => t.Id === taskData.Id ? res.data : t));
      } else {
        const res = await axios.post('/api/tasks', taskData);
        setTasks(prev => [res.data, ...prev]);
      }
      return true;
    } catch (err) {
      console.error('Failed to save task', err);
      return false;
    }
  }, []);

  const handleDeleteTask = useCallback(async (taskId) => {
    try {
      await axios.delete(`/api/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t.Id !== taskId));
      return true;
    } catch (err) {
      console.error('Failed to delete task', err);
      return false;
    }
  }, []);

  const handleSaveEvent = useCallback(async (eventData) => {
    try {
      if (eventData.Id) {
        const res = await axios.put(`/api/events/${eventData.Id}`, eventData);
        setEvents(prev => prev.map(e => e.Id === eventData.Id ? res.data : e));
      } else {
        const res = await axios.post('/api/events', eventData);
        setEvents(prev => [...prev, res.data]);
      }
      return true;
    } catch (err) {
      console.error('Failed to save event', err);
      return false;
    }
  }, []);

  const handleDeleteEvent = useCallback(async (eventId) => {
    try {
      await axios.delete(`/api/events/${eventId}`);
      setEvents(prev => prev.filter(e => e.Id !== eventId));
      return true;
    } catch (err) {
      console.error('Failed to delete event', err);
      return false;
    }
  }, []);

  // ══════════ Auth ══════════
  useEffect(() => {
    axios.get('api/auth.php?action=me')
      .then(res => {
        if (res.data && res.data.user) setCurrentUser(res.data.user);
      })
      .catch(err => console.error('Failed to fetch user:', err));
  }, []);

  const handleLogout = () => {
    axios.post('api/auth.php?action=logout').then(() => {
      window.location.href = '../../MES/MES/auth/login_form.php';
    }).catch(() => {
      window.location.href = '../../MES/MES/auth/login_form.php';
    });
  };

  // ══════════ Theme ══════════
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const switchTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      document.documentElement.style.backgroundColor = '#020617';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      document.documentElement.style.backgroundColor = '#f8fafc';
    }
  };

  const toggleTheme = () => {
    if (document.startViewTransition) {
      document.startViewTransition(switchTheme);
    } else {
      switchTheme();
    }
  };

  // ══════════ Render Content with Props ══════════
  const renderContent = () => {
    const sharedTaskProps = { tasks, onSaveTask: handleSaveTask, onDeleteTask: handleDeleteTask, loading: dataLoading };

    switch (activeTab) {
      case 'dashboard': 
        return <Dashboard tasks={tasks} events={events} activities={activities} loading={dataLoading} />;
      case 'calendar': 
        return <CalendarView tasks={tasks} events={events} onSaveTask={handleSaveTask} onDeleteTask={handleDeleteTask} onSaveEvent={handleSaveEvent} onDeleteEvent={handleDeleteEvent} loading={dataLoading} />;
      case 'tasks': 
        return <TaskBoard {...sharedTaskProps} />;
      case 'gantt': 
        return <GanttChart {...sharedTaskProps} />;
      case 'links': 
        return <LinkHub />;
      default: 
        return <Dashboard tasks={tasks} events={events} activities={activities} loading={dataLoading} />;
    }
  };

  const handleNav = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  // Profile avatar component
  const ProfileAvatar = ({ size = 'sm', onClick }) => {
    if (!currentUser) return null;
    const initial = (currentUser.fullname || currentUser.username || 'U').charAt(0).toUpperCase();
    const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm';
    return (
      <button onClick={onClick} className={`${sizeClass} rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0 hover:ring-2 hover:ring-indigo-500/50 transition-all active:scale-95`} title={currentUser.fullname || currentUser.username}>
        {initial}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans overflow-hidden">
      
      {/* ══════════ Desktop Sidebar (hidden on mobile) ══════════ */}
      <div className="hidden md:flex md:flex-row flex-1 overflow-hidden">
        <aside className="w-56 lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <div className="p-5 pb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">MES Planner</h2>
            <p className="text-xs text-slate-500 mt-0.5">Team Collaboration</p>
          </div>
          
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-3">
            {navItems.map(item => (
              <button 
                key={item.tab}
                onClick={() => handleNav(item.tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                  activeTab === item.tab 
                    ? 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20 dark:border-indigo-500/25' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <item.icon className="text-base shrink-0" />
                <span>{item.label}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto hidden lg:block">{item.sublabel}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0 flex flex-col gap-2">
            <button 
              onClick={toggleTheme} 
              className="w-full flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="Toggle Theme"
            >
              {isDarkMode ? <FiSun className="text-base" /> : <FiMoon className="text-base" />}
              <span className="text-xs">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <button 
              onClick={() => handleNav('dashboard')} 
              className="w-full flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="Activity & Notifications"
            >
              <FiBell className="text-base" />
              <span className="text-xs">Notifications</span>
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            </button>
            
            {currentUser && (
              <div className="mt-2 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                  {(currentUser.fullname || currentUser.username || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{currentUser.fullname || currentUser.username}</p>
                  <p className="text-[10px] text-slate-500 truncate capitalize">{currentUser.role || 'Member'}</p>
                </div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors" title="Logout">
                  <FiLogOut className="text-base" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Desktop Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
          {/* Desktop Top Bar with Profile Icon */}
          <div className="flex items-center justify-end px-5 lg:px-6 py-2 shrink-0 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <button onClick={toggleTheme} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" title="Toggle Theme">
                {isDarkMode ? <FiSun className="text-sm" /> : <FiMoon className="text-sm" />}
              </button>
              {/* Profile Icon — Top Right */}
              <div className="relative">
                <ProfileAvatar onClick={() => setShowProfileMenu(!showProfileMenu)} />
                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-slide-up">
                      {currentUser && (
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{currentUser.fullname || currentUser.username}</p>
                          <p className="text-xs text-slate-500 capitalize">{currentUser.role || 'Member'}</p>
                        </div>
                      )}
                      <div className="p-2">
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                          <FiLogOut className="text-base" />
                          ออกจากระบบ
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 p-5 lg:p-6 overflow-y-auto custom-scrollbar">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* ══════════ Mobile Layout ══════════ */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        
        {/* Mobile Top Bar */}
        <header className="flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90">
              <FiMenu className="text-xl" />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {navItems.find(n => n.tab === activeTab)?.label || 'MES Planner'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white relative p-1.5" onClick={toggleTheme} title="Toggle Theme">
              {isDarkMode ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
            </button>
            <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white relative p-1.5" onClick={() => handleNav('dashboard')} title="Notifications">
              <FiBell className="text-lg" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            </button>
            {/* Mobile Profile Icon */}
            <ProfileAvatar size="sm" onClick={() => setShowProfileMenu(!showProfileMenu)} />
          </div>
        </header>

        {/* Mobile Profile Dropdown (shared) */}
        {showProfileMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
            <div className="fixed right-4 top-14 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-slide-up">
              {currentUser && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{currentUser.fullname || currentUser.username}</p>
                  <p className="text-xs text-slate-500 capitalize">{currentUser.role || 'Member'}</p>
                </div>
              )}
              <div className="p-2">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                  <FiLogOut className="text-base" />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </>
        )}

        {/* Mobile Content */}
        <main className="flex-1 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
          {renderContent()}
        </main>

        {/* Mobile Bottom Tab Bar — All 5 tabs */}
        <nav className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 safe-area-bottom">
          <div className="flex items-stretch">
            {navItems.map(item => (
              <button
                key={item.tab}
                onClick={() => handleNav(item.tab)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all active:scale-90 ${
                  activeTab === item.tab 
                    ? 'text-indigo-600 dark:text-indigo-400' 
                    : 'text-slate-500 dark:text-slate-500'
                }`}
              >
                <item.icon className={`text-lg ${activeTab === item.tab ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                <span className="text-[10px] font-medium">{item.sublabel}</span>
                {activeTab === item.tab && (
                  <div className="w-1 h-1 bg-indigo-500 dark:bg-indigo-400 rounded-full mt-0.5"></div>
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* ══════════ Mobile Slide-out Drawer ══════════ */}
      {isSidebarOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col md:hidden shadow-2xl animate-slide-right">
            <div className="p-5 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">MES Planner</h2>
                <p className="text-xs text-slate-500 mt-0.5">Team Collaboration</p>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90">
                <FiX className="text-xl" />
              </button>
            </div>
            
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
              {navItems.map(item => (
                <button 
                  key={item.tab}
                  onClick={() => { handleNav(item.tab); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                    activeTab === item.tab 
                      ? 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20 dark:border-indigo-500/25' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon className="text-lg shrink-0" />
                  <span>{item.label}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">{item.sublabel}</span>
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
              {currentUser && (
                <div className="mb-4 flex items-center gap-3 px-1">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                    {(currentUser.fullname || currentUser.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{currentUser.fullname || currentUser.username}</p>
                    <p className="text-xs text-slate-500 truncate capitalize">{currentUser.role || 'Member'}</p>
                  </div>
                  <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors">
                    <FiLogOut className="text-lg" />
                  </button>
                </div>
              )}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-[11px] text-slate-500 text-center border border-slate-200 dark:border-slate-700/50">
                MES Toolbox Planner v2.0
              </div>
            </div>
          </div>
        </>
      )}

      {/* Global Notifications */}
      <NotificationManager />
    </div>
  );
}

export default App;
