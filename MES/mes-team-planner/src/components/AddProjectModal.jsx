import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { FiPlus, FiCheckSquare, FiTrash, FiType } from 'react-icons/fi';
import ConfirmDialog from './common/ConfirmDialog';

export default function AddProjectModal({ isOpen, onClose, onSave, initialData, spaces = [] }) {
  const [activeModalTab, setActiveModalTab] = useState('general');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [attachmentsArr, setAttachmentsArr] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '', description: '', status: 'active', assignee: '', 
    startDate: '', dueDate: '', tags: '', priority: 'normal', checklist: [], spaceId: ''
  });
  const [initialFormState, setInitialFormState] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

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

      let parsedAttachments = [];
      try {
        if (initialData.Attachments) parsedAttachments = typeof initialData.Attachments === 'string' ? JSON.parse(initialData.Attachments) : initialData.Attachments;
        else if (initialData.attachments) parsedAttachments = typeof initialData.attachments === 'string' ? JSON.parse(initialData.attachments) : initialData.attachments;
      } catch (e) { console.error(e); }
      setAttachmentsArr(Array.isArray(parsedAttachments) ? parsedAttachments : []);

      const newFormData = {
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
      };
      setFormData(newFormData);
      setInitialFormState(JSON.stringify(newFormData));
      setActiveModalTab('general');
    } else if (isOpen) {
      const newFormData = { 
        title: '', description: '', status: 'active', assignee: '', 
        startDate: '', dueDate: '', tags: '', priority: 'normal', checklist: [], spaceId: ''
      };
      setFormData(newFormData);
      setInitialFormState(JSON.stringify(newFormData));
      setNewChecklistItem('');
      setAttachmentsArr([]);
      setActiveModalTab('general');
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await axios.post('/api/upload_attachment.php', fd);
      if (res.data && res.data.id) {
        setAttachmentsArr([...attachmentsArr, res.data]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.error || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
      e.target.value = null;
    }
  };

  const removeAttachment = (id) => {
    setAttachmentsArr(attachmentsArr.filter(a => a.id !== id));
  };

  const handleClose = () => {
    if (initialFormState && JSON.stringify(formData) !== initialFormState) {
      setShowConfirmClose(true);
      return;
    }
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let finalData = { ...formData };
    if (newChecklistItem.trim()) {
      finalData.checklist = [...finalData.checklist, { id: Date.now().toString(), text: newChecklistItem.trim(), isDone: false }];
      setNewChecklistItem('');
    }
    
    finalData.attachments = JSON.stringify(attachmentsArr);
    if (onSave) {
      onSave(finalData);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <ConfirmDialog 
      isOpen={showConfirmClose}
      title="ละทิ้งการเปลี่ยนแปลง?"
      message="คุณมีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก ต้องการปิดหน้าต่างนี้และละทิ้งการเปลี่ยนแปลงหรือไม่?"
      confirmText="ใช่, ปิดหน้าต่าง"
      cancelText="ยกเลิก"
      type="danger"
      onConfirm={() => {
        setShowConfirmClose(false);
        onClose();
      }}
      onCancel={() => setShowConfirmClose(false)}
    />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={handleClose}></div>
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 animate-scale-up shadow-2xl my-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">{formData.Id ? 'แก้ไขโปรเจ็ค' : 'สร้างโปรเจ็คใหม่'}</h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">✕</button>
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
            <button 
              type="button"
              onClick={() => setActiveModalTab('attachments')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeModalTab === 'attachments' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-300'}`}
            >
              แนบไฟล์
              {attachmentsArr?.length > 0 && (
                <span className="bg-slate-100 dark:bg-slate-800 text-xs px-1.5 py-0.5 rounded-full">{attachmentsArr.length}</span>
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

        {/* ATTACHMENTS TAB */}
        {activeModalTab === 'attachments' && (
          <div className="flex flex-col h-full max-h-[50vh]">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex flex-col items-center justify-center w-full">
                <label htmlFor="project-file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FiPlus className="w-8 h-8 mb-2 text-slate-500" />
                    <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">คลิกเพื่ออัปโหลด</span> หรือลากไฟล์มาวาง</p>
                    <p className="text-xs text-slate-500">PNG, JPG, PDF หรือเอกสาร (สูงสุด 10MB)</p>
                  </div>
                  <input id="project-file-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
                </label>
                {isUploading && <p className="text-xs text-pink-500 mt-2 animate-pulse">กำลังอัปโหลด...</p>}
              </div>

              {attachmentsArr.length > 0 && (
                <div className="flex flex-col gap-2 mt-4">
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">ไฟล์แนบทั้งหมด ({attachmentsArr.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {attachmentsArr.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {att.type.startsWith('image/') ? (
                            <img src={import.meta.env.BASE_URL + att.url} alt="thumbnail" className="w-10 h-10 object-cover rounded-md border border-slate-200 dark:border-slate-700" />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 text-xl border border-slate-200 dark:border-slate-700">
                              <FiType />
                            </div>
                          )}
                          <div className="flex flex-col overflow-hidden">
                            <a href={import.meta.env.BASE_URL + att.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate hover:text-sky-500 hover:underline">
                              {att.name}
                            </a>
                            <span className="text-[10px] text-slate-500">{(att.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeAttachment(att.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors">
                          <FiTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
    </>
  );
}
