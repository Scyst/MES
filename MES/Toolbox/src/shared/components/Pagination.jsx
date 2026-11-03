import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const buttonClasses =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-colors shadow-2xs';

/** Controlled pagination bar. `page` is 1-based. */
export default function Pagination({ page, pageSize, totalItems, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-2.5 text-xs text-slate-600 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between py-1">
      <div className="flex items-center gap-2.5">
        <span>
          แสดง {firstItem.toLocaleString()}–{lastItem.toLocaleString()} จาก {totalItems.toLocaleString()} รายการ
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            aria-label="จำนวนรายการต่อหน้า"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} / หน้า
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" className={buttonClasses} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="หน้าก่อนหน้า">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[70px] text-center font-medium">
          หน้า {page} / {totalPages}
        </span>
        <button type="button" className={buttonClasses} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="หน้าถัดไป">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

