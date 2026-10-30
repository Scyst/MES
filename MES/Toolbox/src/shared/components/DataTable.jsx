import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from 'lucide-react';
import Pagination from './Pagination';
import { useToast } from '../contexts/FeedbackContext';

/**
 * Reusable industrial data table: search, sort, client-side pagination, Excel export.
 *
 * columns: [{
 *   key,                  // unique id; also the default accessor into the row
 *   header,               // header label
 *   accessor?: (row)=>any // value used for search / sort / export (defaults to row[key])
 *   render?: (row)=>node  // cell renderer (defaults to the accessor value)
 *   sortable?: boolean,   // default true
 *   exportable?: boolean, // default true
 *   className?: string    // extra classes for <td>
 * }]
 *
 * Search is debounced by `searchDebounceMs` (default 300ms).
 * Pass `toolbar` to render extra filters next to the search box.
 */

const DEFAULT_PAGE_SIZE = 25;

const readValue = (column, row) => (column.accessor ? column.accessor(row) : row[column.key]);

const compareValues = (left, right) => {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), 'th', { numeric: true, sensitivity: 'base' });
};

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timerId = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timerId);
  }, [value, delayMs]);
  return debounced;
}

export default function DataTable({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = 'ไม่พบข้อมูล',
  searchPlaceholder = 'ค้นหา...',
  searchable = true,
  searchDebounceMs = 300,
  initialPageSize = DEFAULT_PAGE_SIZE,
  exportFileName,
  toolbar = null,
}) {
  const toast = useToast();
  const [searchInput, setSearchInput] = useState('');
  const [sort, setSort] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const searchTerm = useDebouncedValue(searchInput, searchDebounceMs).trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    return rows.filter((row) =>
      columns.some((column) => {
        const value = readValue(column, row);
        return value != null && String(value).toLowerCase().includes(searchTerm);
      })
    );
  }, [rows, columns, searchTerm]);

  const sortedRows = useMemo(() => {
    const sortColumn = columns.find((column) => column.key === sort.key);
    if (!sortColumn) return filteredRows;
    const directionFactor = sort.direction === 'asc' ? 1 : -1;
    return [...filteredRows].sort(
      (leftRow, rightRow) => directionFactor * compareValues(readValue(sortColumn, leftRow), readValue(sortColumn, rightRow))
    );
  }, [filteredRows, columns, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (column) => {
    if (column.sortable === false) return;
    setPage(1);
    setSort((current) =>
      current.key === column.key
        ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, direction: 'asc' }
    );
  };

  const handleExport = async () => {
    try {
      const { utils, writeFile } = await import('xlsx');
      const exportColumns = columns.filter((column) => column.exportable !== false);
      const records = sortedRows.map((row) =>
        Object.fromEntries(exportColumns.map((column) => [column.header, readValue(column, row) ?? '']))
      );
      const worksheet = utils.json_to_sheet(records);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Data');
      writeFile(workbook, `${exportFileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`ส่งออกข้อมูล ${records.length.toLocaleString()} รายการสำเร็จ`);
    } catch (error) {
      console.error('Excel export failed:', error);
      toast.error('ไม่สามารถส่งออกไฟล์ Excel ได้');
    }
  };

  return (
    <div className="w-full space-y-4">
      {(searchable || toolbar || exportFileName) && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          {searchable && (
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setPage(1);
                }}
                placeholder={searchPlaceholder}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}
          {toolbar}
          {exportFileName && (
            <button
              type="button"
              onClick={handleExport}
              disabled={sortedRows.length === 0}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <Download className="h-4 w-4" /> ส่งออก Excel
            </button>
          )}
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            <tr>
              {columns.map((column) => {
                const isSorted = sort.key === column.key;
                const SortIcon = !isSorted ? ArrowUpDown : sort.direction === 'asc' ? ArrowUp : ArrowDown;
                const sortable = column.sortable !== false;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="px-4 py-3 font-semibold"
                  >
                    {sortable ? (
                      <button type="button" onClick={() => handleSort(column)} className="flex min-h-[44px] items-center gap-1 uppercase">
                        {column.header}
                        <SortIcon className={`h-3.5 w-3.5 ${isSorted ? 'text-blue-600' : 'opacity-40'}`} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 text-gray-800 dark:text-gray-100 ${column.className || ''}`}>
                      {column.render ? column.render(row) : readValue(column, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={currentPage}
        pageSize={pageSize}
        totalItems={sortedRows.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
