import React, { useState, useEffect } from 'react';
import { FiX, FiTrash2, FiCalendar, FiClock, FiUser, FiEye, FiCheckCircle, FiType, FiFlag, FiAlignLeft, FiList, FiMessageSquare, FiTag, FiRefreshCw, FiPlus, FiSend, FiInfo } from 'react-icons/fi';
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
];

export default function AddTaskModal({ isOpen, onClose, onSave, onDelete, initialData }) {
  const [activeTab, setActiveTab] = useState('general');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [subtasksArr, setSubtasksArr] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  
  const [formData, setFormData] = useState({
    title: '', status: 'todo', visibility: 'public', assignee: '',
    startDate: '', dueDate: '', startTime: '09:00', endTime: '18:00',
    priority: 'normal', description: '', tags: '', recurrence: 'none'
  });

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
        title: '', status: 'todo', visibility: 'public', assignee: '',
        startDate: '', dueDate: '', startTime: '09:00', endTime: '18:00',
        priority: 'normal', description: '', tags: '', recurrence: 'none'
      });
      setSubtasksArr([]);
      setComments([]);
      setActiveTab('general');
    }
  }, [initialData, isOpen]);

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
        author: 'Me', // Ideally from auth, hardcoded for now
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
    onSave({
      ...formData,
      subtasks: JSON.stringify(subtasksArr)
    });
  };

  const isEditing = !!initialData?.Id;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-300/80 dark:border-slate-700/80 shadow-2xl shadow-black/50 max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex flex-col shrink-0">
          <div className="flex justify-between items-center px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800/80 dark:to-slate-900/80">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isEditing ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`}></div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isEditing ? 'แก้ไขงาน' : 'สร้างงานใหม่'}</h3>
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
              <FiList /> Checklist
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
            <form id="task-form" onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <FiType className="text-indigo-400" /> ชื่องาน
                </label>
                <input required name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-500 text-sm" placeholder="เช่น ตรวจสอบเครื่องจักร Line A..." />
              </div>

              {/* Priority & Recurrence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    <FiFlag className="text-rose-400" /> ความสำคัญ
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {PRIORITY_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setFormData({ ...formData, priority: opt.value })} className={`text-center py-2 px-1 rounded-xl text-[10px] font-semibold transition-all border active:scale-95 ${formData.priority === opt.value ? `${opt.color}/20 ${opt.ring} ring-2 border-transparent text-slate-900 dark:text-white` : 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700/80'}`}>
                        <div className={`w-2 h-2 rounded-full ${opt.dot} mx-auto mb-1`}></div>
                        <span className="leading-tight block">{opt.label.split(' ')[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    <FiRefreshCw className="text-sky-400" /> งานทำซ้ำ (Auto-spawn)
                  </label>
                  <div className="relative">
                    <select name="recurrence" value={formData.recurrence} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm appearance-none cursor-pointer">
                      {RECURRENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▾</div>
                  </div>
                </div>
              </div>

              {/* Status, Visibility, Assignee */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"><FiCheckCircle className="text-emerald-400" /> สถานะ</label>
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
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"><FiEye className="text-sky-400" /> สิทธิ์</label>
                  <div className="relative">
                    <select name="visibility" value={formData.visibility} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm appearance-none cursor-pointer">
                      <option value="public">🌐 Public</option>
                      <option value="private">🔒 Private</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▾</div>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"><FiUser className="text-violet-400" /> รับผิดชอบ</label>
                  <input name="assignee" value={formData.assignee} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm placeholder-slate-500" placeholder="ชื่อ..." />
                </div>
              </div>

              {/* Description & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"><FiAlignLeft className="text-cyan-400" /> รายละเอียด</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm resize-none placeholder-slate-500" placeholder="หมายเหตุ, ขั้นตอน..." />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"><FiTag className="text-pink-400" /> แท็ก (Tags)</label>
                  <textarea name="tags" value={formData.tags} onChange={handleChange} rows={3} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm resize-none placeholder-slate-500" placeholder="คั่นด้วยลูกน้ำ เช่น ซ่อมบำรุง,ด่วน,ประชุม..." />
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800"></div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"><FiCalendar className="text-green-400" /> เริ่มต้น</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" name="startDate" value={formData.startDate || ''} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                    <input type="time" name="startTime" value={formData.startTime || '09:00'} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"><FiClock className="text-orange-400" /> สิ้นสุด</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" name="dueDate" value={formData.dueDate || ''} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                    <input type="time" name="endTime" value={formData.endTime || '18:00'} onChange={handleChange} className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-2 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* CHECKLIST TAB */}
          {activeTab === 'checklist' && (
            <div className="p-5 space-y-4">
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
