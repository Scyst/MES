import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { mockEvents } from '../data/mockData';

export default function CalendarView() {
  const daysInMonth = 31;
  const startDayOfWeek = 3; 
  const currentMonth = "กรกฎาคม 2026";

  const getEventsForDay = (day) => {
    const dateStr = `2026-07-${day.toString().padStart(2, '0')}`;
    return mockEvents.filter(e => e.date === dateStr);
  };

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-700/50 p-6 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <span className="text-fuchsia-400">📅</span> ปฏิทินทีม
        </h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
              <FiChevronLeft />
            </button>
            <span className="text-slate-200 font-semibold px-2 min-w-[120px] text-center">{currentMonth}</span>
            <button className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors">
              <FiChevronRight />
            </button>
          </div>
          <button className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-fuchsia-900/20">
            + สร้างนัดหมาย
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-700/50 rounded-xl overflow-hidden border border-slate-700 flex-1">
        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day, idx) => (
          <div key={idx} className="bg-slate-800 text-center py-3 text-sm font-bold text-slate-400">
            {day}
          </div>
        ))}
        
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="bg-slate-900/80 min-h-[100px] p-2 opacity-50"></div>
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const events = getEventsForDay(day);
          const isToday = day === 6; 

          return (
            <div key={day} className={`bg-slate-900 min-h-[100px] p-2 hover:bg-slate-800/80 transition-colors group relative ${isToday ? 'ring-2 ring-inset ring-fuchsia-500' : ''}`}>
              <div className={`text-sm mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-fuchsia-500 text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'}`}>
                {day}
              </div>
              <div className="space-y-1">
                {events.map(event => (
                  <div key={event.id} className={`text-xs px-2 py-1 rounded truncate cursor-pointer ${
                    event.type === 'maintenance' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                    'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        {Array.from({ length: (7 - ((daysInMonth + startDayOfWeek) % 7)) % 7 }).map((_, i) => (
          <div key={`empty-end-${i}`} className="bg-slate-900/80 min-h-[100px] p-2 opacity-50"></div>
        ))}
      </div>
    </div>
  );
}
