import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { FiCalendar, FiCheckSquare, FiLink, FiPieChart, FiBarChart2, FiBell, FiMenu, FiX, FiSun, FiMoon, FiLogOut, FiUser, FiBriefcase, FiSearch, FiHome, FiUsers, FiPlus } from 'react-icons/fi';
import axios from 'axios';

// ── Lazy-loaded page components (split into separate chunks) ──
const CalendarView   = lazy(() => import('./components/CalendarView'));
const TaskBoard      = lazy(() => import('./components/TaskBoard'));
const Dashboard      = lazy(() => import('./components/Dashboard'));
const GanttChart     = lazy(() => import('./components/GanttChart'));
const LinkHub        = lazy(() => import('./components/LinkHub'));
const ProjectsTab    = lazy(() => import('./components/ProjectsTab'));
const MyTasks        = lazy(() => import('./components/MyTasks'));
const Resources      = lazy(() => import('./components/Resources'));
const SpaceView      = lazy(() => import('./components/SpaceView'));

// ── Static imports: modals & always-visible components ──
import NotificationManager from './components/NotificationManager';
import ChatWidget from './components/ChatWidget';
import SearchModal from './components/SearchModal';
import NotificationModal from './components/NotificationModal';
import AddTaskModal from './components/AddTaskModal';
import AddProjectModal from './components/AddProjectModal';
import AddSpaceModal from './components/AddSpaceModal';
import InviteTeamModal from './components/InviteTeamModal';
import ProfileSettingsModal from './components/ProfileSettingsModal';
import { canManageSpace } from './utils/permissions';

// BUG-018: Top-level components — must NOT be defined inside App() to prevent
// unmount/remount on every parent render, which resets internal state (e.g. imgError).
const ProfileAvatar = ({ currentUser, size = 'sm', onClick }) => {
  const [imgError, setImgError] = useState(false);
  const avatarTimestamp = localStorage.getItem('avatar_ts') || '';
  if (!currentUser) return null;
  const initial = (currentUser.fullname || currentUser.username || 'U').charAt(0).toUpperCase();
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-sm';
  return (
    <button onClick={onClick} className={`${sizeClass} rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0 hover:ring-2 hover:ring-indigo-500/50 transition-all active:scale-95 overflow-hidden`} title={currentUser.fullname || currentUser.username}>
      {!imgError ? (
        <img src={`api/uploads/avatars/${encodeURIComponent(currentUser.username)}.jpg?t=${avatarTimestamp}`} onError={() => setImgError(true)} className="w-full h-full object-cover" alt={initial} />
      ) : (
        initial
      )}
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

const mainNav = [
  { tab: 'dashboard', icon: FiPieChart, label: 'Dashboard' },
  { tab: 'my-tasks', icon: FiUser, label: 'Assigned to me' },
  { tab: 'tasks', icon: FiCheckSquare, label: 'Task' },
  { tab: 'projects', icon: FiBriefcase, label: 'Projects' },
  { tab: 'calendar', icon: FiCalendar, label: 'Schedule' },
  { tab: 'gantt', icon: FiBarChart2, label: 'Timeline' },
  { tab: 'resources', icon: FiFolder, label: 'Files' },
  { tab: 'links', icon: FiLink, label: 'Links' },
];

function App() {
  const [activeTab, setActiveTab] = useState('gantt');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isGlobalTaskModalOpen, setIsGlobalTaskModalOpen] = useState(false);
  const [globalEditingTask, setGlobalEditingTask] = useState(null);
  const [isGlobalProjectModalOpen, setIsGlobalProjectModalOpen] = useState(false);
  const [globalEditingProject, setGlobalEditingProject] = useState(null);
  const [isAddSpaceModalOpen, setIsAddSpaceModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteModalSpaceId, setInviteModalSpaceId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);

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
  const [spaces, setSpaces] = useState([]);
  const [users, setUsers] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch all data once
  const refreshData = useCallback(async (silent = false) => {
    if (!silent) setDataLoading(true);
    try {
      // BUG-007: Normalize AKA to comma-separated string regardless of localStorage format
      let storedAkas = '';
      try {
        const profileRes = await axios.get('/api/profile.php');
        if (profileRes.data && profileRes.data.aka !== undefined) {
          storedAkas = profileRes.data.aka; // server always returns comma-separated string
          localStorage.setItem('user_akas', storedAkas);
        } else {
          // Read from localStorage — handle both old JSON array and new string formats
          const raw = localStorage.getItem('user_akas') || '';
          try {
            const parsed = JSON.parse(raw);
            storedAkas = Array.isArray(parsed) ? parsed.join(',') : raw;
          } catch {
            storedAkas = raw;
          }
        }
      } catch (e) {
        // Ignore auth error on profile fetch if not ready
        const raw = localStorage.getItem('user_akas') || '';
        try {
          const parsed = JSON.parse(raw);
          storedAkas = Array.isArray(parsed) ? parsed.join(',') : raw;
        } catch {
          storedAkas = raw;
        }
      }

      let tasksUrl = '/api/tasks.php';
      if (storedAkas) {
        tasksUrl += `?akas=${encodeURIComponent(storedAkas)}`;
      }

      const timestamp = Date.now();
      const [resTasks, resEvents, resAct, resProj, resSpaces, resUsers] = await Promise.all([
        axios.get(`${tasksUrl}${tasksUrl.includes('?') ? '&' : '?'}_t=${timestamp}`),
        axios.get('/api/events.php'),
        axios.get('/api/activities.php'),
        axios.get(`/api/projects.php?_t=${timestamp}`),
        axios.get(`/api/spaces.php?_t=${timestamp}`),
        axios.get('/api/users.php').catch(() => ({ data: [] }))
      ]);
        setTasks(Array.isArray(resTasks.data) ? resTasks.data : []);
        setEvents(Array.isArray(resEvents.data) ? resEvents.data : []);
        setActivities(Array.isArray(resAct.data) ? resAct.data : []);
        setProjects(Array.isArray(resProj.data) ? resProj.data : []);
        setSpaces(Array.isArray(resSpaces.data) ? resSpaces.data : []);
        setUsers(Array.isArray(resUsers.data) ? resUsers.data : []);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      if (!silent) setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData(false);
    
    // Background polling every 30 seconds (reduced from 15s to cut server load 50%)
    const interval = setInterval(() => {
      refreshData(true);
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refreshData]);

  // ══════════ Shared Handlers ══════════
  const handleSaveTask = useCallback(async (taskData) => {
    if (Array.isArray(taskData)) {
      try {
        await Promise.all(taskData.map(t => axios.post('/api/tasks.php', t)));
        refreshData();
        return true;
      } catch (err) {
        console.error('Failed to bulk save tasks', err);
        refreshData();
        return false;
      }
    }

    // Optimistic UI Update (only for single tasks)
    if (taskData.Id && !taskData.updateSeries) {
      setTasks(prev => prev.map(t => {
        if (String(t.Id) === String(taskData.Id)) {
          const updated = { ...t, ...taskData };
          if (taskData.status) updated.Status = taskData.status;
          return updated;
        }
        return t;
      }));
    }

    try {
      if (taskData.Id) {
        const res = await axios.put(`/api/tasks.php?id=${taskData.Id}`, taskData);
        if (Array.isArray(res.data) || taskData.updateSeries) {
          refreshData(); // bulk update or series update
        } else if (res.data && res.data.Id) {
          setTasks(prev => prev.map(t => String(t.Id) === String(taskData.Id) ? { ...t, ...res.data } : t));
        }
      } else {
        const res = await axios.post('/api/tasks.php', taskData);
        if (Array.isArray(res.data) && res.data.length > 1) {
          refreshData(); // Multiple tasks created (recurrence)
        } else if (Array.isArray(res.data) && res.data.length === 1) {
          setTasks(prev => [res.data[0], ...prev]);
        } else if (res.data && res.data.Id) {
          setTasks(prev => [res.data, ...prev]);
        } else {
          refreshData();
        }
      }
      return true;
    } catch (err) {
      console.error('Failed to save task', err);
      // Revert optimistic update on error by refetching
      refreshData();
      return false;
    }
  }, [refreshData]);

  const handleDeleteTask = useCallback(async (taskId, deleteSeries = false) => {
    try {
      await axios.delete(`/api/tasks.php?id=${taskId}${deleteSeries ? '&deleteSeries=true' : ''}`);
      if (deleteSeries) {
        refreshData();
      } else {
        // BUG-005: Use String comparison to avoid number vs string type mismatch
        setTasks(prev => prev.filter(t => String(t.Id) !== String(taskId)));
      }
      return true;
    } catch (err) {
      console.error('Failed to delete task', err);
      return false;
    }
  }, [refreshData]);

  const handleSaveProject = useCallback(async (projectData) => {
    try {
      const payload = {
        ...projectData,
        checklist: JSON.stringify(projectData.checklist)
      };
      if (projectData.Id) {
        await axios.put(`/api/projects.php?id=${projectData.Id}`, payload);
      } else {
        await axios.post('/api/projects.php', payload);
      }
      setIsGlobalProjectModalOpen(false);
      setGlobalEditingProject(null);
      refreshData();
      return true;
    } catch (err) {
      console.error('Failed to save project', err);
      return false;
    }
  }, [refreshData]);

  const handleSaveSpace = async (data) => {
    try {
      if (data.id) {
        await axios.put(`/api/spaces.php?id=${data.id}`, data);
      } else {
        await axios.post('/api/spaces.php', data);
      }
      await refreshData();
      return true;
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to save space');
      return false;
    }
  };

  const handleSaveInvite = async (data) => {
    try {
      await axios.post('/api/space_members.php', data);
      alert('เชิญสมาชิกสำเร็จ (Invitation sent)');
      return true;
    } catch (err) {
      console.error(err);
      return err.response?.data?.error || 'Failed to send invite';
    }
  };

  const handleSaveEvent = useCallback(async (eventData) => {
    try {
      if (eventData.Id) {
        const res = await axios.put(`/api/events.php?id=${eventData.Id}`, eventData);
        setEvents(prev => prev.map(e => e.Id === eventData.Id ? res.data : e));
      } else {
        const res = await axios.post('/api/events.php', eventData);
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
      await axios.delete(`/api/events.php?id=${eventId}`);
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

  // ══════════ Computed Nav ══════════
  const dynamicSpacesNav = [
    { tab: 'space-home', icon: FiHome, label: 'Home', color: 'text-emerald-500 bg-emerald-500/10' },
    ...spaces.map(s => ({ tab: `space-${s.Id}`, icon: FiUsers, label: s.Name, subItem: true }))
  ];
  const dynamicNavItems = [...mainNav, ...dynamicSpacesNav];

  // ══════════ Theme ══════════
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // BUG-001: Single source of truth for theme — useEffect is the ONLY place that writes DOM/localStorage.
  // Removed switchTheme() which duplicated these writes causing triple-write race conditions.
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#020617';
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#f8fafc';
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // BUG-001: Only flip state — let useEffect handle all DOM side-effects
  const toggleTheme = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    document.documentElement.classList.add('theme-transitioning');
    setIsDarkMode(prev => !prev);
    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 400);
  };

  // ══════════ Render Content with Props ══════════
  const handleCreateTask = (initialData = null) => {
    setGlobalEditingTask(initialData);
    setIsGlobalTaskModalOpen(true);
  };

  const handleCreateProject = (initialData = null) => {
    setGlobalEditingProject(initialData);
    setIsGlobalProjectModalOpen(true);
  };

  const handleProjectClick = (project) => {
    setGlobalEditingProject(project);
    setIsGlobalProjectModalOpen(true);
  };

  const renderContent = () => {
    const sharedTaskProps = { currentUser, tasks, setTasks, onSaveTask: handleSaveTask, onDeleteTask: handleDeleteTask, loading: dataLoading, users };

    switch (activeTab) {
      case 'dashboard': 
        return <Dashboard 
          tasks={tasks} 
          events={events} 
          activities={activities} 
          loading={dataLoading} 
          users={users}
          currentUser={currentUser}
          onNav={handleNav} 
          openTaskModal={() => { setGlobalEditingTask(null); setIsGlobalTaskModalOpen(true); }}
          openProjectModal={() => { setGlobalEditingProject(null); setIsGlobalProjectModalOpen(true); }}
          openSpaceModal={canManageSpace(currentUser) ? () => { setEditingSpace(null); setIsAddSpaceModalOpen(true); } : undefined}
          openInviteModal={() => { setInviteModalSpaceId(null); setIsInviteModalOpen(true); }}
          onTaskClick={(task) => { setGlobalEditingTask(task); setIsGlobalTaskModalOpen(true); }}
          onProjectClick={(proj) => { setGlobalEditingProject(proj); setIsGlobalProjectModalOpen(true); }}
        />;
      case 'calendar': 
        return <CalendarView tasks={tasks} events={events} onSaveTask={handleSaveTask} onDeleteTask={handleDeleteTask} onSaveEvent={handleSaveEvent} onDeleteEvent={handleDeleteEvent} loading={dataLoading} users={users} />;
      case 'tasks': 
        return <TaskBoard {...sharedTaskProps} />;
      case 'gantt': 
        return <GanttChart {...sharedTaskProps} />;
      case 'projects':
        return <ProjectsTab currentUser={currentUser} tasks={tasks} refreshData={refreshData} />;
      case 'links': 
        return <LinkHub />;
      case 'my-tasks':
        return <MyTasks 
          tasks={tasks} 
          currentUser={currentUser} 
          refreshData={refreshData} 
          onSaveTask={handleSaveTask}
          onTaskClick={(task) => { setGlobalEditingTask(task); setIsGlobalTaskModalOpen(true); }}
          onCreateTask={handleCreateTask}
        />;
      case 'timeline':
        return <GanttChart {...sharedTaskProps} />;
      case 'resources':
        return <Resources currentUser={currentUser} />;
      default: 
        // Fallback for Spaces and mock tabs
        if (activeTab.startsWith('space-') || activeTab.startsWith('team-')) {
          return <SpaceView 
            activeTab={activeTab} 
            spaces={spaces} 
            tasks={tasks} 
            projects={projects} 
            currentUser={currentUser} 
            refreshData={refreshData} 
            users={users} 
            onEditSpace={(s) => { setEditingSpace(s); setIsAddSpaceModalOpen(true); }} 
            onDeleteSpace={async (id) => { if(confirm('ต้องการลบทีมนี้ใช่หรือไม่?')) { await axios.delete(`/api/spaces.php?id=${id}`); refreshData(); setActiveTab('space-home'); } }} 
            openInviteModal={(sId) => { setInviteModalSpaceId(sId); setIsInviteModalOpen(true); }}
            onTaskClick={(task) => { setGlobalEditingTask(task); setIsGlobalTaskModalOpen(true); }}
            onCreateTask={handleCreateTask}
            onCreateProject={handleCreateProject}
            onProjectClick={handleProjectClick}
            onSaveTask={handleSaveTask}
          />;
        }
        return <Dashboard 
          tasks={tasks} 
          events={events} 
          activities={activities} 
          loading={dataLoading} 
          users={users}
          onNav={handleNav} 
          openTaskModal={() => { setGlobalEditingTask(null); setIsGlobalTaskModalOpen(true); }}
          openProjectModal={() => { setGlobalEditingProject(null); setIsGlobalProjectModalOpen(true); }}
          openSpaceModal={canManageSpace(currentUser) ? () => { setEditingSpace(null); setIsAddSpaceModalOpen(true); } : undefined}
          openInviteModal={() => { setInviteModalSpaceId(null); setIsInviteModalOpen(true); }}
          onTaskClick={(task) => { setGlobalEditingTask(task); setIsGlobalTaskModalOpen(true); }}
          onProjectClick={(proj) => { setGlobalEditingProject(proj); setIsGlobalProjectModalOpen(true); }}
        />;
    }
  };

  const handleNav = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  // BUG-018: ProfileAvatar and RealTimeClock moved to top-level (above App function)
  // to prevent re-mount on every App render which was resetting imgError state.

  return (
    <div className="flex flex-col h-screen bg-[#f4f9f8] dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans overflow-hidden">
      
      {/* ══════════ Desktop Top Header ══════════ */}
      <header className="hidden md:flex h-16 bg-white dark:bg-slate-900 border-b border-transparent dark:border-slate-800 shrink-0 px-5 items-center justify-between shadow-soft z-50">
        <a href="/iot-toolbox/sandbox-b9/Toolbox2/#/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <FiCalendar className="text-xl" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">MES Planner</h1>
            <p className="text-[11px] text-slate-500">Team Collaboration</p>
          </div>
        </a>

        <div className="flex items-center gap-3 md:gap-4">
          <RealTimeClock />
          
          <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden lg:block"></div>
          
          <button className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all" onClick={() => setShowNotificationModal(true)} title="Notifications">
            <FiBell className="text-[1.1rem]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse border-2 border-white dark:border-slate-900"></span>
          </button>
          
          <div className="relative">
            <div className="flex items-center gap-3 cursor-pointer p-1 pl-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700" onClick={() => setShowProfileMenu(!showProfileMenu)}>
              <ProfileAvatar currentUser={currentUser} size="md" />
            </div>
            
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[200] overflow-hidden animate-slide-up">
                  {currentUser && (
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{currentUser.fullname || currentUser.username}</p>
                      <p className="text-xs text-slate-500 capitalize mt-0.5">{currentUser.role || 'Admin'}</p>
                    </div>
                  )}
                  <div className="p-2">
                    <button onClick={() => { setIsProfileModalOpen(true); setShowProfileMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors mb-1">
                      <FiUser className="text-[1.1rem]" /> ตั้งค่าโปรไฟล์
                    </button>
                    <a href="/iot-toolbox/sandbox-b9/Toolbox2/#/" className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors mb-1">
                      <FiHome className="text-[1.1rem]" /> Home (ระบบใหม่)
                    </a>
                    <a href="/iot-toolbox/sandbox-b9/MES/MES/page/dailyLog/dailyLogUI.php" className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors mb-1">
                      <FiHome className="text-[1.1rem]" /> Home (ระบบเก่า)
                    </a>
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
                  <FiSearch className="cursor-pointer hover:text-slate-600" onClick={() => setShowSearchModal(true)} title="Search Teams" />
                  {canManageSpace(currentUser) && <FiPlus className="cursor-pointer hover:text-slate-600" onClick={() => { setEditingSpace(null); setIsAddSpaceModalOpen(true); }} title="Create Team Space" />}
                </div>
              </div>
              <div className="space-y-0.5">
                  {dynamicSpacesNav.map(item => (
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
          <div className="flex-1 flex flex-col p-5 lg:p-6 overflow-y-auto custom-scrollbar">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-400"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
              {renderContent()}
            </Suspense>
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
            <a href="/iot-toolbox/sandbox-b9/Toolbox2/#/" className="text-base font-bold text-slate-900 dark:text-white hover:opacity-80 transition-opacity">
              {dynamicNavItems.find(n => n.tab === activeTab)?.label || 'MES Planner'}
            </a>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white relative p-1.5" onClick={toggleTheme} title="Toggle Theme">
              {isDarkMode ? <FiSun className="text-lg" /> : <FiMoon className="text-lg" />}
            </button>
            <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white relative p-1.5" onClick={() => setShowNotificationModal(true)} title="Notifications">
              <FiBell className="text-lg" />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            </button>
            {/* Mobile Profile Icon */}
            <ProfileAvatar currentUser={currentUser} size="sm" onClick={() => setShowProfileMenu(!showProfileMenu)} />
          </div>
        </header>

        {/* Mobile Profile Dropdown (shared) */}
        {showProfileMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)}></div>
            <div className="fixed right-4 top-14 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[200] overflow-hidden animate-slide-up">
              {currentUser && (
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{currentUser.fullname || currentUser.username}</p>
                  <p className="text-xs text-slate-500 capitalize">{currentUser.role || 'Member'}</p>
                </div>
              )}
              <div className="p-2">
                <a href="/iot-toolbox/sandbox-b9/Toolbox2/#/" className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors mb-1">
                  <FiHome className="text-base" /> Home (ระบบใหม่)
                </a>
                <a href="/iot-toolbox/sandbox-b9/MES/MES/page/dailyLog/dailyLogUI.php" className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors mb-1">
                  <FiHome className="text-base" /> Home (ระบบเก่า)
                </a>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors">
                  <FiLogOut className="text-base" />
                  ออกจากระบบ
                </button>
              </div>
            </div>
          </>
        )}

        {/* Mobile Content */}
        <main className="flex-1 flex flex-col overflow-y-auto p-3 bg-transparent custom-scrollbar">
          <Suspense fallback={<div className="flex-1 flex items-center justify-center text-slate-400"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
            {renderContent()}
          </Suspense>
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
              <a href="/iot-toolbox/sandbox-b9/Toolbox2/#/" className="block hover:opacity-80 transition-opacity">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">MES Planner</h2>
                <p className="text-xs text-slate-500 mt-0.5">Team Collaboration</p>
              </a>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90">
                <FiX className="text-xl" />
              </button>
            </div>
            
            <nav className="flex-1 px-3 space-y-2 overflow-y-auto pt-4">
              {dynamicNavItems.map(item => (
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
      <NotificationManager tasks={tasks} />
      
      {/* Global Modals */}
      <AddTaskModal
        isOpen={isGlobalTaskModalOpen}
        onClose={() => { setIsGlobalTaskModalOpen(false); setGlobalEditingTask(null); }}
        onSave={async (data) => {
          // BUG-002: await save before closing — prevents modal closing on failure
          const ok = await handleSaveTask(data);
          if (ok) { setIsGlobalTaskModalOpen(false); setGlobalEditingTask(null); }
        }}
        currentUser={currentUser}
        tasks={tasks}
        users={users}
        initialData={globalEditingTask}
      />
      <AddProjectModal 
        isOpen={isGlobalProjectModalOpen} 
        onClose={() => { setIsGlobalProjectModalOpen(false); setGlobalEditingProject(null); }} 
        onSave={async (data) => {
          const ok = await handleSaveProject(data);
          if (ok) {
            setIsGlobalProjectModalOpen(false);
            setGlobalEditingProject(null);
          }
        }}
        initialData={globalEditingProject}
        spaces={spaces}
      />
      <AddSpaceModal
        isOpen={isAddSpaceModalOpen}
        onClose={() => { setIsAddSpaceModalOpen(false); setEditingSpace(null); }}
        onSave={handleSaveSpace}
        initialData={editingSpace}
      />
      
      <InviteTeamModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSave={handleSaveInvite}
        spaces={spaces}
        users={users}
        initialSpaceId={inviteModalSpaceId}
      />
      
      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onSaved={refreshData}
      />
      
      {/* Messenger-style Chat Widget */}
      <ChatWidget 
        currentUser={currentUser}
        tasks={tasks}
        onSaveTask={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        users={users}
      />
    </div>
  );
}

export default App;
