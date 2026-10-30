import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiBriefcase, FiPlus, FiClock, FiTrash2, FiCheckSquare, FiArchive, FiCheckCircle, FiPaperclip, FiMessageSquare } from 'react-icons/fi';
import AddProjectModal from './AddProjectModal';
import ConfirmDialog from './common/ConfirmDialog';
import { canEditProject, canDeleteProject } from '../utils/permissions';
import { getCoverImage } from '../utils/imageUtils';

export default function ProjectsTab({ currentUser, tasks, spaces = [], users = [], refreshData }) {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(true);
  // FEAT-1: Active/Closed tab filter
  const [activeStatusTab, setActiveStatusTab] = useState('active');
  // MINOR-4: Confirmation dialog state
  const [projectToDelete, setProjectToDelete] = useState(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get(`/api/projects.php?_t=${Date.now()}`);
      const formattedData = res.data.map(p => {
        let parsedAttachments = [];
        try {
          if (p.Attachments) parsedAttachments = typeof p.Attachments === 'string' ? JSON.parse(p.Attachments) : p.Attachments;
        } catch(e) {}
        return {
          ...p,
          Checklist: p.Checklist ? (typeof p.Checklist === 'string' ? JSON.parse(p.Checklist) : p.Checklist) : [],
          Attachments: Array.isArray(parsedAttachments) ? parsedAttachments : []
        };
      });
      setProjects(formattedData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // BUG-4: 30s polling — same cadence as Task/Calendar views
  useEffect(() => {
    const interval = setInterval(fetchProjects, 30000);
    return () => clearInterval(interval);
  }, [fetchProjects]);

  const getProgress = (checklist) => {
    if (!checklist || checklist.length === 0) return 0;
    return Math.round((checklist.filter(c => c.isDone).length / checklist.length) * 100);
  };

  // BUG-2: Read AKA from currentUser prop, never from localStorage
  const isUserInvolvedInProject = (project) => {
    if (!currentUser || !project) return false;
    const akas = currentUser.aka
      ? currentUser.aka.split(',').map(a => a.trim()).filter(Boolean)
      : [];
    const isMe = (name) => {
      if (!name) return false;
      if (name === currentUser?.fullname || name === currentUser?.username) return true;
      return akas.includes(name);
    };
    return isMe(project.CreatedBy) || isMe(project.Assignee);
  };

  const calculateTimeSpent = (projectId) => {
    const projectTasks = tasks.filter(t => t.ProjectId == projectId || t.projectId == projectId);
    let totalMinutes = 0;
    projectTasks.forEach(t => {
      const st = String(t.Status || t.status || '').toLowerCase();
      if (st !== 'done' && st !== 'in progress' && st !== 'in_progress') return;
      let diffDays = 1;
      const sDate = t.StartDate || t.startDate;
      const dDate = t.DueDate || t.dueDate;
      if (sDate && dDate) {
        const diff = Math.round((new Date(dDate) - new Date(sDate)) / (1000 * 60 * 60 * 24));
        if (diff > 0) diffDays = diff + 1;
      }
      const startStr = t.StartTime || t.startTime;
      const endStr = t.EndTime || t.endTime;
      if (startStr && endStr) {
        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);
        const start = startH * 60 + startM;
        let end = endH * 60 + endM;
        if (end < start) end += 24 * 60;
        totalMinutes += (end - start) * diffDays;
      }
    });
    return `${Math.floor(totalMinutes / 60)} ชั่วโมง ${totalMinutes % 60} นาที`;
  };

  const handleSubmit = async (projectData) => {
    try {
      const payload = { ...projectData, checklist: JSON.stringify(projectData.checklist) };
      if (projectData.Id) {
        await axios.put(`/api/projects.php?id=${projectData.Id}`, payload);
      } else {
        await axios.post('/api/projects.php', payload);
      }
      setIsModalOpen(false);
      setEditingProject(null);
      fetchProjects();
      if (refreshData) refreshData();
    } catch (e) {
      console.error(e);
      alert('Failed to save project');
    }
  };

  // MINOR-4: Confirmed via ConfirmDialog instead of window.confirm
  const handleDelete = async () => {
    if (!projectToDelete) return;
    try {
      await axios.delete(`/api/projects.php?id=${projectToDelete}`);
      fetchProjects();
      if (refreshData) refreshData();
    } catch(e) {
      console.error(e);
    } finally {
      setProjectToDelete(null);
    }
  };

  const handleEditChecklistInTab = async (project, itemIndex, newText) => {
    try {
      const newChecklist = [...(project.Checklist || [])];
      newChecklist[itemIndex].text = newText;
      await axios.put(`/api/projects.php?id=${project.Id}`, { checklist: JSON.stringify(newChecklist) });
      fetchProjects();
      if (refreshData) refreshData();
    } catch (e) { console.error(e); }
  };

  const handleToggleChecklistInTab = async (project, itemIndex) => {
    try {
      const newChecklist = [...(project.Checklist || [])];
      newChecklist[itemIndex].isDone = !newChecklist[itemIndex].isDone;
      await axios.put(`/api/projects.php?id=${project.Id}`, { checklist: JSON.stringify(newChecklist) });
      fetchProjects();
      if (refreshData) refreshData();
    } catch (e) {
      console.error(e);
      alert('Failed to update checklist');
    }
  };

  // BUG-3: Use String() for type-safe SpaceId comparison (matches SpaceView.jsx pattern)
  const buildGroupedProjects = (filteredProjects) => {
    const grouped = spaces
      .map(space => ({
        spaceId: space.Id,
        spaceName: space.Name,
        spaceColor: space.Color || 'indigo',
        projects: filteredProjects.filter(p => String(p.SpaceId) === String(space.Id))
      }))
      .filter(g => g.projects.length > 0);
    const spaceIds = spaces.map(s => String(s.Id));
    const unassigned = filteredProjects.filter(p => !p.SpaceId || !spaceIds.includes(String(p.SpaceId)));
    if (unassigned.length > 0) {
      grouped.push({ spaceId: 'none', spaceName: 'ทั่วไป (ไม่มี Team Space)', spaceColor: 'slate', projects: unassigned });
    }
    return grouped;
  };

  const activeProjects = projects.filter(p => p.Status === 'active' || !p.Status);
  const closedProjects = projects.filter(p => p.Status === 'closed');
  const displayedProjects = activeStatusTab === 'active' ? activeProjects : closedProjects;
  const groupedProjects = buildGroupedProjects(displayedProjects);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* MINOR-4: ConfirmDialog for delete */}
      <ConfirmDialog
        isOpen={!!projectToDelete}
        title="ลบโปรเจ็ค?"
        message="ยืนยันการลบโปรเจ็คนี้? งานที่ถูกเชื่อมโยงจะยังอยู่ แต่จะหลุดจากการอ้างอิงโปรเจ็ค"
        confirmText="ลบโปรเจ็ค"
        cancelText="ยกเลิก"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setProjectToDelete(null)}
      />

      <div className="flex flex-row flex-wrap items-center justify-between gap-3 shrink-0 mb-4 px-1">
        <div className="flex items-center gap-4 shrink-0">
          <h2 className="hidden md:flex text-lg md:text-xl font-bold text-slate-900 dark:text-white items-center gap-2">
            <span className="text-indigo-400">💼</span> โปรเจ็ค
          </h2>
          
          {/* FEAT-1: Active / Closed status tabs (Moved to header) */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl w-fit shrink-0">
            <button
              onClick={() => setActiveStatusTab('active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeStatusTab === 'active'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <FiCheckCircle className={activeStatusTab === 'active' ? 'text-indigo-500' : ''} />
              ดำเนินการ
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeStatusTab === 'active' ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>{activeProjects.length}</span>
            </button>
            <button
              onClick={() => setActiveStatusTab('closed')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeStatusTab === 'closed'
                  ? 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <FiArchive className={activeStatusTab === 'closed' ? 'text-slate-500' : ''} />
              ปิดแล้ว
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeStatusTab === 'closed' ? 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
              }`}>{closedProjects.length}</span>
            </button>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-1.5"
          >
            <FiPlus /> <span className="hidden sm:inline">สร้างโปรเจ็ค</span><span className="sm:hidden">เพิ่ม</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-1 pb-4 custom-scrollbar">
        {loading ? (
          <div className="text-center text-slate-500 py-10">กำลังโหลด...</div>
        ) : groupedProjects.length === 0 ? (
          <div className="text-center bg-white dark:bg-slate-800 rounded-2xl p-10 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-soft transition-all">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              {activeStatusTab === 'closed' ? <FiArchive className="text-2xl text-slate-400" /> : <FiBriefcase className="text-2xl text-indigo-500" />}
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {activeStatusTab === 'closed' ? 'ยังไม่มีโปรเจ็คที่ปิดแล้ว' : 'ยังไม่มีโปรเจ็ค'}
            </h3>
            <p className="text-slate-500 mt-2">
              {activeStatusTab === 'closed' ? 'โปรเจ็คที่เปลี่ยนสถานะเป็น "ปิดแล้ว" จะมาปรากฏที่นี่' : 'สร้างโปรเจ็คเพื่อเริ่มติดตามเวลาการทำงานแบบต่อเนื่อง'}
            </p>
          </div>
        ) : (
          <div className="space-y-8 pb-6">
            {groupedProjects.map(group => (
              <div key={group.spaceId} className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <div className={`w-3 h-3 rounded-full bg-${group.spaceColor}-500`}></div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{group.spaceName}</h2>
                  <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{group.projects.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.projects.map(p => {
                    const coverImage = getCoverImage(p.Attachments);
                    const isClosed = p.Status === 'closed';
                    return (
                      <div key={p.Id} className={`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-soft transition-all flex flex-col h-full border border-slate-200 dark:border-slate-700 ${isClosed ? 'opacity-70' : ''}`}>
                        {coverImage && (
                          <div className="-mx-4 -mt-4 mb-3 h-32 md:h-40 overflow-hidden rounded-t-xl rounded-tr-xl">
                            <img src={coverImage} alt="Cover" className="w-full h-full object-cover transition-transform hover:scale-105" />
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <h3 className={`font-bold text-base ${isClosed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>{p.Title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${p.Status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                            {p.Status === 'active' ? 'ดำเนินการ' : 'ปิดแล้ว'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {p.Priority && (
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                              p.Priority === 'high' ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400' :
                              p.Priority === 'low' ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400' :
                              'bg-amber-50 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400'
                            }`}>
                              {p.Priority === 'high' ? 'ด่วน' : p.Priority === 'low' ? 'ต่ำ' : 'ปานกลาง'}
                            </span>
                          )}
                          {p.Assignee && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400">👤 {p.Assignee}</span>}
                          {p.Attachments && p.Attachments.length > 0 && (
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-500 dark:bg-sky-500/20 dark:text-sky-400 flex items-center gap-1">
                              <FiPaperclip className="w-2.5 h-2.5" /> {p.Attachments.length}
                            </span>
                          )}
                          {p.StartDate && p.DueDate && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 dark:bg-slate-700 dark:text-slate-300">📅 {p.StartDate} ถึง {p.DueDate}</span>}
                        </div>
                        <p className="text-slate-500 text-xs mb-3 line-clamp-2">{p.Description || 'ไม่มีรายละเอียด'}</p>
                        {p.Tags && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {p.Tags.split(',').map((t, i) => <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">{t.trim()}</span>)}
                          </div>
                        )}
                        {p.Checklist && p.Checklist.length > 0 && (
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                              <span>ความคืบหน้า</span>
                              <span>{getProgress(p.Checklist)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                              <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${getProgress(p.Checklist)}%` }}></div>
                            </div>
                            <div className="mt-2 space-y-1">
                              {p.Checklist.map((item, idx) => (
                                <div key={item.id} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                  <button
                                    disabled={!canEditProject(currentUser, p)}
                                    onClick={() => handleToggleChecklistInTab(p, idx)}
                                    className={`flex-shrink-0 w-4 h-4 rounded flex items-center justify-center border transition-colors ${item.isDone ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-400'} ${!canEditProject(currentUser, p) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    <FiCheckSquare className="w-3 h-3" />
                                  </button>
                                  <input
                                    disabled={!canEditProject(currentUser, p)}
                                    defaultValue={item.text}
                                    onBlur={(e) => { if (e.target.value.trim() !== '' && e.target.value !== item.text) handleEditChecklistInTab(p, idx, e.target.value); }}
                                    onKeyDown={(e) => { if(e.key === 'Enter') e.target.blur(); }}
                                    className={`flex-1 bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 dark:focus:border-indigo-500 outline-none px-1 transition-colors ${item.isDone ? 'line-through text-slate-400' : ''}`}
                                    title="คลิกเพื่อแก้ไข"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-auto">
                          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1.5 rounded-md font-medium text-xs mb-3">
                            <FiClock /> ใช้เวลา: {calculateTimeSpent(p.Id)}
                          </div>
                          <div className="flex gap-2">
                            {isUserInvolvedInProject(p) && (
                              <button
                                onClick={() => window.dispatchEvent(new CustomEvent('open-chat-room', { detail: { type: 'project', referenceId: p.Id }}))}
                                className="flex-none bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 px-2 py-1.5 rounded-md transition-colors" title="เปิดแชทโปรเจ็ค"
                              >
                                <FiMessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canEditProject(currentUser, p) && (
                              <button onClick={() => { setEditingProject(p); setIsModalOpen(true); }} className="flex-1 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded-md text-xs font-medium transition-colors">
                                แก้ไขโปรเจ็ค
                              </button>
                            )}
                            {canDeleteProject(currentUser, p) && (
                              <button onClick={() => setProjectToDelete(p.Id)} className="flex-none bg-white hover:bg-rose-50 dark:bg-slate-700 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded-md transition-colors" title="ลบโปรเจ็ค">
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProject(null); }}
        onSave={handleSubmit}
        initialData={editingProject}
        spaces={spaces}
        users={users}
      />
    </div>
  );
}
