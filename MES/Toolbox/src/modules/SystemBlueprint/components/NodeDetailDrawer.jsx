import React from 'react';
import {
  X,
  ExternalLink,
  Database,
  Cpu,
  Layers,
  ShieldCheck,
  Globe,
  ArrowRight,
  Code2,
  FileCode,
  Table,
  CheckCircle2,
  Activity,
  Workflow
} from 'lucide-react';
import { Link } from 'react-router-dom';

const LAYER_ICONS = {
  L1_HARDWARE_IOT: Cpu,
  L2_EXTERNAL_ERP: Globe,
  L3_DATABASE: Database,
  L4_API_GATEWAY: ShieldCheck,
  L5_APPLICATIONS: Layers,
};

export default function NodeDetailDrawer({ node, isOpen, onClose, allNodes = [], edges = [] }) {
  if (!isOpen || !node) return null;

  const LayerIcon = LAYER_ICONS[node.layer] || Layers;

  // Find upstream connections (edges pointing TO this node)
  const upstreamEdges = edges.filter(e => e.to === node.id);
  // Find downstream connections (edges pointing FROM this node)
  const downstreamEdges = edges.filter(e => e.from === node.id);

  const getNodeTitle = (nodeId) => {
    const found = allNodes.find(n => n.id === nodeId);
    return found ? found.title : nodeId;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/50">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <LayerIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                  {node.layer}
                </span>
                {node.status && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    node.status.includes('SPA') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300' :
                    node.status.includes('LIVE') ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 animate-pulse' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                  }`}>
                    {node.status}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 leading-snug">
                {node.title}
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Description */}
          {node.desc && (
            <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                {node.desc}
              </p>
            </div>
          )}

          {/* Quick Launch Action */}
          {node.route && (
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">เข้าใช้งานระบบ</p>
                <p className="text-[11px] text-slate-500 font-mono">{node.route}</p>
              </div>
              {node.route.startsWith('#') ? (
                <Link
                  to={node.route.replace(/^#/, '')}
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 shadow-xs"
                >
                  เปิดหน้านี้ <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <a
                  href={node.route}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-medium flex items-center gap-1.5 shadow-xs"
                >
                  เปิดลิงก์เดิม <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Technical Specs */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Code2 className="w-4 h-4 text-blue-600" /> ข้อมูลเชิงเทคนิค (Technical Details)
            </h4>
            
            <div className="grid grid-cols-1 gap-2.5 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              {node.protocol && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">โปรโตคอล / การเชื่อมต่อ</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">{node.protocol}</span>
                </div>
              )}

              {node.ui_path && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Frontend Path</span>
                  <code className="text-[11px] font-mono text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 block truncate">
                    {node.ui_path}
                  </code>
                </div>
              )}

              {node.api_path && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Backend API Path</span>
                  <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 block truncate">
                    {node.api_path}
                  </code>
                </div>
              )}

              {node.scripts && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">สคริปต์ที่ทำงาน</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {node.scripts.map(s => (
                      <span key={s} className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {node.endpoints && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Security Endpoints</span>
                  <div className="space-y-1 mt-1">
                    {node.endpoints.map(ep => (
                      <div key={ep} className="font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        • {ep}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Database Tables */}
          {(node.tables || node.core_tables) && (
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <Table className="w-4 h-4 text-emerald-600" /> ตารางฐานข้อมูลที่เกี่ยวข้อง (Database Tables)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(node.tables || node.core_tables).map(tbl => (
                  <span 
                    key={tbl}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-[11px]"
                  >
                    {tbl}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stored Procedures (if DB node) */}
          {node.stored_procedures && (
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <Workflow className="w-4 h-4 text-purple-600" /> Stored Procedures หลัก
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {node.stored_procedures.map(sp => (
                  <span 
                    key={sp}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-mono text-[11px]"
                  >
                    {sp}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Upstream & Downstream Pipelines */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Activity className="w-4 h-4 text-amber-600" /> เส้นทางไปป์ไลน์ข้อมูล (Data Pipelines)
            </h4>

            {upstreamEdges.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">📥 รับข้อมูลจาก (Inputs / Upstream):</span>
                {upstreamEdges.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px]">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{getNodeTitle(e.from)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="text-slate-500 italic truncate">{e.label}</span>
                  </div>
                ))}
              </div>
            )}

            {downstreamEdges.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">📤 ส่งข้อมูลต่อไปยัง (Outputs / Downstream):</span>
                {downstreamEdges.map((e, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500 italic truncate">{e.label}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{getNodeTitle(e.to)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

