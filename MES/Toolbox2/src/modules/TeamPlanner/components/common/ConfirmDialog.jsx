import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

export default function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', type = 'warning' }) {
  if (!isOpen) return null;

  const getIconColor = () => {
    switch(type) {
      case 'danger': return 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400';
      case 'warning': return 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400';
      default: return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400';
    }
  };

  const getButtonClass = () => {
    switch(type) {
      case 'danger': return 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500';
      case 'warning': return 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500 text-white';
      default: return 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 text-white';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onCancel}></div>
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl animate-scale-up overflow-hidden p-6 text-center">
        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${getIconColor()}`}>
          <FiAlertTriangle className="text-3xl" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm">
          {message}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium shadow-sm focus:ring-2 focus:ring-offset-2 transition-colors text-white ${getButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
