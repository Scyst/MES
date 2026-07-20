import React, { useMemo } from 'react';
import { FiUsers, FiCheckCircle, FiClock, FiAlertCircle, FiFolder, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import { canManageSpace } from '../utils/permissions';

export default function SpaceView({ activeTab, spaces = [], tasks = [], projects = [], currentUser, refreshData, onEditSpace, onDeleteSpace, onTaskClick, onCreateTask, onCreateProject, onProjectClick, onSaveTask }) {
  // Determine Space Name and current Space
  const currentSpace = useMemo(() => {
    if (activeTab === 'space-home') return { Id: 'home', Name: 'Home' };
    if (activeTab.startsWith('space-')) {
      const spaceId = activeTab.replace('space-', '');
      const found = spaces.find(s => String(s.Id) === String(spaceId));
      if (found) return found;
    }
    // Fallback for legacy mock tabs
    if (activeTab === 'team-engineers') return { Id: 'mock', Name: 'Engineers' };
    if (activeTab === 'team-design') return { Id: 'mock', Name: 'Design Team' };
    if (activeTab === 'team-developer') return { Id: 'mock', Name: 'Developer Team' };
    
    return { Id: 'unknown', Name: String(activeTab || '').replace('-', ' ') };
  }, [activeTab, spaces]);

  const spaceName = currentSpace?.Name || 'Unknown Space';

  const teamProjects = useMemo(() => {
    const safeProjects = Array.isArray(projects) ? projects : [];
    if (currentSpace.Id === 'home') return safeProjects;
    if (currentSpace.Id === 'mock') return []; // Clear mock data to prevent confusion
    
    return safeProjects.filter(p => String(p.SpaceId) === String(currentSpace.Id));
  }, [currentSpace, projects]);

  const teamTasks = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    if (currentSpace.Id === 'home') return safeTasks;
    if (currentSpace.Id === 'mock') return [];
    
    return safeTasks.filter(t => 
      String(t.SpaceId) === String(currentSpace.Id) || teamProjects.some(p => p?.Id && t?.ProjectId && String(p.Id) === String(t.ProjectId))
    );
  }, [currentSpace, tasks, teamProjects]);

  const activeProjects = teamProjects.filter(p => p && p.Status !== 'Completed' && p.Status !== 'done');
  const doneTasks = teamTasks.filter(t => t && (t.Status === 'Done' || t.Status === 'done'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-md">
        <div>
          <div className="flex items-center gap-2 text-indigo-100 text-sm mb-1 uppercase tracking-wider font-bold">
            <FiUsers />
            <span>Space / Team</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold capitalize">
            {spaceName}
          </h2>
          <p className="text-indigo-100 text-sm mt-1 mb-2">
            ยินดีต้อนรับสู่พื้นที่ทำงานของทีม {spaceName}
          </p>
          {currentSpace.Id !== 'home' && currentSpace.Id !== 'mock' && currentSpace.Id !== 'unknown' && canManageSpace(currentUser) && (
            <div className="flex gap-2">
              <button 
                onClick={() => onEditSpace && onEditSpace(currentSpace)}
                className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 transition-colors rounded text-xs font-semibold backdrop-blur-sm"
              >
                <FiEdit2 /> แก้ไข
              </button>
              <button 
                onClick={() => onDeleteSpace && onDeleteSpace(currentSpace.Id)}
                className="flex items-center gap-1 px-3 py-1 bg-rose-500/80 hover:bg-rose-500 transition-colors rounded text-xs font-semibold backdrop-blur-sm"
              >
                <FiTrash2 /> ลบทีม
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20">
          <div className="text-center">
            <div className="text-2xl font-bold">{activeProjects.length}</div>
            <div className="text-[10px] text-indigo-100 uppercase tracking-wide">Active Projects</div>
          </div>
          <div className="w-px h-8 bg-white/20"></div>
          <div className="text-center">
            <div className="text-2xl font-bold">{teamTasks.length}</div>
            <div className="text-[10px] text-indigo-100 uppercase tracking-wide">Total Tasks</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col - Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FiFolder className="text-indigo-500" /> Team Projects
            </h3>
            <div className="flex items-center gap-2">
              {currentSpace.Id !== 'home' && currentSpace.Id !== 'mock' && (
                <button onClick={() => onCreateProject && onCreateProject({ SpaceId: currentSpace.Id })} className="text-xs font-bold bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1">
                  <FiPlus /> New Project
                </button>
              )}
              <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View All</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeProjects.slice(0, 4).map((proj, idx) => {
              let checklist = [];
              try { checklist = proj?.Checklist ? (typeof proj.Checklist === 'string' ? JSON.parse(proj.Checklist) : proj.Checklist) : []; } catch (e) {}
              const totalItems = Array.isArray(checklist) ? checklist.length : 0;
              const doneItems = Array.isArray(checklist) ? checklist.filter(c => c && c.isDone).length : 0;
              const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
              
              return (
                <div key={proj?.Id || `proj-${idx}`} onClick={() => onProjectClick && onProjectClick(proj)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 hover:shadow-soft transition-all cursor-pointer">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{String(proj?.Title || 'ไม่มีชื่อ')}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-[32px]">{String(proj?.Description || 'ไม่มีรายละเอียด')}</p>
                  <div className="mt-4">
                    <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
            {activeProjects.length === 0 && (
              <div className="col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed text-slate-500">
                ไม่มีโปรเจ็คในทีมนี้
              </div>
            )}
          </div>
        </div>

        {/* Right Col - Recent Tasks & Team Members */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2 mb-4">
              <span className="flex items-center gap-2"><FiCheckCircle className="text-emerald-500" /> Recent Tasks</span>
              {currentSpace.Id !== 'home' && currentSpace.Id !== 'mock' && (
                <button onClick={() => onCreateTask && onCreateTask({ SpaceId: currentSpace.Id })} className="text-xs font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors flex items-center gap-1">
                  <FiPlus /> New Task
                </button>
              )}
            </h3>
            <div className="space-y-2">
              {teamTasks.slice(0, 5).map((task, idx) => (
                <div 
                  key={task?.Id || `task-${idx}`} 
                  onClick={() => onTaskClick && onTaskClick(task)}
                  className="flex gap-3 items-start border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 p-2 rounded-xl transition-colors group"
                >
                  <div className="mt-0.5">
                    <div className={`w-2 h-2 rounded-full ${task?.Status === 'Done' ? 'bg-emerald-500' : task?.Status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{String(task?.Title || 'ไม่มีชื่องาน')}</p>
                    <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                      <span>{String(task?.Assignee || 'Unassigned')}</span>
                      <span className="flex items-center gap-1"><FiClock /> {typeof task?.DueDate === 'string' ? task.DueDate.substring(0, 10) : (task?.DueDate ? String(task.DueDate) : '-')}</span>
                    </div>
                  </div>
                </div>
              ))}
              {teamTasks.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
                  ไม่มีงานในทีมนี้
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {currentSpace.Id === 'mock' && (
        <div className="text-center text-xs text-slate-400 mt-4">
          * ข้อมูลในหน้านี้เป็นข้อมูลจำลอง (Mock Data) สำหรับการแสดงผลหน้าทีม
        </div>
      )}
    </div>
  );
}
