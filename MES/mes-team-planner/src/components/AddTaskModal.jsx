import React, { useState, useEffect } from 'react';
import { FiX, FiTrash2, FiCalendar, FiClock, FiUser, FiEye, FiCheckCircle, FiCheckSquare, FiType, FiFlag, FiAlignLeft, FiList, FiMessageSquare, FiTag, FiRefreshCw, FiPlus, FiSend, FiInfo, FiBriefcase } from 'react-icons/fi';
import MultiSelectInput from './common/MultiSelectInput';
import axios from 'axios';
import { canEditTask, canDeleteTask } from '../utils/permissions';
import ConfirmDialog from './common/ConfirmDialog';

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: '๐”ด เธ”เนเธงเธเธกเธฒเธ', color: 'bg-red-500', dot: 'bg-red-400', ring: 'ring-red-500/30' },
  { value: 'high', label: '๐  เธ”เนเธงเธ', color: 'bg-orange-500', dot: 'bg-orange-400', ring: 'ring-orange-500/30' },
  { value: 'normal', label: '๐ก เธเธเธ•เธด', color: 'bg-yellow-500', dot: 'bg-yellow-400', ring: 'ring-yellow-500/30' },
  { value: 'low', label: '๐ข เธ•เนเธณ', color: 'bg-green-500', dot: 'bg-green-400', ring: 'ring-green-500/30' },
];

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'โ เนเธกเนเธ—เธณเธเนเธณ' },
  { value: 'daily', label: '๐“… เธ—เธณเธเนเธณเธ—เธธเธเธงเธฑเธ' },
  { value: 'weekly', label: '๐“ เธ—เธณเธเนเธณเธ—เธธเธเธชเธฑเธเธ”เธฒเธซเน' },
  { value: 'monthly', label: '๐—“๏ธ เธ—เธณเธเนเธณเธ—เธธเธเน€เธ”เธทเธญเธ' },
  { value: 'custom', label: 'โ๏ธ เธเธณเธซเธเธ”เธงเธฑเธเน€เธญเธ' },
];

const WEEK_DAYS = [
  { value: 1, label: 'เธ' },
  { value: 2, label: 'เธญ' },
  { value: 3, label: 'เธ' },
  { value: 4, label: 'เธเธค' },
  { value: 5, label: 'เธจ' },
  { value: 6, label: 'เธช' },
  { value: 0, label: 'เธญเธฒ' },
];

const TimeInput24 = ({ name, value, onChange, disabled, className }) => {
  const [inputType, setInputType] = React.useState('text');

  const handleChange = (e) => {
    let val = e.target.value;
    if (inputType === 'text') {
      val = val.replace(/[^0-9:]/g, '');
      if (val.length > 5) val = val.slice(0, 5);
      
      // Auto-insert colon
      if (val.length === 3 && !val.includes(':')) {
        val = val.slice(0, 2) + ':' + val.slice(2);
      }
    }
    
    onChange({ target: { name, value: val } });
  };

  const handleBlur = (e) => {
    setInputType('text');
    let val = e.target.value;
    if (val && !val.includes(':')) {
      val = val.replace(/[^0-9]/g, '');
      if (val.length > 0) {
        if (val.length === 1) {
          val = '0' + val + '00';
        } else if (val.length === 2) {
          val = val + '00';
        } else if (val.length === 3) {
          val = '0' + val;
        }
        const h = Math.min(parseInt(val.slice(0, 2) || '0', 10), 23).toString().padStart(2, '0');
        const m = Math.min(parseInt(val.slice(2, 4) || '0', 10), 59).toString().padStart(2, '0');
        val = `${h}:${m}`;
      }
    }
    if (!val) val = '00:00';
    onChange({ target: { name, value: val } });
  };

  const handleFocus = () => {
    setInputType('time');
  };

  return (
    <input
      type={inputType}
      name={name}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      disabled={disabled}
      placeholder="HH:MM"
      className={className}
      maxLength={5}
    />
  );
};

export default function AddTaskModal({ isOpen, onClose, onSave, onDelete, initialData, currentUser, tasks = [], users = [], isProjectTask = false, projectId = null }) {
  const [activeTab, setActiveTab] = useState('general');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [subtasksArr, setSubtasksArr] = useState([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [checklistsArr, setChecklistsArr] = useState([]);
  const [attachmentsArr, setAttachmentsArr] = useState([]);
  const [initialAttachmentsState, setInitialAttachmentsState] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState(null);
  const [attachmentsToDeleteOnSave, setAttachmentsToDeleteOnSave] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '', status: 'todo', visibility: 'public', assignee: '',
    startDate: '', dueDate: '', startTime: '09:00', endTime: '18:00',
    priority: 'normal', description: '', tags: '', recurrence: 'none',
    recurrenceDays: [], recurrenceDates: [], recurrenceEndDate: '', recurrenceDuration: '1m', projectId: '', projectChecklistId: '', groupId: '', updateSeries: false
  });
  const [initialFormState, setInitialFormState] = useState(null);
  const [initialSubtasksState, setInitialSubtasksState] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [projectsList, setProjectsList] = useState([]);
  const isEditable = canEditTask(currentUser, initialData);
  const canDelete = canDeleteTask(currentUser, initialData);

  useEffect(() => {
    if (initialData && isOpen) {
      const newFormData = {
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
        groupId: initialData.groupId || initialData.GroupId || '',
        spaceId: initialData.spaceId || initialData.SpaceId || '',
        updateSeries: false,
        Id: initialData.Id
      };
      setFormData(newFormData);
      setInitialFormState(JSON.stringify(newFormData));
      
      try {
        const parsed = JSON.parse(initialData.subtasks || initialData.Subtasks || '[]');
        setSubtasksArr(parsed);
        setInitialSubtasksState(JSON.stringify(parsed));
      } catch (e) {
        setSubtasksArr([]);
        setInitialSubtasksState('[]');
      }

      try {
        const parsedAttachments = JSON.parse(initialData.attachments || initialData.Attachments || '[]');
        setAttachmentsArr(parsedAttachments);
        setInitialAttachmentsState(JSON.stringify(parsedAttachments));
      } catch (e) {
        setAttachmentsArr([]);
        setInitialAttachmentsState('[]');
      }

      if (initialData.Id) {
        axios.get(`/api/tasks/${initialData.Id}/comments`)
          .then(res => setComments(res.data))
          .catch(e => console.error('Failed to fetch comments', e));
      }



    } else if (isOpen) {
      const newFormData = {
        title: '', status: 'todo', visibility: 'public', assignee: currentUser?.fullname || currentUser?.username || '',
        startDate: '', dueDate: '', startTime: '09:00', endTime: '18:00',
        priority: 'normal', description: '', tags: '', recurrence: 'none',
        recurrenceDays: [], recurrenceDates: [], recurrenceEndDate: '', recurrenceDuration: '1m', projectId: '', projectChecklistId: '', groupId: '', spaceId: initialData?.spaceId || initialData?.SpaceId || '', updateSeries: false
      };
      setFormData(newFormData);
      setInitialFormState(JSON.stringify(newFormData));
      setSubtasksArr([]);
      setInitialSubtasksState('[]');
      setAttachmentsArr([]);
      setInitialAttachmentsState('[]');
      setComments([]);

      setActiveTab('general');
    }
  }, [isOpen, initialData]);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
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

  const handleClose = () => {
    const currentFormState = JSON.stringify(formData);
    const currentSubtasksState = JSON.stringify(subtasksArr);
    const currentAttachmentsState = JSON.stringify(attachmentsArr);
    
    if (initialFormState && initialSubtasksState && initialAttachmentsState) {
      if (currentFormState !== initialFormState || currentSubtasksState !== initialSubtasksState || currentAttachmentsState !== initialAttachmentsState) {
        setShowConfirmClose(true);
        return;
      }
    }
    onClose();
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('เธเธเธฒเธ”เนเธเธฅเนเน€เธเธดเธ 50MB');
      e.target.value = null;
      return;
    }

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
  
  const removeAttachment = (id, url) => {
    setAttachmentToDelete({ id, url });
  };

  const confirmDeleteAttachment = async () => {
    if (!attachmentToDelete) return;
    try {
      if (attachmentToDelete.url) {
        setAttachmentsToDeleteOnSave([...attachmentsToDeleteOnSave, attachmentToDelete.url]);
      }
      setAttachmentsArr(attachmentsArr.filter(a => a.id !== attachmentToDelete.id));
    } catch (e) {
      console.error('Delete failed:', e);
      alert('เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเธฅเธเนเธเธฅเนเธเธฒเธเน€เธเธดเธฃเนเธเน€เธงเธญเธฃเน');
    } finally {
      setAttachmentToDelete(null);
    }
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

    if (!formData.title || !formData.title.trim()) {
      alert('เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธเธเธทเนเธญเธเธฒเธ');
      setActiveTab('general');
      return;
    }
    
    if (formData.recurrence !== 'none' && !formData.startDate) {
      alert('เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธเธงเธฑเธเธ—เธตเนเน€เธฃเธดเนเธกเธ•เนเธ (Start Date) เธชเธณเธซเธฃเธฑเธเธเธฒเธเธ—เธตเนเธ•เธฑเนเธเธเนเธฒเธ—เธณเธเนเธณ');
      setActiveTab('general');
      return;
    }

    // Process physical deletions now
    attachmentsToDeleteOnSave.forEach(async (url) => {
      try {
        await axios.post('/api/delete_attachment.php', { url });
      } catch (err) {
        console.error('Delete on save failed:', err);
      }
    });
    
    let computedEndDate = formData.recurrenceEndDate;
    if (!isEditing && formData.recurrence !== 'none') {
        const d = new Date(formData.startDate || new Date());
        if (formData.recurrenceDuration === '1m') d.setMonth(d.getMonth() + 1);
        else if (formData.recurrenceDuration === '3m') d.setMonth(d.getMonth() + 3);
        else if (formData.recurrenceDuration === '6m') d.setMonth(d.getMonth() + 6);
        else if (formData.recurrenceDuration === '1y') d.setFullYear(d.getFullYear() + 1);
        computedEndDate = d.toISOString().split('T')[0];
    }
    
    onSave({
      ...formData,
      recurrenceEndDate: computedEndDate,
      subtasks: JSON.stringify(subtasksArr),
      attachments: JSON.stringify(attachmentsArr)
    });
  };

  const isEditing = !!initialData?.Id;

  // Extract unique assignees from tasks array and user database for autocomplete
  const uniqueAssignees = Array.from(new Set([
    ...tasks.flatMap(t => (t.Assignee || t.assignee || '').split(',').map(a => a.trim()).filter(a => a !== '')),
    ...(users || []).flatMap(u => {
      const names = [];
      if (u.fullname) names.push(u.fullname.trim());
      else if (u.username) names.push(u.username.trim());
      if (u.aka) {
        const akas = u.aka.split(',').map(a => a.trim()).filter(a => a !== '');
        names.push(...akas);
      }
      return names;
    })
  ])).sort();

  return (
    <>
    {showConfirmClose && (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-700 animate-scale-up">
          <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">เธฅเธฐเธ—เธดเนเธเธเธฒเธฃเน€เธเธฅเธตเนเธขเธเนเธเธฅเธ?</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">เธเธธเธ“เธกเธตเธเธฒเธฃเน€เธเธฅเธตเนเธขเธเนเธเธฅเธเธ—เธตเนเธขเธฑเธเนเธกเนเนเธ”เนเธเธฑเธเธ—เธถเธ เธ•เนเธญเธเธเธฒเธฃเธเธดเธ”เนเธ”เธขเนเธกเนเธเธฑเธเธ—เธถเธเนเธเนเธซเธฃเธทเธญเนเธกเน?</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowConfirmClose(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors">
              เธขเธเน€เธฅเธดเธ
            </button>
            <button onClick={() => { setShowConfirmClose(false); onClose(); }} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-rose-500/20">
              เธขเธทเธเธขเธฑเธเธเธฒเธฃเธเธดเธ”
            </button>
          </div>
        </div>
      </div>
    )}

    {attachmentToDelete && (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-700 animate-scale-up">
          <div className="flex items-center gap-3 mb-3 text-rose-500">
            <FiTrash2 className="w-6 h-6" />
            <h4 className="text-lg font-bold text-slate-800 dark:text-white">เธฅเธเนเธเธฅเนเนเธเธ?</h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">เธเธธเธ“เธ•เนเธญเธเธเธฒเธฃเธฅเธเนเธเธฅเนเธเธตเนเธญเธญเธเธเธฒเธเน€เธเธดเธฃเนเธเน€เธงเธญเธฃเนเนเธเนเธซเธฃเธทเธญเนเธกเน? (เธเธฒเธฃเธฅเธเธเธฐเน€เธเธดเธ”เธเธถเนเธเธ—เธฑเธเธ—เธต เนเธฅเธฐเนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธนเนเธเธทเธเนเธ”เน)</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setAttachmentToDelete(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors">
              เธขเธเน€เธฅเธดเธ
            </button>
            <button onClick={confirmDeleteAttachment} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-rose-500/20">
              เธฅเธเธ–เธฒเธงเธฃ
            </button>
          </div>
        </div>
      </div>
    )}

    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="flex flex-col shrink-0">
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${isEditing ? 'bg-amber-400' : 'bg-indigo-500'}`}></div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{isEditing ? 'เนเธเนเนเธเธเธฒเธ' : 'เธชเธฃเนเธฒเธเธเธฒเธเนเธซเธกเน'}</h3>
            </div>
            <div className="flex items-center gap-2">
              {isEditing && formData.Id && (
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    handleClose();
                    window.dispatchEvent(new CustomEvent('open-chat-room', { detail: { type: 'task', referenceId: formData.Id }}));
                  }}
                  className="flex items-center gap-1.5 bg-sky-100 hover:bg-sky-200 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 dark:hover:bg-sky-800/80 px-3 py-1.5 rounded-xl font-medium text-sm transition-all"
                  title="เน€เธเธดเธ”เนเธเธ—เธเธญเธเธเธฒเธเธเธตเน"
                >
                  <FiMessageSquare /> เนเธเธ—
                </button>
              )}
              <button type="button" onClick={handleClose} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700/80 transition-all active:scale-90">
                <FiX className="text-lg" />
              </button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-2 bg-white dark:bg-slate-900/50">
            <button 
              type="button"
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'general' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-300'}`}
            >
              <FiAlignLeft /> เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('checklist')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'checklist' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-300'}`}
            >
              <FiList /> เธเธฒเธเธขเนเธญเธข & เนเธเธฃเน€เธเนเธ
              {subtasksArr.length > 0 && (
                <span className="ml-1 bg-slate-100 dark:bg-slate-800 text-xs px-1.5 py-0.5 rounded-full">{subtasksArr.filter(s=>s.completed).length}/{subtasksArr.length}</span>
              )}
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'attachments' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-300'}`}
            >
              <FiType /> เนเธเธเนเธเธฅเน
              {attachmentsArr.length > 0 && (
                <span className="ml-1 bg-slate-100 dark:bg-slate-800 text-xs px-1.5 py-0.5 rounded-full">{attachmentsArr.length}</span>
              )}
            </button>
            {isEditing && (
              <button 
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'comments' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-300'}`}
              >
                <FiMessageSquare /> เธเธงเธฒเธกเธเธดเธ”เน€เธซเนเธ
                {comments.length > 0 && (
                  <span className="ml-1 bg-slate-100 dark:bg-slate-800 text-xs px-1.5 py-0.5 rounded-full">{comments.length}</span>
                )}
              </button>
            )}
          </div>
        </div>
        
        {!isEditable && (
          <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 p-2 text-xs text-center border-b border-amber-200 dark:border-amber-500/20 font-medium">
            เธเธธเธ“เนเธกเนเธกเธตเธชเธดเธ—เธเธดเนเนเธเนเนเธเธเธฒเธเธเธตเน (View Only)
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <form id="task-form" onSubmit={handleSubmit} className="p-5 flex flex-col h-full gap-4">
              
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <FiType className="text-indigo-500" /> เธเธทเนเธญเธเธฒเธ
                </label>
                <input disabled={!isEditable} required name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder-slate-400 text-sm" placeholder="เน€เธเนเธ เธ•เธฃเธงเธเธชเธญเธเน€เธเธฃเธทเนเธญเธเธเธฑเธเธฃ Line A..." />
              </div>

              {/* Description */}
              <div className="flex flex-col flex-1 min-h-[100px]">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <FiAlignLeft className="text-indigo-500" /> เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”
                </label>
                <textarea disabled={!isEditable} name="description" value={formData.description} onChange={handleChange} className="flex-1 w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm resize-none placeholder-slate-400" placeholder="เธซเธกเธฒเธขเน€เธซเธ•เธธ, เธเธฑเนเธเธ•เธญเธเธเธฒเธฃเธเธเธดเธเธฑเธ•เธดเธเธฒเธ..." />
              </div>

              {/* Status, Priority, Assignee */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiCheckCircle className="text-emerald-500" /> เธชเธ–เธฒเธเธฐ
                  </label>
                  <div className="relative">
                    <select disabled={!isEditable} name="status" value={formData.status} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-sm appearance-none cursor-pointer">
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">โ–พ</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiFlag className="text-orange-500" /> เธเธงเธฒเธกเธชเธณเธเธฑเธ
                  </label>
                  <div className="relative">
                    <select disabled={!isEditable} name="priority" value={formData.priority} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-sm appearance-none cursor-pointer">
                      <option value="urgent">๐”ด เธ”เนเธงเธเธกเธฒเธ</option>
                      <option value="high">๐  เธ”เนเธงเธ</option>
                      <option value="normal">๐ก เธเธเธ•เธด</option>
                      <option value="low">๐ข เธ•เนเธณ</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">โ–พ</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiUser className="text-sky-500" /> เธเธนเนเธฃเธฑเธเธเธดเธ”เธเธญเธ
                  </label>
                  <MultiSelectInput 
                    disabled={!isEditable}
                    value={formData.assignee}
                    onChange={(val) => setFormData(prev => ({ ...prev, assignee: val }))}
                    suggestions={uniqueAssignees}
                    placeholder="เธเธดเธกเธเนเธเธทเนเธญ..."
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiCalendar className="text-indigo-500" /> เน€เธฃเธดเนเธกเธ•เนเธ
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input lang="en-GB" disabled={!isEditable} type="date" name="startDate" value={formData.startDate || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm" />
                    <TimeInput24 disabled={!isEditable} name="startTime" value={formData.startTime || '09:00'} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiClock className="text-rose-500" /> เธชเธดเนเธเธชเธธเธ”
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input lang="en-GB" disabled={!isEditable} type="date" name="dueDate" value={formData.dueDate || ''} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all text-sm" />
                    <TimeInput24 disabled={!isEditable} name="endTime" value={formData.endTime || '18:00'} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl px-3 py-2.5 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all text-sm" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800"></div>

              {/* Tags, Visibility, Recurrence Mode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiTag className="text-indigo-500" /> เนเธ—เนเธ (Tags)
                  </label>
                  <MultiSelectInput 
                    disabled={!isEditable}
                    value={formData.tags || ''}
                    onChange={(val) => setFormData(prev => ({ ...prev, tags: val }))}
                    suggestions={['เธ”เนเธงเธ', 'เธเธฃเธฐเธเธธเธก', 'เนเธเธฃเน€เธเธเธ•เน', 'เธเธฑเธเธซเธฒ', 'เธญเธญเธเนเธเธ', 'เธเธฑเธ’เธเธฒเธฃเธฐเธเธ']}
                    placeholder="เธเธดเธกเธเนเนเธ—เนเธ..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiEye className="text-slate-500" /> เธชเธดเธ—เธเธดเนเธเธฒเธฃเธกเธญเธเน€เธซเนเธ
                  </label>
                  <div className="relative">
                    <select disabled={!isEditable} name="visibility" value={formData.visibility} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-500/10 transition-all text-sm appearance-none cursor-pointer">
                      <option value="public">๐ Public</option>
                      <option value="private">๐”’ Private</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">โ–พ</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <FiRefreshCw className="text-indigo-500" /> เธเธฒเธเธ—เธณเธเนเธณ
                    {isEditing && (
                      <div className="group relative flex items-center ml-1">
                        <FiInfo className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help transition-colors" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 dark:bg-slate-700 text-white text-[11px] font-normal text-center rounded-lg px-2 py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-lg pointer-events-none">
                          เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เน€เธเธฅเธตเนเธขเธเธฃเธนเธเนเธเธเธเธฒเธฃเธ—เธณเธเนเธณเธเธญเธเธเธฒเธเธ—เธตเนเธ–เธนเธเธชเธฃเนเธฒเธเนเธเนเธฅเนเธง
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                        </div>
                      </div>
                    )}
                  </label>
                  <div className="relative">
                    <select disabled={!isEditable || isEditing} name="recurrence" value={formData.recurrence} onChange={handleChange} className={`w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 outline-none transition-all text-sm appearance-none ${!isEditable || isEditing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'}`}>
                      {RECURRENCE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">โ–พ</div>
                  </div>
                  {formData.recurrence === 'weekly' && !isEditing && (
                    <p className="mt-2 text-xs text-indigo-500 dark:text-indigo-400">
                      โจ เธ•เธฒเธกเธงเธฑเธเนเธเธชเธฑเธเธ”เธฒเธซเนเธเธญเธ <strong>"เธงเธฑเธเธ—เธตเนเน€เธฃเธดเนเธก"</strong>
                    </p>
                  )}
                  {formData.recurrence === 'monthly' && !isEditing && (
                    <p className="mt-2 text-xs text-indigo-500 dark:text-indigo-400">
                      โจ เธ•เธฒเธกเธงเธฑเธเธ—เธตเนเธเธญเธ <strong>"เธงเธฑเธเธ—เธตเนเน€เธฃเธดเนเธก"</strong>
                    </p>
                  )}
                </div>
              </div>

              {formData.recurrence !== 'none' && !isEditing && isEditable && (
                <div className="bg-indigo-50/30 dark:bg-indigo-500/5 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-500/10 space-y-6 shadow-inner">
                  {formData.recurrence === 'custom' && (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                          1. เน€เธฅเธทเธญเธเธงเธฑเธเนเธเธชเธฑเธเธ”เธฒเธซเน
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {WEEK_DAYS.map(day => {
                            const isSelected = (formData.recurrenceDays || []).includes(day.value);
                            return (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => {
                                  const days = formData.recurrenceDays || [];
                                  const newDays = isSelected ? days.filter(d => d !== day.value) : [...days, day.value];
                                  setFormData({ ...formData, recurrenceDays: newDays });
                                }}
                                className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/40 scale-105' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'}`}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="h-px bg-slate-200 dark:bg-slate-700/50 w-full"></div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                          2. เน€เธฅเธทเธญเธเธงเธฑเธเธ—เธตเนเธเธญเธเน€เธ”เธทเธญเธ (1-31)
                        </label>
                        <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map(date => {
                            const isSelected = (formData.recurrenceDates || []).includes(date);
                            return (
                              <button
                                key={date}
                                type="button"
                                onClick={() => {
                                  const dates = formData.recurrenceDates || [];
                                  const newDates = isSelected ? dates.filter(d => d !== date) : [...dates, date];
                                  setFormData({ ...formData, recurrenceDates: newDates });
                                }}
                                className={`aspect-square rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-200 ${isSelected ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/40 scale-105' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10'}`}
                              >
                                {date}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {(formData.recurrence === 'custom') && <div className="h-px bg-slate-200 dark:bg-slate-700/50 w-full my-2"></div>}
                  
                  <div className="pt-2">
                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                      <FiRefreshCw className="text-indigo-500" />
                      เธ•เนเธญเธเธเธฒเธฃเธ—เธณเธเนเธณเนเธเธเธฒเธเนเธเนเนเธซเธ?
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { value: '1m', label: '1 เน€เธ”เธทเธญเธ' },
                        { value: '3m', label: '3 เน€เธ”เธทเธญเธ' },
                        { value: '6m', label: '6 เน€เธ”เธทเธญเธ' },
                        { value: '1y', label: '1 เธเธต' }
                      ].map(opt => {
                        const isSelected = (formData.recurrenceDuration || '1m') === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, recurrenceDuration: opt.value })}
                            className={`flex flex-col items-center justify-center px-4 py-3.5 rounded-xl border-2 transition-all duration-200 ${isSelected ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:bg-slate-50 dark:hover:bg-slate-800/80'}`}
                          >
                            <span className="font-bold">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <FiInfo className="shrink-0" />
                      เธฃเธฐเธเธเธเธฐเธชเธฃเนเธฒเธเธ•เธฒเธฃเธฒเธเธเธฒเธเธฅเนเธงเธเธซเธเนเธฒเนเธซเนเธ•เธฒเธกเธฃเธฐเธขเธฐเน€เธงเธฅเธฒเธ—เธตเนเธเธธเธ“เน€เธฅเธทเธญเธ (เธเธฑเธเธเธฒเธเธงเธฑเธเธ—เธตเนเน€เธฃเธดเนเธก)
                    </p>
                  </div>
                </div>
              )}

              {isEditing && formData.groupId && (
                <div className="bg-amber-50/50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-100 dark:border-amber-500/20 mt-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      disabled={!isEditable}
                      type="checkbox" 
                      name="updateSeries"
                      checked={formData.updateSeries || false}
                      onChange={(e) => setFormData({ ...formData, updateSeries: e.target.checked })}
                      className="mt-1 w-4 h-4 text-amber-500 bg-white border-slate-300 rounded focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-sm font-bold text-amber-700 dark:text-amber-400">เธญเธฑเธเน€เธ”เธ•เธเธฒเธเนเธเธญเธเธฒเธเธ•เธ—เธฑเนเธเธซเธกเธ”</div>
                      <div className="text-xs text-amber-600 dark:text-amber-500/70 mt-1">เธซเธฒเธเธ•เธดเนเธเน€เธฅเธทเธญเธ เธเธฐเธญเธฑเธเน€เธ”เธ•เธเธฒเธเธญเธทเนเธเน เนเธเธเธตเธฃเธตเธชเนเธเธตเนเธ—เธตเนเธกเธตเธเธณเธซเธเธ”เธเธฒเธฃเธซเธฅเธฑเธเธเธฒเธเธเธฒเธเธเธตเนเธ”เนเธงเธข (เธเธฒเธฃเน€เธเธฅเธตเนเธขเธเธงเธฑเธเธ—เธตเนเธเธฐเนเธกเนเธ–เธนเธเธเธณเนเธเธญเธฑเธเน€เธ”เธ•เธเธฑเธเธเธฒเธเธญเธทเนเธ)</div>
                    </div>
                  </label>
                </div>
              )}

            </form>
          )}

          {/* CHECKLIST TAB */}
          {activeTab === 'checklist' && (
            <div className="p-5 space-y-5">
              
              {/* Projects Integration - Cleaned up */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2">
                  <FiBriefcase className="text-indigo-500" /> เธเธณเน€เธเนเธฒเธเธฒเธเนเธเธฃเน€เธเนเธ (เธ—เธฒเธเน€เธฅเธทเธญเธ)
                </label>
                <div className="relative mb-3">
                  <select disabled={!isEditable} name="projectId" value={formData.projectId} onChange={handleProjectChange} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm appearance-none cursor-pointer">
                    <option value="">-- เนเธกเนเธเธนเธเธเธฑเธเนเธเธฃเน€เธเนเธ --</option>
                    {projectsList.filter(p => p.Status === 'active' || p.Id == formData.projectId).map(p => (
                      <option key={p.Id} value={p.Id}>{p.Title}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">โ–พ</div>
                </div>

                {formData.projectId && isEditable && projectsList.find(p => p.Id == formData.projectId)?.Checklist?.filter(c => !c.isDone && !subtasksArr.some(st => st.projectChecklistId === c.id))?.length > 0 && (
                  <div className="bg-indigo-50/50 dark:bg-indigo-500/10 p-3 rounded-xl border border-indigo-100 dark:border-indigo-500/20 mb-4">
                    <label className="block text-xs font-semibold text-indigo-700 dark:indigo-400 mb-2 uppercase tracking-wide">
                      เธ”เธถเธ Checklist เธเธฒเธเนเธเธฃเน€เธเนเธเธกเธฒเธ—เธณ
                    </label>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {projectsList.find(p => p.Id == formData.projectId)?.Checklist?.filter(c => !c.isDone && !subtasksArr.some(st => st.projectChecklistId === c.id))?.map(c => (
                        <div key={c.id} className="group flex items-center justify-between bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-indigo-50 dark:border-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all">
                          <span className="text-sm text-slate-700 dark:text-slate-300 truncate mr-2 flex-1" title={c.text}>{c.text}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSubtasksArr([...subtasksArr, {
                                id: Date.now().toString() + Math.random(),
                                title: c.text,
                                completed: false,
                                projectChecklistId: c.id
                              }]);
                            }}
                            className="shrink-0 flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-500 hover:text-white dark:bg-indigo-500/20 dark:text-indigo-400 dark:hover:bg-indigo-500 dark:hover:text-white transition-colors"
                            title="เธ”เธถเธเน€เธเนเธฒเธเธฒเธเธขเนเธญเธข"
                          >
                            <FiPlus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Internal Subtasks */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
                {isEditable && (
                  <form onSubmit={handleSaveSubtask} className="flex gap-2 mb-4">
                    <input 
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      className="flex-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                      placeholder="เน€เธเธดเนเธกเธเธฒเธเธขเนเธญเธขเนเธซเธกเน..."
                    />
                    <button type="submit" className="bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-1 transition-colors">
                      <FiPlus /> เน€เธเธดเนเธก
                    </button>
                  </form>
                )}

                {subtasksArr.length === 0 ? (
                  <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                    เธขเธฑเธเนเธกเนเธกเธตเธฃเธฒเธขเธเธฒเธฃเธขเนเธญเธขเนเธเธเธฒเธเธเธตเน
                  </div>
                ) : (
                  <div className="space-y-2">
                    {subtasksArr.map((st) => (
                      <div key={st.id} className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${st.completed ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm hover:border-slate-300 dark:hover:border-slate-600'}`}>
                        <button 
                          disabled={!isEditable}
                          onClick={() => toggleSubtask(st.id)}
                          className={`shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all ${st.completed ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-400'}`}
                        >
                          {st.completed && <FiCheckSquare className="w-3.5 h-3.5" />}
                        </button>
                        <input
                          disabled={!isEditable}
                          value={st.title}
                          onChange={(e) => {
                            const newArr = [...subtasksArr];
                            const idx = newArr.findIndex(s => s.id === st.id);
                            if(idx !== -1) {
                                newArr[idx].title = e.target.value;
                                setSubtasksArr(newArr);
                            }
                          }}
                          className={`flex-1 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 focus:border-solid focus:border-indigo-500 outline-none text-sm px-1 py-0.5 transition-all ${st.completed ? 'text-emerald-500/70 line-through' : 'text-slate-700 dark:text-slate-200'}`}
                          title="เธเธฅเธดเธเน€เธเธทเนเธญเนเธเนเนเธ"
                        />
                        {st.projectChecklistId && (
                          <span className="inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 font-medium shrink-0">
                            เธเธฒเธเนเธเธฃเน€เธเนเธ
                          </span>
                        )}
                        {isEditable && (
                          <button onClick={() => deleteSubtask(st.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-all p-1">
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                <FiInfo className="shrink-0 text-sky-500" /> 
                <span>
                  เธซเธฒเธเธ•เนเธญเธเธเธฒเธฃเธเธฑเธเธ—เธถเธ Checklist เธญเธขเนเธฒเธฅเธทเธกเธเธ” <b>เธเธฑเธเธ—เธถเธเธ—เธฑเนเธเธซเธกเธ”</b> เธ—เธตเนเธ”เนเธฒเธเธฅเนเธฒเธเธเธฐเธเธฃเธฑเธ
                </span>
              </div>
            </div>
          )}

          {/* ATTACHMENTS TAB */}
          {activeTab === 'attachments' && (
            <div className="flex flex-col h-full max-h-[50vh]">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* File input area */}
                <div className="flex flex-col items-center justify-center w-full">
                  <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FiPlus className="w-8 h-8 mb-2 text-slate-500" />
                      <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">เธเธฅเธดเธเน€เธเธทเนเธญเธญเธฑเธเนเธซเธฅเธ”</span> เธซเธฃเธทเธญเธฅเธฒเธเนเธเธฅเนเธกเธฒเธงเธฒเธ</p>
                      <p className="text-xs text-slate-500">PNG, JPG, PDF เธซเธฃเธทเธญเน€เธญเธเธชเธฒเธฃ (เธชเธนเธเธชเธธเธ” 50MB)</p>
                    </div>
                    <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
                  </label>
                  {isUploading && <p className="text-xs text-pink-500 mt-2 animate-pulse">เธเธณเธฅเธฑเธเธญเธฑเธเนเธซเธฅเธ”...</p>}
                </div>

                {/* List of attachments */}
                {attachmentsArr.length > 0 && (
                  <div className="flex flex-col gap-2 mt-4">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">เนเธเธฅเนเนเธเธเธ—เธฑเนเธเธซเธกเธ” ({attachmentsArr.length})</h4>
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
                          <button type="button" onClick={() => removeAttachment(att.id, att.url)} className="text-rose-400 hover:text-rose-500 p-1.5 hover:bg-rose-500/10 rounded-md transition-colors shrink-0">
                            <FiTrash2 className="text-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
              </div>
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === 'comments' && isEditing && (
            <div className="flex flex-col h-full max-h-[50vh]">
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                {comments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-slate-500 py-10">
                    <FiMessageSquare className="text-4xl text-slate-300 dark:text-slate-600 mb-3" />
                    <p>เธขเธฑเธเนเธกเนเธกเธตเธเธงเธฒเธกเธเธดเธ”เน€เธซเนเธ</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {comments.map((c, i) => (
                      <div key={c.Id || i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                            {(c.Author || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-2xl rounded-tl-none p-3 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{c.Author}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(c.CreatedAt).toLocaleString('th-TH')}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{c.Message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <form onSubmit={handlePostComment} className="flex gap-2 relative">
                  <input
                    type="text"
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="เธเธดเธกเธเนเธเธงเธฒเธกเธเธดเธ”เน€เธซเนเธ..."
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-full pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:border-indigo-500 dark:text-white"
                  />
                  <button 
                    type="submit"
                    disabled={!newComment.trim()}
                    className="absolute right-1 top-1 w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiSend className="w-4 h-4 ml-[-2px] mt-[2px]" />
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 shrink-0">
          <div className="flex items-center justify-between">
            {isEditing && onDelete ? (
              <button type="button" onClick={() => onDelete(formData.Id, formData.updateSeries)} className="text-rose-400 hover:text-rose-300 flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-rose-500/10 transition-all text-sm font-medium active:scale-95">
                <FiTrash2 /> เธฅเธเธเธฒเธ
              </button>
            ) : <div></div>}
            
            <div className="flex gap-2">
              <button type="button" onClick={handleClose} className="px-5 py-2.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-sm font-medium active:scale-95">
                เธขเธเน€เธฅเธดเธ
              </button>
              {/* Only submit the form if we are on general tab, or just use a button that triggers handleSubmit directly */}
              <button type="button" onClick={handleSubmit} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl font-semibold shadow-lg shadow-indigo-900/30 transition-all active:scale-95 text-sm flex items-center gap-2">
                {isEditing ? '๐’พ เธเธฑเธเธ—เธถเธเธ—เธฑเนเธเธซเธกเธ”' : 'โจ เธชเธฃเนเธฒเธเธเธฒเธ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
