import React, { useState } from 'react';
import LogModal from './LogModal';

export default function CalendarWidget({ monthlyData = {}, unreadDates = [], todayDate, onLogSaved }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  // Parse todayDate to ensure we use the shifted date
  const [yearStr, monthStr, dayStr] = todayDate ? todayDate.split('-') : [];
  const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();
  const month = monthStr ? parseInt(monthStr, 10) - 1 : new Date().getMonth();
  
  const todayForCal = new Date(year, month, parseInt(dayStr || new Date().getDate(), 10));
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // Generate blank days
  const blankDays = Array.from({ length: firstDayOfWeek });
  const actualDays = Array.from({ length: daysInMonth }).map((_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { day, dateStr };
  });

  const todayStr = todayDate;

  const openDayManager = (dateStr) => {
    setSelectedDate(dateStr);
    setModalOpen(true);
  };

  const openLog = (pid) => {
    setSelectedPeriod(pid);
    setModalOpen(false);
    setLogModalOpen(true);
  };

  return (
    <div className="flex-1 min-h-[380px] flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-3.5 rounded-full bg-blue-500"></span>
        <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs tracking-wider uppercase">
          ปฏิทินงาน <span className="text-slate-400 dark:text-slate-500 font-normal text-[11px] normal-case">({todayDate})</span>
        </h3>
      </div>
      
      <div className="flex-1 flex flex-col border border-slate-200/90 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 overflow-hidden shadow-2xs">
        <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-750 py-2 border-b border-slate-100 dark:border-slate-700">
          <div className="text-rose-500 dark:text-rose-400">อา</div>
          <div>จ</div>
          <div>อ</div>
          <div>พ</div>
          <div>พฤ</div>
          <div>ศ</div>
          <div className="text-blue-500 dark:text-blue-400">ส</div>
        </div>
        <div className="grid grid-cols-7 gap-1 p-1.5 sm:p-2 bg-slate-50/30 dark:bg-slate-850/50 flex-1 auto-rows-fr">
          {blankDays.map((_, i) => (
            <div key={`blank-${i}`} className="min-h-[48px] sm:min-h-[52px] border border-transparent"></div>
          ))}
          {actualDays.map(({ day, dateStr }) => {
            const isToday = dateStr === todayStr;
            const hasUnread = unreadDates.includes(dateStr);
            const dayData = monthlyData[dateStr] || {};

            return (
              <div 
                key={dateStr}
                onClick={() => openDayManager(dateStr)}
                className={`relative flex flex-col justify-between p-1.5 sm:p-2 border rounded-xl cursor-pointer transition-all min-h-[48px] sm:min-h-[52px]
                  ${isToday 
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/30 font-bold shadow-2xs ring-1 ring-blue-400/40' 
                    : 'border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-750 hover:shadow-2xs'}
                  ${hasUnread ? 'ring-2 ring-rose-400 animate-pulse' : ''}
                `}
              >
                <div className="flex justify-between items-center leading-none">
                  <span className={`text-xs sm:text-sm ${isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>
                  {hasUnread && <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-800"></span>}
                </div>
                <div className="flex gap-1 mt-auto pt-1 justify-center">
                  {[1, 2, 3].map(pid => (
                    <div 
                      key={pid} 
                      className={`w-1.5 h-1.5 rounded-full ${dayData[pid] ? 'bg-emerald-500 shadow-2xs' : 'bg-slate-200 dark:bg-slate-600'}`}
                      title={pid === 1 ? 'เริ่มงาน' : pid === 2 ? 'พักเบรก' : 'เลิกงาน'}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day Manager Modal */}
      {modalOpen && selectedDate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-xs shadow-xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
              <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">วันที่ {selectedDate}</h5>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">เลือกช่วงเวลาเพื่อดูหรือแก้ไขบันทึก:</p>
              {[
                { id: 1, label: 'ช่วงที่ 1: เริ่มงาน (Start)' },
                { id: 2, label: 'ช่วงที่ 2: พักเบรก (Break)' },
                { id: 3, label: 'ช่วงที่ 3: เลิกงาน (End)' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => openLog(p.id)}
                  className="w-full text-left px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex justify-between items-center cursor-pointer"
                >
                  <span>{p.label}</span>
                  <span className={`w-2 h-2 rounded-full ${monthlyData[selectedDate]?.[p.id] ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {logModalOpen && selectedDate && selectedPeriod && (
        <LogModal
          isOpen={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          periodId={selectedPeriod}
          periodInfo={{
            label: selectedPeriod === 1 ? 'เริ่มงาน (Start)' : selectedPeriod === 2 ? 'พักเบรก (Break)' : 'เลิกงาน (End)'
          }}
          logDate={selectedDate}
          existingData={monthlyData[selectedDate]?.[selectedPeriod]}
          onSaved={() => {
            setLogModalOpen(false);
            if (onLogSaved) onLogSaved();
          }}
        />
      )}
    </div>
  );
}
