import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getDaysInMonth, startOfMonth, getDay, format, addMonths, subMonths } from 'date-fns';
import axios from 'axios';
import AddEventModal from './AddEventModal';

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resEvents, resTasks] = await Promise.all([
        axios.get('/api/events'),
        axios.get('/api/tasks')
      ]);
      setEvents(resEvents.data);
      setTasks(resTasks.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveEvent = async (eventData) => {
    try {
      const res = await axios.post('/api/events', eventData);
      setEvents([...events, res.data]);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save event', err);
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
    if (item._type === 'task') return { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-400' };
    if (item.Type === 'maintenance') return { bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-300', dot: 'bg-rose-400' };
    if (item.Type === 'holiday') return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-300', dot: 'bg-amber-400' };
    if (item.Type === 'leave') return { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-300', dot: 'bg-orange-400' };
    return { bg: 'bg-indigo-500/10 dark:bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-300', dot: 'bg-indigo-400' };
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-2 mb-4 shrink-0">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-300 dark:border-slate-700">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-90">
            <FiChevronLeft />
          </button>
          <span className="text-slate-800 dark:text-slate-200 font-semibold px-3 min-w-[90px] text-center text-sm">{currentMonthDisplay}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-90">
            <FiChevronRight />
          </button>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-slate-900 dark:text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 shadow-lg shadow-fuchsia-900/20">
          + เพิ่ม
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden">
        {/* Calendar Grid — compact on mobile */}
        <div className="flex-1 rounded-xl border border-slate-300/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 flex flex-col min-h-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-slate-100/80 dark:bg-slate-800/80 shrink-0">
          {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, idx) => (
            <div key={idx} className="text-center py-2 text-[11px] sm:text-xs font-bold text-slate-500">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto custom-scrollbar">
          {/* Empty cells before first day */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square sm:aspect-auto sm:min-h-[80px] p-1 border-t border-r border-slate-300/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/30"></div>
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
                className={`aspect-square sm:aspect-auto sm:min-h-[80px] p-1 sm:p-1.5 border-t border-r border-slate-300/50 dark:border-slate-800/50 cursor-pointer transition-all relative
                  ${isSelected ? 'bg-indigo-500/10 dark:bg-indigo-500/10 ring-2 ring-inset ring-indigo-500/50' : 'bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800/50'}
                  ${isToday && !isSelected ? 'ring-2 ring-inset ring-fuchsia-500/70' : ''}
                `}
              >
                {/* Day number */}
                <div className={`text-[11px] sm:text-xs w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full mx-auto sm:mx-0 mb-0.5 
                  ${isToday ? 'bg-fuchsia-500 text-slate-900 dark:text-white font-bold' : isSelected ? 'text-indigo-300 font-semibold' : 'text-slate-600 dark:text-slate-400'}
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
                <div className="hidden sm:block space-y-0.5 mt-0.5">
                  {dayEvents.slice(0, 2).map(item => {
                    const color = getItemColor(item);
                    return (
                      <div key={`${item._type}-${item.Id}`} className={`text-[10px] px-1.5 py-0.5 rounded truncate ${color.bg} ${color.text} border ${color.border}`}>
                        {item.Title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 2 && (
                    <div className="text-[9px] text-slate-500 px-1">+{dayEvents.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Empty cells after last day */}
          {Array.from({ length: (7 - ((daysInMonth + startDay) % 7)) % 7 }).map((_, i) => (
            <div key={`empty-end-${i}`} className="aspect-square sm:aspect-auto sm:min-h-[80px] p-1 border-t border-r border-slate-300/50 dark:border-slate-800/50 bg-white dark:bg-slate-900/30"></div>
          ))}
        </div>
      </div>

      {/* Selected Day Detail Panel */}
      <div className="md:w-72 shrink-0 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-300/80 dark:border-slate-700/80 overflow-hidden flex flex-col h-64 md:h-full">
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-800/40 shrink-0 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            📋 {selectedDate ? (() => { 
              try { return format(new Date(selectedDate + 'T00:00:00'), 'dd MMM yyyy'); } 
              catch { return selectedDate; } 
            })() : 'เลือกวัน'}
          </h3>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-fuchsia-400 hover:text-fuchsia-300 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-fuchsia-500/10 transition-all"
          >
            + เพิ่มนัด
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {selectedDayItems.length > 0 ? (
            <div className="space-y-2">
              {selectedDayItems.map(item => {
                const color = getItemColor(item);
                return (
                  <div key={`${item._type}-${item.Id}`} className={`${color.bg} border ${color.border} rounded-xl px-3 py-2.5 flex items-center gap-3`}>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`}></div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium ${color.text} truncate`}>
                        {item.Title}
                      </div>
                      {item._type === 'task' && item.Assignee && (
                        <div className="text-[11px] text-slate-500 mt-0.5">👤 {item.Assignee}</div>
                      )}
                      {item._type === 'event' && item.Type && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
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
      <AddEventModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveEvent} preSelectedDate={selectedDate} />
    </div>
  );
}
