import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FiUsers, FiCheckCircle, FiClock, FiAlertCircle, FiFolder, FiEdit2, FiTrash2, FiUserPlus, FiUser, FiPlus } from 'react-icons/fi';
import axios from 'axios';
import InviteToTeamModal from './InviteToTeamModal';
import AddProjectModal from './AddProjectModal';
import AddTaskModal from './AddTaskModal';

export default function SpaceView({ 
  activeTab, spaces = [], tasks = [], projects = [], currentUser, refreshData, 
  onEditSpace, onDeleteSpace, onSaveProject, onSaveTask 
}) {
  // Determine Space Name and current Space
  const currentSpace = useMemo(() => {
    if (activeTab === 'space-home') return { Id: 'home', Name: 'Home' };
    if (activeTab.startsWith('space-')) {
      const spaceId = activeTab.replace('space-', '');
      const found = spaces.find(s => String(s.Id || s.id) === String(spaceId));
      if (found) {
        return {
          ...found,
          Id: found.Id || found.id,
          Name: found.Name || found.name
        };
      }
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
    
    return safeProjects.filter(p => String(p.SpaceId || p.spaceId) === String(currentSpace.Id));
  }, [currentSpace, projects]);

  const teamTasks = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    if (currentSpace.Id === 'home') return safeTasks;
    if (currentSpace.Id === 'mock') return [];
    
    return safeTasks.filter(t => 
      String(t.SpaceId || t.spaceId) === String(currentSpace.Id) || teamProjects.some(p => (p?.Id || p?.id) && (t?.ProjectId || t?.projectId) && String(p.Id || p.id) === String(t.ProjectId || t.projectId))
    );
  }, [currentSpace, tasks, teamProjects]);

  const activeProjects = teamProjects.filter(p => p && p.Status !== 'Completed' && p.Status !== 'done');
  const doneTasks = teamTasks.filter(t => t && (t.Status === 'Done' || t.Status === 'done'));

  const [spaceMembers, setSpaceMembers] = useState([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);

  const fetchMembers = useCallback(async () => {
    if (!currentSpace || currentSpace.Id === 'home' || currentSpace.Id === 'mock' || currentSpace.Id === 'unknown') {
      setSpaceMembers([]);
      return;
    }
    try {
      const res = await axios.get(`/api/spaces.php?action=members&id=${currentSpace.Id}`);
      if (res.data && Array.isArray(res.data)) {
        setSpaceMembers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch space members', err);
    }
  }, [currentSpace]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleDeleteProjectLocal = async (id) => {
    if (!window.confirm('ยืนยันการลบโปรเจ็คนี้?')) return;
    try {
      await axios.delete(`/api/projects.php?id=${id}`);
      refreshData();
    } catch(e) {
      console.error(e);
    }
  };

  const handleDeleteTaskLocal = async (id) => {
    if (!window.confirm('ยืนยันการลบงานนี้?')) return;
    try {
      await axios.delete(`/api/tasks.php?id=${id}`);
      refreshData();
    } catch(e) {
      console.error(e);
    }
  };

  const handleToggleTaskStatusLocal = async (task) => {
    try {
      const newStatus = (task.Status === 'Done' || task.Status === 'done') ? 'To Do' : 'Done';
      const updatedTask = { ...task, Status: newStatus };
      if (onSaveTask) {
        await onSaveTask(updatedTask);
      }
    } catch(e) {
      console.error(e);
    }
  };

  const handleSaveProjectLocal = async (projectData) => {
    if (onSaveProject) {
      const success = await onSaveProject(projectData);
      if (success) setIsProjectModalOpen(false);
    }
  };

  const handleSaveTaskLocal = async (taskData) => {
    if (onSaveTask) {
      const success = await onSaveTask(taskData);
      if (success) setIsTaskModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-400 opacity-20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-100 text-sm mb-2 uppercase tracking-wider font-bold">
            <FiUsers className="w-4 h-4" />
            <span>Space / Team</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold capitalize mb-2 tracking-tight">
            {spaceName}
          </h2>
          <p className="text-indigo-100/90 text-sm mb-6 max-w-xl">
            จัดการโปรเจ็คและงานของทีมได้อย่างง่ายดาย ทุกอย่างถูกรวบรวมไว้ที่นี่
          </p>
          {currentSpace.Id !== 'home' && currentSpace.Id !== 'mock' && currentSpace.Id !== 'unknown' && (
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 transition-colors rounded-xl text-sm font-bold shadow-sm"
              >
                <FiUserPlus /> สมาชิกทีม
              </button>
              <button 
                onClick={() => onEditSpace && onEditSpace(currentSpace)}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 transition-colors rounded-xl text-sm font-semibold backdrop-blur-md"
              >
                <FiEdit2 /> แก้ไขทีม
              </button>
              <button 
                onClick={() => onDeleteSpace && onDeleteSpace(currentSpace.Id)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/80 hover:bg-rose-500 transition-colors rounded-xl text-sm font-semibold backdrop-blur-md"
              >
                <FiTrash2 /> ลบทีม
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-6 bg-white/10 backdrop-blur-md px-8 py-5 rounded-2xl border border-white/20 relative z-10">
          
          {/* Member Avatars */}
          {spaceMembers.length > 0 && (
            <div className="hidden md:flex flex-col items-center mr-2">
              <div className="flex -space-x-3 mb-1">
                {spaceMembers.slice(0, 4).map((member, idx) => (
                  <div key={member.Id || idx} className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-white flex items-center justify-center text-indigo-600 font-bold text-sm uppercase shadow-sm relative z-10 hover:z-20 transform hover:scale-110 transition-transform" title={`${member.Name || member.fullname || member.UserId} (${member.Role})`}>
                    {(member.Name || member.fullname) ? (member.Name || member.fullname).charAt(0) : <FiUser />}
                  </div>
                ))}
                {spaceMembers.length > 4 && (
                  <div className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-indigo-900/80 flex items-center justify-center text-white font-bold text-xs shadow-sm relative z-10">
                    +{spaceMembers.length - 4}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-indigo-100 uppercase font-semibold">Members</span>
            </div>
          )}

          <div className="w-px h-12 bg-white/20 hidden md:block"></div>
          
          <div className="text-center">
            <div className="text-3xl font-black">{activeProjects.length}</div>
            <div className="text-[10px] text-indigo-100 uppercase tracking-wide font-semibold mt-1">Active Projects</div>
          </div>
          <div className="w-px h-12 bg-white/20"></div>
          <div className="text-center">
            <div className="text-3xl font-black">{teamTasks.length}</div>
            <div className="text-[10px] text-indigo-100 uppercase tracking-wide font-semibold mt-1">Total Tasks</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col - Projects */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <FiFolder className="w-5 h-5" />
              </div>
              Team Projects
            </h3>
            {currentSpace.Id !== 'unknown' && currentSpace.Id !== 'mock' && (
              <button 
                onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors rounded-lg text-sm font-bold"
              >
                <FiPlus /> สร้างโปรเจ็ค
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teamProjects.map((proj, idx) => {
              let checklist = [];
              try { checklist = proj?.Checklist ? (typeof proj.Checklist === 'string' ? JSON.parse(proj.Checklist) : proj.Checklist) : []; } catch (e) {}
              const totalItems = Array.isArray(checklist) ? checklist.length : 0;
              const doneItems = Array.isArray(checklist) ? checklist.filter(c => c && c.isDone).length : 0;
              const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
              const isCompleted = proj.Status === 'Completed' || proj.Status === 'done';
              
              return (
                <div key={proj?.Id || `proj-${idx}`} className={`group relative bg-white dark:bg-slate-800 border ${isCompleted ? 'border-emerald-200 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-700'} shadow-sm rounded-2xl p-5 hover:shadow-md transition-all`}>
                  
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => { setEditingProject(proj); setIsProjectModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-md transition-colors" title="แก้ไข">
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteProjectLocal(proj.Id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-md transition-colors" title="ลบ">
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pr-12">
                    <h4 className={`text-base font-bold ${isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'} truncate`}>{String(proj?.Title || 'ไม่มีชื่อ')}</h4>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2 min-h-[40px]">{String(proj?.Description || 'ไม่มีรายละเอียด')}</p>
                  </div>
                  <div className="mt-5">
                    <div className="flex justify-between items-center text-xs font-bold mb-2">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <FiCheckCircle className={isCompleted ? "text-emerald-500" : "text-slate-400"} /> Progress
                      </span>
                      <span className={isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400"}>{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
            {teamProjects.length === 0 && (
              <div className="col-span-2 p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed text-slate-500">
                <div className="w-16 h-16 mx-auto bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm mb-4">
                  <FiFolder className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">ยังไม่มีโปรเจ็ค</h3>
                <p className="text-sm mb-4">เริ่มต้นสร้างโปรเจ็คแรกสำหรับทีมนี้</p>
                {currentSpace.Id !== 'unknown' && currentSpace.Id !== 'mock' && (
                  <button onClick={() => { setEditingProject(null); setIsProjectModalOpen(true); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors inline-flex items-center gap-2">
                    <FiPlus /> สร้างโปรเจ็คใหม่
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Col - Recent Tasks */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <FiCheckCircle className="w-5 h-5" />
                </div>
                Team Tasks
              </h3>
              {currentSpace.Id !== 'unknown' && currentSpace.Id !== 'mock' && (
                <button 
                  onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
                  className="p-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:text-emerald-600 transition-colors rounded-lg"
                  title="เพิ่มงานใหม่"
                >
                  <FiPlus className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {teamTasks.map((task, idx) => {
                const isDone = task?.Status === 'Done' || task?.Status === 'done';
                return (
                  <div key={task?.Id || `task-${idx}`} className={`group flex gap-3 items-start border border-slate-100 dark:border-slate-700 rounded-xl p-3 transition-colors ${isDone ? 'bg-slate-50 dark:bg-slate-800/50 opacity-70' : 'bg-white dark:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/50'}`}>
                    <button 
                      onClick={() => handleToggleTaskStatusLocal(task)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'}`}
                    >
                      {isDone && <FiCheckCircle className="w-3.5 h-3.5 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className={`text-sm font-bold leading-tight truncate ${isDone ? 'text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                        {String(task?.Title || 'ไม่มีชื่องาน')}
                      </p>
                      <div className="flex justify-between items-center mt-2 text-xs">
                        <span className="text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-medium">{String(task?.Assignee || 'Unassigned')}</span>
                        <span className={`flex items-center gap-1 font-medium ${isDone ? 'text-slate-400' : 'text-rose-500'}`}>
                          <FiClock /> {typeof task?.DueDate === 'string' ? task.DueDate.substring(0, 10) : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingTask(task); setIsTaskModalOpen(true); }} className="p-1 text-slate-400 hover:text-indigo-600" title="แก้ไข"><FiEdit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteTaskLocal(task.Id)} className="p-1 text-slate-400 hover:text-rose-600" title="ลบ"><FiTrash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
              {teamTasks.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
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

      {/* Modals */}
      <InviteToTeamModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        space={currentSpace}
        members={spaceMembers}
        onMemberUpdate={fetchMembers}
        currentUser={currentUser}
      />

      <AddProjectModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        onSave={handleSaveProjectLocal}
        spaces={spaces}
        initialData={editingProject ? editingProject : { spaceId: currentSpace?.Id !== 'home' ? currentSpace?.Id : '' }}
      />
      
      <AddTaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => setIsTaskModalOpen(false)} 
        onSave={handleSaveTaskLocal}
        spaces={spaces}
        projects={projects}
        initialData={editingTask ? editingTask : { spaceId: currentSpace?.Id !== 'home' ? currentSpace?.Id : '' }}
      />
    </div>
  );
}
