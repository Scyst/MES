import React, { useState } from 'react';
import LogModal from './LogModal';

const periodInfo = {
  1: { label: 'เริ่มงาน (Start)' },
  2: { label: 'พักเบรก (Break)' },
  3: { label: 'เลิกงาน (End)' }
};

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
  const monthName = todayForCal.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });

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
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-4 mt-2">
        <span className="text-gray-500 text-xl">📅</span>
        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">ปฏิทินงาน <span className="font-normal text-gray-500 dark:text-gray-400 text-sm ml-1 tracking-wide">({todayDate})</span></h3>
      </div>
      
      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <div className="grid grid-cols-7 text-center text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-50/80 dark:bg-gray-700/50 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="text-red-500 dark:text-red-400">อา</div><div>จ</div><div>อ</div><div>พ</div><div>พฤ</div><div>ศ</div><div className="text-blue-500 dark:text-blue-400">ส</div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {blankDays.map((_, i) => (
            <div key={`blank-${i}`} className="h-10 md:h-12 border border-transparent"></div>
          ))}
          {actualDays.map(({ day, dateStr }) => {
            const isToday = dateStr === todayStr;
            const hasUnread = unreadDates.includes(dateStr);
            const dayData = monthlyData[dateStr] || {};

            return (
              <div 
                key={dateStr}
                onClick={() => openDayManager(dateStr)}
                className={`relative flex flex-col p-1 border rounded-lg cursor-pointer transition-all h-12 md:h-14
                  ${isToday ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700'}
                  ${hasUnread ? 'ring-2 ring-red-400 animate-pulse' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-semibold ${isToday ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{day}</span>
                  {hasUnread && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                </div>
                <div className="flex gap-0.5 mt-auto justify-center">
                  {[1, 2, 3].map(pid => (
                    <div 
                      key={pid} 
                      className={`w-1.5 h-1.5 rounded-full ${dayData[pid] ? 'bg-green-500' : 'bg-gray-200'}`}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xs shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h5 className="font-bold text-lg dark:text-gray-100">วันที่ {selectedDate}</h5>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold leading-none">&times;</button>
            </div>
            <div className="p-4 space-y-2">
              {[1, 2, 3].map(pid => {
                const logData = (monthlyData[selectedDate] && monthlyData[selectedDate][pid]) || null;
                const isDone = !!logData;
                
                return (
                  <div 
                    key={pid}
                    onClick={() => openLog(pid)}
                    className="flex justify-between items-center p-3 border dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${isDone ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                      <span className="font-medium text-gray-700 dark:text-gray-200">{periodInfo[pid].label}</span>
                      {logData?.reply_message && (
                        <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800">ตอบกลับ</span>
                      )}
                    </div>
                    <span className="text-gray-400 dark:text-gray-500 text-xl">&rsaquo;</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Log Modal (Recycled from DailyPulseWidget) */}
      {logModalOpen && selectedDate && selectedPeriod && (
        <LogModal
          isOpen={logModalOpen}
          onClose={() => setLogModalOpen(false)}
          periodId={selectedPeriod}
          periodInfo={periodInfo[selectedPeriod]}
          logDate={selectedDate}
          existingData={(monthlyData[selectedDate] && monthlyData[selectedDate][selectedPeriod]) || null}
          onSaved={onLogSaved}
        />
      )}
    </div>
  );
}
