import React from 'react';
import { Zap, Flame, Activity, Gauge, ArrowUpRight, TrendingUp, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function UtilityKpiCards({ summary = {}, isRange = false }) {
  const elecCost = summary.period_elec_cost || 0;
  const elecKwh = summary.period_kwh || 0;
  const peakCost = summary.peak_elec_cost || 0;
  const offpeakCost = summary.offpeak_elec_cost || 0;

  const lpgCost = summary.period_lpg_cost || 0;
  const lpgUsage = summary.period_lpg_usage || 0;
  const lpgFlow = summary.total_lpg_flow || 0;

  const totalKw = summary.total_kw || 0;
  const onlineMeters = summary.online_meters || 0;
  const totalMeters = summary.total_meters || 0;

  const avgPf = summary.avg_pf || 0;
  const pfStatus = avgPf >= 0.90 ? 'good' : avgPf >= 0.85 ? 'warning' : 'danger';

  return (
    <div className="flex md:grid md:grid-cols-4 gap-2 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap snap-x snap-mandatory pb-1 flex-nowrap flex-shrink-0 touch-pan-x">
      {/* Card 1: Electricity Cost */}
      <div className="w-[170px] shrink-0 md:w-auto md:shrink md:flex-1 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm snap-start border-l-4 border-l-amber-500 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {isRange ? 'ค่าไฟฟ้ารวม (ช่วงเวลา)' : 'ค่าไฟฟ้ารอบวัน (Today)'}
          </span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-500/20" />
          </div>
        </div>

        <div>
          <div className="text-base sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 tracking-tight truncate">
            ฿{Number(elecCost).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="truncate">ใช้ไป {Number(elecKwh).toLocaleString(undefined, { maximumFractionDigits: 1 })} kWh</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans mt-0.5">
            <span className="text-amber-600 font-bold">Peak: ฿{Number(peakCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span>•</span>
            <span className="text-blue-500 font-bold">Off: ฿{Number(offpeakCost).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>

      {/* Card 2: LPG Gas Cost */}
      <div className="w-[170px] shrink-0 md:w-auto md:shrink md:flex-1 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm snap-start border-l-4 border-l-rose-500 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            {isRange ? 'ค่าก๊าซ LPG (ช่วงเวลา)' : 'ค่าก๊าซ LPG (Today)'}
          </span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-rose-500/20" />
          </div>
        </div>

        <div>
          <div className="text-base sm:text-2xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight truncate">
            ฿{Number(lpgCost).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="truncate">ปริมาณ {Number(lpgUsage).toLocaleString(undefined, { maximumFractionDigits: 1 })} m³</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            Flow ขณะนี้: <strong className="font-mono text-rose-500">{Number(lpgFlow).toFixed(1)}</strong> m³/h
          </div>
        </div>
      </div>

      {/* Card 3: Realtime Power (kW) */}
      <div className="w-[160px] shrink-0 md:w-auto md:shrink md:flex-1 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm snap-start border-l-4 border-l-blue-600 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            กำลังไฟฟ้าขณะนี้ (Live)
          </span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div>
          <div className="text-base sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100 tracking-tight truncate">
            {Number(totalKw).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs sm:text-sm font-bold text-slate-400 font-sans">kW</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>ออนไลน์ {onlineMeters} / {totalMeters} มิเตอร์</span>
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            รวมโหลดรายไลน์และแอร์คอม
          </div>
        </div>
      </div>

      {/* Card 4: Average Power Factor */}
      <div className={`w-[160px] shrink-0 md:w-auto md:shrink md:flex-1 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm snap-start flex flex-col justify-between border-l-4 ${
        pfStatus === 'good'
          ? 'border-l-emerald-500'
          : pfStatus === 'warning'
          ? 'border-l-amber-500'
          : 'border-l-rose-500'
      }`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
            เพาเวอร์แฟกเตอร์ (PF)
          </span>
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            pfStatus === 'good'
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-amber-500/10 text-amber-600'
          }`}>
            <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className={`text-base sm:text-2xl font-black font-mono tracking-tight ${
              pfStatus === 'good' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
            }`}>
              {avgPf > 0 ? avgPf.toFixed(2) : '-'}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
              pfStatus === 'good'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
            }`}>
              {pfStatus === 'good' ? 'มาตรฐาน (≥0.90)' : 'ต่ำกว่าเกณฑ์'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="truncate">เกณฑ์ กฟภ. ค่าปรับ PF &lt; 0.85</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            {pfStatus === 'good' ? '✓ ไม่เสียค่าปรับ kVAR' : '⚠️ ระวังค่าปรับ kVAR'}
          </div>
        </div>
      </div>
    </div>
  );
}
