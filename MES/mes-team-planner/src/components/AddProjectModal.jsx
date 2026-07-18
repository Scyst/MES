import React, { useState, useEffect } from 'react';
import { FiPlus, FiCheckSquare, FiTrash } from 'react-icons/fi';

export default function AddProjectModal({ isOpen, onClose, onSave, initialData, spaces = [] }) {
  const [activeModalTab, setActiveModalTab] = useState('general');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  
  const [formData, setFormData] = useState({
    title: '', description: '', status: 'active', assignee: '', 
    startDate: '', dueDate: '', tags: '', priority: 'normal', checklist: [], spaceId: ''
  });

  useEffect(() => {
    if (initialData && isOpen) {
      let parsedChecklist = [];
      try {
        if (initialData.Checklist) {
          parsedChecklist = typeof initialData.Checklist === 'string' ? JSON.parse(initialData.Checklist) : initialData.Checklist;
        } else if (initialData.checklist) {
          parsedChecklist = typeof initialData.checklist === 'string' ? JSON.parse(initialData.checklist) : initialData.checklist;
        }
      } catch (e) {
        console.error("Failed to parse checklist", e);
      }

      setFormData({
        title: initialData.Title || initialData.title || '',
        description: initialData.Description || initialData.description || '',
        status: initialData.Status || initialData.status || 'active',
        assignee: initialData.Assignee || initialData.assignee || '',
        startDate: initialData.StartDate || initialData.startDate || '',
        dueDate: initialData.DueDate || initialData.dueDate || '',
        tags: initialData.Tags || initialData.tags || '',
        priority: initialData.Priority || initialData.priority || 'normal',
        checklist: Array.isArray(parsedChecklist) ? parsedChecklist : [],
        spaceId: initialData.SpaceId || initialData.spaceId || '',
        Id: initialData.Id
      });
      setActiveModalTab('general');
    } else if (isOpen) {
      setFormData({ 
        title: '', description: '', status: 'active', assignee: '', 
        startDate: '', dueDate: '', tags: '', priority: 'normal', checklist: [], spaceId: ''
      });
      setNewChecklistItem('');
      setActiveModalTab('general');
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 animate-slide-up my-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{formData.Id ? 'แก้ไขโปรเจ็ค' : 'สร้างโปรเจ็คใหม่'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col h-full gap-4">
          <div className="flex border-b border-slate-200 dark:border-slate-800 -mx-6 px-4">
            <button 
              type="button"
              onClick={() => setActiveModalTab('general')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeModalTab === 'general' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-300'}`}
            >
              รายละเอียด
            </button>
            <button 
              type="button"
              onClick={() => setActiveModalTab('checklist')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeModalTab === 'checklist' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-300'}`}
            >
              Checklist
              {formData.checklist?.length > 0 && (
                <span className="bg-slate-100 dark:bg-slate-800 text-xs px-1.5 py-0.5 rounded-full">{formData.checklist.filter(s=>s.isDone).length}/{formData.checklist.length}</span>
              )}
            </button>
          </div>

          {activeModalTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อโปรเจ็ค</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">รายละเอียด</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500 h-24 resize-none" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ผู้รับผิดชอบ</label>
                  <input value={formData.assignee} onChange={e => setFormData({...formData, assignee: e.target.value})} placeholder="ชื่อผู้รับผิดชอบ..." className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ความสำคัญ</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500">
                    <option value="low">ต่ำ (Low)</option>
                    <option value="normal">ปานกลาง (Normal)</option>
                    <option value="high">ด่วน (High)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">วันที่เริ่ม</label>
                  <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">วันสิ้นสุด</label>
                  <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">แท็ก (คั่นด้วยลูกน้ำ ,)</label>
                  <input value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="ex. design, frontend" className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">สถานะ</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500">
                    <option value="active">ดำเนินการ (Active)</option>
                    <option value="closed">ปิดแล้ว (Closed)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ระบุ Team Space (ตัวเลือก)</label>
                <select value={formData.spaceId} onChange={e => setFormData({...formData, spaceId: e.target.value})} className="w-full border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500">
                  <option value="">-- ไม่ระบุ (อยู่ในหน้า Dashboard รวม) --</option>
                  {spaces.map(s => (
                    <option key={s.Id} value={s.Id}>{s.Name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeModalTab === 'checklist' && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Checklist งานในโปรเจ็ค</label>
              <div className="flex gap-2 mb-2">
                <input 
                  value={newChecklistItem}
                  onChange={e => setNewChecklistItem(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newChecklistItem.trim()) {
                        setFormData({
                          ...formData, 
                          checklist: [...formData.checklist, { id: Date.now().toString(), text: newChecklistItem.trim(), isDone: false }]
                        });
                        setNewChecklistItem('');
                      }
                    }
                  }}
                  placeholder="เพิ่มงานย่อย แล้วกด Enter หรือปุ่ม +" 
                  className="flex-1 border dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 outline-none focus:border-indigo-500" 
                />
                <button 
                  type="button"
                  onClick={() => {
                    if (newChecklistItem.trim()) {
                      setFormData({
                        ...formData, 
                        checklist: [...formData.checklist, { id: Date.now().toString(), text: newChecklistItem.trim(), isDone: false }]
                      });
                      setNewChecklistItem('');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 transition-colors"
                >
                  <FiPlus />
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {formData.checklist.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                    <button 
                      type="button"
                      onClick={() => {
                        const newList = [...formData.checklist];
                        newList[index].isDone = !newList[index].isDone;
                        setFormData({...formData, checklist: newList});
                      }}
                      className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors ${item.isDone ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-400'}`}
                    >
                      <FiCheckSquare className="w-3.5 h-3.5" />
                    </button>
                    <input 
                      value={item.text}
                      onChange={(e) => {
                        const newList = [...formData.checklist];
                        newList[index].text = e.target.value;
                        setFormData({...formData, checklist: newList});
                      }}
                      className={`flex-1 bg-transparent outline-none text-sm ${item.isDone ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const newList = formData.checklist.filter((_, i) => i !== index);
                        setFormData({...formData, checklist: newList});
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1 transition-colors"
                    >
                      <FiTrash />
                    </button>
                  </div>
                ))}
                {formData.checklist.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-2">ยังไม่มี Checklist</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">ยกเลิก</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">บันทึก</button>
          </div>
        </form>
      </div>
    </div>
  );
}
