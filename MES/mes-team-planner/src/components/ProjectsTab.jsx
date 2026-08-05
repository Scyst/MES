import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiBriefcase, FiPlus, FiClock, FiTrash2, FiEdit2, FiCheckSquare, FiTrash, FiCheckCircle, FiPaperclip } from 'react-icons/fi';
import AddProjectModal from './AddProjectModal';
import { canEditProject, canDeleteProject } from '../utils/permissions';

export default function ProjectsTab({ currentUser, tasks, spaces = [], refreshData }) {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
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
  };

  const getProgress = (checklist) => {
    if (!checklist || checklist.length === 0) return 0;
    const completed = checklist.filter(c => c.isDone).length;
    return Math.round((completed / checklist.length) * 100);
  };

  const calculateTimeSpent = (projectId) => {
    const projectTasks = tasks.filter(t => t.ProjectId == projectId || t.projectId == projectId);
    let totalMinutes = 0;
    projectTasks.forEach(t => {
      if (t.StartTime && t.EndTime) {
        const [startH, startM] = t.StartTime.split(':').map(Number);
        const [endH, endM] = t.EndTime.split(':').map(Number);
        const start = startH * 60 + startM;
        let end = endH * 60 + endM;
        if (end < start) end += 24 * 60;
        totalMinutes += (end - start);
      } else if (t.startTime && t.endTime) {
        const [startH, startM] = t.startTime.split(':').map(Number);
        const [endH, endM] = t.endTime.split(':').map(Number);
        const start = startH * 60 + startM;
        let end = endH * 60 + endM;
        if (end < start) end += 24 * 60;
        totalMinutes += (end - start);
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} เธเธฑเนเธงเนเธกเธ ${minutes} เธเธฒเธ—เธต`;
  };

  const handleSubmit = async (projectData) => {
    try {
      const payload = {
        ...projectData,
        checklist: JSON.stringify(projectData.checklist)
      };
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

  const handleDelete = async (id) => {
    if (!window.confirm('เธขเธทเธเธขเธฑเธเธเธฒเธฃเธฅเธเนเธเธฃเน€เธเนเธเธเธตเน? (เธเธฒเธเธ—เธตเนเธ–เธนเธเน€เธเธทเนเธญเธกเนเธขเธเธเธฐเธขเธฑเธเธญเธขเธนเน เนเธ•เนเธเธฐเธซเธฅเธธเธ”เธเธฒเธเธเธฒเธฃเธญเนเธฒเธเธญเธดเธเนเธเธฃเน€เธเนเธ)')) return;
    try {
      await axios.delete(`/api/projects.php?id=${id}`);
      fetchProjects();
      if (refreshData) refreshData();
    } catch(e) {
      console.error(e);
    }
  };

  const handleEditChecklistInTab = async (project, itemIndex, newText) => {
    try {
      const newChecklist = [...(project.Checklist || [])];
      newChecklist[itemIndex].text = newText;
      await axios.put(`/api/projects.php?id=${project.Id}`, {
        checklist: JSON.stringify(newChecklist)
      });
      fetchProjects();
      if (refreshData) refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleChecklistInTab = async (project, itemIndex) => {
    try {
      const newChecklist = [...(project.Checklist || [])];
      newChecklist[itemIndex].isDone = !newChecklist[itemIndex].isDone;
      await axios.put(`/api/projects.php?id=${project.Id}`, {
        checklist: JSON.stringify(newChecklist)
      });
      fetchProjects();
      if (refreshData) refreshData();
    } catch (e) {
      console.error(e);
      alert('Failed to update checklist');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-row flex-wrap items-center justify-end md:justify-between gap-3 shrink-0 mb-4 px-1">
        <h2 className="hidden md:flex text-lg md:text-xl font-bold text-slate-900 dark:text-white items-center gap-2">
          <span className="text-indigo-400">๐’ผ</span> เนเธเธฃเน€เธเนเธ
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-1.5"
          >
            <FiPlus /> <span className="hidden sm:inline">เธชเธฃเนเธฒเธเนเธเธฃเน€เธเนเธ</span><span className="sm:hidden">เน€เธเธดเนเธก</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 pb-4 custom-scrollbar">

      {loading ? (
        <div className="text-center text-slate-500 py-10">เธเธณเธฅเธฑเธเนเธซเธฅเธ”...</div>
      ) : projects.length === 0 ? (
        <div className="text-center bg-white dark:bg-slate-800 rounded-2xl p-10 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-soft transition-all">
          <div className="bg-indigo-50 dark:bg-indigo-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FiBriefcase className="text-2xl text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">เธขเธฑเธเนเธกเนเธกเธตเนเธเธฃเน€เธเนเธ</h3>
          <p className="text-slate-500 mt-2">เธชเธฃเนเธฒเธเนเธเธฃเน€เธเนเธเน€เธเธทเนเธญเน€เธฃเธดเนเธกเธ•เธดเธ”เธ•เธฒเธกเน€เธงเธฅเธฒเธเธฒเธฃเธ—เธณเธเธฒเธเนเธเธเธ•เนเธญเน€เธเธทเนเธญเธ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {projects.map(p => (
            <div key={p.Id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-soft transition-all flex flex-col h-full border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{p.Title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${p.Status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-50 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {p.Status === 'active' ? 'เธ”เธณเน€เธเธดเธเธเธฒเธฃ' : 'เธเธดเธ”เนเธฅเนเธง'}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-2">
                {p.Priority && (
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                    p.Priority === 'high' ? 'bg-rose-50 text-rose-500 dark:bg-rose-500/20 dark:text-rose-400' : 
                    p.Priority === 'low' ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/20 dark:text-indigo-400' : 
                    'bg-amber-50 text-amber-500 dark:bg-amber-500/20 dark:text-amber-400'
                  }`}>
                    {p.Priority === 'high' ? 'เธ”เนเธงเธ' : p.Priority === 'low' ? 'เธ•เนเธณ' : 'เธเธฒเธเธเธฅเธฒเธ'}
                  </span>
                )}
                {p.Assignee && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400">๐‘ค {p.Assignee}</span>}
                {p.Attachments && p.Attachments.length > 0 && (
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-500 dark:bg-sky-500/20 dark:text-sky-400 flex items-center gap-1">
                    <FiPaperclip className="w-2.5 h-2.5" /> {p.Attachments.length}
                  </span>
                )}
                {p.StartDate && p.DueDate && <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 dark:bg-slate-700 dark:text-slate-300">๐“… {p.StartDate} เธ–เธถเธ {p.DueDate}</span>}
              </div>

              <p className="text-slate-500 text-xs mb-3 line-clamp-2">{p.Description || 'เนเธกเนเธกเธตเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”'}</p>
              
              {p.Tags && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.Tags.split(',').map((t, i) => <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">{t.trim()}</span>)}
                </div>
              )}
              
              {p.Checklist && p.Checklist.length > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <span>เธเธงเธฒเธกเธเธทเธเธซเธเนเธฒ</span>
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
                        <span className={`line-clamp-1 ${item.isDone ? 'line-through text-slate-400' : ''}`}>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1.5 rounded-md font-medium text-xs mb-3">
                  <FiClock /> เนเธเนเน€เธงเธฅเธฒ: {calculateTimeSpent(p.Id)}
                </div>
                
                <div className="flex gap-2">
                  {canEditProject(currentUser, p) && (
                    <button onClick={() => { setEditingProject(p); setIsModalOpen(true); }} className="flex-1 bg-white hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded-md text-xs font-medium transition-colors">
                      เนเธเนเนเธเนเธเธฃเน€เธเนเธ
                    </button>
                  )}
                  {canDeleteProject(currentUser, p) && (
                    <button onClick={() => handleDeleteProject(p.Id)} className="flex-none bg-white hover:bg-rose-50 dark:bg-slate-700 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 border border-slate-300 dark:border-slate-600 px-2 py-1.5 rounded-md transition-colors" title="เธฅเธเนเธเธฃเน€เธเนเธ">
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
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
      />
    </div>
  );
}

