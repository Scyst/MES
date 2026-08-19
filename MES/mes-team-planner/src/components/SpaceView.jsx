import React, { useMemo, useState, useEffect } from 'react';
import { FiUsers, FiCheckCircle, FiClock, FiAlertCircle, FiFolder, FiEdit2, FiTrash2, FiPlus, FiUserPlus, FiActivity, FiX } from 'react-icons/fi';
import axios from 'axios';
import { canManageSpace } from '../utils/permissions';
import { resolveAssigneeName } from '../utils/userUtils';
import { getCoverImage } from '../utils/imageUtils';
import WorkloadWidget from './workload/WorkloadWidget';

export default function SpaceView({ activeTab, spaces = [], tasks = [], projects = [], users = [], currentUser, refreshData, onEditSpace, onDeleteSpace, openInviteModal, onTaskClick, onCreateTask, onCreateProject, onProjectClick, onSaveTask }) {
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);
  const [activeStatusTab, setActiveStatusTab] = useState('active');
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
    
    return { Id: 'unknown', Name: 'Unknown Space' };
  }, [activeTab, spaces]);

  const [spaceMembers, setSpaceMembers] = useState([]);


  useEffect(() => {
    if (currentSpace.Id && currentSpace.Id !== 'home' && currentSpace.Id !== 'mock' && currentSpace.Id !== 'unknown') {
      axios.get(`/api/space_members.php?space_id=${currentSpace.Id}`)
        .then(res => setSpaceMembers(res.data))
        .catch(console.error);
    } else {
      setSpaceMembers([]);
    }
    // NOTE: Intentionally excludes refreshData — space members only change when space changes,
    // not every 30s global poll. Including refreshData caused WorkloadWidget to re-fetch GitHub
    // API (50+ calls) every polling cycle.
  }, [currentSpace.Id]); // eslint-disable-line react-hooks/exhaustive-deps

  const spaceName = currentSpace?.Name || 'Unknown Space';

  const teamProjects = useMemo(() => {
    const safeProjects = Array.isArray(projects) ? projects : [];
    if (currentSpace.Id === 'home') return safeProjects;
    if (currentSpace.Id === 'mock') return []; // Clear mock data to prevent confusion
    
    return safeProjects.filter(p => String(p.SpaceId || p.spaceId) === String(currentSpace.Id));
  }, [currentSpace, projects]);

  const teamTasks = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    if (currentSpace.Id === 'home') return safeTasks;
    if (currentSpace.Id === 'mock') return [];
    
    return safeTasks.filter(t => {
      const tSpaceId = t.SpaceId || t.spaceId;
      const tProjId = t.ProjectId || t.projectId;
      
      // Strict space match (ignore null/empty/0)
      const matchesSpace = tSpaceId && String(tSpaceId) !== '0' && String(tSpaceId) === String(currentSpace.Id);
      
      // Match by Project inside the space
      const matchesProject = teamProjects.some(p => p?.Id && tProjId && String(p.Id) === String(tProjId));
      
      return matchesSpace || matchesProject;
    });
  }, [currentSpace, tasks, teamProjects]);

  const activeProjects = teamProjects.filter(p => p && p.Status !== 'closed');
  const closedProjects = teamProjects.filter(p => p && p.Status === 'closed');
  const displayedProjects = activeStatusTab === 'active' ? activeProjects : closedProjects;

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
          <div className="flex gap-2">
            {currentSpace.Id !== 'home' && currentSpace.Id !== 'mock' && currentSpace.Id !== 'unknown' && canManageSpace(currentUser) && (
              <>
                <button 
                  onClick={() => onEditSpace && onEditSpace(currentSpace)}
                  className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 transition-colors rounded text-xs font-semibold backdrop-blur-sm"
                >
                  <FiEdit2 /> แก้ไข
                </button>
                <button 
                  onClick={() => onDeleteSpace && onDeleteSpace(currentSpace.Id)}
                  className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 text-rose-200 hover:text-rose-100 transition-colors rounded text-xs font-semibold backdrop-blur-sm"
                >
                  <FiTrash2 /> ลบ
                </button>
              </>
            )}
            {currentSpace.Id !== 'home' && currentSpace.Id !== 'mock' && currentSpace.Id !== 'unknown' && (
              <button 
                onClick={() => openInviteModal && openInviteModal(currentSpace.Id)}
                className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 transition-colors rounded text-xs font-semibold backdrop-blur-sm"
              >
                <FiUserPlus /> เชิญคนเข้าทีม
              </button>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-4">
          {spaceMembers.length > 0 && (
            <div className="hidden md:flex flex-col items-end gap-1">
              <div className="text-[10px] text-indigo-100 font-semibold uppercase tracking-wider">Members</div>
              <div className="flex -space-x-2">
                {spaceMembers.slice(0, 5).map((m, i) => (
                  <div key={m.Id} className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold ring-2 ring-indigo-500 shadow-sm" title={`${m.fullname || m.UserId} (${m.Role})`}>
                    {(m.fullname || m.UserId).charAt(0).toUpperCase()}
                  </div>
                ))}
                {spaceMembers.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-indigo-900/50 text-indigo-100 flex items-center justify-center text-xs font-bold ring-2 ring-indigo-500 shadow-sm">
                    +{spaceMembers.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
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
      </div>


      {showWorkloadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                🚀 Team Workloads
              </h2>
              <button onClick={() => setShowWorkloadModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {spaceMembers.map(member => (
                <WorkloadWidget key={member.Id} user={{username: member.UserId, fullname: member.fullname, Role: member.Role}} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col - Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 shrink-0">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <FiFolder className="text-indigo-500" /> Team Projects
              </h3>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                <button 
                  onClick={() => setActiveStatusTab('active')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${activeStatusTab === 'active' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  ดำเนินการ ({activeProjects.length})
                </button>
                <button 
                  onClick={() => setActiveStatusTab('closed')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${activeStatusTab === 'closed' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  ปิดแล้ว ({closedProjects.length})
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {currentSpace.Id !== 'home' && currentSpace.Id !== 'mock' && spaceMembers.length > 0 && 
               currentSpace.Name?.toLowerCase().includes('developer') && (
                <button 
                  onClick={() => setShowWorkloadModal(true)}
                  className="text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                >
                  <FiActivity className="w-3.5 h-3.5" /> Team Workloads
                </button>
              )}
              {currentSpace.Id !== 'home' && currentSpace.Id !== 'mock' && (
                <button onClick={() => onCreateProject && onCreateProject({ SpaceId: currentSpace.Id })} className="text-xs font-bold bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors flex items-center gap-1">
                  <FiPlus /> New Project
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayedProjects.map((proj, idx) => {
              let checklist = [];
              try { checklist = proj?.Checklist ? (typeof proj.Checklist === 'string' ? JSON.parse(proj.Checklist) : proj.Checklist) : []; } catch (e) {}
              const totalItems = Array.isArray(checklist) ? checklist.length : 0;
              const doneItems = Array.isArray(checklist) ? checklist.filter(c => c && c.isDone).length : 0;
              const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
              const coverImage = getCoverImage(proj?.Attachments);
              
              return (
                <div key={proj?.Id || `proj-${idx}`} onClick={() => onProjectClick && onProjectClick(proj)} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 hover:shadow-soft transition-all cursor-pointer">
                  {coverImage && (
                    <div className="-mx-4 -mt-4 mb-3 h-24 overflow-hidden rounded-t-2xl">
                      <img src={coverImage} alt="Cover" className="w-full h-full object-cover transition-transform hover:scale-105" />
                    </div>
                  )}
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
            {displayedProjects.length === 0 && (
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
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {teamTasks.map((task, idx) => {
                const assigneeName = resolveAssigneeName(task.Assignee, users);
                const coverImage = getCoverImage(task?.Attachments || task?.attachments);
                return (
                <div 
                  key={task?.Id || `task-${idx}`} 
                  onClick={() => onTaskClick && onTaskClick(task)}
                  className="flex gap-3 items-start border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 p-2 rounded-xl transition-colors group"
                >
                  <div className="mt-0.5 shrink-0">
                    {coverImage ? (
                      <img src={coverImage} alt="Cover" className="w-6 h-6 rounded object-cover" />
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${task?.Status === 'Done' ? 'bg-emerald-500' : task?.Status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{String(task?.Title || task?.title || 'ไม่มีชื่องาน')}</p>
                    <div className="flex justify-between items-center mt-1 text-[10px] text-slate-500">
                      <span className="truncate max-w-[120px]" title={assigneeName}>{String(assigneeName || 'Unassigned')}</span>
                      <span className="flex items-center gap-1 shrink-0"><FiClock /> {typeof (task?.DueDate || task?.dueDate) === 'string' ? (task.DueDate || task.dueDate).substring(0, 10) : ((task?.DueDate || task?.dueDate) ? String(task.DueDate || task.dueDate) : '-')}</span>
                    </div>
                  </div>
                </div>
              )})}
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
