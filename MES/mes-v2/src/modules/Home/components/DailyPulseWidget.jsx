import React, { useState } from 'react';
import { PlusCircle, Info } from 'lucide-react';
import LogModal from './LogModal';

const periodInfo = {
  1: { label: 'เริ่มงาน (Start)', color: 'text-blue-600', bg: 'bg-blue-50' },
  2: { label: 'พักเบรก (Break)', color: 'text-orange-500', bg: 'bg-orange-50' },
  3: { label: 'เลิกงาน (End)', color: 'text-green-600', bg: 'bg-green-50' }
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
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-4 mt-2">
        <span className="text-red-500 text-lg">❤️</span>
        <h3 className="font-bold text-gray-800 text-base">DAILY PULSE <span className="text-gray-500 font-normal text-sm ml-1 tracking-wide">(บันทึกประจำวัน)</span></h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map(pid => {
          const log = todayLogs[pid];
          const isDone = !!log;
          const info = periodInfo[pid];
          
          return (
            <button
              key={pid}
              onClick={() => handleOpenModal(pid)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 cursor-pointer h-28 ${
                isDone 
                  ? `${info.bg} border-transparent shadow-[0_2px_6px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_12px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:border-gray-300` 
                  : 'bg-white border-gray-200 shadow-[0_2px_6px_rgba(0,0,0,0.02)] hover:border-blue-400 hover:shadow-[0_6px_12px_rgba(0,0,0,0.08)] hover:-translate-y-1 hover:bg-blue-50/50'
              }`}
            >
              <div className="text-sm font-bold text-gray-700 mb-2">{info.label}</div>
              
              {isDone ? (
                <div className="flex flex-col items-center">
                  <span className="text-3xl leading-none mb-1">{emojis[log.mood]}</span>
                  <span className="text-xs text-gray-500 font-medium">บันทึกแล้ว</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <PlusCircle className="mb-2 opacity-50 w-6 h-6" strokeWidth={1.5} />
                  <span className="text-xs">กดบันทึก</span>
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
