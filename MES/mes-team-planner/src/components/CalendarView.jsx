import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus, FiCalendar } from 'react-icons/fi';
import { getDaysInMonth, startOfMonth, getDay, format, addMonths, subMonths } from 'date-fns';
import AddTaskModal from './AddTaskModal';
import AddEventModal from './AddEventModal';

export default function CalendarView({ tasks = [], events = [], onSaveTask, onDeleteTask, onSaveEvent, onDeleteEvent, loading, currentUser }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  const handleSaveTask = async (taskData) => {
    const success = await onSaveTask(taskData);
    if (success) {
      setIsTaskModalOpen(false);
      setEditingTask(null);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const success = await onDeleteTask(taskId);
    if (success) {
      setIsTaskModalOpen(false);
      setEditingTask(null);
    }
  };

  const handleSaveEvent = async (eventData) => {
    const success = await onSaveEvent(eventData);
    if (success) {
      setIsEventModalOpen(false);
      setEditingEvent(null);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const success = await onDeleteEvent(eventId);
    if (success) {
      setIsEventModalOpen(false);
      setEditingEvent(null);
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const daysInMonth = getDaysInMonth(currentDate);
  const startDay = getDay(startOfMonth(currentDate));
  
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const currentMonthDisplay = `${thaiMonths[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const getEventsForDay = (day) => {
    const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd');
    const dayEvents = events.filter(e => e.date === dateStr).map(e => ({ ...e, _type: 'event' }));
    const dayTasks = tasks.filter(t => t.Visibility === 'public' && t.dueDate === dateStr).map(t => ({ ...t, _type: 'task' }));
    return [...dayEvents, ...dayTasks];
  };

  const handleDayClick = (day) => {
    const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd');
    setSelectedDate(dateStr);
  };

  // Items for selected day detail panel
  const selectedDayItems = (() => {
    if (!selectedDate) return [];
    const dayEvents = events.filter(e => e.date === selectedDate).map(e => ({ ...e, _type: 'event' }));
    const dayTasks = tasks.filter(t => t.Visibility === 'public' && t.dueDate === selectedDate).map(t => ({ ...t, _type: 'task' }));
    return [...dayEvents, ...dayTasks];
  })();

  const getItemColor = (item) => {
    if (item._type === 'task') return { bg: 'bg-emerald-50 dark:bg-emerald-500/15', border: 'border-emerald-300 dark:border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-400' };
    if (item.Type === 'maintenance') return { bg: 'bg-rose-50 dark:bg-rose-500/15', border: 'border-rose-300 dark:border-rose-500/30', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-400' };
    if (item.Type === 'holiday') return { bg: 'bg-amber-50 dark:bg-amber-500/15', border: 'border-amber-300 dark:border-amber-500/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-400' };
    if (item.Type === 'leave') return { bg: 'bg-orange-50 dark:bg-orange-500/15', border: 'border-orange-300 dark:border-orange-500/30', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-400' };
    return { bg: 'bg-indigo-50 dark:bg-indigo-500/15', border: 'border-indigo-300 dark:border-indigo-500/30', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-400' };
  };

  const handleItemClick = (item) => {
    if (item._type === 'task') {
      setEditingTask(item);
      setIsTaskModalOpen(true);
    } else if (item._type === 'event') {
      setEditingEvent(item);
      setIsEventModalOpen(true);
    }
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-600 dark:text-slate-400">Loading calendar...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-2 mb-4 shrink-0">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-90">
            <FiChevronLeft />
          </button>
          <span className="text-slate-800 dark:text-slate-200 font-semibold px-3 min-w-[90px] text-center text-sm md:text-base">{currentMonthDisplay}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-90">
            <FiChevronRight />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditingEvent({ date: selectedDate }); setIsEventModalOpen(true); }} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-fuchsia-900/20 flex items-center gap-1.5 hidden md:flex">
            <FiPlus className="text-sm" /> สร้างกิจกรรม
          </button>
          <button onClick={() => { setEditingTask({ startDate: selectedDate, dueDate: selectedDate }); setIsTaskModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-indigo-900/20 flex items-center gap-1.5">
            <FiPlus className="text-sm" /> สร้างงาน
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50 flex flex-col min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800/80 shrink-0">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, idx) => (
            <div key={idx} className="text-center py-2 text-[11px] sm:text-xs md:text-sm font-bold text-slate-500">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto custom-scrollbar">
          {/* Empty cells before first day */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square sm:aspect-auto sm:min-h-[80px] md:min-h-[100px] p-1 border-t border-r border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.03)] dark:shadow-[inset_1px_1px_4px_rgba(0,0,0,0.2)]"></div>
          ))}
          
          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd');
            const dayEvents = getEventsForDay(day);
            const isToday = todayStr === dateStr;
            const isSelected = selectedDate === dateStr;

            return (
              <div 
                key={day} 
                onClick={() => handleDayClick(day)}
                className={`aspect-square sm:aspect-auto sm:min-h-[80px] md:min-h-[100px] p-1 sm:p-1.5 md:p-2 border-t border-r border-slate-300 dark:border-slate-700 cursor-pointer transition-all relative hover:shadow-lg hover:z-10
                  ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10 ring-2 ring-inset ring-indigo-500/50 shadow-inner' : 'bg-white dark:bg-slate-900 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.03)] dark:shadow-[inset_1px_1px_4px_rgba(0,0,0,0.2)] hover:bg-slate-50 dark:hover:bg-slate-800/80'}
                  ${isToday && !isSelected ? 'ring-2 ring-inset ring-fuchsia-500/70' : ''}
                `}
              >
                {/* Day number */}
                <div className={`text-[11px] sm:text-xs md:text-sm w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full mx-auto sm:mx-0 mb-0.5 md:mb-1 
                  ${isToday ? 'bg-fuchsia-500 text-white font-bold' : isSelected ? 'text-indigo-600 dark:text-indigo-300 font-semibold' : 'text-slate-700 dark:text-slate-400'}
                `}>
                  {day}
                </div>

                {/* Mobile: colored dots only */}
                {dayEvents.length > 0 && (
                  <div className="flex justify-center gap-0.5 mt-0.5 sm:hidden flex-wrap">
                    {dayEvents.slice(0, 3).map((item, idx) => {
                      const color = getItemColor(item);
                      return <div key={idx} className={`w-1.5 h-1.5 rounded-full ${color.dot}`}></div>;
                    })}
                    {dayEvents.length > 3 && <div className="text-[7px] text-slate-500 leading-none ml-0.5">+{dayEvents.length - 3}</div>}
                  </div>
                )}

                {/* Desktop: event labels */}
                <div className="hidden sm:block space-y-0.5 md:space-y-1 mt-0.5">
                  {dayEvents.slice(0, 2).map(item => {
                    const color = getItemColor(item);
                    return (
                      <div 
                        key={`${item._type}-${item.Id}`} 
                        onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                        className={`text-[10px] md:text-xs px-1.5 py-0.5 md:py-1 rounded truncate cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] ${color.bg} ${color.text} border ${color.border}`}
                      >
                        {item.Title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-[9px] md:text-xs text-slate-500 px-1">+{dayEvents.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Empty cells after last day */}
          {Array.from({ length: (7 - ((daysInMonth + startDay) % 7)) % 7 }).map((_, i) => (
            <div key={`empty-end-${i}`} className="aspect-square sm:aspect-auto sm:min-h-[80px] md:min-h-[100px] p-1 border-t border-r border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 shadow-[inset_1px_1px_4px_rgba(0,0,0,0.03)] dark:shadow-[inset_1px_1px_4px_rgba(0,0,0,0.2)]"></div>
          ))}
        </div>
      </div>

      {/* Selected Day Detail Panel */}
      <div className="md:w-80 lg:w-96 shrink-0 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden flex flex-col h-64 md:h-full">
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 shrink-0 flex items-center justify-between">
          <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200">
            📋 {selectedDate ? (() => { 
              try { return format(new Date(selectedDate + 'T00:00:00'), 'dd MMM yyyy'); } 
              catch { return selectedDate; } 
            })() : 'เลือกวัน'}
          </h3>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => { setEditingEvent({ date: selectedDate }); setIsEventModalOpen(true); }}
              className="text-fuchsia-600 dark:text-fuchsia-400 hover:text-fuchsia-500 dark:hover:text-fuchsia-300 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 transition-all"
            >
              + กิจกรรม
            </button>
            <button 
              onClick={() => { setEditingTask({ startDate: selectedDate, dueDate: selectedDate }); setIsTaskModalOpen(true); }}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all"
            >
              + งาน
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {selectedDayItems.length > 0 ? (
            <div className="space-y-2">
              {selectedDayItems.map(item => {
                const color = getItemColor(item);
                return (
                  <div 
                    key={`${item._type}-${item.Id}`} 
                    onClick={() => handleItemClick(item)}
                    className={`${color.bg} border ${color.border} rounded-xl px-3 py-2.5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`}></div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm md:text-base font-medium ${color.text} truncate`}>
                        {item.Title}
                      </div>
                      {item._type === 'task' && item.Assignee && (
                        <div className="text-[11px] md:text-xs text-slate-500 mt-0.5">👤 {item.Assignee}</div>
                      )}
                      {item._type === 'event' && item.Type && (
                        <div className="text-[11px] md:text-xs text-slate-500 mt-0.5">
                          {item.Type === 'leave' ? '🏖️ วันลา' : item.Type === 'holiday' ? '🎉 วันหยุด' : item.Type === 'maintenance' ? '🔧 บำรุงรักษา' : '📌 นัดหมาย'}
                          {item.Assignee ? ` · ${item.Assignee}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm py-4">
              ไม่มีกิจกรรมในวันนี้
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Task Modal (same as TaskBoard & GanttChart) */}
      <AddTaskModal 
        isOpen={isTaskModalOpen} 
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }} 
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialData={editingTask}
        tasks={tasks}
        currentUser={currentUser}
      />

      {/* Event Modal (for calendar events like meetings, holidays, leaves) */}
      <AddEventModal 
        isOpen={isEventModalOpen} 
        onClose={() => { setIsEventModalOpen(false); setEditingEvent(null); }} 
        tasks={tasks}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        preSelectedDate={selectedDate}
        initialData={editingEvent}
        currentUser={currentUser}
      />
    </div>
  );
}
