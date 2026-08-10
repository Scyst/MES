import { Activity, Cpu, HardDrive, Network, Flame, Layers, ArrowDown, ArrowUp } from 'lucide-react';
import type { SysPayload } from '../types';
import { YAxis, ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

export const ModernTheme = ({ 
  sys, 
  history,
  onClose,
  onToggleTheme
}: { 
  sys: SysPayload, 
  history: {time: string, cpu: number, ram: number}[],
  onClose: () => void,
  onToggleTheme: () => void
}) => {
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const half = Math.ceil(sys.cpu_cores.length / 2);
  const leftCores = sys.cpu_cores.slice(0, half);
  const rightCores = sys.cpu_cores.slice(half);

  return (
    <div className="h-screen w-screen bg-[#080c14]/90 text-slate-200 overflow-hidden flex flex-col p-4 gap-4 font-sans select-none relative">
      
      {/* DRAG REGION BACKGROUND LAYER */}
      <div data-tauri-drag-region className="absolute top-0 left-0 w-full h-16 z-0 cursor-move" />

      {/* HEADER */}
      <div className="flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center gap-3 pointer-events-none">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Activity className="text-cyan-400" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">
              SystemMonitor<span className="font-light">Pro</span>
            </h1>
            <div className="text-xs text-slate-500 flex gap-2">
              <span>{sys.hostname}</span>
              <span>•</span>
              <span>{sys.os}</span>
              <span>•</span>
              <span>Uptime: {formatUptime(sys.uptime)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={onToggleTheme} className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-md text-xs text-slate-300 transition-colors cursor-pointer border border-slate-700 z-50 shadow-sm pointer-events-auto">
            Toggle Classic Theme
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 rounded-md text-red-400 hover:text-red-200 transition-colors cursor-pointer border border-red-500/30 z-50 pointer-events-auto">
            ✕
          </button>
        </div>
      </div>

      {/* TOP ROW: CPU & RAM WITH CHARTS */}
      <div className="flex gap-4 h-[160px] shrink-0 z-10">
        
        {/* CPU + CHART */}
        <div className="flex-1 bg-[#0f1522]/80 backdrop-blur-md rounded-xl p-4 border border-cyan-500/20 shadow-[0_4px_20px_-4px_rgba(6,182,212,0.1)] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/0 via-cyan-400 to-cyan-500/0 opacity-50" />
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-cyan-400" />
              <span className="text-sm font-semibold text-slate-300">CPU Usage</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-cyan-400">{sys.cpu_percent.toFixed(1)}<span className="text-sm text-cyan-600">%</span></span>
              <div className="flex gap-2 text-cyan-200 text-[10px] mt-1 justify-end">
                <span>{(sys.cpu_freq / 1000).toFixed(2)}GHz</span>
                {sys.temp_c && <span className="flex items-center gap-1"><Flame size={10} className="text-red-400"/> {sys.temp_c.toFixed(1)}°C</span>}
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 w-full mt-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <YAxis domain={[0, 100]} hide />
                <Tooltip contentStyle={{ backgroundColor: '#0f1522', border: '1px solid #1e293b', borderRadius: '4px' }} labelStyle={{ display: 'none' }} />
                <Area type="monotone" dataKey="cpu" stroke="#22d3ee" strokeWidth={2} fillOpacity={0.2} fill="#06b6d4" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RAM + CHART */}
        <div className="flex-1 bg-[#0f1522]/80 backdrop-blur-md rounded-xl p-4 border border-fuchsia-500/20 shadow-[0_4px_20px_-4px_rgba(217,70,239,0.1)] flex flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500/0 via-fuchsia-400 to-fuchsia-500/0 opacity-50" />
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-fuchsia-400" />
              <span className="text-sm font-semibold text-slate-300">Memory</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-fuchsia-400">{((sys.ram_used_mb / sys.ram_total_mb) * 100).toFixed(1)}<span className="text-sm text-fuchsia-600">%</span></span>
              <div className="flex gap-2 text-fuchsia-200 text-[10px] mt-1 justify-end">
                <span>{(sys.ram_used_mb / 1024).toFixed(1)} / {(sys.ram_total_mb / 1024).toFixed(1)} GB</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 w-full mt-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <YAxis domain={[0, 100]} hide />
                <Tooltip contentStyle={{ backgroundColor: '#0f1522', border: '1px solid #1e293b', borderRadius: '4px' }} labelStyle={{ display: 'none' }} />
                <Area type="step" dataKey="ram" stroke="#d946ef" strokeWidth={2} fillOpacity={0.2} fill="#c026d3" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* MIDDLE ROW: STORAGE & NETWORK MINIS */}
      <div className="flex gap-4 shrink-0 z-10 h-20">
        
        {/* DISK */}
        <div className="flex-1 bg-[#0f1522]/80 backdrop-blur-md rounded-xl p-3 border border-amber-500/20 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-slate-300">Storage Usage</span>
            </div>
            <span className="text-lg font-bold text-amber-400">{((sys.disk_used_gb / sys.disk_total_gb) * 100).toFixed(1)}<span className="text-xs text-amber-600">%</span></span>
          </div>
          <div className="flex justify-between items-center text-[10px]">
            <span className="flex items-center gap-1 text-slate-400"><ArrowDown size={10}/>{sys.disk_read_kbps.toFixed(0)} KB/s Read</span>
            <span className="flex items-center gap-1 text-amber-300"><ArrowUp size={10}/>{sys.disk_write_kbps.toFixed(0)} KB/s Write</span>
          </div>
        </div>

        {/* NETWORK */}
        <div className="flex-1 bg-[#0f1522]/80 backdrop-blur-md rounded-xl p-3 border border-emerald-500/20 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Network size={14} className="text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300">Network I/O</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 text-emerald-400 text-sm font-bold">
              <ArrowDown size={14}/> {sys.net_down_kbps > 1024 ? (sys.net_down_kbps/1024).toFixed(1) + ' MB/s' : sys.net_down_kbps.toFixed(0) + ' KB/s'}
            </div>
            <div className="flex items-center gap-1 text-blue-400 text-sm font-bold">
              <ArrowUp size={14}/> {sys.net_up_kbps > 1024 ? (sys.net_up_kbps/1024).toFixed(1) + ' MB/s' : sys.net_up_kbps.toFixed(0) + ' KB/s'}
            </div>
          </div>
        </div>

      </div>

      <div className="flex gap-4 flex-1 min-h-0 z-10">
        {/* LEFT COL: CORE MATRIX */}
        <div className="w-[30%] flex flex-col gap-3 shrink-0">
          <div className="bg-[#0f1522]/80 backdrop-blur-md border border-slate-800/60 rounded-xl p-4 shadow-lg flex-1 overflow-hidden flex flex-col">
            <div className="text-xs font-semibold text-slate-400 mb-3 tracking-wide uppercase flex items-center gap-2">
              <Cpu size={14} /> Logical Cores
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-1 overflow-y-auto custom-scrollbar pr-2 items-start content-start">
              <div className="flex flex-col gap-1">
                {leftCores.map((c, i) => (
                  <div key={`l-${i}`} className="flex items-center gap-2 group py-0.5">
                    <span className="text-[10px] text-slate-500 w-5">C{i}</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" 
                           style={{ 
                             width: `${c}%`,
                             backgroundColor: c > 85 ? '#ef4444' : c > 50 ? '#f59e0b' : '#06b6d4',
                             boxShadow: c > 50 ? `0 0 8px ${c > 85 ? '#ef4444' : '#f59e0b'}` : 'none'
                           }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                {rightCores.map((c, i) => (
                  <div key={`r-${i}`} className="flex items-center gap-2 group py-0.5">
                    <span className="text-[10px] text-slate-500 w-5">C{i + half}</span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" 
                           style={{ 
                             width: `${c}%`,
                             backgroundColor: c > 85 ? '#ef4444' : c > 50 ? '#f59e0b' : '#06b6d4',
                             boxShadow: c > 50 ? `0 0 8px ${c > 85 ? '#ef4444' : '#f59e0b'}` : 'none'
                           }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL: PROCESS TABLE */}
        <div className="flex-1 bg-[#0f1522]/80 backdrop-blur-md border border-slate-800/60 rounded-xl flex flex-col overflow-hidden shadow-lg">
          <div className="px-5 py-3 border-b border-slate-800/60 flex justify-between items-center bg-[#111827]/50 shrink-0">
            <span className="text-xs font-semibold text-slate-300 tracking-wide flex items-center gap-2">
              <Layers size={14} className="text-slate-400" /> Active Processes ({sys.total_processes})
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 bg-[#0f1522] z-10">
                <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                  <th className="py-2 px-4 font-semibold rounded-tl-lg">Process</th>
                  <th className="py-2 px-4 font-semibold text-right">PID</th>
                  <th className="py-2 px-4 font-semibold text-right w-32">CPU</th>
                  <th className="py-2 px-4 font-semibold text-right w-40">Memory</th>
                  <th className="py-2 px-4 font-semibold text-right rounded-tr-lg">Threads</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {sys.processes.map(p => (
                  <tr key={p.pid} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors group">
                    <td className="py-2 px-4">
                      <div className="font-medium text-slate-200 group-hover:text-cyan-400 transition-colors truncate max-w-[200px]">{p.name}</div>
                    </td>
                    <td className="py-2 px-4 text-right text-xs text-slate-500 font-mono">{p.pid}</td>
                    
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-mono w-10">{p.cpu.toFixed(1)}%</span>
                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500" style={{ width: `${Math.min(100, p.cpu)}%` }} />
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-2 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-mono">{p.ram_mb.toFixed(0)} MB</span>
                        <span className="text-[9px] text-slate-500">{(p.ram_mb/sys.ram_total_mb*100).toFixed(1)}%</span>
                      </div>
                    </td>

                    <td className="py-2 px-4 text-right text-xs text-slate-500 font-mono">
                      {p.threads}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};
