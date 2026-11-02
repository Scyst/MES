import React, { useState } from 'react';
import { PlusCircle, Heart } from 'lucide-react';
import LogModal from './LogModal';

const periodInfo = {
  1: { label: 'เริ่มงาน (Start)', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50/70 dark:bg-blue-900/25 border-blue-200 dark:border-blue-800' },
  2: { label: 'พักเบรก (Break)', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50/70 dark:bg-amber-900/25 border-amber-200 dark:border-amber-800' },
  3: { label: 'เลิกงาน (End)', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/70 dark:bg-emerald-900/25 border-emerald-200 dark:border-emerald-800' }
};

const emojis = { 1: '😤', 2: '😓', 3: '😐', 4: '🙂', 5: '🤩' };

export default function DailyPulseWidget({ todayLogs = {}, todayDate, onLogSaved }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const handleOpenModal = (periodId) => {
    setSelectedPeriod(periodId);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-3.5 rounded-full bg-rose-500"></span>
        <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs tracking-wider uppercase">
          DAILY PULSE <span className="text-slate-400 dark:text-slate-500 font-normal text-[11px] normal-case">(บันทึกประจำวัน)</span>
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map(pid => {
          const log = todayLogs[pid];
          const isDone = !!log;
          const info = periodInfo[pid];
          
          return (
            <button
              key={pid}
              onClick={() => handleOpenModal(pid)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border cursor-pointer h-20 transition-all duration-200 shadow-2xs group ${
                isDone 
                  ? `${info.bg} hover:shadow-xs hover:-translate-y-0.5` 
                  : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 hover:-translate-y-0.5'
              }`}
            >
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {info.label}
              </span>
              
              {isDone ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xl leading-none">{emojis[log.mood]}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">บันทึกแล้ว</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-500 transition-colors">
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium">กดบันทึก</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {modalOpen && selectedPeriod && (
        <LogModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          periodId={selectedPeriod}
          periodInfo={periodInfo[selectedPeriod]}
          logDate={todayDate}
          existingData={todayLogs[selectedPeriod]}
          onSaved={onLogSaved}
        />
      )}
    </div>
  );
}
