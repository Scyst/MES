import React from 'react';
import { CheckCircle2, Clock, Gauge, Zap } from 'lucide-react';
import { formatCurrencyThb } from '../utils/oeeHelpers';

/** Semi-circle SVG gauge with crisp dynamic progress arc. */
function SemiGauge({ value = 0, target = 85, strokeColor = '#2563eb' }) {
  const clamped = Math.max(0, Math.min(100, Number(value || 0)));
  const isPass = clamped >= target;
  const radius = 54;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative mx-auto flex w-44 flex-col items-center">
      <svg viewBox="0 0 140 82" className="w-full overflow-visible">
        <path
          d="M 16 72 A 54 54 0 0 1 124 72"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          className="text-slate-100 dark:text-slate-800"
        />
        <path
          d="M 16 72 A 54 54 0 0 1 124 72"
          fill="none"
          stroke={strokeColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className={`-mt-7 font-mono text-2xl font-black ${isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
        {clamped.toFixed(1)}%
      </div>
    </div>
  );
}

export default function OeeGaugesGrid({ pie = {}, isShopfloor = false }) {
  const fg = Number(pie.fg || 0);
  const hold = Number(pie.hold || 0);
  const scrap = Number(pie.scrap || 0);
  const totalOut = fg + hold + scrap;
  const targetQty = Math.round(Number(pie.TargetQty || 0));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {/* OEE */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase text-blue-600 dark:text-blue-400">
          <Gauge className="h-4 w-4" />
          <span>Overall OEE</span>
        </div>
        <div className="my-2">
          <SemiGauge value={pie.oee || 0} target={85} strokeColor="#2563eb" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Target</div>
            <div className="font-mono text-xs font-bold">85%</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Actual</div>
            <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
              {Number(pie.oee || 0).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Quality */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Quality</span>
        </div>
        <div className="my-2">
          <SemiGauge value={pie.quality || 0} target={99} strokeColor="#16a34a" />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">FG</div>
            <div className="font-mono text-xs font-bold text-emerald-600">{fg.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Hold</div>
            <div className="font-mono text-xs font-bold text-amber-600">{hold.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Scrap</div>
            <div className="font-mono text-xs font-bold text-rose-600">{scrap.toLocaleString()}</div>
            {!isShopfloor && Number(pie.sap_scrap_cost || 0) > 0 && (
              <div className="truncate text-[9px] text-slate-400">{formatCurrencyThb(pie.sap_scrap_cost)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Performance */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase text-amber-600 dark:text-amber-400">
          <Zap className="h-4 w-4" />
          <span>Performance</span>
        </div>
        <div className="my-2">
          <SemiGauge value={pie.performance || 0} target={90} strokeColor="#eab308" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Qty</div>
            <div className="font-mono text-xs font-bold">{totalOut.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Target Qty</div>
            <div className="font-mono text-xs font-bold">{targetQty.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Availability */}
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase text-cyan-600 dark:text-cyan-400">
          <Clock className="h-4 w-4" />
          <span>Availability</span>
        </div>
        <div className="my-2">
          <SemiGauge value={pie.availability || 0} target={95} strokeColor="#06b6d4" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Runtime</div>
            <div className="font-mono text-xs font-bold text-cyan-600">{Math.round(Number(pie.runtime || 0))} m</div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center dark:border-slate-800 dark:bg-slate-800/60">
            <div className="text-[10px] font-bold uppercase text-slate-400">Downtime</div>
            <div className="font-mono text-xs font-bold text-rose-600">{Math.round(Number(pie.downtime || 0))} m</div>
          </div>
        </div>
      </div>
    </div>
  );
}
