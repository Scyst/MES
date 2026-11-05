import React from 'react';
import { ChevronRight, Folder, Home } from 'lucide-react';

export default function BreadcrumbBar({ currentFolderPath, onNavigate }) {
  const parts = currentFolderPath ? currentFolderPath.split('/') : [];

  return (
    <nav className="flex items-center gap-1.5 text-sm flex-wrap">
      <button
        type="button"
        onClick={() => onNavigate('')}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
          parts.length === 0
            ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-800'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        <Home size={14} className="shrink-0" />
        <span>All Files (ราก)</span>
      </button>

      {parts.map((part, index) => {
        const subPath = parts.slice(0, index + 1).join('/');
        const isLast = index === parts.length - 1;

        return (
          <React.Fragment key={subPath}>
            <ChevronRight size={14} className="text-slate-400 dark:text-slate-600 shrink-0" />
            <button
              type="button"
              onClick={() => onNavigate(subPath)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                isLast
                  ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-800'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Folder size={14} className="shrink-0 text-amber-500" />
              <span className="truncate max-w-[180px]">{part}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
