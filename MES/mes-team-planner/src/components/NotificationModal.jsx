import React, { useEffect } from 'react';
import { FiX, FiActivity, FiBell, FiCheckCircle } from 'react-icons/fi';

export default function NotificationModal({ onClose, activities = [] }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-[100]" onClick={onClose}></div>
      <div className="fixed top-16 left-4 md:left-[270px] w-[calc(100%-2rem)] md:w-80 max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[110] overflow-hidden animate-slide-up border border-slate-200 dark:border-slate-800 flex flex-col">
        
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <FiBell className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Mark all as read</button>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md text-slate-400 transition-colors">
              <FiX />
            </button>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-slate-900">
          {activities.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {activities.slice(0, 10).map((act, i) => (
                <div key={act.Id || i} className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${i < 3 ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''}`}>
                  <div className="flex gap-3">
                    <div className="mt-0.5 shrink-0">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        {act.Message.includes('เสร็จ') ? <FiCheckCircle /> : <FiActivity />}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">{act.Message}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(act.CreatedAt).toLocaleString('th-TH')}</p>
                    </div>
                    {i < 3 && <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1.5 ml-auto"></div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <FiBell className="text-xl text-slate-400" />
              </div>
              <p className="text-sm">ไม่มีการแจ้งเตือนใหม่</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
