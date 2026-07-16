import React, { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiCheckSquare, FiLink, FiPieChart, FiBarChart2, FiBell, FiMenu, FiX, FiSun, FiMoon, FiLogOut, FiUser, FiBriefcase, FiSearch, FiHome, FiUsers, FiPlus } from 'react-icons/fi';
import axios from 'axios';
import CalendarView from './components/CalendarView';
import TaskBoard from './components/TaskBoard';
import Dashboard from './components/Dashboard';
import GanttChart from './components/GanttChart';
import LinkHub from './components/LinkHub';
import ProjectsTab from './components/ProjectsTab';
import NotificationManager from './components/NotificationManager';
import NotificationWidget from './components/NotificationWidget';
import SearchModal from './components/SearchModal';
import NotificationModal from './components/NotificationModal';
import MyTasks from './components/MyTasks';
import Resources from './components/Resources';
import SpaceView from './components/SpaceView';

const mainNav = [
  { tab: 'dashboard', icon: FiPieChart, label: 'Dashboard' },
  { tab: 'my-tasks', icon: FiUser, label: 'Assigned to me' },
  { tab: 'tasks', icon: FiCheckSquare, label: 'Task' },
  { tab: 'projects', icon: FiBriefcase, label: 'Projects' },
  { tab: 'calendar', icon: FiCalendar, label: 'Schedule' },
  { tab: 'gantt', icon: FiBarChart2, label: 'Timeline' },
  { tab: 'links', icon: FiLink, label: 'Resources' },
];

const spacesNav = [
  { tab: 'space-home', icon: FiHome, label: 'Home', color: 'text-emerald-500 bg-emerald-500/10' },
  { tab: 'team-engineers', icon: FiUsers, label: 'Engineers', subItem: true },
  { tab: 'team-design', icon: FiUsers, label: 'Design Team', subItem: true },
  { tab: 'team-dev', icon: FiUsers, label: 'Developer Team', subItem: true },
];

const navItems = [...mainNav, ...spacesNav];

function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ══════════ Centralized State (Single Source of Truth) ══════════
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch all data once
  const refreshData = useCallback(async (silent = false) => {
    if (!silent) setDataLoading(true);
    try {
      const [resTasks, resEvents, resAct, resProj] = await Promise.all([
        axios.get('/api/tasks'),
        axios.get('/api/events'),
        axios.get('/api/activities'),
        axios.get('/api/projects')
      ]);
      setTasks(resTasks.data);
      setEvents(resEvents.data);
      setActivities(resAct.data);
      setProjects(resProj.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      if (!silent) setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData(false);
    
    // Background polling every 15 seconds
    const interval = setInterval(() => {
      refreshData(true);
    }, 15000);
    
    return () => clearInterval(interval);
  }, [refreshData]);

  // ══════════ Shared Handlers ══════════
  const handleSaveTask = useCallback(async (taskData) => {
    if (Array.isArray(taskData)) {
      try {
        const results = await Promise.all(taskData.map(t => axios.post('/api/tasks', t)));
        setTasks(prev => [...results.map(r => r.data), ...prev]);
        return true;
      } catch (err) {
        console.error('Failed to bulk save tasks', err);
        refreshData();
        return false;
      }
    }

    // Optimistic UI Update for immediate feedback (crucial for drag & drop)
    if (taskData.Id) {
      setTasks(prev => prev.map(t => {
        if (String(t.Id) === String(taskData.Id)) {
          const updated = { ...t, ...taskData };
          // Ensure casing matches backend for TaskBoard filtering
          if (taskData.status) updated.Status = taskData.status;
          return updated;
        }
        return t;
      }));
    }

    try {
      if (taskData.Id) {
        const res = await axios.put(`/api/tasks/${taskData.Id}`, taskData);
        // Only update from response if it's an actual task object
        if (res.data && res.data.Id) {
          setTasks(prev => prev.map(t => String(t.Id) === String(taskData.Id) ? { ...t, ...res.data } : t));
        }
      } else {
        const res = await axios.post('/api/tasks', taskData);
        setTasks(prev => [res.data, ...prev]);
      }
      return true;
    } catch (err) {
      console.error('Failed to save task', err);
      // Revert optimistic update on error by refetching
      refreshData();
      return false;
    }
  }, [refreshData]);

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
    const sharedTaskProps = { currentUser, tasks, setTasks, onSaveTask: handleSaveTask, onDeleteTask: handleDeleteTask, loading: dataLoading };

    switch (activeTab) {
      case 'dashboard': 
        return <Dashboard tasks={tasks} events={events} activities={activities} loading={dataLoading} onNav={handleNav} />;
      case 'calendar': 
        return <CalendarView tasks={tasks} events={events} onSaveTask={handleSaveTask} onDeleteTask={handleDeleteTask} onSaveEvent={handleSaveEvent} onDeleteEvent={handleDeleteEvent} loading={dataLoading} />;
      case 'tasks': 
        return <TaskBoard {...sharedTaskProps} />;
      case 'gantt': 
        return <GanttChart {...sharedTaskProps} />;
      case 'projects':
        return <ProjectsTab tasks={tasks} refreshData={refreshData} />;
      case 'links': 
        return <LinkHub />;
      case 'my-tasks':
        return <MyTasks tasks={tasks} currentUser={currentUser} refreshData={refreshData} />;
      case 'timeline':
        return <GanttChart {...sharedTaskProps} />;
      case 'resources':
        return <Resources />;
      default: 
        // Fallback for Spaces and mock tabs
        if (activeTab.startsWith('space-') || activeTab.startsWith('team-')) {
          return <SpaceView activeTab={activeTab} tasks={tasks} projects={projects} currentUser={currentUser} refreshData={refreshData} />;
        }
        return <Dashboard tasks={tasks} events={events} activities={activities} loading={dataLoading} onNav={handleNav} />;
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

  const RealTimeClock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
      const timer = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);
    return (
      <div className="hidden lg:flex items-center justify-center">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {time.toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit' })} น. • {time.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#f4f9f8] dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans overflow-hidden">
      
      {/* ══════════ Desktop Top Header ══════════ */}
      <header className="hidden md:flex h-16 bg-white dark:bg-slate-900 border-b border-transparent dark:border-slate-800 shrink-0 px-5 items-center justify-between shadow-soft z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FiCalendar className="text-xl" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">MES Planner</h1>
            <p className="text-[11px] text-slate-500">Team Collaboration</p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          <RealTimeClock />
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden lg:block"></div>
          
          <div className="relative">
            <div className="flex items-center gap-3 cursor-pointer p-1 pl-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              {currentUser && (
                <div className="hidden lg:flex items-center text-right">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{currentUser.fullname || currentUser.username}</span>
                </div>
              )}
              <ProfileAvatar size="md" />
            </div>
            
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-slide-up">
                  {currentUser && (
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{currentUser.fullname || currentUser.username}</p>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">{currentUser.role || 'Admin'}</p>
                    </div>
                  )}
                  <div className="p-2">
                    <button onClick={toggleTheme} className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors mb-1">
                      <div className="flex items-center gap-3">
                        {isDarkMode ? <FiSun className="text-[1.1rem]" /> : <FiMoon className="text-[1.1rem]" />} 
                        <span>{isDarkMode ? 'โหมดสว่าง' : 'โหมดมืด'}</span>
                      </div>
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                      <FiLogOut className="text-[1.1rem]" /> ออกจากระบบ
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="hidden md:flex md:flex-row flex-1 overflow-hidden relative">
        <aside className="w-56 lg:w-[260px] bg-[#f4f9f8] dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-10">
          <div className="px-4 py-4 pt-5 shrink-0">
            <button 
              onClick={() => setShowSearchModal(true)} 
              className="w-full flex items-center justify-between px-4 py-2 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-300/70 dark:hover:bg-slate-700 transition-colors text-sm font-medium border border-transparent dark:border-slate-700"
            >
              <span>Search...</span>
              <kbd className="hidden lg:inline-block text-[10px] bg-slate-300/50 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-mono">⌘K</kbd>
            </button>
          </div>

          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-4 custom-scrollbar">
            {/* Notification */}
            <div className="px-2 mb-3">
              <button 
                onClick={() => setShowNotificationModal(true)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-black/5 dark:hover:bg-white/5 group"
              >
                <div className="flex items-center gap-3">
                  <FiBell className="text-[1.1rem] shrink-0 group-hover:text-rose-500 transition-colors" />
                  <span className="text-sm font-medium">Notifications</span>
                </div>
                <div className="flex items-center justify-center w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full shadow-sm">
                  3
                </div>
              </button>
            </div>

            <div className="space-y-0.5 mt-2">
              {mainNav.map(item => (
                <button 
                  key={item.tab}
                  onClick={() => handleNav(item.tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-sm font-medium ${
                    activeTab === item.tab 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                      : 'text-slate-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon className={`text-[1.1rem] shrink-0 ${activeTab === item.tab ? 'text-indigo-600' : ''}`} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 px-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                <span>Spaces</span>
                <div className="flex gap-2">
                  <FiSearch className="cursor-pointer hover:text-slate-600" />
                  <FiPlus className="cursor-pointer hover:text-slate-600" />
                </div>
              </div>
              <div className="space-y-0.5">
                {spacesNav.map(item => (
                  <button 
                    key={item.tab}
                    onClick={() => handleNav(item.tab)}
                    className={`w-full flex items-center gap-3 py-1.5 rounded-xl transition-all text-sm font-medium ${item.subItem ? 'pl-8 pr-3 text-slate-500 text-[13px]' : 'px-3'} ${
                      activeTab === item.tab 
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' 
                        : 'hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200 text-slate-600'
                    }`}
                  >
                    {!item.subItem && (
                      <div className={`p-1 rounded flex items-center justify-center ${item.color || 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                        <item.icon className="text-[14px]" />
                      </div>
                    )}
                    {item.subItem && <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </nav>
        </aside>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-transparent">
          <div className="flex-1 p-5 lg:p-6 overflow-y-auto custom-scrollbar">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* ══════════ Mobile Layout ══════════ */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        
        {/* Mobile Top Bar */}
        <header className="flex items-center justify-between bg-white dark:bg-slate-900 border-b border-transparent dark:border-slate-800 px-4 py-3 shrink-0 z-30 shadow-soft">
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
        <main className="flex-1 overflow-y-auto p-3 bg-transparent custom-scrollbar">
          {renderContent()}
        </main>

        {/* Mobile Bottom Tab Bar — All 5 tabs */}
        <nav className="bg-white dark:bg-slate-900 border-t border-transparent dark:border-slate-800 shrink-0 safe-area-bottom shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
          <div className="flex items-stretch">
            {mainNav.slice(0, 5).map(item => (
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
                <span className="text-[10px] font-medium">{item.label}</span>
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
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-[#f4f9f8] dark:bg-slate-900 border-r border-transparent dark:border-slate-800 flex flex-col md:hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)] animate-slide-right">
            <div className="p-5 flex justify-between items-center bg-white dark:bg-slate-900 shadow-soft z-10 rounded-b-3xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">MES Planner</h2>
                <p className="text-xs text-slate-500 mt-0.5">Team Collaboration</p>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90">
                <FiX className="text-xl" />
              </button>
            </div>
            
            <nav className="flex-1 px-3 space-y-2 overflow-y-auto pt-4">
              {navItems.map(item => (
                <button 
                  key={item.tab}
                  onClick={() => { handleNav(item.tab); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-sm ${
                    activeTab === item.tab 
                      ? 'bg-white dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-soft' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <item.icon className="text-lg shrink-0" />
                  <span>{item.label}</span>
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

      {/* ══════════ Modals ══════════ */}
      {showSearchModal && <SearchModal onClose={() => setShowSearchModal(false)} tasks={tasks} projects={projects} onNav={handleNav} />}
      {showNotificationModal && <NotificationModal onClose={() => setShowNotificationModal(false)} activities={activities} />}

      {/* Global Notifications */}
      <NotificationManager />
      
      {/* Chat Notification Widget */}
      <NotificationWidget 
        currentUser={currentUser}
        tasks={tasks}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
}

export default App;
