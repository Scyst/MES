import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, Users, X } from 'lucide-react';
import { productionApi } from '../../../shared/services/productionApi';

/**
 * Reusable Operator Multi-Select combining active checked-in manpower
 * (MANPOWER_DAILY_LOGS) with full active MES user roster.
 */
export default function OperatorMultiSelect({
  locationId = null,
  date = '',
  selectedIds = [],
  onChange,
  label = 'ผู้ปฏิบัติงาน (Attribution)',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [activeRes, teamRes] = await Promise.all([
          productionApi.getActiveLineUsers({ location_id: locationId || '', date: date || '' }),
          productionApi.getTeamUsers(),
        ]);
        if (cancelled) return;

        const checkedInMap = new Map();
        const activeRows = activeRes?.data?.operators || [];
        activeRows.forEach((op) => {
          checkedInMap.set(Number(op.user_id), {
            id: Number(op.user_id),
            name: op.display_name || op.username,
            empId: op.emp_id || '',
            team: op.team_group || '',
            line: op.line || '',
            checkedIn: Number(op.is_checked_in) === 1,
          });
        });

        const allUsers = teamRes?.data?.users || [];
        allUsers.forEach((usr) => {
          const uid = Number(usr.id);
          if (!checkedInMap.has(uid)) {
            checkedInMap.set(uid, {
              id: uid,
              name: usr.fullname || usr.username,
              empId: usr.emp_id || '',
              team: usr.team_group || '',
              line: usr.line || '',
              checkedIn: false,
            });
          }
        });

        const merged = Array.from(checkedInMap.values()).sort((a, b) => {
          if (a.checkedIn !== b.checkedIn) return a.checkedIn ? -1 : 1;
          return a.name.localeCompare(b.name, 'th');
        });
        setOperators(merged);
      } catch {
        // Keep current list on transient failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [locationId, date]);

  const normalizedSelected = useMemo(
    () => (Array.isArray(selectedIds) ? selectedIds.map(Number).filter((n) => n > 0) : []),
    [selectedIds]
  );

  const selectedSet = useMemo(() => new Set(normalizedSelected), [normalizedSelected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return operators;
    return operators.filter((op) =>
      `${op.name} ${op.empId} ${op.team} ${op.line}`.toLowerCase().includes(q)
    );
  }, [operators, search]);

  const toggleUser = (userId) => {
    if (disabled) return;
    const next = new Set(selectedSet);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    onChange(Array.from(next));
  };

  const selectedNames = useMemo(
    () =>
      operators
        .filter((op) => selectedSet.has(op.id))
        .map((op) => op.name),
    [operators, selectedSet]
  );

  return (
    <div className="relative">
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          {normalizedSelected.length > 0 ? `${normalizedSelected.length} คน` : 'ผู้ล็อกอินปัจจุบัน'}
        </span>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800 transition-colors hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        <span className="flex items-center gap-2 truncate">
          <Users className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">
            {selectedNames.length > 0 ? selectedNames.join(', ') : '-- อิงตามผู้ล็อกอินปัจจุบัน --'}
          </span>
        </span>
        {normalizedSelected.length > 0 && (
          <span
            role="button"
            tabIndex={0}
            aria-label="ล้างผู้ปฏิบัติงานที่เลือก"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onChange([]);
              }
            }}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div className="mt-1.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อ / รหัสพนักงาน / ทีม..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
            {loading && operators.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">กำลังโหลดรายชื่อ...</div>
            ) : filtered.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-500">ไม่พบรายชื่อผู้ปฏิบัติงาน</div>
            ) : (
              filtered.slice(0, 80).map((op) => {
                const isSelected = selectedSet.has(op.id);
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => toggleUser(op.id)}
                    className={`flex min-h-[40px] w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-50 font-semibold text-blue-900 dark:bg-blue-950/60 dark:text-blue-200'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{op.name}</span>
                        {op.checkedIn && (
                          <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                            ลงเวลาแล้ว
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {op.empId || '-'} • {op.line || '-'} {op.team ? `(${op.team})` : ''}
                      </div>
                    </div>
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="mt-2 flex justify-end border-t border-slate-100 pt-2 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
