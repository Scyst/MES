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
    <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 border-b pb-2">
        <h3 className="text-lg font-bold text-gray-800">DAILY PULSE</h3>
        <span className="text-sm text-gray-500">(บันทึกประจำวัน)</span>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-3 flex-1">
        {[1, 2, 3].map(pid => {
          const log = todayLogs[pid];
          const isDone = !!log;
          const info = periodInfo[pid];
          
          return (
            <button
              key={pid}
              onClick={() => handleOpenModal(pid)}
              className={`flex flex-col items-center justify-center p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer ${
                isDone 
                  ? `${info.bg} border-transparent hover:border-gray-300` 
                  : 'bg-gray-50 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
            >
              <div className="text-[10px] md:text-xs font-bold text-gray-500 mb-2 whitespace-nowrap">{info.label}</div>
              
              {isDone ? (
                <div className="flex flex-col items-center">
                  <span className="text-2xl md:text-3xl leading-none">{emojis[log.mood]}</span>
                  <span className="text-[9px] md:text-[10px] text-green-600 font-semibold mt-2 bg-green-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">บันทึกแล้ว</span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <PlusCircle className="mb-2 opacity-50 w-6 h-6 md:w-7 md:h-7" strokeWidth={1.5} />
                  <span className="text-[9px] md:text-[10px]">กดบันทึก</span>
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
