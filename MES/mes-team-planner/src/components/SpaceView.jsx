import React, { useMemo } from 'react';
import { FiUsers, FiCheckCircle, FiClock, FiAlertCircle, FiFolder } from 'react-icons/fi';

export default function SpaceView({ activeTab, tasks = [], projects = [], currentUser, refreshData }) {
  // Determine Space Name
  const spaceName = useMemo(() => {
    if (activeTab === 'space-home') return 'Home';
    if (activeTab === 'team-engineers') return 'Engineers';
    if (activeTab === 'team-design') return 'Design Team';
    if (activeTab === 'team-developer') return 'Developer Team';
    return String(activeTab || '').replace('-', ' ');
  }, [activeTab]);

  const teamProjects = useMemo(() => {
    const safeProjects = Array.isArray(projects) ? projects : [];
    if (activeTab === 'space-home') return safeProjects;
    let filtered = safeProjects;
    if (activeTab === 'team-design') filtered = safeProjects.slice(0, Math.max(1, safeProjects.length / 2));
    if (activeTab === 'team-developer') filtered = safeProjects.slice(Math.max(0, safeProjects.length / 2 - 1));
    if (activeTab === 'team-engineers') {
      filtered = safeProjects.filter(p => String(p?.Title || '').toLowerCase().includes('engine') || (p?.Id && typeof p.Id === 'number' && p.Id % 2 === 0));
    }
    return filtered;
  }, [activeTab, projects]);

  const teamTasks = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    if (activeTab === 'space-home') return safeTasks;
    return safeTasks.filter(t => 
      teamProjects.some(p => p?.Id === t?.ProjectId) || 
      (t?.Id && typeof t.Id === 'number' && t.Id % 3 === (activeTab === 'team-design' ? 0 : 1))
    );
  }, [activeTab, tasks, teamProjects]);

  const activeProjects = teamProjects.filter(p => p && p.Status !== 'Completed');
  const doneTasks = teamTasks.filter(t => t && t.Status === 'Done');

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
          <p className="text-indigo-100 text-sm mt-1">
            ยินดีต้อนรับสู่พื้นที่ทำงานของทีม {spaceName}
          </p>
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
            <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">View All</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeProjects.slice(0, 4).map((proj, idx) => {
              let checklist = [];
              try { checklist = proj?.Checklist ? (typeof proj.Checklist === 'string' ? JSON.parse(proj.Checklist) : proj.Checklist) : []; } catch (e) {}
              const totalItems = Array.isArray(checklist) ? checklist.length : 0;
              const doneItems = Array.isArray(checklist) ? checklist.filter(c => c && c.isDone).length : 0;
              const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
              
              return (
                <div key={proj?.Id || `proj-${idx}`} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 hover:shadow-soft transition-all">
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
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
              <FiCheckCircle className="text-emerald-500" /> Recent Tasks
            </h3>
            <div className="space-y-3">
              {teamTasks.slice(0, 5).map((task, idx) => (
                <div key={task?.Id || `task-${idx}`} className="flex gap-3 items-start border-b border-slate-100 dark:border-slate-700/50 last:border-0 pb-3 last:pb-0">
                  <div className="mt-0.5">
                    <div className={`w-2 h-2 rounded-full ${task?.Status === 'Done' ? 'bg-emerald-500' : task?.Status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight truncate">{String(task?.Title || 'ไม่มีชื่องาน')}</p>
                    <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                      <span>{String(task?.Assignee || 'Unassigned')}</span>
                      <span className="flex items-center gap-1"><FiClock /> {typeof task?.DueDate === 'string' ? task.DueDate.substring(0, 10) : (task?.DueDate ? String(task.DueDate) : '-')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-center text-xs text-slate-400 mt-4">
        * ข้อมูลในหน้านี้เป็นข้อมูลจำลอง (Mock Data) สำหรับการแสดงผลหน้าทีม
      </div>
    </div>
  );
}
