import React, { useState, useRef, useEffect } from 'react';
import { Bell, Reply } from 'lucide-react';
import { dailyLogApi } from '../../../shared/services/dailyLogApi';

const periodInfo = {
  1: { label: 'เริ่มงาน (Start)' },
  2: { label: 'พักเบรก (Break)' },
  3: { label: 'เลิกงาน (End)' }
};

export default function NotificationMenu({ unreadDates = [], monthlyData = {}, onOpenLog }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute actual unread logs
  const unreadLogs = [];
  unreadDates.forEach(dateStr => {
    [1, 2, 3].forEach(pid => {
      const log = monthlyData[dateStr] && monthlyData[dateStr][pid];
      if (log && log.reply_message && log.is_read == 0) {
        unreadLogs.push({
          dateStr,
          pid,
          log
        });
      }
    });
  });

  const count = unreadLogs.length;

  const handleItemClick = (dateStr, pid) => {
    setIsOpen(false);
    onOpenLog(dateStr, pid);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-sm transition-colors relative" 
        title="การแจ้งเตือน"
      >
        <Bell size={24} className={count > 0 ? "text-white animate-pulse" : "text-white"} />
        {count > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center translate-x-1/4 -translate-y-1/4 border-2 border-slate-800">
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-gray-50 border-b p-3 flex justify-between items-center">
            <h6 className="font-bold text-gray-800 m-0">การแจ้งเตือน</h6>
            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-bold">{count} ใหม่</span>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto">
            {count === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                <Bell size={32} className="opacity-20 mb-2" />
                <p className="text-sm">ไม่มีการแจ้งเตือนใหม่</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {unreadLogs.map(({ dateStr, pid, log }, idx) => (
                  <button 
                    key={`${dateStr}-${pid}`}
                    onClick={() => handleItemClick(dateStr, pid)}
                    className={`text-left p-4 hover:bg-gray-50 transition-colors ${idx !== unreadLogs.length - 1 ? 'border-b' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-500">
                        {new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ({periodInfo[pid].label})
                      </span>
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    </div>
                    <div className="flex items-start gap-2 mt-2 text-sm text-gray-700">
                      <Reply size={16} className="text-gray-400 mt-0.5 shrink-0" style={{ transform: 'scaleX(-1)' }} />
                      <div className="line-clamp-2">
                        <span className="font-bold text-green-600">{log.reply_by || 'Admin'}:</span> {log.reply_message}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
