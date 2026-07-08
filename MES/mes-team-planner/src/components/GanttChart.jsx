import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, addDays, subDays } from 'date-fns';
import { FiChevronLeft, FiChevronRight, FiFilter, FiPlus, FiSearch, FiX } from 'react-icons/fi';
import AddTaskModal from './AddTaskModal';

export default function GanttChart() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedAssignee, setSelectedAssignee] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await axios.get('/api/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSaveTask = async (taskData) => {
    try {
      if (taskData.Id) {
        const res = await axios.put(`/api/tasks/${taskData.Id}`, taskData);
        setTasks(tasks.map(t => t.Id === res.data.Id ? res.data : t));
      } else {
        const res = await axios.post('/api/tasks', taskData);
        setTasks([res.data, ...tasks]);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await axios.delete(`/api/tasks/${id}`);
      setTasks(tasks.filter(t => t.Id !== id));
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
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

    const updatedTask = { ...task, Assignee: targetAssignee, startTime: newStartTime, endTime: newEndTime };
    setTasks(tasks.map(t => t.Id === updatedTask.Id ? updatedTask : t));

    try {
      await axios.put(`/api/tasks/${updatedTask.Id}`, {
        assignee: targetAssignee,
        startTime: newStartTime,
        endTime: newEndTime
      });
    } catch (err) {
      console.error('Drag drop failed', err);
      fetchTasks();
    }
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

  const currentDateStr = format(currentDate, 'yyyy-MM-dd');

  const allAssignees = [...new Set(tasks.map(t => t.Assignee || 'Unassigned'))];
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
  const startHour = 0;
  const endHour = 24;
  const hours = Array.from({ length: 24 }).map((_, i) => i);
  const totalMinutes = 24 * 60;

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-400">Loading Gantt Chart...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ═══ Toolbar ═══ */}
      <div className="flex flex-col gap-3 mb-4 shrink-0">
        <div className="flex flex-row flex-nowrap overflow-x-auto items-center justify-between gap-3 custom-scrollbar pb-1 -mb-1">
          {/* Left Group: Date */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700">
              <button onClick={prevDay} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors active:scale-90">
                <FiChevronLeft />
              </button>
              <span className="text-slate-200 font-semibold px-2 min-w-[100px] sm:min-w-[130px] text-center text-sm">
                {format(currentDate, 'dd MMM yyyy')}
              </span>
              <button onClick={nextDay} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors active:scale-90">
                <FiChevronRight />
              </button>
            </div>
          </div>
          
          {/* Right Group: Filter + Search + Add */}
          <div className="flex items-center gap-2 shrink-0">

            <button onClick={() => setShowSearch(!showSearch)} className={`p-2.5 rounded-xl transition-all active:scale-90 border h-10 w-10 flex items-center justify-center ${showSearch || searchQuery ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
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
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ค้นหางาน / ผู้รับผิดชอบ..." className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm placeholder-slate-500" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><FiX className="text-sm" /></button>
            )}
          </div>
        )}
      </div>

      {/* ═══ Gantt Chart Area ═══ */}
      <div className="flex-1 overflow-auto border border-slate-700/80 rounded-xl bg-slate-800/20 relative">
        <div className="min-w-[1200px]">
          
          {/* Header Row (Hours) */}
          <div className="flex border-b border-slate-700 sticky top-0 bg-slate-800 z-20 shadow-md">
            <div className="w-28 md:w-40 shrink-0 px-3 py-2 font-bold text-slate-400 text-xs border-r border-slate-700 flex items-center bg-slate-800 sticky left-0 z-40">
              ผู้รับผิดชอบ
            </div>
            <div className="flex flex-1 relative">
              {hours.map(hour => (
                <div key={hour} className="flex-1 min-w-[50px] border-r border-slate-700/30 flex items-center justify-center py-2 text-[11px] text-slate-500 font-mono">
                  {hour.toString().padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>

          {/* Body Rows */}
          {assignees.map(assignee => {
            const assigneeTasks = todaysTasks.filter(t => (t.Assignee || 'Unassigned') === assignee);

            // Calculate overlaps
            const sortedTasks = [...assigneeTasks].sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
            const rows = [];
            
            sortedTasks.forEach(task => {
              const taskStartMins = parseTimeToMinutes(task.startTime || '09:00');
              const taskEndMins = parseTimeToMinutes(task.endTime || '18:00');
              
              let rowIndex = 0;
              while(true) {
                if (!rows[rowIndex]) {
                  rows[rowIndex] = [task];
                  task._rowIndex = rowIndex;
                  break;
                }
                const overlaps = rows[rowIndex].some(eTask => {
                  const eStart = parseTimeToMinutes(eTask.startTime || '09:00');
                  const eEnd = parseTimeToMinutes(eTask.endTime || '18:00');
                  return (taskStartMins < eEnd && taskEndMins > eStart);
                });
                
                if (!overlaps) {
                  rows[rowIndex].push(task);
                  task._rowIndex = rowIndex;
                  break;
                }
                rowIndex++;
              }
            });

            const requiredHeight = Math.max(56, rows.length * 34 + 16);
            const blockHeight = rows.length * 34 - 6;
            const offsetY = (requiredHeight - blockHeight) / 2;

            return (
              <div key={assignee} className="flex border-b border-slate-700/40 group hover:bg-slate-800/30 relative" style={{ minHeight: `${requiredHeight}px` }}>
                {/* Name column */}
                <div className="w-28 md:w-40 shrink-0 px-3 py-2 text-sm font-medium text-slate-300 border-r border-slate-700 flex items-center bg-slate-900/95 z-20 sticky left-0 shadow-[2px_0_8px_rgba(0,0,0,0.3)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[11px] text-white font-bold shrink-0 border border-indigo-400/30">
                      {assignee.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="truncate text-xs md:text-sm" title={assignee}>{assignee}</span>
                  </div>
                </div>

                {/* Timeline cells */}
                <div className="flex flex-1 relative">
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className="flex-1 min-w-[50px] border-r border-slate-700/20 hover:bg-indigo-500/5 cursor-pointer transition-colors"
                      onClick={() => openAddModal(assignee, hour)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, assignee, hour)}
                    ></div>
                  ))}

                  {/* Task Bars */}
                  <div className="absolute inset-0 pointer-events-none" style={{ minHeight: `${requiredHeight}px` }}>
                    {sortedTasks.map(task => {
                      const taskStartMins = parseTimeToMinutes(task.startTime || '09:00');
                      const taskEndMins = parseTimeToMinutes(task.endTime || '18:00');
                      
                      // Clamp to visible range
                      const visStart = Math.max(taskStartMins, startHour * 60);
                      const visEnd = Math.min(taskEndMins, endHour * 60);
                      if (visEnd <= visStart) return null;

                      const leftPct = ((visStart - startHour * 60) / totalMinutes) * 100;
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
                          className={`absolute rounded-lg border text-[11px] text-white px-2 py-0.5 shadow-md hover:shadow-lg cursor-grab active:cursor-grabbing hover:brightness-110 transition-all z-10 flex items-center overflow-hidden pointer-events-auto ${colorClass}`}
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

          {/* Empty state */}
          {assignees.length === 0 && (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
              ยังไม่มีงานสำหรับวันนี้
            </div>
          )}
        </div>
      </div>

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
