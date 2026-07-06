import React, { useState } from 'react';
import { FiCalendar, FiCheckSquare, FiBookOpen } from 'react-icons/fi';
import CalendarView from './components/CalendarView';
import TaskBoard from './components/TaskBoard';
import TeamWiki from './components/TeamWiki';

function App() {
  const [activeTab, setActiveTab] = useState('tasks');

  const renderContent = () => {
    switch (activeTab) {
      case 'calendar':
        return <CalendarView />;
      case 'tasks':
        return <TaskBoard />;
      case 'wiki':
        return <TeamWiki />;
      default:
        return <TaskBoard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-2">MES Team Planner</h2>
          <p className="text-sm text-slate-400">Collaboration Space</p>
        </div>
        
        <div className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'calendar' 
                ? 'bg-fuchsia-500/20 text-fuchsia-400 font-bold border border-fuchsia-500/30' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <FiCalendar className="text-lg" /> ปฏิทินทีม
          </button>
          
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'tasks' 
                ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <FiCheckSquare className="text-lg" /> กระดานงาน (Tasks)
          </button>

          <button 
            onClick={() => setActiveTab('wiki')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'wiki' 
                ? 'bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <FiBookOpen className="text-lg" /> คู่มือการทำงานทีม
          </button>
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-4 text-xs text-slate-400 text-center border border-slate-700/50">
            MES Toolbox Planner v1.0
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}

export default App;
