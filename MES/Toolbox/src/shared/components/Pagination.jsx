import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const buttonClasses =
  'flex h-11 min-w-[44px] items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700';

/** Controlled pagination bar. `page` is 1-based. */
export default function Pagination({ page, pageSize, totalItems, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span>
          แสดง {firstItem.toLocaleString()}–{lastItem.toLocaleString()} จาก {totalItems.toLocaleString()} รายการ
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-11 rounded-lg border border-gray-300 bg-white px-2 dark:border-gray-600 dark:bg-gray-800"
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
      <div className="flex items-center gap-2">
        <button type="button" className={buttonClasses} disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="หน้าก่อนหน้า">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[88px] text-center font-medium">
          หน้า {page} / {totalPages}
        </span>
        <button type="button" className={buttonClasses} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="หน้าถัดไป">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

