import { getCurrentWindow } from '@tauri-apps/api/window';
import { YAxis, XAxis, ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { Zap, ArrowDown, ArrowUp, HardDrive, Flame, Layers } from 'lucide-react';
import type { SysPayload } from '../types';

const CircularGauge = ({ value, max, label, subtext, color }: {value: number, max: number, label: string, subtext: string, color: string}) => {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(1, value / safeMax));
  const strokeDashoffset = circumference - pct * circumference;

  return (
    <div className="flex flex-col items-center justify-center bg-[#0a0f18] flex-1 py-4 rounded border border-[#1a2b50]/40 shadow-inner">
      <div className="relative flex items-center justify-center">
        <svg className="w-24 h-24 transform -rotate-90">
          <circle cx="48" cy="48" r={radius} stroke="#111827" strokeWidth="6" fill="transparent" />
          <circle cx="48" cy="48" r={radius} stroke={color} strokeWidth="6" fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-[#e2e8f0]">{Math.round(pct*100)}%</span>
          <span className="text-[10px] text-[#64748b]">{label}</span>
        </div>
      </div>
      <div className="text-[10px] text-[#00d4ff] mt-2 font-medium tracking-wider">{subtext}</div>
    </div>
  );
};

export const ClassicTheme = ({ 
  sys, 
  history,
  onClose,
  onToggleTheme,
  ecoMode
}: { 
  sys: SysPayload, 
  history: any[],
  onClose: () => void,
  onToggleTheme: () => void,
  ecoMode?: boolean
}) => {
  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="h-screen w-screen bg-[#060810]/90 text-[#cbd5e1] overflow-hidden flex flex-col p-3 gap-3 font-mono select-none text-xs">
      
      {/* DRAG REGION BACKGROUND LAYER */}
      <div onMouseDown={() => getCurrentWindow().startDragging()} className="absolute top-0 left-0 w-[calc(100%-200px)] h-8 z-0 cursor-move" />

      <div className="flex justify-between items-end shrink-0 border-b border-[#1a2b50]/60 pb-1 z-10">
        <div className="flex items-center gap-2 pointer-events-none">
          <Zap size={16} className="text-[#00d4ff]" />
          <h1 className="text-base font-bold tracking-widest text-[#00d4ff]">SYSTEM MONITOR</h1>
          <span className="text-[#475569] text-[10px] ml-2">[ Classic Mode ]</span>
        </div>
        <div className="flex items-center gap-4 text-[#64748b] text-[10px]">
          <div>Uptime: {formatUptime(sys.uptime)}</div>
          <div className="text-[#e2e8f0] font-bold tracking-wider">{new Date().toLocaleTimeString()}</div>
          <button onClick={onToggleTheme} className="ml-2 px-2 py-1 bg-[#1a2b50]/60 hover:bg-[#1a2b50] rounded text-[#00d4ff] transition-colors cursor-pointer relative z-50">
            Settings
          </button>
          <button onClick={onClose} className="px-2 py-1 bg-red-500/20 hover:bg-red-500/40 rounded text-red-400 transition-colors cursor-pointer relative z-50">
            ✕
          </button>
        </div>
      </div>
      
      <div className="flex justify-between text-[10px] text-[#475569] uppercase tracking-wide">
        <div>SCAN_PE_Naphat • {sys.cpu_name} @ {(sys.cpu_freq / 1000).toFixed(2)}GHz • {(sys.ram_total_mb / 1024).toFixed(0)} GB RAM • {sys.os}</div>
        <div className="truncate max-w-[40%]" title={sys.gpus ? sys.gpus.map(g => g.name).join(' + ') : 'detecting...'}>GPU: {sys.gpus ? sys.gpus.map(g => g.name).join(' + ') : 'detecting...'}</div>
      </div>

      {/* 2. CIRCULAR GAUGES */}
      <div className="flex gap-4 shrink-0 mt-1">
        <CircularGauge 
          value={sys.cpu_percent} max={100} 
          label="CPU" subtext={`${sys.cpu_freq} MHz`} color="#00d4ff" 
        />
        <CircularGauge 
          value={sys.ram_used_mb} max={sys.ram_total_mb} 
          label="RAM" subtext={`${(sys.ram_used_mb/1024).toFixed(1)}/${(sys.ram_total_mb/1024).toFixed(0)} GB`} color="#f59e0b" 
        />
        <CircularGauge 
          value={0} max={100} 
          label="GPU" subtext={`0 MB`} color="#3b82f6" 
        />
        <CircularGauge 
          value={sys.disk_used_gb} max={sys.disk_total_gb} 
          label="Disk" subtext={`${(sys.disk_total_gb - sys.disk_used_gb).toFixed(1)} GB free`} color="#f59e0b" 
        />
        <CircularGauge 
          value={100} max={100} 
          label="Power" subtext={`100% ⚡`} color="#22c55e" 
        />
      </div>

      {/* 3. CPU CORES MATRIX */}
      <div className="bg-[#0a0f18] border border-[#1a2b50]/40 rounded p-2 shrink-0 flex flex-col h-[100px]">
        <div className="text-[10px] text-[#64748b] mb-2 uppercase shrink-0">CPU Cores</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-1 overflow-y-auto custom-scrollbar flex-1 content-start pr-1">
          {sys.cpu_cores.map((c, i) => (
            <div key={`c-${i}`} className="flex items-center text-[10px]">
              <span className="w-6 text-[#475569]">C{i}</span>
              <div className="flex-1 h-2 bg-[#111827] mx-2">
                <div className="h-full bg-[#00d4ff]" style={{ width: `${c}%` }} />
              </div>
              <span className="w-8 text-right text-[#64748b]">{c.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. AREA CHARTS (CPU & RAM) */}
      <div className="flex gap-4 h-20 shrink-0">
        <div className="flex-1 bg-[#0a0f18] border border-[#1a2b50]/40 rounded relative p-1">
          <div className="absolute top-1 left-2 text-[10px] text-[#475569] z-10">CPU</div>
          <div className="absolute top-1 right-2 text-[10px] text-[#00d4ff] z-10">{sys.cpu_percent.toFixed(0)}%</div>
          {ecoMode ? <div className="flex-1 flex items-center justify-center text-emerald-500/50 text-xs font-bold font-mono tracking-widest border border-emerald-500/10 rounded-lg bg-emerald-500/5">ECO MODE PAUSED</div> : <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <XAxis dataKey="time" hide /><YAxis domain={[0, 100]} hide />
              <Tooltip contentStyle={{ backgroundColor: '#0b1120', border: '1px solid #1a2b50', borderRadius: '4px' }} labelStyle={{ display: 'none' }} />
              <Area type="monotone" dataKey="cpu" stroke="#00d4ff" strokeWidth={1.5} fillOpacity={0.1} fill="#00d4ff" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>}
        </div>
        <div className="flex-1 bg-[#0a0f18] border border-[#1a2b50]/40 rounded relative p-1">
          <div className="absolute top-1 left-2 text-[10px] text-[#475569] z-10">RAM</div>
          <div className="absolute top-1 right-2 text-[10px] text-[#a855f7] z-10">{((sys.ram_used_mb/sys.ram_total_mb)*100).toFixed(0)}%</div>
          {ecoMode ? <div className="flex-1 flex items-center justify-center text-emerald-500/50 text-xs font-bold font-mono tracking-widest border border-emerald-500/10 rounded-lg bg-emerald-500/5">ECO MODE PAUSED</div> : <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <XAxis dataKey="time" hide /><YAxis domain={[0, 100]} hide />
              <Tooltip contentStyle={{ backgroundColor: '#0b1120', border: '1px solid #1a2b50', borderRadius: '4px' }} labelStyle={{ display: 'none' }} />
              <Area type="step" dataKey="ram" stroke="#a855f7" strokeWidth={1.5} fillOpacity={0.1} fill="#a855f7" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>}
        </div>
        <div className="flex-1 bg-[#0a0f18] border border-[#1a2b50]/40 rounded relative p-1">
          <div className="absolute top-1 left-2 text-[10px] text-[#475569] z-10">GPU</div>
          <div className="absolute top-1 right-2 text-[10px] text-[#f43f5e] z-10">{sys.gpus && sys.gpus.length > 0 ? sys.gpus.map(g => `${g.util.toFixed(0)}%`).join(' / ') : '0%'}</div>
          {ecoMode ? <div className="flex-1 flex items-center justify-center text-emerald-500/50 text-xs font-bold font-mono tracking-widest border border-emerald-500/10 rounded-lg bg-emerald-500/5">ECO MODE PAUSED</div> : <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <XAxis dataKey="time" hide /><YAxis domain={[0, 100]} hide />
              <Tooltip contentStyle={{ backgroundColor: '#0b1120', border: '1px solid #1a2b50', borderRadius: '4px' }} labelStyle={{ display: 'none' }} />
              {sys.gpus && sys.gpus.map((gpu, i) => (
                <Area key={`gpu-classic-${i}`} type="monotone" dataKey={`gpu${i}`} stroke={gpu.is_nvidia ? "#10b981" : "#f43f5e"} strokeWidth={1.5} fillOpacity={0.1} fill={gpu.is_nvidia ? "#10b981" : "#f43f5e"} isAnimationActive={false} />
              ))}
            </AreaChart>
          </ResponsiveContainer>}
        </div>
      </div>

      {/* 5. STATS ROW */}
      <div className="flex border border-[#1a2b50]/40 bg-[#0a0f18] rounded divide-x divide-[#1a2b50]/40 shrink-0">
        <div className="flex-1 p-2 flex items-center justify-between">
          <div>
            <div className="text-[#e2e8f0] font-bold">{sys.net_down_kbps.toFixed(0)} KB/s</div>
            <div className="text-[10px] text-[#64748b]">Download</div>
          </div>
          <ArrowDown className="text-[#22c55e]" size={16} />
        </div>
        <div className="flex-1 p-2 flex items-center justify-between">
          <div>
            <div className="text-[#e2e8f0] font-bold">{sys.net_up_kbps.toFixed(0)} KB/s</div>
            <div className="text-[10px] text-[#64748b]">Upload</div>
          </div>
          <ArrowUp className="text-[#3b82f6]" size={16} />
        </div>
        <div className="flex-1 p-2 flex items-center justify-between">
          <div>
            <div className="text-[#00d4ff] font-bold">{sys.disk_read_kbps.toFixed(0)} KB/s</div>
            <div className="text-[10px] text-[#64748b]">Disk Read</div>
          </div>
          <HardDrive className="text-[#00d4ff]" size={16} />
        </div>
        <div className="flex-1 p-2 flex items-center justify-between">
          <div>
            <div className="text-[#f59e0b] font-bold">{sys.disk_write_kbps.toFixed(0)} KB/s</div>
            <div className="text-[10px] text-[#64748b]">Disk Write</div>
          </div>
          <HardDrive className="text-[#f59e0b]" size={16} />
        </div>
        <div className="flex-1 border-r border-[#1a2b50]/40 p-2 flex items-center justify-between">
          <div>
            <div className="text-[#e2e8f0] font-bold">{sys.gpus && sys.gpus.length > 0 ? sys.gpus.filter(g => g.temp > 0).map(g => `${g.temp.toFixed(1)} °C`).join(' / ') || '--' : '--'}</div>
            <div className="text-[10px] text-[#64748b]">GPU Temp</div>
          </div>
          <Flame className="text-[#ef4444]" size={16} />
        </div>
        <div className="flex-1 p-2 flex items-center justify-between">
          <div>
            <div className="text-[#e2e8f0] font-bold">{sys.total_processes}</div>
            <div className="text-[10px] text-[#64748b]">Processes</div>
          </div>
          <Layers className="text-[#94a3b8]" size={16} />
        </div>
      </div>

      {/* 6. PROCESS TABLE */}
      <div className="flex-1 bg-[#0a0f18] border border-[#1a2b50]/40 rounded flex flex-col min-h-0 mt-1">
        <div className="flex justify-between items-center px-4 py-1 border-b border-[#1a2b50]/40 shrink-0">
          <span className="text-[10px] font-bold text-[#00d4ff] uppercase tracking-wider">Top Processes</span>
          <div className="text-[10px] text-[#64748b]">Sort: <span className="text-[#cbd5e1]">CPU</span></div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 bg-[#0a0f18] z-20">
              <tr className="text-[10px] text-[#00d4ff] uppercase tracking-wider border-b border-[#1a2b50]/40">
                <th className="py-1 px-4 font-normal w-[10%] text-center">PID</th>
                <th className="py-1 px-4 font-normal w-[20%]">Name</th>
                <th className="py-1 px-4 font-normal text-center w-[20%]">CPU</th>
                <th className="py-1 px-4 font-normal text-center w-[30%]">RAM</th>
                <th className="py-1 px-4 font-normal text-center w-[10%]">Disk (MB)</th>
                <th className="py-1 px-4 font-normal text-center w-[10%]">Threads</th>
              </tr>
            </thead>
            <tbody>
              {sys.processes.map(p => (
                <tr key={p.pid} className="border-b border-[#1a2b50]/20 hover:bg-[#1a2b50]/30 transition-colors group">
                  <td className="py-0.5 px-4 text-[#64748b] group-hover:text-[#00d4ff] text-center">{p.pid}</td>
                  <td className="py-0.5 px-4 font-medium text-[#e2e8f0] truncate max-w-[150px]">{p.name}</td>
                  
                  <td className="py-0.5 px-4 text-center tabular-nums">
                    {(p.cpu).toFixed(1)}% <span className="text-[#475569]">/ 100%</span>
                  </td>
                  
                  <td className="py-0.5 px-4 text-center tabular-nums">
                    {p.ram_mb.toFixed(0)} MB <span className="text-[#475569]">/ {sys.ram_total_mb.toFixed(0)} MB ({(p.ram_mb/sys.ram_total_mb*100).toFixed(1)}%)</span>
                  </td>
                  
                  <td className="py-0.5 px-4 text-center tabular-nums text-[#64748b]">
                    {p.disk_total_mb > 0 ? p.disk_total_mb.toFixed(1) : '-'}
                  </td>
                  
                  <td className="py-0.5 px-4 text-center tabular-nums text-[#64748b]">
                    {p.threads > 0 ? p.threads : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
