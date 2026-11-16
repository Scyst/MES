import React, { useMemo } from 'react';
import { Crown, Lock, Table2 } from 'lucide-react';
import {
  buildExecSummaryRows,
  formatPlNumber,
  formatPlShort,
  resolveStatementFormulas,
} from '../utils/plFormulaEngine';

const PERIOD_MONTHS = [
  { label: 'Jan', months: [1] },
  { label: 'Feb', months: [2] },
  { label: 'Mar', months: [3] },
  { label: 'Q1', months: [1, 2, 3], subtotal: true },
  { label: 'Apr', months: [4] },
  { label: 'May', months: [5] },
  { label: 'Jun', months: [6] },
  { label: 'Q2', months: [4, 5, 6], subtotal: true },
  { label: 'Jul', months: [7] },
  { label: 'Aug', months: [8] },
  { label: 'Sep', months: [9] },
  { label: 'Q3', months: [7, 8, 9], subtotal: true },
  { label: 'Oct', months: [10] },
  { label: 'Nov', months: [11] },
  { label: 'Dec', months: [12] },
  { label: 'Q4', months: [10, 11, 12], subtotal: true },
  { label: 'YTD', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], subtotal: true },
];

export default function PlStatementViews({
  variant = 'statement', // 'statement' | 'executive'
  periodMode = 'yearly', // 'yearly' | 'daily'
  onPeriodModeChange,
  year,
  onYearChange,
  monthStr,
  onMonthChange,
  rawRows = [],
  lockedDays = [],
  loading = false,
}) {
  const computedRows = useMemo(
    () => resolveStatementFormulas(rawRows, periodMode),
    [rawRows, periodMode]
  );

  const daysInMonth = useMemo(() => {
    const [y, m] = String(monthStr || '').split('-').map(Number);
    if (!y || !m) return 31;
    return new Date(y, m, 0).getDate();
  }, [monthStr]);

  const execRows = useMemo(
    () => (variant === 'executive' ? buildExecSummaryRows(computedRows, periodMode) : []),
    [variant, computedRows, periodMode]
  );

  const renderYearlyStatement = () => {
    const baseAct = Array(13).fill(0);
    const baseTgt = Array(13).fill(0);
    computedRows.forEach((it) => {
      if (Number(it.item_level) === 0 && it.item_type === 'REVENUE') {
        for (let m = 1; m <= 12; m += 1) {
          baseAct[m] += Number(it[`m${m}_act`] || 0);
          baseTgt[m] += Number(it[`m${m}_tgt`] || 0);
        }
      }
    });

    const sumPeriods = (months, item, keySuffix) =>
      months.reduce((acc, m) => acc + Number(item[`m${m}_${keySuffix}`] || 0), 0);
    const sumBase = (months, arr) => months.reduce((acc, m) => acc + Number(arr[m] || 0), 0);

    return (
      <div className="overflow-auto">
        <table className="w-max min-w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 text-center font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 min-w-[240px] border border-slate-200 bg-slate-100 p-2.5 text-left dark:border-slate-700 dark:bg-slate-800">
                Account Name
              </th>
              {PERIOD_MONTHS.map((col) => (
                <th key={col.label} colSpan={4} className={`border border-slate-200 p-1.5 dark:border-slate-700 ${col.subtotal ? 'bg-amber-50 dark:bg-amber-950/40' : ''}`}>
                  {col.label} {col.subtotal ? '' : year}
                </th>
              ))}
            </tr>
            <tr>
              {PERIOD_MONTHS.map((col) => (
                <React.Fragment key={`${col.label}-sub`}>
                  <th className="border border-slate-200 p-1 text-[10px] text-slate-500 dark:border-slate-700">Target</th>
                  <th className="border border-slate-200 p-1 text-[10px] text-slate-400 dark:border-slate-700">%</th>
                  <th className="border border-slate-200 p-1 text-[10px] text-blue-600 dark:border-slate-700">Actual</th>
                  <th className="border border-slate-200 p-1 text-[10px] text-cyan-600 dark:border-slate-700">%</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {computedRows.map((item) => {
              const lvl = Number(item.item_level || 0);
              return (
                <tr key={item.item_id} className={lvl === 0 ? 'bg-slate-50/70 font-bold dark:bg-slate-800/40' : ''}>
                  <td
                    className="sticky left-0 z-10 border-r border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                    style={{ paddingLeft: `${12 + lvl * 16}px` }}
                  >
                    {item.item_name}
                  </td>
                  {PERIOD_MONTHS.map((col) => {
                    const act = sumPeriods(col.months, item, 'act');
                    const tgt = sumPeriods(col.months, item, 'tgt');
                    const bAct = sumBase(col.months, baseAct);
                    const bTgt = sumBase(col.months, baseTgt);
                    const actPct = bAct ? `${((act / bAct) * 100).toFixed(1)}%` : '-';
                    const tgtPct = bTgt ? `${((tgt / bTgt) * 100).toFixed(1)}%` : '-';
                    return (
                      <React.Fragment key={`${item.item_id}-${col.label}`}>
                        <td className={`border-l border-slate-200 p-1.5 text-right font-mono text-slate-500 dark:border-slate-800 ${col.subtotal ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}>
                          {formatPlShort(tgt)}
                        </td>
                        <td className="p-1.5 text-right font-mono text-[10px] text-slate-400">{tgtPct}</td>
                        <td className={`p-1.5 text-right font-mono font-bold ${col.subtotal ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}`}>
                          {formatPlShort(act)}
                        </td>
                        <td className="p-1.5 text-right font-mono text-[10px] font-bold text-blue-600">{actPct}</td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDailyStatement = () => {
    const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return (
      <div className="overflow-auto">
        <table className="w-max min-w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 text-center font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              <th className="sticky left-0 z-20 min-w-[240px] border border-slate-200 bg-slate-100 p-2.5 text-left dark:border-slate-700 dark:bg-slate-800">
                Account Name
              </th>
              {dayNumbers.map((d) => (
                <th key={d} className="min-w-[82px] border border-slate-200 p-1.5 dark:border-slate-700">
                  <div className="flex items-center justify-center gap-1">
                    <span>{String(d).padStart(2, '0')}</span>
                    {lockedDays.includes(d) && <Lock className="h-3 w-3 text-rose-500" />}
                  </div>
                </th>
              ))}
              <th className="min-w-[95px] border border-slate-200 bg-blue-50 p-1.5 text-blue-700 dark:border-slate-700 dark:bg-blue-950/40">MTD</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {computedRows.map((item) => {
              const lvl = Number(item.item_level || 0);
              const mtd = dayNumbers.reduce((s, d) => s + Number(item[`d${d}_act`] || 0), 0);
              return (
                <tr key={item.item_id} className={lvl === 0 ? 'bg-slate-50/70 font-bold dark:bg-slate-800/40' : ''}>
                  <td
                    className="sticky left-0 z-10 border-r border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                    style={{ paddingLeft: `${12 + lvl * 16}px` }}
                  >
                    {item.item_name}
                  </td>
                  {dayNumbers.map((d) => (
                    <td key={d} className="border-l border-slate-100 p-1.5 text-right font-mono dark:border-slate-800">
                      {formatPlShort(item[`d${d}_act`] || 0)}
                    </td>
                  ))}
                  <td className="border-l border-slate-200 bg-blue-50/40 p-1.5 text-right font-mono font-bold text-blue-700 dark:border-slate-700 dark:bg-blue-950/20">
                    {formatPlNumber(mtd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderExecutiveSummary = () => {
    const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const toneClassMap = {
      blue: 'bg-blue-50/80 dark:bg-blue-950/30',
      amber: 'bg-amber-50/80 dark:bg-amber-950/30',
      green: 'bg-emerald-50/80 dark:bg-emerald-950/30',
      emerald: 'bg-teal-50/80 dark:bg-teal-950/30',
      slate: 'bg-slate-50 dark:bg-slate-800/50',
    };

    if (periodMode === 'daily') {
      return (
        <div className="overflow-auto">
          <table className="w-max min-w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 text-center font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="sticky left-0 z-20 min-w-[230px] border border-slate-200 bg-slate-100 p-2.5 text-left dark:border-slate-700 dark:bg-slate-800">
                  Executive Line Item
                </th>
                {dayNumbers.map((d) => (
                  <th key={d} className="min-w-[78px] border border-slate-200 p-1.5 dark:border-slate-700">D{d}</th>
                ))}
                <th className="min-w-[95px] border border-slate-200 bg-blue-50 p-1.5 dark:border-slate-700 dark:bg-blue-950/40">MTD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {execRows.map((row) => {
                const mtd = dayNumbers.reduce((s, d) => s + row.getAct(d), 0);
                return (
                  <tr key={row.label} className={`${toneClassMap[row.tone] || ''} ${row.isBold ? 'font-bold' : ''}`}>
                    <td
                      className="sticky left-0 z-10 border-r border-slate-200 bg-inherit p-2 dark:border-slate-700"
                      style={{ paddingLeft: `${12 + Number(row.indent || 0) * 16}px` }}
                    >
                      {row.label}
                    </td>
                    {dayNumbers.map((d) => (
                      <td key={d} className="border-l border-slate-100 p-1.5 text-right font-mono dark:border-slate-800">
                        {formatPlShort(row.getAct(d))}
                      </td>
                    ))}
                    <td className="border-l border-slate-200 p-1.5 text-right font-mono font-bold dark:border-slate-700">
                      {formatPlNumber(mtd)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    const sumRowMonths = (row, months, isAct) =>
      months.reduce((s, m) => s + (isAct ? row.getAct(m) : row.getTgt(m)), 0);

    return (
      <div className="overflow-auto">
        <table className="w-max min-w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-slate-100 text-center font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              <th rowSpan={2} className="sticky left-0 z-20 min-w-[230px] border border-slate-200 bg-slate-100 p-2.5 text-left dark:border-slate-700 dark:bg-slate-800">
                Executive Line Item
              </th>
              {PERIOD_MONTHS.map((col) => (
                <th key={col.label} colSpan={2} className={`border border-slate-200 p-1.5 dark:border-slate-700 ${col.subtotal ? 'bg-amber-50 dark:bg-amber-950/40' : ''}`}>
                  {col.label} {col.subtotal ? '' : year}
                </th>
              ))}
            </tr>
            <tr>
              {PERIOD_MONTHS.map((col) => (
                <React.Fragment key={`${col.label}-sub`}>
                  <th className="border border-slate-200 p-1 text-[10px] text-slate-500 dark:border-slate-700">Tgt</th>
                  <th className="border border-slate-200 p-1 text-[10px] text-blue-700 dark:border-slate-700">Act</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {execRows.map((row) => (
              <tr key={row.label} className={`${toneClassMap[row.tone] || ''} ${row.isBold ? 'font-bold' : ''}`}>
                <td
                  className="sticky left-0 z-10 border-r border-slate-200 bg-inherit p-2 dark:border-slate-700"
                  style={{ paddingLeft: `${12 + Number(row.indent || 0) * 16}px` }}
                >
                  {row.label}
                </td>
                {PERIOD_MONTHS.map((col) => (
                  <React.Fragment key={`${row.label}-${col.label}`}>
                    <td className="border-l border-slate-200 p-1.5 text-right font-mono text-slate-500 dark:border-slate-800">
                      {formatPlShort(sumRowMonths(row, col.months, false))}
                    </td>
                    <td className="p-1.5 text-right font-mono font-bold">
                      {formatPlShort(sumRowMonths(row, col.months, true))}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b p-4 ${variant === 'executive' ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            {variant === 'executive' ? <Crown className="h-4 w-4 text-amber-400" /> : <Table2 className="h-4 w-4 text-blue-600" />}
            <span>{variant === 'executive' ? 'Executive P&L Summary (EBIT / EAT / EBITDA)' : 'P&L Financial Statement'}</span>
          </h3>
          <div className="inline-flex rounded-xl border border-slate-300/40 p-0.5 text-xs">
            {[
              { id: 'yearly', label: 'Yearly View' },
              { id: 'daily', label: 'Daily View' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onPeriodModeChange(m.id)}
                className={`rounded-lg px-3 py-1 font-bold ${
                  periodMode === m.id
                    ? 'bg-blue-600 text-white'
                    : variant === 'executive'
                      ? 'text-slate-300'
                      : 'text-slate-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold opacity-75">Period:</span>
          {periodMode === 'yearly' ? (
            <input
              type="number"
              value={year}
              onChange={(e) => onYearChange(e.target.value)}
              className="min-h-[38px] w-24 rounded-xl border border-slate-300/40 bg-white/95 px-2.5 text-center font-mono font-bold text-slate-900"
            />
          ) : (
            <input
              type="month"
              value={monthStr}
              onChange={(e) => onMonthChange(e.target.value)}
              className="min-h-[38px] rounded-xl border border-slate-300/40 bg-white/95 px-2.5 font-mono font-bold text-slate-900"
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">กำลังคำนวณงบกำไรขาดทุน...</div>
      ) : computedRows.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>
      ) : variant === 'executive' ? (
        renderExecutiveSummary()
      ) : periodMode === 'yearly' ? (
        renderYearlyStatement()
      ) : (
        renderDailyStatement()
      )}
    </div>
  );
}
