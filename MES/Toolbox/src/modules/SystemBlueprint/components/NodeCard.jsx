import React from 'react';
import {
  Cpu,
  Globe,
  Database,
  ShieldCheck,
  Layers,
  ChevronRight,
  ExternalLink,
  Table,
  Workflow
} from 'lucide-react';

const LAYER_CONFIG = {
  L1_HARDWARE_IOT: { icon: Cpu, badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200' },
  L2_EXTERNAL_ERP: { icon: Globe, badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200' },
  L3_DATABASE: { icon: Database, badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200' },
  L4_API_GATEWAY: { icon: ShieldCheck, badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200' },
  L5_APPLICATIONS: { icon: Layers, badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200' },
};

export default function NodeCard({ node, onClick }) {
  const layerMeta = LAYER_CONFIG[node.layer] || { icon: Layers, badgeColor: 'bg-slate-100 text-slate-800' };
  const Icon = layerMeta.icon;

  const isPorted = node.status === 'PORTED_SPA';
  const isLive = node.status?.includes('LIVE') || node.status === 'CORE_ONLINE';

  return (
    <div
      onClick={() => onClick(node)}
      className="group relative bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${layerMeta.badgeColor}`}>
              {node.layer.replace(/^[L0-9]+_/, '')}
            </span>
            {isPorted && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                ⚡ SPA
              </span>
            )}
            {isLive && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                ONLINE
              </span>
            )}
          </div>
          <div className="w-5 h-5 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/40 text-slate-400 group-hover:text-blue-600 transition-colors">
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Title */}
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950/60 dark:group-hover:text-blue-400 transition-colors shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
              {node.title}
            </h4>
            {node.desc && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 font-normal leading-normal">
                {node.desc}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card Footer: Protocol / Tables chips */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span className="font-mono truncate max-w-[180px]">
          {node.protocol || (node.core_tables ? `${node.core_tables.length} Tables` : 'Internal')}
        </span>
        {node.tables && (
          <span className="flex items-center gap-0.5 text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            <Table className="w-3 h-3 text-emerald-500" /> {node.tables.length}
          </span>
        )}
      </div>
    </div>
  );
}
