import { useState, useEffect } from 'react';
import { Activity, Cpu, HardDrive, Zap, Flame, Layers, ArrowDown, ArrowUp, Globe, Database, Server, Wifi, LayoutDashboard, Cloud, Settings, LayoutList, Columns3, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import type { SysPayload, ServerStatus } from '../types';
import { YAxis, XAxis, ResponsiveContainer, AreaChart, Area, Tooltip, CartesianGrid } from 'recharts';

const ModernCircularGauge = ({ value, max, label, subtext, color, icon: Icon }: {value: number, max: number, label: string, subtext: string, color: string, icon?: any}) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(1, value / safeMax));
  const strokeDashoffset = circumference - pct * circumference;

  return (
    <div className="flex flex-col items-center justify-center bg-white/5 backdrop-blur-xl flex-1 py-4 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative overflow-hidden group hover:bg-white/10 transition-colors">
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" style={{ background: `radial-gradient(circle, ${color}22, transparent)` }} />
      <div className="relative flex items-center justify-center mb-1">
        <svg className="w-[84px] h-[84px] transform -rotate-90">
          <circle cx="42" cy="42" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
          <circle cx="42" cy="42" r={radius} stroke={color} strokeWidth="6" fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xl font-black text-white/90" style={{ textShadow: `0 0 10px ${color}44` }}>{Math.round(pct*100)}%</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2 z-10">
        {Icon && <Icon size={12} style={{ color: color }} />}
        <span className="text-xs font-bold text-white/70 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-[10px] text-white/40 mt-0.5 font-medium tracking-wider z-10 truncate max-w-[95%] text-center px-1" title={subtext}>{subtext}</div>
    </div>
  );
};

export const ModernTheme = ({ 
  sys, 
  history,
  serverStatus,
  serverHistory,
  onClose,
  onToggleTheme
}: { 
  sys: SysPayload, 
  history: {time: string, cpu: number, ram: number}[],
  serverStatus?: ServerStatus | null,
  serverHistory?: any[],
  onClose: () => void,
  onToggleTheme: () => void
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'server'>('local');
  const [serverLayout, setServerLayout] = useState<'row' | 'col' | 'combined'>('col');
  const [backendRunning, setBackendRunning] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isRunning: boolean = await invoke('check_backend_status');
        setBackendRunning(isRunning);
      } catch (e) {
        setBackendRunning(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] text-slate-200 overflow-hidden flex flex-col p-4 gap-4 font-sans select-none relative">
      
      {/* DRAG REGION */}
      <div data-tauri-drag-region className="absolute top-0 left-0 w-[calc(100%-200px)] h-16 z-0 cursor-move" />

      {/* 1. HEADER */}
      <div className="flex justify-between items-center shrink-0 z-10 bg-white/5 backdrop-blur-md rounded-2xl px-4 py-2 border border-white/10 shadow-lg">
        <div className="flex items-center gap-6 pointer-events-none">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Activity className="text-indigo-400" size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white/90">
                SystemMonitor<span className="font-light text-indigo-400">Pro</span>
              </h1>
              <div className="text-[10px] font-medium tracking-widest text-indigo-200/50 uppercase flex gap-3">
                <span>{sys.hostname}</span>
                <span>{sys.os}</span>
                <span>UPTIME: {formatUptime(sys.uptime)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pointer-events-auto z-50">
          
          {/* BACKEND STATUS INDICATOR */}
          <div className="flex items-center gap-1.5 px-3 h-10 bg-black/20 rounded-xl border border-white/5" title="Backend Services (Logger, Dashboard, Backup)">
            {backendRunning === true ? (
              <><CheckCircle2 size={14} className="text-emerald-400" /><span className="text-[10px] font-bold text-emerald-400">ACTIVE</span></>
            ) : backendRunning === false ? (
              <><AlertCircle size={14} className="text-rose-400" /><span className="text-[10px] font-bold text-rose-400">STOPPED</span></>
            ) : (
              <span className="text-[10px] font-bold text-white/40">...</span>
            )}
          </div>

          {/* TABS (MOVED HERE) */}
          <div className="flex gap-2 bg-black/20 p-1 rounded-xl border border-white/5 mr-2">
            <button 
              onClick={() => setActiveTab('local')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'local' ? 'bg-indigo-500/30 text-white shadow-sm border border-indigo-400/30' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
            >
              <LayoutDashboard size={14} /> LOCAL PC
            </button>
            <button 
              onClick={() => setActiveTab('server')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'server' ? 'bg-indigo-500/30 text-white shadow-sm border border-indigo-400/30' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
            >
              <Cloud size={14} /> MES SERVER
            </button>
          </div>

          <button onClick={onToggleTheme} title="Settings" className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all cursor-pointer border border-white/10 shadow-sm">
            <Settings size={18} />
          </button>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 rounded-xl text-rose-400 hover:text-rose-300 transition-all cursor-pointer border border-rose-500/20">
            ✕
          </button>
        </div>
      </div>

      {activeTab === 'local' && (
        <div className="flex-1 flex flex-col gap-4 min-h-0 animate-in fade-in duration-300">
          {/* 2. CIRCULAR GAUGES */}
          <div className="flex gap-4 shrink-0 z-10">
            <ModernCircularGauge value={sys.cpu_percent} max={100} label="CPU" subtext={`${sys.cpu_freq} MHz`} color="#38bdf8" icon={Cpu} />
            <ModernCircularGauge value={sys.ram_used_mb} max={sys.ram_total_mb} label="RAM" subtext={`${(sys.ram_used_mb/1024).toFixed(1)} / ${(sys.ram_total_mb/1024).toFixed(1)} GB`} color="#a855f7" icon={Layers} />
            {sys.gpus && sys.gpus.map((gpu, i) => (
              <ModernCircularGauge key={`gpu-${i}`} value={gpu.util || 0} max={100} label={`GPU ${i}`} subtext={gpu.name ? gpu.name : "Detecting..."} color={gpu.is_nvidia ? "#10b981" : "#f43f5e"} icon={Activity} />
            ))}
            <ModernCircularGauge value={sys.disk_used_gb} max={sys.disk_total_gb} label="DISK" subtext={`${(sys.disk_total_gb - sys.disk_used_gb).toFixed(1)} GB Free`} color="#f59e0b" icon={HardDrive} />
            <ModernCircularGauge value={100} max={100} label="POWER" subtext={`Stable`} color="#10b981" icon={Zap} />
          </div>

          {/* 3. CORES */}
          <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col shadow-lg relative overflow-hidden shrink-0 z-10 max-h-[120px]">
              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
              <div className="text-xs font-bold text-white/60 mb-3 tracking-widest uppercase flex items-center gap-2 shrink-0">
                <Cpu size={14} className="text-indigo-400" /> Logical Cores
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1 items-start">
                  {sys.cpu_cores.map((c, i) => (
                    <div key={`c-${i}`} className="flex items-center gap-2 group">
                      <span className="text-[10px] font-bold text-white/40 w-5">C{i}</span>
                      <div className="flex-1 h-1.5 bg-black/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${c}%`, backgroundColor: c > 85 ? '#f43f5e' : c > 50 ? '#f59e0b' : '#38bdf8' }} />
                      </div>
                      <span className="text-[9px] font-mono text-white/50 w-6 text-right">{c.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          {/* 4. CHARTS GRID */}
          <div className="w-full grid grid-cols-5 gap-4 shrink-0 z-10 h-28">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col shadow-lg relative">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase flex items-center gap-1"><Cpu size={10} className="text-sky-400"/> CPU</span>
                  <span className="text-xs font-black text-sky-400">{sys.cpu_percent.toFixed(1)}%</span>
                </div>
                <div className="flex-1 min-h-0 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <YAxis domain={[0, 100]} hide />
                      <XAxis dataKey="time" hide />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', marginBottom: '4px' }} />
                      <Area type="monotone" dataKey="cpu" stroke="#38bdf8" strokeWidth={2} fillOpacity={0.15} fill="#38bdf8" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col shadow-lg relative">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase flex items-center gap-1"><Layers size={10} className="text-purple-400"/> RAM</span>
                  <span className="text-xs font-black text-purple-400">{((sys.ram_used_mb / sys.ram_total_mb) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex-1 min-h-0 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <YAxis domain={[0, 100]} hide />
                      <XAxis dataKey="time" hide />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', marginBottom: '4px' }} />
                      <Area type="step" dataKey="ram" stroke="#a855f7" strokeWidth={2} fillOpacity={0.15} fill="#a855f7" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col shadow-lg relative">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase flex items-center gap-1"><HardDrive size={10} className="text-amber-400"/> DISK I/O</span>
                  <span className="text-xs font-black text-amber-400">{(sys.disk_read_kbps + sys.disk_write_kbps).toFixed(0)} KB/s</span>
                </div>
                <div className="flex-1 min-h-0 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <YAxis hide />
                      <XAxis dataKey="time" hide />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', marginBottom: '4px' }} />
                      <Area type="monotone" dataKey="disk" stroke="#f59e0b" strokeWidth={2} fillOpacity={0.15} fill="#f59e0b" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col shadow-lg relative">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase flex items-center gap-1"><Activity size={10} className="text-emerald-400"/> NETWORK I/O</span>
                  <span className="text-xs font-black text-emerald-400">{(sys.net_down_kbps + sys.net_up_kbps).toFixed(0)} KB/s</span>
                </div>
                <div className="flex-1 min-h-0 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <YAxis hide />
                      <XAxis dataKey="time" hide />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', marginBottom: '4px' }} />
                      <Area type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} fillOpacity={0.15} fill="#10b981" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 flex flex-col shadow-lg relative min-h-[80px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase flex items-center gap-1"><Flame size={10} className="text-rose-400"/> GPU</span>
                  <span className="text-xs font-black text-rose-400">{sys.gpus && sys.gpus.length > 0 ? sys.gpus.map(g => `${g.util.toFixed(1)}%`).join(' / ') : '0.0%'}</span>
                </div>
                <div className="flex-1 min-h-0 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history}>
                      <YAxis domain={[0, 100]} hide />
                      <XAxis dataKey="time" hide />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} labelStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', marginBottom: '4px' }} />
                      {sys.gpus && sys.gpus.map((gpu, i) => (
                        <Area key={`gpu-area-${i}`} type="monotone" dataKey={`gpu${i}`} stroke={gpu.is_nvidia ? "#10b981" : "#f43f5e"} strokeWidth={2} fillOpacity={0.15} fill={gpu.is_nvidia ? "#10b981" : "#f43f5e"} isAnimationActive={false} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          {/* 4.5. STATS ROW */}
          <div className="flex gap-4 shrink-0 z-10">
            {[
              { label: "Download", val: `${sys.net_down_kbps.toFixed(0)} KB/s`, icon: ArrowDown, color: "text-emerald-400" },
              { label: "Upload", val: `${sys.net_up_kbps.toFixed(0)} KB/s`, icon: ArrowUp, color: "text-blue-400" },
              { label: "Disk Read", val: `${sys.disk_read_kbps.toFixed(0)} KB/s`, icon: HardDrive, color: "text-amber-400" },
              { label: "Disk Write", val: `${sys.disk_write_kbps.toFixed(0)} KB/s`, icon: HardDrive, color: "text-orange-400" },
              { label: "Temperature", val: sys.gpus && sys.gpus.length > 0 ? sys.gpus.filter(g => g.temp > 0).map(g => `${g.temp.toFixed(1)} °C`).join(' / ') || '--' : '--', icon: Flame, color: "text-rose-400" },
              { label: "Processes", val: sys.total_processes, icon: Layers, color: "text-indigo-400" }
            ].map((s, i) => (
              <div key={`stat-${i}`} className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-3 flex items-center justify-between shadow-lg">
                <div>
                  <div className="text-[10px] font-bold text-white/50 tracking-widest uppercase mb-1">{s.label}</div>
                  <div className={`text-sm font-black ${s.color}`}>{s.val}</div>
                </div>
                <s.icon size={16} className={`${s.color} opacity-70`} />
              </div>
            ))}
          </div>

          {/* 5. PROCESS TABLE */}
          <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-lg z-10 min-h-0">
            <div className="px-5 py-3 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
              <span className="text-xs font-bold text-white/70 tracking-widest uppercase flex items-center gap-2">
                <Layers size={14} className="text-indigo-400" /> Top Processes
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              <table className="w-full text-left border-collapse text-sm table-fixed">
                <thead className="sticky top-0 bg-[#0f172a]/90 backdrop-blur-md z-20">
                  <tr className="text-[9px] text-white/40 uppercase tracking-widest border-b border-white/5">
                    <th className="py-2 px-4 font-bold rounded-tl-lg w-[30%]">Process</th>
                    <th className="py-2 px-4 font-bold text-center w-[15%]">PID</th>
                    <th className="py-2 px-4 font-bold text-center w-[15%]">CPU</th>
                    <th className="py-2 px-4 font-bold text-center w-[15%]">Memory</th>
                    <th className="py-2 px-4 font-bold text-center w-[15%]">Disk (MB)</th>
                    <th className="py-2 px-4 font-bold text-center rounded-tr-lg w-[10%]">Threads</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {sys.processes.map(p => (
                    <tr key={p.pid} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="py-2 px-4">
                        <div className="font-semibold text-white/80 group-hover:text-indigo-300 transition-colors truncate max-w-[200px]">{p.name}</div>
                      </td>
                      <td className="py-2 px-4 text-center text-[10px] font-mono text-white/40">{p.pid}</td>
                      <td className="py-2 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[10px] font-black w-10 text-sky-400">{p.cpu.toFixed(1)}%</span>
                          <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <div className="h-full bg-sky-400 rounded-full" style={{ width: `${Math.min(100, p.cpu)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[11px] font-bold text-purple-300">{p.ram_mb.toFixed(0)} MB</span>
                          <span className="text-[9px] text-white/40 font-mono">{(p.ram_mb/sys.ram_total_mb*100).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-center text-[11px] font-medium text-white/50">
                        {p.disk_total_mb > 0 ? p.disk_total_mb.toFixed(1) : '-'}
                      </td>
                      <td className="py-2 px-4 text-center text-[11px] font-mono text-white/40">
                        {p.threads}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'server' && (
        <div className="flex-1 flex flex-col gap-4 min-h-0 animate-in fade-in duration-300">
          {serverStatus ? (
            <>
              {/* SERVER STATUS STATS */}
              <div className="flex gap-4 shrink-0 z-10">
                {[
                  { label: "Web (HTTP)", val: serverStatus.http ? `${serverStatus.http} ms` : 'ERR', icon: Globe, color: serverStatus.http ? "text-sky-400" : "text-rose-500" },
                  { label: "DB Connect", val: serverStatus.dbConnect ? `${serverStatus.dbConnect} ms` : 'ERR', icon: Database, color: serverStatus.dbConnect ? "text-indigo-400" : "text-rose-500" },
                  { label: "DB Query", val: serverStatus.dbQuery ? `${serverStatus.dbQuery} ms` : 'ERR', icon: Database, color: serverStatus.dbQuery ? "text-purple-400" : "text-rose-500" },
                  { label: "FTP Storage", val: serverStatus.ftp ? `${serverStatus.ftp} ms` : 'ERR', icon: Server, color: serverStatus.ftp ? "text-blue-400" : "text-rose-500" },
                  { label: "Node-RED", val: serverStatus.nodered ? `${serverStatus.nodered} ms` : 'ERR', icon: Wifi, color: serverStatus.nodered ? "text-emerald-400" : "text-rose-500" }
                ].map((s, i) => (
                  <div key={`srv-${i}`} className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 flex items-center justify-between shadow-lg ring-1 ring-white/5 hover:bg-white/10 transition-colors">
                    <div>
                      <div className="text-[10px] font-bold text-white/50 tracking-widest uppercase mb-1">{s.label}</div>
                      <div className={`text-xl font-black ${s.color}`}>{s.val}</div>
                    </div>
                    <s.icon size={24} className={`${s.color} opacity-70`} />
                  </div>
                ))}
              </div>

              {/* SERVER GRAPHS */}
              <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-4 shadow-lg min-h-0 overflow-hidden">
                <div className="flex justify-between items-center shrink-0">
                  <div className="text-xs font-bold text-white/70 tracking-widest uppercase flex items-center gap-2">
                    <Activity size={14} className="text-sky-400" /> Historical Performance
                  </div>
                  {/* Layout Toggle */}
                  <div className="flex gap-1 bg-black/20 p-1 rounded-lg border border-white/5">
                    <button
                      onClick={() => setServerLayout('row')}
                      title="Side by Side"
                      className={`w-7 h-7 flex items-center justify-center rounded transition-all ${serverLayout === 'row' ? 'bg-indigo-500/30 text-white border border-indigo-400/30' : 'text-white/40 hover:text-white/80'}`}
                    >
                      <Columns3 size={14} />
                    </button>
                    <button
                      onClick={() => setServerLayout('col')}
                      title="Stacked"
                      className={`w-7 h-7 flex items-center justify-center rounded transition-all ${serverLayout === 'col' ? 'bg-indigo-500/30 text-white border border-indigo-400/30' : 'text-white/40 hover:text-white/80'}`}
                    >
                      <LayoutList size={14} />
                    </button>
                    <button
                      onClick={() => setServerLayout('combined')}
                      title="Combined (All Lines)"
                      className={`w-7 h-7 flex items-center justify-center rounded transition-all ${serverLayout === 'combined' ? 'bg-indigo-500/30 text-white border border-indigo-400/30' : 'text-white/40 hover:text-white/80'}`}
                    >
                      <TrendingUp size={14} />
                    </button>
                  </div>
                </div>

                {serverLayout === 'combined' ? (
                  /* COMBINED: all 3 series in one chart */
                  <div className="flex-1 min-h-0 bg-black/20 rounded-xl p-4 border border-white/5 flex flex-col">
                    {/* Legend */}
                    <div className="flex gap-4 mb-3 shrink-0">
                      {[
                        { key: 'ping',    label: 'Ping',     color: '#38bdf8', icon: Globe },
                        { key: 'http',    label: 'HTTP',     color: '#a855f7', icon: Wifi },
                        { key: 'dbQuery', label: 'DB Query', color: '#f59e0b', icon: Database },
                      ].map(s => (
                        <div key={s.key} className="flex items-center gap-1.5">
                          <s.icon size={10} style={{ color: s.color }} />
                          <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{s.label}</span>
                          <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 min-h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={serverHistory || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} width={35} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                            formatter={(v: any, name: any) => [`${v} ms`, name === 'ping' ? 'Ping' : name === 'http' ? 'HTTP' : 'DB Query']}
                          />
                          <Area type="monotone" dataKey="ping"    stroke="#38bdf8" strokeWidth={2} fillOpacity={0.08} fill="#38bdf8" isAnimationActive={false} />
                          <Area type="monotone" dataKey="http"    stroke="#a855f7" strokeWidth={2} fillOpacity={0.08} fill="#a855f7" isAnimationActive={false} />
                          <Area type="monotone" dataKey="dbQuery" stroke="#f59e0b" strokeWidth={2} fillOpacity={0.08} fill="#f59e0b" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${serverLayout === 'row' ? 'grid grid-cols-3 gap-4' : 'flex flex-col gap-4'}`}>

                  {/* PING CHART */}
                  <div className={`bg-black/20 rounded-xl p-4 border border-white/5 flex flex-col ${serverLayout === 'col' ? 'min-h-[200px]' : ''}`}>
                    <h3 className="text-[10px] font-bold text-white/50 tracking-widest uppercase mb-2 flex items-center gap-2">
                      <Globe size={10} className="text-sky-400" /> Ping Latency (ms)
                    </h3>
                    <div className="flex-1 min-h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={serverHistory || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} width={35} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} formatter={(v: any) => [`${v} ms`, 'Ping']} />
                          <Area type="monotone" dataKey="ping" stroke="#38bdf8" strokeWidth={2} fillOpacity={0.15} fill="#38bdf8" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* HTTP CHART */}
                  <div className={`bg-black/20 rounded-xl p-4 border border-white/5 flex flex-col ${serverLayout === 'col' ? 'min-h-[200px]' : ''}`}>
                    <h3 className="text-[10px] font-bold text-white/50 tracking-widest uppercase mb-2 flex items-center gap-2">
                      <Wifi size={10} className="text-purple-400" /> HTTP Response (ms)
                    </h3>
                    <div className="flex-1 min-h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={serverHistory || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} width={35} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} formatter={(v: any) => [`${v} ms`, 'HTTP']} />
                          <Area type="monotone" dataKey="http" stroke="#a855f7" strokeWidth={2} fillOpacity={0.15} fill="#a855f7" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* DB QUERY CHART */}
                  <div className={`bg-black/20 rounded-xl p-4 border border-white/5 flex flex-col ${serverLayout === 'col' ? 'min-h-[200px]' : ''}`}>
                    <h3 className="text-[10px] font-bold text-white/50 tracking-widest uppercase mb-2 flex items-center gap-2">
                      <Database size={10} className="text-amber-400" /> DB Query Time (ms)
                    </h3>
                    <div className="flex-1 min-h-[160px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={serverHistory || []}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} width={35} />
                          <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} formatter={(v: any) => [`${v} ms`, 'DB Query']} />
                          <Area type="monotone" dataKey="dbQuery" stroke="#f59e0b" strokeWidth={2} fillOpacity={0.15} fill="#f59e0b" isAnimationActive={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                )} {/* end combined ternary */}
              </div>


            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/40 font-mono flex-col gap-4">
              <Cloud size={64} className="opacity-20 animate-pulse" />
              <div className="flex flex-col items-center">
                <span className="text-lg text-white/60">WAITING FOR MES SERVER DATA...</span>
                <span className="text-xs opacity-50 mt-1">Ensure performance_logger is running and fetching data.</span>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
