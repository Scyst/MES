import React from 'react';
import { FiPlus, FiMoreVertical, FiLock, FiGlobe, FiClock } from 'react-icons/fi';
import { mockTasks } from '../data/mockData';

export default function TaskBoard() {
  const cols = [
    { id: 'todo', title: 'To Do', color: 'border-slate-500', bg: 'bg-slate-500/10', titleColor: 'text-slate-300' },
    { id: 'in-progress', title: 'In Progress', color: 'border-amber-500', bg: 'bg-amber-500/10', titleColor: 'text-amber-400' },
    { id: 'done', title: 'Done', color: 'border-emerald-500', bg: 'bg-emerald-500/10', titleColor: 'text-emerald-400' }
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-emerald-400">📋</span> Task Board
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-slate-700 text-sm">
            <button className="px-3 py-1.5 bg-slate-700 text-white rounded shadow">All Tasks</button>
            <button className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors">My Tasks</button>
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/20">
            + New Task
          </button>
        </div>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 flex-1">
        {cols.map(col => {
          const colTasks = mockTasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className={`flex-1 min-w-[300px] flex flex-col bg-slate-900/50 rounded-2xl border-t-4 ${col.color} border-l border-r border-b border-slate-800 shadow-lg`}>
              <div className={`px-4 py-3 flex items-center justify-between border-b border-slate-800 ${col.bg}`}>
                <h3 className={`font-bold ${col.titleColor} flex items-center gap-2`}>
                  {col.title}
                  <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full border border-slate-700">
                    {colTasks.length}
                  </span>
                </h3>
                <button className="text-slate-400 hover:text-white p-1"><FiPlus /></button>
              </div>
              
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {colTasks.map(task => (
                  <div key={task.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-sm hover:border-slate-500 transition-colors cursor-grab active:cursor-grabbing group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        {task.visibility === 'private' ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            <FiLock /> Private
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
                            <FiGlobe /> Public
                          </span>
                        )}
                      </div>
                      <button className="text-slate-500 opacity-0 group-hover:opacity-100 hover:text-white transition-all">
                        <FiMoreVertical />
                      </button>
                    </div>
                    
                    <h4 className="text-slate-200 font-medium text-sm mb-3 leading-snug">
                      {task.title}
                    </h4>
                    
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <FiClock className="text-slate-500" />
                        <span>{task.dueDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold border border-slate-700" title={task.assignee}>
                          {task.assignee.substring(0, 1)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {colTasks.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                    No tasks
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
