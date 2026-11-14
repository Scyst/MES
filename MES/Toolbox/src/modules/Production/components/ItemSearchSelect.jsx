import React, { useMemo, useState } from 'react';
import { Package, Search, X } from 'lucide-react';

/**
 * Reusable searchable item autocomplete selector for SAP No / Part No / Description.
 */
export default function ItemSearchSelect({
  items = [],
  value = '',
  onSelect,
  placeholder = 'ค้นหารหัส SAP หรือ Part No...',
  disabled = false,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selectedItem = useMemo(
    () => items.find((item) => String(item.item_id) === String(value)) || null,
    [items, value]
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 40);
    return items
      .filter((item) =>
        `${item.sap_no || ''} ${item.part_no || ''} ${item.part_description || ''} ${item.sku || ''}`
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 50);
  }, [items, query]);

  const handleChoose = (item) => {
    onSelect(item);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
        <input
          type="text"
          disabled={disabled}
          value={open ? query : selectedItem ? `${selectedItem.sap_no} | ${selectedItem.part_no} — ${selectedItem.part_description || ''}` : query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        {(selectedItem || query) && !disabled && (
          <button
            type="button"
            aria-label="ล้างสินค้าที่เลือก"
            onClick={() => {
              setQuery('');
              onSelect(null);
              setOpen(true);
            }}
            className="absolute right-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-40 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
          {matches.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">ไม่พบสินค้าที่ตรงกับคำค้นหา</div>
          ) : (
            matches.map((item) => (
              <button
                key={item.item_id}
                type="button"
                onClick={() => handleChoose(item)}
                className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-blue-50 dark:hover:bg-slate-700 ${
                  String(item.item_id) === String(value) ? 'bg-blue-50/80 dark:bg-blue-950/50' : ''
                }`}
              >
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <span>{item.part_no}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {item.sap_no}
                    </span>
                    {item.material_type && (
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {item.material_type}
                      </span>
                    )}
                  </div>
                  <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {item.part_description || '-'}
                  </div>
                </div>
              </button>
            ))
          )}
          <div className="sticky bottom-0 mt-1 flex justify-end border-t border-slate-100 bg-white pt-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              ปิดรายการ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
