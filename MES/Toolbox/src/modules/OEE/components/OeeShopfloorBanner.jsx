import React from 'react';
import { Ban, CheckCircle2, Coins, PauseCircle } from 'lucide-react';
import { formatOeeNumber } from '../utils/oeeHelpers';

export default function OeeShopfloorBanner({
  revenue = 0,
  partResults = [],
  hideRevenue = false,
}) {
  const totals = partResults.reduce(
    (acc, r) => {
      acc.good += Number(r.FG || 0);
      acc.hold += Number(r.HOLD || 0);
      acc.scrap += Number(r.SCRAP || 0);
      return acc;
    },
    { good: 0, hold: 0, scrap: 0 }
  );

  return (
    <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${hideRevenue ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
      {!hideRevenue && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-blue-200 border-l-8 border-l-blue-600 bg-gradient-to-b from-white to-blue-50 p-5 text-center shadow-sm dark:border-blue-900 dark:from-slate-900 dark:to-blue-950/30">
          <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
            <Coins className="h-5 w-5 text-blue-600" />
            <span>Revenue</span>
          </div>
          <div className="my-2 font-mono text-3xl font-black text-blue-700 sm:text-4xl dark:text-blue-400">
            {formatOeeNumber(revenue, 2)}
          </div>
          <div className="text-xs font-bold text-slate-400">THB</div>
        </div>
      )}

      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 border-l-8 border-l-emerald-600 bg-gradient-to-b from-white to-emerald-50 p-5 text-center shadow-sm dark:border-emerald-900 dark:from-slate-900 dark:to-emerald-950/30">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>Good Output</span>
        </div>
        <div className="my-2 font-mono text-3xl font-black text-emerald-700 sm:text-4xl dark:text-emerald-400">
          {totals.good.toLocaleString()}
        </div>
        <div className="text-xs font-bold text-slate-400">PCS</div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-200 border-l-8 border-l-amber-500 bg-gradient-to-b from-white to-amber-50 p-5 text-center shadow-sm dark:border-amber-900 dark:from-slate-900 dark:to-amber-950/30">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
          <PauseCircle className="h-5 w-5 text-amber-600" />
          <span>Hold / Rework</span>
        </div>
        <div className="my-2 font-mono text-3xl font-black text-amber-700 sm:text-4xl dark:text-amber-400">
          {totals.hold.toLocaleString()}
        </div>
        <div className="text-xs font-bold text-slate-400">PCS</div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 border-l-8 border-l-rose-600 bg-gradient-to-b from-white to-rose-50 p-5 text-center shadow-sm dark:border-rose-900 dark:from-slate-900 dark:to-rose-950/30">
        <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
          <Ban className="h-5 w-5 text-rose-600" />
          <span>Scrap / NG</span>
        </div>
        <div className="my-2 font-mono text-3xl font-black text-rose-700 sm:text-4xl dark:text-rose-400">
          {totals.scrap.toLocaleString()}
        </div>
        <div className="text-xs font-bold text-slate-400">PCS</div>
      </div>
    </div>
  );
}
