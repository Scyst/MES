import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation, Warehouse, ExternalLink, ChevronRight, Activity } from 'lucide-react';

export default function FactoryOperationsWidget() {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 rounded-full bg-cyan-500"></span>
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs tracking-wider uppercase">
            แผนผังโรงงานและการปฏิบัติการ <span className="text-slate-400 dark:text-slate-500 font-normal text-[11px] normal-case">(Operations Map)</span>
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-mono text-[10px] font-bold">IoT ONLINE</span>
        </div>
      </div>

      {/* Spacious, Elegant Quick-Launch Map Portal */}
      <div className="rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-850 p-4 shadow-2xs space-y-3">
        {/* Portal 1: Forklift Live Map (Internal SPA Route) */}
        <Link
          to="/forklift?tab=map"
          className="group flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-blue-50/80 dark:bg-slate-800/80 dark:hover:bg-slate-750 border border-slate-200/60 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  แผนผังรถโฟล์คลิฟต์ (Forklift Live Map)
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                ติดตามตำแหน่งแบบเรียลไทม์ Heatmap และสแกน QR ใน Toolbox SPA
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shadow-2xs shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Portal 2: Visual Warehouse & Cycle Count */}
        <a
          href="/iot-toolbox/sandbox-b9/MES/MES/page/storeManagement/cycleCount.php"
          className="group flex items-center justify-between p-3 rounded-xl bg-slate-50/80 hover:bg-emerald-50/80 dark:bg-slate-800/80 dark:hover:bg-slate-750 border border-slate-200/60 dark:border-slate-700/60 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all shadow-2xs hover:shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  แผนผังคลังสินค้า (Visual Warehouse Map)
                </h4>
                <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                จำลองโซนจัดเก็บและตรวจนับสต็อก (Cycle Count)
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shadow-2xs shrink-0">
            <ChevronRight className="w-4 h-4" />
          </div>
        </a>

        {/* Subtle Industrial Status Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          <span>PLANT B9 • SHOPFLOOR</span>
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Activity className="w-3 h-3 text-cyan-500" />
            Live Telemetry Active
          </span>
        </div>
      </div>
    </div>
  );
}
