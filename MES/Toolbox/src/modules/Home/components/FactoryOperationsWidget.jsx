import React from 'react';
import { MapPin, Navigation, Truck, Warehouse, Activity, ExternalLink, Cpu } from 'lucide-react';

export default function FactoryOperationsWidget() {
  const zones = [
    { name: 'Line 1 - 3 (Stamping)', status: 'RUNNING', color: 'bg-emerald-500' },
    { name: 'Line 4 - 6 (Assembly)', status: 'RUNNING', color: 'bg-emerald-500' },
    { name: 'Paint & Chemical Shop', status: 'ACTIVE', color: 'bg-blue-500' },
    { name: 'Warehouse A & B', status: '84% FULL', color: 'bg-amber-500' },
  ];

  return (
    <div className="flex-1 min-h-[210px] flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 rounded-full bg-cyan-500"></span>
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-xs tracking-wider uppercase">
            แผนผังโรงงาน & สถานะปฏิบัติการ <span className="text-slate-400 dark:text-slate-500 font-normal text-[11px] normal-case">(Operations Map)</span>
          </h3>
        </div>

        <a
          href="/iot-toolbox/sandbox-b9/MES/MES/page/forklift/forkliftMapUI.php"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          <span>เปิดแผนที่สด</span>
          <ExternalLink size={12} />
        </a>
      </div>

      <div className="flex-1 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-800 p-3.5 shadow-2xs flex flex-col justify-between gap-3">
        {/* Plant Zone Quick Status */}
        <div className="grid grid-cols-2 gap-2">
          {zones.map((z) => (
            <div
              key={z.name}
              className="p-2 rounded-lg bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-700/60 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate">
                  {z.name}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${z.color} shrink-0`}></span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {z.status}
              </span>
            </div>
          ))}
        </div>

        {/* Live Metrics Row */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs">
          <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
            <Truck size={14} className="shrink-0" />
            <span className="text-[11px] font-medium">Forklift ประจำการ:</span>
            <strong className="font-mono font-bold">4 คัน</strong>
          </div>

          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <Cpu size={14} className="shrink-0" />
            <span className="text-[11px] font-medium">IoT Gateway:</span>
            <strong className="text-[10px] bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded font-bold">ONLINE</strong>
          </div>
        </div>

        {/* Quick Map Action Links */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
          <a
            href="/iot-toolbox/sandbox-b9/MES/MES/page/forklift/forkliftMapUI.php"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors"
          >
            <Navigation size={12} />
            <span>Forklift Live Map</span>
          </a>

          <a
            href="/iot-toolbox/sandbox-b9/MES/MES/page/storeManagement/cycleCount.php"
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors"
          >
            <Warehouse size={12} />
            <span>คลังสินค้า Visual Map</span>
          </a>
        </div>
      </div>
    </div>
  );
}
