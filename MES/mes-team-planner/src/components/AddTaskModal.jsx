import React, { useState, useEffect } from 'react';
import { FiX, FiTrash2, FiCalendar, FiClock, FiUser, FiEye, FiCheckCircle, FiType, FiFlag, FiAlignLeft, FiList, FiMessageSquare, FiTag, FiRefreshCw, FiPlus, FiSend, FiInfo, FiBriefcase } from 'react-icons/fi';
import MultiSelectInput from './common/MultiSelectInput';
import axios from 'axios';

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: '🔴 ด่วนมาก', color: 'bg-red-500', dot: 'bg-red-400', ring: 'ring-red-500/30' },
  { value: 'high', label: '🟠 ด่วน', color: 'bg-orange-500', dot: 'bg-orange-400', ring: 'ring-orange-500/30' },
  { value: 'normal', label: '🟡 ปกติ', color: 'bg-yellow-500', dot: 'bg-yellow-400', ring: 'ring-yellow-500/30' },
  { value: 'low', label: '🟢 ต่ำ', color: 'bg-green-500', dot: 'bg-green-400', ring: 'ring-green-500/30' },
];

const RECURRENCE_OPTIONS = [
  { value: 'none', label: '❌ ไม่ทำซ้ำ' },
  { value: 'daily', label: '📅 ทำซ้ำทุกวัน' },
  { value: 'weekly', label: '📆 ทำซ้ำทุกสัปดาห์' },
  { value: 'monthly', label: '🗓️ ทำซ้ำทุกเดือน' },
  { value: 'custom', label: '⚙️ กำหนดวันเอง' },
];

const WEEK_DAYS = [
  { value: 1, label: 'จ' },
  { value: 2, label: 'อ' },
  { value: 3, label: 'พ' },
  { value: 4, label: 'พฤ' },
  { value: 5, label: 'ศ' },
  { value: 6, label: 'ส' },
  { value: 0, label: 'อา' },
];

export default function AddTaskModal({ isOpen, onClose, onSave, onDelete, initialData, currentUser, tasks = [] }) {
  const [activeTab, setActiveTab] = useState('general');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [subtasksArr, setSubtasksArr] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  
  const [formData, setFormData] = useState({
    title: '', status: 'todo', visibility: 'public', assignee: '',
    startDate: '', dueDate: '', startTime: '09:00', endTime: '18:00',
    startDate: '', dueDate: '', startTime: '09:00', endTime: '18:00',
    priority: 'normal', description: '', tags: '', recurrence: 'none',
    recurrenceDays: [], recurrenceEndDate: '', projectId: '', projectChecklistId: ''
  });
  const [projectsList, setProjectsList] = useState([]);

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        title: initialData.Title || initialData.title || '',
        status: initialData.Status || initialData.status || 'todo',
        visibility: initialData.Visibility || initialData.visibility || 'public',
        assignee: initialData.Assignee || initialData.assignee || '',
        startDate: initialData.startDate || initialData.StartDate || '',
        dueDate: initialData.dueDate || initialData.DueDate || '',
        startTime: initialData.startTime || initialData.StartTime || '09:00',
        endTime: initialData.endTime || initialData.EndTime || '18:00',
        priority: initialData.priority || initialData.Priority || 'normal',
        description: initialData.description || initialData.Description || '',
        tags: initialData.tags || initialData.Tags || '',
        recurrence: initialData.recurrence || initialData.Recurrence || 'none',
        projectId: initialData.projectId || initialData.ProjectId || '',
        projectChecklistId: initialData.projectChecklistId || initialData.ProjectChecklistId || '',
        Id: initialData.Id
      });
      
      try {
        const parsed = JSON.parse(initialData.subtasks || initialData.Subtasks || '[]');
        setSubtasksArr(parsed);
      } catch (e) {
        setSubtasksArr([]);
      }

      if (initialData.Id) {
        fetchComments(initialData.Id);
      } else {
        setComments([]);
      }
    } else if (isOpen) {
      setFormData({
        title: '', status: 'todo', visibility: 'public', assignee: currentUser?.fullname || currentUser?.username || '',
        startDate: '', dueDate: '', startTime: '09:00', endTime: '18:00',
        priority: 'normal', description: '', tags: '', recurrence: 'none',
        recurrenceDays: [], recurrenceEndDate: '', projectId: '', projectChecklistId: ''
      });
      setSubtasksArr([]);
      setComments([]);
      setNewComment('');
      setActiveTab('general');
    }
  }, [isOpen, initialData]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      axios.get('/api/projects.php').then(res => {
        const formatted = res.data.map(p => ({
          ...p,
          Checklist: p.Checklist ? (typeof p.Checklist === 'string' ? JSON.parse(p.Checklist) : p.Checklist) : []
        }));
        setProjectsList(formatted);
      }).catch(console.error);
    }
  }, [isOpen]);

  const fetchComments = async (taskId) => {
    try {
      const res = await axios.get(`/api/tasks/${taskId}/comments`);
      setComments(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProjectChange = (e) => {
    const val = e.target.value;
    const selectedProj = projectsList.find(p => p.Id == val);
    setFormData({
      ...formData,
      projectId: val,
      projectChecklistId: '',
      title: (selectedProj && !formData.title) ? selectedProj.Title : formData.title
    });
  };

  const handleChecklistChange = (e) => {
    const val = e.target.value;
    const selectedProj = projectsList.find(p => p.Id == formData.projectId);
    const selectedItem = selectedProj?.Checklist?.find(c => c.id == val);
    setFormData({
      ...formData,
      projectChecklistId: val,
      title: (selectedItem && selectedProj) ? `${selectedProj.Title} - ${selectedItem.text}` : formData.title
    });
  };

  const handleSaveSubtask = (e) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    const newTask = { id: Date.now(), title: newSubtask, completed: false };
    setSubtasksArr([...subtasksArr, newTask]);
    setNewSubtask('');
  };

  const toggleSubtask = (id) => {
    setSubtasksArr(subtasksArr.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
  };

  const deleteSubtask = (id) => {
    setSubtasksArr(subtasksArr.filter(st => st.id !== id));
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !formData.Id) return;
    try {
      const res = await axios.post(`/api/tasks/${formData.Id}/comments`, {
        author: currentUser?.fullname || currentUser?.username || 'Unknown',
        message: newComment
      });
      setComments([...comments, res.data]);
      setNewComment('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEditing && formData.recurrence !== 'none' && formData.recurrenceEndDate && formData.startDate) {
      let tasksToCreate = [];
      let current = new Date(formData.startDate);
      const end = new Date(formData.recurrenceEndDate);
      let safetyCounter = 0;
      
      while (current <= end && safetyCounter < 100) {
        let shouldCreate = false;
        if (formData.recurrence === 'daily') shouldCreate = true;
        else if (formData.recurrence === 'weekly') {
          if (current.getDay() === new Date(formData.startDate).getDay()) shouldCreate = true;
        }
        else if (formData.recurrence === 'monthly') {
          if (current.getDate() === new Date(formData.startDate).getDate()) shouldCreate = true;
        }
        else if (formData.recurrence === 'custom') {
          if ((formData.recurrenceDays || []).includes(current.getDay())) shouldCreate = true;
        }
        
        if (shouldCreate) {
          const dateStr = current.getFullYear() + '-' + String(current.getMonth()+1).padStart(2, '0') + '-' + String(current.getDate()).padStart(2, '0');
          let dueDateStr = dateStr;
          if (formData.dueDate) {
            const startD = new Date(formData.startDate);
            const dueD = new Date(formData.dueDate);
            const diffDays = Math.round((dueD - startD) / (1000 * 3600 * 24));
            let newDue = new Date(current);
            newDue.setDate(newDue.getDate() + diffDays);
            dueDateStr = newDue.getFullYear() + '-' + String(newDue.getMonth()+1).padStart(2, '0') + '-' + String(newDue.getDate()).padStart(2, '0');
          }
          tasksToCreate.push({
            ...formData,
            startDate: dateStr,
            dueDate: dueDateStr,
            subtasks: JSON.stringify(subtasksArr)
          });
          safetyCounter++;
        }
        current.setDate(current.getDate() + 1);
      }
      
      if (tasksToCreate.length > 0) {
        onSave(tasksToCreate);
      } else {
        onSave({ ...formData, subtasks: JSON.stringify(subtasksArr) });
      }
    } else {
      onSave({
        ...formData,
        subtasks: JSON.stringify(subtasksArr)
      });
    }
  };

  const isEditing = !!initialData?.Id;

  // Extract unique assignees from tasks array for autocomplete
  const uniqueAssignees = Array.from(new Set(
    tasks
      .flatMap(t => (t.Assignee || t.assignee || '').split(','))
      .map(a => a.trim())
      .filter(a => a !== '')
  )).sort();

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex flex-col shrink-0">
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isEditing ? 'bg-amber-400' : 'bg-indigo-500'}`}></div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{isEditing ? 'แก้ไขงาน' : 'สร้างงานใหม่'}</h3>
            </div>
            <button onClick={onClose} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-all active:scale-90">
              <FiX className="text-lg" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-2 bg-white dark:bg-slate-900/50">
            <button 
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'general' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-300'}`}
            >
              <FiAlignLeft /> รายละเอียด
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'checklist' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-300'}`}
            >
              <FiList /> งานย่อย & โปรเจ็ค
              {subtasksArr.length > 0 && (
                <span className="ml-1 bg-slate-100 dark:bg-slate-800 text-xs px-1.5 py-0.5 rounded-full">{subtasksArr.filter(s=>s.completed).length}/{subtasksArr.length}</span>
              )}
            </button>
            {isEditing && (
              <button 
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'comments' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-300'}`}
              >
                <FiMessageSquare /> พูดคุย
                {comments.length > 0 && <span className="ml-1 bg-slate-100 dark:bg-slate-800 text-xs px-1.5 py-0.5 rounded-full">{comments.length}</span>}
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <form id="task-form" onSubmit={handleSubmit} className="p-5 flex flex-col h-full gap-4">
              
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">ชื่องาน</label>
                <input required name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-500 text-sm" placeholder="เช่น ตรวจสอบเครื่องจักร Line A..." />
              </div>

              {/* Description */}
              <div className="flex flex-col flex-1 min-h-[120px]">
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">รายละเอียด</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="flex-1 w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm resize-none placeholder-slate-500" placeholder="หมายเหตุ, ขั้นตอน..." />
              </div>

              {/* Status, Priority, Assignee */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">สถานะ</label>
                  <div className="relative">
                    <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm appearance-none cursor-pointer">
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▾</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">ความสำคัญ</label>
                  <div className="relative">
                    <select name="priority" value={formData.priority} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm appearance-none cursor-pointer">
                      <option value="urgent">🔴 ด่วนมาก</option>
                      <option value="high">🟠 ด่วน</option>
                      <option value="normal">🟡 ปกติ</option>
                      <option value="low">🟢 ต่ำ</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▾</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">ผู้รับผิดชอบ</label>
                  <MultiSelectInput 
                    value={formData.assignee}
                    onChange={(val) => setFormData(prev => ({ ...prev, assignee: val }))}
                    suggestions={uniqueAssignees}
                    placeholder="พิมพ์ชื่อ..."
                  />
                </div>
              </div>


              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">เริ่มต้น</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" name="startDate" value={formData.startDate || ''} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                    <input type="time" name="startTime" value={formData.startTime || '09:00'} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">สิ้นสุด</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" name="dueDate" value={formData.dueDate || ''} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                    <input type="time" name="endTime" value={formData.endTime || '18:00'} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800"></div>

              {/* Tags, Visibility, Recurrence */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">แท็ก (Tags)</label>
                  <MultiSelectInput 
                    value={formData.tags || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, tags: val }))}
                    suggestions={['ด่วน', 'ประชุม', 'โปรเจกต์', 'ปัญหา', 'ออกแบบ', 'พัฒนาระบบ']}
                    placeholder="ค้นหาหรือพิมพ์แท็ก..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">สิทธิ์</label>
                  <div className="relative">
                    <select name="visibility" value={formData.visibility} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm appearance-none cursor-pointer">
                      <option value="public">🌐 Public</option>
                      <option value="private">🔒 Private</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▾</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">งานทำซ้ำ</label>
                  <div className="relative">
                    <select name="recurrence" value={formData.recurrence} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm appearance-none cursor-pointer">
                      {RECURRENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▾</div>
                  </div>
                </div>
              </div>

              {formData.recurrence !== 'none' && !isEditing && (
                <div className="bg-indigo-50/50 dark:bg-indigo-500/10 rounded-xl p-4 border border-indigo-100 dark:border-indigo-500/20 space-y-4">
                  {formData.recurrence === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">เลือกวันทำซ้ำ</label>
                      <div className="flex flex-wrap gap-2">
                        {WEEK_DAYS.map(day => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              const days = formData.recurrenceDays || [];
                              const newDays = days.includes(day.value) ? days.filter(d => d !== day.value) : [...days, day.value];
                              setFormData({ ...formData, recurrenceDays: newDays });
                            }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all ${(formData.recurrenceDays || []).includes(day.value) ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 hover:border-indigo-400'}`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">สิ้นสุดการทำซ้ำ (End Date)</label>
                    <input type="date" required={formData.recurrence !== 'none' && !isEditing} name="recurrenceEndDate" value={formData.recurrenceEndDate || ''} onChange={handleChange} className="w-full md:w-1/2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  </div>
                </div>
              )}

            </form>
          )}

          {/* CHECKLIST TAB */}
          {activeTab === 'checklist' && (
            <div className="p-5 space-y-6">
              
              {/* Projects Integration */}
              <div className="bg-indigo-50/50 dark:bg-indigo-500/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-500/20">
                <label className="block text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-1.5 flex items-center gap-2">
                  <FiBriefcase /> ผูกกับโปรเจ็ค (ทางเลือก)
                </label>
                <div className="relative mb-3">
                  <select name="projectId" value={formData.projectId} onChange={handleProjectChange} className="w-full bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-500/30 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm appearance-none cursor-pointer">
                    <option value="">-- ไม่ผูกกับโปรเจ็ค --</option>
                    {projectsList.filter(p => p.Status === 'active' || p.Id == formData.projectId).map(p => (
                      <option key={p.Id} value={p.Id}>{p.Title}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▾</div>
                </div>

                {formData.projectId && (
                  <div>
                    <label className="block text-xs font-medium text-indigo-700 dark:text-indigo-400 mb-1.5">Checklist ในโปรเจ็คที่ยังไม่เสร็จ</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {projectsList.find(p => p.Id == formData.projectId)?.Checklist?.filter(c => !c.isDone)?.length > 0 ? (
                        projectsList.find(p => p.Id == formData.projectId)?.Checklist?.filter(c => !c.isDone)?.map(c => {
                          const isAdded = subtasksArr.some(st => st.projectChecklistId === c.id);
                          return (
                            <div key={c.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-lg border border-indigo-100 dark:border-indigo-500/20">
                              <span className="text-sm text-slate-700 dark:text-slate-300 truncate mr-2 flex-1" title={c.text}>{c.text}</span>
                              <button
                                type="button"
                                disabled={isAdded}
                                onClick={() => {
                                  setSubtasksArr([...subtasksArr, {
                                    id: Date.now().toString() + Math.random(),
                                    text: c.text,
                                    completed: false,
                                    projectChecklistId: c.id
                                  }]);
                                }}
                                className={`flex-shrink-0 px-2 py-1 rounded-md text-xs font-medium transition-colors ${isAdded ? 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500/40'}`}
                              >
                                {isAdded ? 'ดึงแล้ว' : '+ ดึง'}
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 p-2 rounded-lg border border-dashed border-indigo-200 dark:border-indigo-500/20 text-center">ไม่มี Checklist ที่รอทำ</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Internal Subtasks */}
              <div className="bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-300/50 dark:border-slate-700/50">
                <form onSubmit={handleSaveSubtask} className="flex gap-2 mb-4">
                  <input 
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    placeholder="เพิ่มงานย่อยใหม่..."
                  />
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-1 transition-colors">
                    <FiPlus /> เพิ่ม
                  </button>
                </form>

                {subtasksArr.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-4">ยังไม่มีรายการย่อย</div>
                ) : (
                  <div className="space-y-2">
                    {subtasksArr.map((st) => (
                      <div key={st.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${st.completed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:border-slate-500'}`}>
                        <button 
                          onClick={() => toggleSubtask(st.id)}
                          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${st.completed ? 'bg-emerald-500 border-emerald-500 text-slate-900 dark:text-white' : 'border-slate-500 text-transparent hover:border-emerald-400'}`}
                        >
                          <FiCheckCircle className="text-sm" />
                        </button>
                        <span className={`flex-1 text-sm transition-all ${st.completed ? 'text-emerald-400/70 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                          {st.title}
                        </span>
                        <button onClick={() => deleteSubtask(st.id)} className="text-slate-500 hover:text-rose-400 transition-colors">
                          <FiTrash2 />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <FiInfo className="shrink-0" /> อย่าลืมกด <b>บันทึก</b> ที่มุมขวาล่างเพื่อเซฟ Checklist นี้นะครับ
              </div>
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && (
            <div className="flex flex-col h-full max-h-[50vh]">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center text-slate-500 text-sm py-10">เริ่มพูดคุยในงานนี้เลย!</div>
                ) : (
                  comments.map(c => (
                    <div key={c.Id} className="flex flex-col bg-slate-100/80 dark:bg-slate-800/80 rounded-tr-2xl rounded-bl-2xl rounded-br-2xl p-3 border border-slate-300/50 dark:border-slate-700/50 max-w-[90%]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sky-400 text-xs">{c.Author}</span>
                        <span className="text-[10px] text-slate-500">{new Date(c.CreatedAt).toLocaleString('th-TH')}</span>
                      </div>
                      <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{c.Message}</p>
                    </div>
                  ))
                )}
              </div>
              
              <form onSubmit={handlePostComment} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex gap-2">
                  <input 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-slate-600 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-sky-500"
                    placeholder="พิมพ์คอมเมนต์..."
                  />
                  <button type="submit" disabled={!newComment.trim()} className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors">
                    <FiSend /> ส่ง
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 shrink-0">
          <div className="flex items-center justify-between">
            {isEditing && onDelete ? (
              <button type="button" onClick={() => onDelete(formData.Id)} className="text-rose-400 hover:text-rose-300 flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 transition-all text-sm font-medium active:scale-95">
                <FiTrash2 /> ลบงาน
              </button>
            ) : <div></div>}
            
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-sm font-medium active:scale-95">
                ยกเลิก
              </button>
              {/* Only submit the form if we are on general tab, or just use a button that triggers handleSubmit directly */}
              <button type="button" onClick={handleSubmit} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-semibold shadow-lg shadow-indigo-900/30 transition-all active:scale-95 text-sm flex items-center gap-2">
                {isEditing ? '💾 บันทึกทั้งหมด' : '✨ สร้างงาน'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
