import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiBriefcase, FiPlus, FiClock, FiTrash2, FiEdit2 } from 'react-icons/fi';

export default function ProjectsTab({ tasks, refreshData }) {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', status: 'active' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get('/api/projects.php');
      setProjects(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
    return `${hours} ชั่วโมง ${minutes} นาที`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.Id) {
        await axios.put(`/api/projects.php?id=${formData.Id}`, formData);
      } else {
        await axios.post('/api/projects.php', formData);
      }
      setIsModalOpen(false);
      setFormData({ title: '', description: '', status: 'active' });
      fetchProjects();
    } catch (e) {
      console.error(e);
      alert('Failed to save project');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ยืนยันการลบโปรเจ็คนี้? (งานที่ถูกเชื่อมโยงจะยังอยู่ แต่จะหลุดจากการอ้างอิงโปรเจ็ค)')) return;
    try {
      await axios.delete(`/api/projects.php?id=${id}`);
      refreshData();
      fetchProjects();
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FiBriefcase className="text-indigo-500" /> โปรเจ็ค
          </h1>
          <p className="text-slate-500 text-sm mt-1">จัดการโปรเจ็คระยะยาวและติดตามเวลาที่ใช้</p>
        </div>
        <button 
          onClick={() => { setFormData({ title: '', description: '', status: 'active' }); setIsModalOpen(true); }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium shadow-md transition-all active:scale-95"
        >
          <FiPlus /> สร้างโปรเจ็ค
        </button>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-10">กำลังโหลด...</div>
      ) : projects.length === 0 ? (
        <div className="text-center bg-white dark:bg-slate-800 rounded-2xl p-10 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="bg-indigo-50 dark:bg-indigo-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiBriefcase className="text-2xl text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">ยังไม่มีโปรเจ็ค</h3>
          <p className="text-slate-500 mt-2">สร้างโปรเจ็คเพื่อเริ่มติดตามเวลาการทำงานแบบต่อเนื่อง</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <div key={p.Id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">{p.Title}</h3>
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${p.Status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {p.Status === 'active' ? 'ดำเนินการ' : 'ปิดแล้ว'}
                </span>
              </div>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2 min-h-[40px]">{p.Description || 'ไม่มีรายละเอียด'}</p>
              
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 rounded-lg font-medium text-sm mb-4">
                <FiClock /> ใช้เวลาไปแล้ว: {calculateTimeSpent(p.Id)}
              </div>
              
              <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                <button onClick={() => { setFormData({ Id: p.Id, title: p.Title, description: p.Description, status: p.Status }); setIsModalOpen(true); }} className="p-2 text-slate-500 hover:text-sky-500 transition-colors">
                  <FiEdit2 />
                </button>
                <button onClick={() => handleDelete(p.Id)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{formData.Id ? 'แก้ไขโปรเจ็ค' : 'สร้างโปรเจ็คใหม่'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อโปรเจ็ค</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">รายละเอียด</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500 h-24 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">สถานะ</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500">
                  <option value="active">ดำเนินการ (Active)</option>
                  <option value="closed">ปิดแล้ว (Closed)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
