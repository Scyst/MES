import React from 'react';
import { Truck, Handshake, Building2, Banknote } from 'lucide-react';
import { formatCurrency } from '../utils/fleetLogHelpers';

const VEHICLE_PILL_STYLES = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
};

function BreakdownBadges({ breakdown, tone }) {
  const entries = Object.entries(breakdown || {});
  if (entries.length === 0) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">ไม่มีข้อมูลในตัวกรองนี้</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([key, count]) => (
        <span
          key={key}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${VEHICLE_PILL_STYLES[tone]}`}
        >
          <span>{key}</span>
          <span className="font-bold">{count}</span>
        </span>
      ))}
    </div>
  );
}

export default function FleetKpiCards({ kpi }) {
  const costBreakdown = kpi?.cost_breakdown || {};
  const costEntries = [
    { key: 'INBOUND', label: 'IN', val: costBreakdown.INBOUND || 0 },
    { key: 'OUTBOUND', label: 'OUT', val: costBreakdown.OUTBOUND || 0 },
    { key: 'OTHER', label: 'OTHER', val: costBreakdown.OTHER || 0 }
  ].filter((item) => item.val > 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-full">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-600 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              รวมรถทั้งหมด (เที่ยว)
            </p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
              {(kpi?.total ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
            <Truck className="w-5 h-5" />
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <BreakdownBadges breakdown={kpi?.breakdown?.total} tone="blue" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-amber-500 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              รถ VENDOR (จ้างนอก)
            </p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
              {(kpi?.vendor ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <Handshake className="w-5 h-5" />
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <BreakdownBadges breakdown={kpi?.breakdown?.vendor} tone="amber" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-600 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              รถ SNC (ภายใน)
            </p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 tabular-nums">
              {(kpi?.snc ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <BreakdownBadges breakdown={kpi?.breakdown?.snc} tone="emerald" />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-600 bg-white dark:bg-slate-900 p-4 shadow-sm flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">
              ค่าขนส่งรวม (THB)
            </p>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
              ฿{formatCurrency(kpi?.total_cost || 0)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
            <Banknote className="w-5 h-5" />
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          {costEntries.length === 0 ? (
            <span className="text-xs text-slate-400 dark:text-slate-500">*ยังไม่มีรายการค่าใช้จ่าย</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {costEntries.map((item) => (
                <span
                  key={item.key}
                  className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${VEHICLE_PILL_STYLES.rose}`}
                >
                  <span>{item.label}</span>
                  <span className="font-bold">฿{formatCurrency(item.val)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
