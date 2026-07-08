import React, { useState, useEffect } from 'react';
import { FiCalendar, FiCheckSquare, FiLink, FiPieChart, FiBarChart2, FiBell, FiMenu, FiX, FiSun, FiMoon } from 'react-icons/fi';
import CalendarView from './components/CalendarView';
import TaskBoard from './components/TaskBoard';
import Dashboard from './components/Dashboard';
import GanttChart from './components/GanttChart';
import LinkHub from './components/LinkHub';
import NotificationManager from './components/NotificationManager';

const navItems = [
  { tab: 'gantt', icon: FiBarChart2, label: 'ตารางงาน', sublabel: 'Gantt Chart' },
  { tab: 'tasks', icon: FiCheckSquare, label: 'กระดานงาน', sublabel: 'Task Board' },
  { tab: 'calendar', icon: FiCalendar, label: 'ปฏิทินทีม', sublabel: 'Calendar' },
  { tab: 'links', icon: FiLink, label: 'คลังข้อมูล', sublabel: 'Links' },
  { tab: 'dashboard', icon: FiPieChart, label: 'ภาพรวม', sublabel: 'Dashboard' },
];

function App() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Theme logic
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

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'calendar': return <CalendarView />;
      case 'tasks': return <TaskBoard />;
      case 'gantt': return <GanttChart />;
      case 'links': return <LinkHub />;
      default: return <Dashboard />;
    }
  };

  const handleNav = (tab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
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
          </div>
        </aside>

        {/* Desktop Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
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
          </div>
        </header>

        {/* Mobile Content */}
        <main className="flex-1 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
          {renderContent()}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 safe-area-bottom">
          <div className="flex items-stretch">
            {navItems.slice(0, 4).map(item => (
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
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-slate-500 active:scale-90"
            >
              <FiMenu className="text-lg" />
              <span className="text-[10px] font-medium">More</span>
            </button>
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
