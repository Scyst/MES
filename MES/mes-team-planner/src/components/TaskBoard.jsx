import React, { useState, useMemo } from 'react';
import { FiPlus, FiMoreVertical, FiLock, FiGlobe, FiClock, FiSearch, FiFilter, FiX, FiDownload, FiTag, FiCheckSquare, FiRefreshCw } from 'react-icons/fi';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AddTaskModal from './AddTaskModal';

const cols = [
  { id: 'todo', title: 'To Do', color: 'border-slate-500', bg: 'bg-transparent', titleColor: 'text-slate-700 dark:text-slate-300' },
  { id: 'in-progress', title: 'In Progress', color: 'border-amber-500', bg: 'bg-transparent', titleColor: 'text-amber-500 dark:text-amber-400' },
  { id: 'done', title: 'Done', color: 'border-emerald-500', bg: 'bg-transparent', titleColor: 'text-emerald-500 dark:text-emerald-400' }
];

const PRIORITY_META = {
  urgent: { label: 'ด่วนมาก', dot: 'bg-red-400', border: 'border-l-red-500' },
  high: { label: 'ด่วน', dot: 'bg-orange-400', border: 'border-l-orange-500' },
  normal: { label: 'ปกติ', dot: 'bg-yellow-400', border: 'border-l-yellow-500' },
  low: { label: 'ต่ำ', dot: 'bg-green-400', border: 'border-l-green-500' },
};

export default function TaskBoard({ currentUser, tasks = [], setTasks, onSaveTask, onDeleteTask, loading }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchSearch = !searchQuery || 
        t.Title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.Assignee?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPriority = filterPriority === 'all' || (t.priority || 'normal') === filterPriority;
      const matchAssignee = filterAssignee === 'all' || t.Assignee === filterAssignee;
      return matchSearch && matchPriority && matchAssignee;
    });
  }, [tasks, searchQuery, filterPriority, filterAssignee]);

  const allAssignees = useMemo(() => [...new Set(tasks.map(t => t.Assignee).filter(Boolean))], [tasks]);

  const hasActiveFilters = searchQuery || filterPriority !== 'all' || filterAssignee !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setFilterPriority('all');
    setFilterAssignee('all');
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'ชื่องาน', 'สถานะ', 'สิทธิ์', 'ความสำคัญ', 'ผู้รับผิดชอบ', 'เริ่ม', 'สิ้นสุด', 'แท็ก', 'ทำซ้ำ'];
    const rows = tasks.map(t => [
      t.Id,
      `"${t.Title?.replace(/"/g, '""')}"`,
      t.Status,
      t.Visibility,
      t.priority || 'normal',
      `"${t.Assignee?.replace(/"/g, '""')}"`,
      `${t.startDate || ''} ${t.startTime || ''}`,
      `${t.dueDate || ''} ${t.endTime || ''}`,
      `"${t.tags || ''}"`,
      t.recurrence || 'none'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(',') + '\n' 
      + rows.map(e => e.join(',')).join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mes_tasks_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveTask = async (taskData) => {
    setIsModalOpen(false);
    setEditingTask(null);
    setTimeout(async () => {
      await onSaveTask(taskData);
    }, 10);
  };

  const handleDeleteTask = async (taskId) => {
    const success = await onDeleteTask(taskId);
    if (success) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const draggedTaskId = parseInt(draggableId);
    const newStatus = destination.droppableId;

    // Optimistic update via shared handler
    onSaveTask({ Id: draggedTaskId, status: newStatus });
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-600 dark:text-slate-400">Loading tasks...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-row flex-wrap items-center justify-end md:justify-between gap-3 shrink-0 mb-4">
        <h2 className="hidden md:flex text-lg md:text-xl font-bold text-slate-900 dark:text-white items-center gap-2">
          <span className="text-indigo-400">📊</span> กระดานงาน (Kanban)
        </h2>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="bg-emerald-100 dark:bg-emerald-600/20 hover:bg-emerald-200 dark:hover:bg-emerald-600/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 p-2 sm:px-3 sm:py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2" title="ส่งออก CSV">
            <FiDownload /> <span className="hidden sm:inline">ส่งออก CSV</span>
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className={`bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white p-2 sm:px-3 sm:py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border-transparent shadow-soft ${hasActiveFilters ? 'text-emerald-500' : ''}`} title="กรองข้อมูล">
            <FiFilter /> <span className="hidden sm:inline">กรองข้อมูล</span> {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
          </button>
          <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-1.5">
            <FiPlus /> <span className="hidden sm:inline">สร้างงาน</span><span className="sm:hidden">เพิ่ม</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      {showFilters && (
        <div className="mb-3 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-soft border border-transparent space-y-3 shrink-0 animate-slide-up">
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหางาน, ชื่อ, ผู้รับผิดชอบ..."
              className="w-full bg-[#f4f9f8] dark:bg-slate-900 border border-transparent dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm placeholder-slate-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <FiX className="text-sm" />
              </button>
            )}
          </div>
          {/* Filters row */}
          <div className="flex gap-2 flex-wrap">
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2 outline-none cursor-pointer">
              <option value="all" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">ทุกความสำคัญ</option>
              <option value="urgent" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">🔴 ด่วนมาก</option>
              <option value="high" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">🟠 ด่วน</option>
              <option value="normal" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">🟡 ปกติ</option>
              <option value="low" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">🟢 ต่ำ</option>
            </select>
            <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2 outline-none cursor-pointer">
              <option value="all" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">ทุกคน</option>
              {allAssignees.map(a => <option key={a} value={a} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">{a}</option>)}
            </select>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-emerald-500 hover:text-emerald-600 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all">
                ล้างตัวกรอง
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <div className="text-[11px] md:text-xs text-slate-500">พบ {filteredTasks.length} จาก {tasks.length} งาน</div>
          )}
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 flex-1 snap-x snap-mandatory custom-scrollbar">
          {cols.map(col => {
            let colTasks = filteredTasks.filter(t => t.Status === col.id);
            const isDoneLimited = col.id === 'done' && !searchQuery && colTasks.length > 30;
            if (col.id === 'done' && !searchQuery) {
              colTasks.sort((a, b) => {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                return dateB - dateA || (b.Id || 0) - (a.Id || 0);
              });
              colTasks = colTasks.slice(0, 30);
            }
            return (
              <div key={col.id} className={`snap-center w-[85vw] md:w-auto md:flex-1 shrink-0 min-w-[280px] md:min-w-[300px] flex flex-col bg-transparent rounded-2xl border-t-[3px] ${col.color}`}>
                <div className={`px-2 py-3 flex items-center justify-between ${col.bg}`}>
                  <h3 className={`font-bold ${col.titleColor} flex items-center gap-2 text-sm`}>
                    {col.title}
                    <span className="bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs px-2 py-0.5 rounded-full shadow-sm">
                      {colTasks.length}
                    </span>
                  </h3>
                  <button onClick={() => { setEditingTask(null); setIsModalOpen(true); }} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1"><FiPlus /></button>
                </div>
                
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`p-3 flex-1 overflow-y-auto space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-slate-100/30 dark:bg-slate-800/30' : ''}`}
                    >
                      {colTasks.map((task, index) => {
                        const pMeta = PRIORITY_META[task.priority || 'normal'] || PRIORITY_META.normal;
                        
                        let subtasks = [];
                        try { subtasks = JSON.parse(task.subtasks || '[]'); } catch(e) {}
                        const completedSubtasks = subtasks.filter(s => s.completed).length;
                        
                        const tagsList = (task.tags || '').split(',').map(t => t.trim()).filter(Boolean);

                        return (
                        <Draggable key={task.Id} draggableId={task.Id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{ ...provided.draggableProps.style }}
                              className={`bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-soft hover:shadow-soft-lg transition-all border-l-4 ${pMeta.border} ${snapshot.isDragging ? 'ring-2 ring-emerald-500/20 opacity-90 scale-[1.02]' : ''}`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {task.Visibility === 'private' ? (
                                    <span className="flex items-center gap-1 text-[10px] md:text-[11px] font-bold tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-full">
                                      <FiLock /> Private
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[10px] md:text-[11px] font-bold tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded-full">
                                      <FiGlobe /> Public
                                    </span>
                                  )}
                                  {/* Priority badge */}
                                  <span className="flex items-center gap-1 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    <div className={`w-2 h-2 rounded-full ${pMeta.dot}`}></div>
                                    {pMeta.label}
                                  </span>
                                  {/* Recurrence Icon */}
                                  {task.recurrence && task.recurrence !== 'none' && (
                                    <span className="flex items-center gap-1 text-[10px] md:text-[11px] font-bold uppercase tracking-wider text-sky-400" title={`ทำซ้ำ: ${task.recurrence}`}>
                                      <FiRefreshCw />
                                    </span>
                                  )}
                                </div>
                                <button className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all" onClick={() => { setEditingTask(task); setIsModalOpen(true); }}>
                                  <FiMoreVertical />
                                </button>
                              </div>
                              
                              <h4 className="text-slate-800 dark:text-slate-200 font-medium text-sm md:text-base mb-1 leading-snug">
                                {task.Title}
                              </h4>
                              
                              {/* Description preview */}
                              {task.description && (
                                <p className="text-slate-500 text-xs md:text-sm mb-2 line-clamp-2 leading-relaxed">{task.description}</p>
                              )}
                              
                              {/* Tags */}
                              {tagsList.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {tagsList.map((tag, idx) => (
                                    <span key={idx} className="bg-slate-200/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 text-[9px] md:text-[11px] px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <FiTag className="text-[8px]" /> {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1">
                                    <FiClock className="text-slate-500" />
                                    <span>{task.dueDate || '-'}</span>
                                  </div>
                                  {subtasks.length > 0 && (
                                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${completedSubtasks === subtasks.length ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400'}`}>
                                      <FiCheckSquare className="text-[10px]" />
                                      <span className="text-[10px] md:text-[11px] font-medium">{completedSubtasks}/{subtasks.length}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center">
                                  {(task.Assignee || '').split(',').map(a => a.trim()).filter(Boolean).slice(0, 3).map((assignee, idx) => (
                                    <div key={idx} className={`w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-[10px] md:text-xs text-white font-bold border-2 border-white dark:border-slate-800 ${idx > 0 ? '-ml-2' : ''}`} title={assignee} style={{ zIndex: 10 - idx }}>
                                      {assignee.substring(0, 1)}
                                    </div>
                                  ))}
                                  {((task.Assignee || '').split(',').map(a => a.trim()).filter(Boolean).length > 3) && (
                                     <div className="-ml-2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[9px] md:text-[10px] text-slate-700 dark:text-slate-300 font-bold border-2 border-white dark:border-slate-800" style={{ zIndex: 1 }}>
                                      +{(task.Assignee || '').split(',').map(a => a.trim()).filter(Boolean).length - 3}
                                     </div>
                                  )}
                                  {!(task.Assignee || '').trim() && (
                                    <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] md:text-xs text-slate-500 font-bold border-2 border-white dark:border-slate-800">
                                      ?
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )})}
                      {provided.placeholder}
                      {isDoneLimited && (
                        <div className="text-center py-2 mt-2">
                          <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                            แสดงเฉพาะ 30 รายการล่าสุด
                          </span>
                        </div>
                      )}
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                          Drop tasks here
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
      
      <AddTaskModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }} 
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialData={editingTask}
        currentUser={currentUser}
        tasks={tasks}
      />
    </div>
  );
}
