import React, { useState, useMemo } from 'react';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { FiChevronLeft, FiChevronRight, FiSearch, FiPlus, FiX, FiUsers, FiUser } from 'react-icons/fi';
import AddTaskModal from './AddTaskModal';

// Assign stable colors to assignees
const PERSON_COLORS = [
  { bg: 'bg-indigo-500', text: 'text-indigo-500', light: 'bg-indigo-500/20', border: 'border-indigo-400/40' },
  { bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-500/20', border: 'border-emerald-400/40' },
  { bg: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-500/20', border: 'border-amber-400/40' },
  { bg: 'bg-rose-500', text: 'text-rose-500', light: 'bg-rose-500/20', border: 'border-rose-400/40' },
  { bg: 'bg-cyan-500', text: 'text-cyan-500', light: 'bg-cyan-500/20', border: 'border-cyan-400/40' },
  { bg: 'bg-violet-500', text: 'text-violet-500', light: 'bg-violet-500/20', border: 'border-violet-400/40' },
  { bg: 'bg-pink-500', text: 'text-pink-500', light: 'bg-pink-500/20', border: 'border-pink-400/40' },
  { bg: 'bg-teal-500', text: 'text-teal-500', light: 'bg-teal-500/20', border: 'border-teal-400/40' },
];

export default function GanttChart({ tasks = [], onSaveTask, onDeleteTask, loading }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly'
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedAssignee, setSelectedAssignee] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleSaveTask = async (taskData) => {
    const success = await onSaveTask(taskData);
    if (success) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const success = await onDeleteTask(taskId);
    if (success) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('taskId', task.Id);
  };

  const handleDrop = async (e, targetAssignee, targetHour) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.Id.toString() === taskId);
    if (!task) return;

    const startMins = parseTimeToMinutes(task.startTime || '09:00');
    const endMins = parseTimeToMinutes(task.endTime || '18:00');
    const duration = endMins - startMins > 0 ? endMins - startMins : 60;

    const newStartMins = targetHour * 60;
    let newEndMins = newStartMins + duration;
    if (newEndMins > 24 * 60) newEndMins = 24 * 60;

    const newStartTime = formatMinutesToTime(newStartMins);
    const newEndTime = formatMinutesToTime(newEndMins);

    onSaveTask({
      Id: task.Id,
      assignee: targetAssignee,
      startTime: newStartTime,
      endTime: newEndTime
    });
  };

  const handleWeeklyDrop = async (e, targetDateStr, targetHour) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find(t => t.Id.toString() === taskId);
    if (!task) return;

    const startMins = parseTimeToMinutes(task.startTime || '09:00');
    const endMins = parseTimeToMinutes(task.endTime || '18:00');
    const duration = endMins - startMins > 0 ? endMins - startMins : 60;

    const newStartMins = targetHour * 60;
    let newEndMins = newStartMins + duration;
    if (newEndMins > 24 * 60) newEndMins = 24 * 60;

    const newStartTime = formatMinutesToTime(newStartMins);
    const newEndTime = formatMinutesToTime(newEndMins);

    onSaveTask({
      Id: task.Id,
      startDate: targetDateStr,
      dueDate: targetDateStr,
      startTime: newStartTime,
      endTime: newEndTime
    });
  };

  // --- Helpers ---
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const formatMinutesToTime = (mins) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const nextDay = () => setCurrentDate(addDays(currentDate, 1));
  const prevDay = () => setCurrentDate(subDays(currentDate, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const currentDateStr = format(currentDate, 'yyyy-MM-dd');

  const allAssignees = [...new Set(
    tasks.flatMap(t => {
      const names = (t.Assignee || '').split(',').map(a => a.trim()).filter(Boolean);
      return names.length > 0 ? names : ['Unassigned'];
    })
  )].sort();
  if (allAssignees.length === 0) allAssignees.push('Unassigned');

  const assignees = selectedAssignee === 'All' ? allAssignees : [selectedAssignee];

  const todaysTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.startDate || !t.dueDate) return false;
      const inDateRange = t.startDate <= currentDateStr && t.dueDate >= currentDateStr;
      if (!inDateRange) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.Title?.toLowerCase().includes(q) || t.Assignee?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tasks, currentDateStr, searchQuery]);

  const openAddModal = (assignee, hour) => {
    setEditingTask({
      assignee,
      startDate: currentDateStr,
      dueDate: currentDateStr,
      startTime: formatMinutesToTime(hour * 60),
      endTime: formatMinutesToTime((hour + 1) * 60)
    });
    setIsModalOpen(true);
  };

  const openEditModal = (e, task) => {
    e.stopPropagation();
    setEditingTask(task);
    setIsModalOpen(true);
  };

  // Full 24-hour view
  const hours = Array.from({ length: 24 }).map((_, i) => i);
  const totalMinutes = 24 * 60;

  // Monthly view helpers
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }).map((_, i) => addDays(monthStart, i));
  const thaiDayNamesFull = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const thaiDayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const getPersonColor = (name) => {
    const idx = allAssignees.indexOf(name);
    return PERSON_COLORS[idx % PERSON_COLORS.length];
  };

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-600 dark:text-slate-400">Loading Gantt Chart...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ═══ Toolbar ═══ */}
      <div className="flex flex-col gap-3 mb-4 shrink-0">
        <div className="flex flex-row flex-nowrap overflow-x-auto items-center justify-between gap-3 custom-scrollbar pb-1 -mb-1">
          {/* Left Group: View Toggle + Date Nav */}
          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button onClick={() => setViewMode('daily')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'daily' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                <FiUsers className="text-sm" /> รายวัน
              </button>
              <button onClick={() => setViewMode('monthly')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === 'monthly' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                <FiUser className="text-sm" /> รายเดือน
              </button>
            </div>

            {/* Date/Week Nav */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button onClick={viewMode === 'daily' ? prevDay : prevMonth} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-90">
                <FiChevronLeft />
              </button>
              <span className="text-slate-800 dark:text-slate-200 font-semibold px-2 min-w-[100px] sm:min-w-[130px] text-center text-sm">
                {viewMode === 'daily' 
                  ? format(currentDate, 'dd MMM yyyy')
                  : format(monthStart, 'MMMM yyyy')
                }
              </span>
              <button onClick={viewMode === 'daily' ? nextDay : nextMonth} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-90">
                <FiChevronRight />
              </button>
            </div>
          </div>
          
          {/* Right Group: Assignee Filter + Search + Add */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Assignee Filter */}
            <select 
              value={selectedAssignee} 
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-2.5 outline-none cursor-pointer h-10"
            >
              <option value="All">ทุกคน</option>
              {allAssignees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <button onClick={() => setShowSearch(!showSearch)} className={`p-2.5 rounded-xl transition-all active:scale-90 border h-10 w-10 flex items-center justify-center ${showSearch || searchQuery ? 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
              <FiSearch className="text-sm" />
            </button>
            <button 
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white pl-3 pr-4 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-indigo-900/20 h-10"
            >
              <FiPlus className="text-base" /> <span className="hidden sm:inline">สร้างงาน</span><span className="sm:hidden">เพิ่ม</span>
            </button>
          </div>
        </div>

        {/* Search bar (collapsible) */}
        {showSearch && (
          <div className="relative animate-slide-up">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหางาน / ผู้รับผิดชอบ..." className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl pl-10 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm placeholder-slate-500" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:hover:text-white"><FiX className="text-sm" /></button>
            )}
          </div>
        )}
      </div>

      {/* ═══ DAILY VIEW (Original) ═══ */}
      {viewMode === 'daily' && (
        <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 relative">
          <div className="min-w-[1200px]">
            
            {/* Header Row (Hours) */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-slate-50 dark:bg-slate-800 z-20 shadow-md">
              <div className="w-28 md:w-40 shrink-0 px-3 py-2 font-bold text-slate-600 dark:text-slate-400 text-xs border-r border-slate-200 dark:border-slate-700 flex items-center bg-slate-50 dark:bg-slate-800 sticky left-0 z-40">
                ผู้รับผิดชอบ
              </div>
              <div className="flex flex-1 relative">
                {hours.map(hour => (
                  <div key={hour} className="flex-1 min-w-[50px] border-r border-slate-200/30 dark:border-slate-700/30 flex items-center justify-center py-2 text-[11px] md:text-xs text-slate-500 font-mono">
                    {hour.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>

            {/* Body Rows */}
            {assignees.map(assignee => {
              const assigneeTasks = todaysTasks.filter(t => {
                const names = (t.Assignee || '').split(',').map(a => a.trim()).filter(Boolean);
                return (names.length > 0 ? names : ['Unassigned']).includes(assignee);
              });
              const sortedTasks = [...assigneeTasks].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
              const rows = [];
              
              sortedTasks.forEach(task => {
                const taskStartMins = parseTimeToMinutes(task.startTime || '09:00');
                const taskEndMins = parseTimeToMinutes(task.endTime || '18:00');
                let rowIndex = 0;
                while(true) {
                  if (!rows[rowIndex]) { rows[rowIndex] = [task]; task._rowIndex = rowIndex; break; }
                  const overlaps = rows[rowIndex].some(eTask => {
                    const eStart = parseTimeToMinutes(eTask.startTime || '09:00');
                    const eEnd = parseTimeToMinutes(eTask.endTime || '18:00');
                    return (taskStartMins < eEnd && taskEndMins > eStart);
                  });
                  if (!overlaps) { rows[rowIndex].push(task); task._rowIndex = rowIndex; break; }
                  rowIndex++;
                }
              });

              const requiredHeight = Math.max(56, rows.length * 34 + 16);
              const blockHeight = rows.length * 34 - 6;
              const offsetY = (requiredHeight - blockHeight) / 2;

              return (
                <div key={assignee} className="flex border-b border-slate-200/40 dark:border-slate-700/40 group hover:bg-slate-100/50 dark:hover:bg-slate-800/30 relative" style={{ minHeight: `${requiredHeight}px` }}>
                  <div className="w-28 md:w-40 shrink-0 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 flex items-center bg-white dark:bg-slate-900/95 z-20 sticky left-0 shadow-[2px_0_8px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_8px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] md:text-xs text-white font-bold shrink-0 border border-indigo-400/30">
                        {assignee.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="truncate text-xs md:text-sm" title={assignee}>{assignee}</span>
                    </div>
                  </div>

                  <div className="flex flex-1 relative">
                    {hours.map(hour => (
                      <div 
                        key={hour} 
                        className="flex-1 min-w-[50px] border-r border-slate-300 dark:border-slate-700/60 cursor-pointer transition-all hover:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)] hover:bg-slate-100 dark:hover:bg-slate-800/80"
                        onClick={() => openAddModal(assignee, hour)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, assignee, hour)}
                      ></div>
                    ))}

                    <div className="absolute inset-0 pointer-events-none" style={{ minHeight: `${requiredHeight}px` }}>
                      {sortedTasks.map(task => {
                        const taskStartMins = parseTimeToMinutes(task.startTime || '09:00');
                        const taskEndMins = parseTimeToMinutes(task.endTime || '18:00');
                        const visStart = Math.max(taskStartMins, 0);
                        const visEnd = Math.min(taskEndMins, 24 * 60);
                        if (visEnd <= visStart) return null;

                        const leftPct = (visStart / totalMinutes) * 100;
                        const widthPct = ((visEnd - visStart) / totalMinutes) * 100;

                        const colorClass = (task.priority || 'normal') === 'urgent' ? 'bg-red-500/90 border-red-400/60' :
                                           (task.priority || 'normal') === 'high' ? 'bg-orange-500/90 border-orange-400/60' :
                                           (task.priority || 'normal') === 'low' ? 'bg-green-500/80 border-green-400/60' :
                                           task.Status === 'done' ? 'bg-emerald-500/90 border-emerald-400/60' :
                                           task.Status === 'in-progress' ? 'bg-amber-500/90 border-amber-400/60' :
                                           'bg-indigo-500/90 border-indigo-400/60';

                        return (
                          <div 
                            key={task.Id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onClick={(e) => openEditModal(e, task)}
                            className={`absolute rounded-lg border text-[11px] md:text-xs text-white px-2 py-0.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all z-10 flex items-center overflow-hidden pointer-events-auto ${colorClass}`}
                            style={{ 
                              left: `${leftPct}%`, 
                              width: `${widthPct}%`,
                              top: `${offsetY + (task._rowIndex * 34)}px`,
                              height: '26px',
                              minWidth: '24px'
                            }}
                            title={`${task.Title}\nเวลา: ${task.startTime} - ${task.endTime}`}
                          >
                            <span className="font-semibold truncate w-full leading-tight">{task.Title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {assignees.length === 0 && (
              <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
                ยังไม่มีงานสำหรับวันนี้
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ MONTHLY VIEW ═══ */}
      {viewMode === 'monthly' && (
        <div className="flex-1 overflow-auto border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 relative shadow-inner">
          <div className="min-w-[1200px]">
            
            {/* Header Row (Hours) */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-slate-50 dark:bg-slate-800 z-30 shadow-md">
              <div className="w-28 md:w-40 shrink-0 px-3 py-2 font-bold text-slate-600 dark:text-slate-400 text-xs border-r border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 sticky left-0 z-40">
                วัน / วันที่
              </div>
              <div className="flex flex-1 relative">
                {hours.map(hour => (
                  <div key={hour} className="flex-1 min-w-[50px] border-r border-slate-200/30 dark:border-slate-700/30 flex items-center justify-center py-2 text-[11px] md:text-xs text-slate-500 font-mono">
                    {hour.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>

            {/* Body Rows */}
            {monthDays.map((day, idx) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isToday = dayStr === format(new Date(), 'yyyy-MM-dd');
              const dayOfWeek = day.getDay();
              
              // Filter tasks for this day
              const dayTasks = tasks.filter(t => {
                if (!t.startDate || !t.dueDate) return false;
                const inDateRange = t.startDate <= dayStr && t.dueDate >= dayStr;
                if (!inDateRange) return false;
                if (selectedAssignee !== 'All' && t.Assignee !== selectedAssignee) return false;
                if (searchQuery) {
                  const q = searchQuery.toLowerCase();
                  return t.Title?.toLowerCase().includes(q) || t.Assignee?.toLowerCase().includes(q);
                }
                return true;
              });

              const sortedTasks = [...dayTasks].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
              const rows = [];
              
              sortedTasks.forEach(task => {
                const taskStartMins = parseTimeToMinutes(task.startTime || '09:00');
                const taskEndMins = parseTimeToMinutes(task.endTime || '18:00');
                let rowIndex = 0;
                while(true) {
                  if (!rows[rowIndex]) { rows[rowIndex] = [task]; task._rowIndex = rowIndex; break; }
                  const overlaps = rows[rowIndex].some(eTask => {
                    const eStart = parseTimeToMinutes(eTask.startTime || '09:00');
                    const eEnd = parseTimeToMinutes(eTask.endTime || '18:00');
                    return (taskStartMins < eEnd && taskEndMins > eStart);
                  });
                  if (!overlaps) { rows[rowIndex].push(task); task._rowIndex = rowIndex; break; }
                  rowIndex++;
                }
              });

              const requiredHeight = Math.max(56, rows.length * 34 + 16);
              const blockHeight = rows.length * 34 - 6;
              const offsetY = (requiredHeight - blockHeight) / 2;

              return (
                <div key={dayStr} className={`flex border-b border-slate-200/40 dark:border-slate-700/40 group relative ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/30'}`} style={{ minHeight: `${requiredHeight}px` }}>
                  {/* Left Sidebar Day Cell */}
                  <div className={`w-28 md:w-40 shrink-0 px-2 py-2 flex items-center gap-2 md:gap-3 border-r border-slate-200 dark:border-slate-700 z-20 sticky left-0 shadow-[2px_0_8px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_8px_rgba(0,0,0,0.3)] ${isToday ? 'bg-indigo-50 dark:bg-slate-800' : 'bg-white dark:bg-slate-900/95'}`}>
                    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg flex flex-col items-center justify-center shrink-0 ${isToday ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                      <span className="text-[9px] md:text-[10px] font-bold leading-none mt-1">{thaiDayNames[dayOfWeek]}</span>
                      <span className="text-sm md:text-base font-black leading-tight">{format(day, 'dd')}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[11px] md:text-xs font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}`}>{format(day, 'MMM')}</span>
                      <span className="text-[9px] md:text-[10px] text-slate-400">{format(day, 'yyyy')}</span>
                    </div>
                  </div>

                  <div className="flex flex-1 relative">
                    {hours.map(hour => (
                      <div 
                        key={hour} 
                        className={`flex-1 min-w-[50px] border-r border-slate-300 dark:border-slate-700/60 cursor-pointer transition-all hover:shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)] hover:bg-slate-100 dark:hover:bg-slate-800/80 ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''}`}
                        onClick={() => {
                          setEditingTask({
                            startDate: dayStr,
                            dueDate: dayStr,
                            startTime: formatMinutesToTime(hour * 60),
                            endTime: formatMinutesToTime((hour + 1) * 60),
                            assignee: selectedAssignee !== 'All' ? selectedAssignee : ''
                          });
                          setIsModalOpen(true);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleWeeklyDrop(e, dayStr, hour)}
                      ></div>
                    ))}

                    <div className="absolute inset-0 pointer-events-none" style={{ minHeight: `${requiredHeight}px` }}>
                      {sortedTasks.map(task => {
                        const taskStartMins = parseTimeToMinutes(task.startTime || '09:00');
                        const taskEndMins = parseTimeToMinutes(task.endTime || '18:00');
                        const visStart = Math.max(taskStartMins, 0);
                        const visEnd = Math.min(taskEndMins, 24 * 60);
                        if (visEnd <= visStart) return null;

                        const leftPct = (visStart / totalMinutes) * 100;
                        const widthPct = ((visEnd - visStart) / totalMinutes) * 100;

                        const colorClass = (task.priority || 'normal') === 'urgent' ? 'bg-red-500/90 border-red-400/60' :
                                           (task.priority || 'normal') === 'high' ? 'bg-orange-500/90 border-orange-400/60' :
                                           (task.priority || 'normal') === 'low' ? 'bg-green-500/80 border-green-400/60' :
                                           task.Status === 'done' ? 'bg-emerald-500/90 border-emerald-400/60' :
                                           task.Status === 'in-progress' ? 'bg-amber-500/90 border-amber-400/60' :
                                           'bg-indigo-500/90 border-indigo-400/60';

                        const personColor = getPersonColor(task.Assignee || 'Unassigned');

                        return (
                          <div 
                            key={task.Id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, task)}
                            onClick={(e) => openEditModal(e, task)}
                            className={`absolute rounded-lg border text-[11px] md:text-xs text-white px-2 py-0.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all z-10 flex items-center overflow-hidden pointer-events-auto ${colorClass}`}
                            style={{ 
                              left: `${leftPct}%`, 
                              width: `${widthPct}%`,
                              top: `${offsetY + (task._rowIndex * 34)}px`,
                              height: '26px',
                              minWidth: '24px'
                            }}
                            title={`${task.Title} (${task.Assignee || 'Unassigned'})\nเวลา: ${task.startTime} - ${task.endTime}`}
                          >
                            <div className="flex items-center gap-1.5 w-full">
                              {selectedAssignee === 'All' && (
                                <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold ${personColor.bg} text-white shadow-[0_0_2px_rgba(0,0,0,0.5)] border border-white/20`}>
                                  {(task.Assignee || 'U').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="font-semibold truncate w-full leading-tight">{task.Title}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend for team comparison */}
          {selectedAssignee === 'All' && (
            <div className="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center gap-3 flex-wrap z-50">
              <span className="text-[10px] md:text-xs text-slate-500 font-medium">สมาชิก:</span>
              {allAssignees.slice(0, 8).map(name => {
                const color = getPersonColor(name);
                return (
                  <button 
                    key={name} 
                    onClick={() => setSelectedAssignee(name)}
                    className={`flex items-center gap-1.5 text-[11px] md:text-xs px-2 py-1 rounded-lg border transition-all hover:scale-105 shadow-sm hover:shadow ${color.light} ${color.border} ${color.text}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${color.bg}`}></div>
                    {name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <AddTaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialData={editingTask}
      />
    </div>
  );
}
