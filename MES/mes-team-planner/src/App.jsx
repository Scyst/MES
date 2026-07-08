import React, { useState } from 'react';
import { FiCalendar, FiCheckSquare, FiLink, FiPieChart, FiBarChart2, FiBell, FiMenu, FiX } from 'react-icons/fi';
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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* ══════════ Desktop Sidebar (hidden on mobile) ══════════ */}
      <div className="hidden md:flex md:flex-row flex-1 overflow-hidden">
        <aside className="w-56 lg:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
          <div className="p-5 pb-3">
            <h2 className="text-lg font-bold text-white">MES Planner</h2>
            <p className="text-xs text-slate-500 mt-0.5">Team Collaboration</p>
          </div>
          
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-3">
            {navItems.map(item => (
              <button 
                key={item.tab}
                onClick={() => handleNav(item.tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                  activeTab === item.tab 
                    ? 'bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/25' 
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <item.icon className="text-base shrink-0" />
                <span>{item.label}</span>
                <span className="text-[10px] text-slate-500 ml-auto hidden lg:block">{item.sublabel}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-800 shrink-0">
            <button 
              onClick={() => handleNav('dashboard')} 
              className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-all"
              title="Activity & Notifications"
            >
              <FiBell className="text-base" />
              <span className="text-xs">Notifications</span>
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
            </button>
          </div>
        </aside>

        {/* Desktop Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 p-5 lg:p-6 overflow-y-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* ══════════ Mobile Layout ══════════ */}
      <div className="flex flex-col flex-1 overflow-hidden md:hidden">
        
        {/* Mobile Top Bar */}
        <header className="flex items-center justify-between bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-all active:scale-90">
              <FiMenu className="text-xl" />
            </button>
            <h2 className="text-base font-bold text-white">
              {navItems.find(n => n.tab === activeTab)?.label || 'MES Planner'}
            </h2>
          </div>
          <button className="text-slate-400 hover:text-white relative p-1.5" onClick={() => handleNav('dashboard')} title="Notifications">
            <FiBell className="text-lg" />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
          </button>
        </header>

        {/* Mobile Content */}
        <main className="flex-1 overflow-y-auto p-3">
          {renderContent()}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="bg-slate-900 border-t border-slate-800 shrink-0 safe-area-bottom">
          <div className="flex items-stretch">
            {navItems.slice(0, 4).map(item => (
              <button
                key={item.tab}
                onClick={() => handleNav(item.tab)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all active:scale-90 ${
                  activeTab === item.tab 
                    ? 'text-indigo-400' 
                    : 'text-slate-500'
                }`}
              >
                <item.icon className={`text-lg ${activeTab === item.tab ? 'text-indigo-400' : ''}`} />
                <span className="text-[10px] font-medium">{item.sublabel}</span>
                {activeTab === item.tab && (
                  <div className="w-1 h-1 bg-indigo-400 rounded-full mt-0.5"></div>
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
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col md:hidden shadow-2xl shadow-black/50 animate-slide-right">
            <div className="p-5 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-white">MES Planner</h2>
                <p className="text-xs text-slate-500 mt-0.5">Team Collaboration</p>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-all active:scale-90">
                <FiX className="text-xl" />
              </button>
            </div>
            
            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
              {navItems.map(item => (
                <button 
                  key={item.tab}
                  onClick={() => handleNav(item.tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                    activeTab === item.tab 
                      ? 'bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/25' 
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <item.icon className="text-lg shrink-0" />
                  <span>{item.label}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">{item.sublabel}</span>
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-800 shrink-0">
              <div className="bg-slate-800/50 rounded-xl p-3 text-[11px] text-slate-500 text-center border border-slate-700/50">
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
