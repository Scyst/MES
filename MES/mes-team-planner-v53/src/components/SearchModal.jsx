import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX, FiCheckSquare, FiBriefcase, FiClock } from 'react-icons/fi';

export default function SearchModal({ onClose, tasks = [], projects = [], onNav }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeProjects = Array.isArray(projects) ? projects : [];

  const filteredTasks = safeTasks.filter(t => 
    String(t?.Title || '').toLowerCase().includes(query.toLowerCase()) || 
    String(t?.Assignee || '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  const filteredProjects = safeProjects.filter(p => 
    String(p?.Title || '').toLowerCase().includes(query.toLowerCase()) || 
    String(p?.Description || '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const handleTaskClick = (id) => {
    if (onNav) onNav('tasks');
    onClose();
  };

  const handleProjectClick = (id) => {
    if (onNav) onNav('projects');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]" onClick={onClose}></div>
      <div className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[110] overflow-hidden animate-slide-up border border-slate-200 dark:border-slate-800">
        
        {/* Search Input Area */}
        <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800">
          <FiSearch className="text-xl text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="ค้นหางาน, โปรเจ็ค หรือ ผู้รับผิดชอบ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-4 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none"
          />
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
          {query.trim() === '' ? (
            <div className="px-6 py-12 text-center text-slate-500 flex flex-col items-center">
              <FiSearch className="text-4xl mb-3 text-slate-300 dark:text-slate-700" />
              <p>พิมพ์คำค้นหาเพื่อเริ่มค้นหาทันที</p>
            </div>
          ) : (
            <>
              {filteredProjects.length > 0 && (
                <div className="mb-4">
                  <h3 className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Projects</h3>
                  <div className="space-y-1">
                    {filteredProjects.map((proj, idx) => (
                      <div 
                        key={proj?.Id || `proj-${idx}`}
                        onClick={() => handleProjectClick(proj?.Id)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer group transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20">
                          <FiBriefcase className="text-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{String(proj?.Title || 'ไม่มีชื่อ')}</h4>
                          <p className="text-xs text-slate-500 truncate">{String(proj?.Description || 'ไม่มีรายละเอียด')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredTasks.length > 0 && (
                <div>
                  <h3 className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Tasks</h3>
                  <div className="space-y-1">
                    {filteredTasks.map((task, idx) => (
                      <div 
                        key={task?.Id || `task-${idx}`}
                        onClick={() => handleTaskClick(task?.Id)}
                        className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer group transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20">
                          <FiCheckSquare className="text-lg" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{String(task?.Title || 'ไม่มีชื่อ')}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><FiClock /> {typeof task?.DueDate === 'string' ? task.DueDate.substring(0, 10) : (task?.DueDate ? String(task.DueDate) : '-')}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-600 dark:text-slate-400">@{String(task?.Assignee || 'Unassigned')}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase shrink-0 ${
                          task?.Status === 'Done' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                          task?.Status === 'In Progress' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {String(task?.Status || 'Todo')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredProjects.length === 0 && filteredTasks.length === 0 && (
                <div className="px-6 py-12 text-center text-slate-500">
                  <p>ไม่พบผลลัพธ์สำหรับ "{query}"</p>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><kbd className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">Enter</kbd> to select</span>
            <span className="flex items-center gap-1"><kbd className="bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 font-mono text-[10px]">Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </>
  );
}
