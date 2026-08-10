import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, HardDrive, Cpu, MemoryStick } from 'lucide-react';

interface ProcInfo {
  pid: number;
  name: string;
  cpu: number;
  ram_mb: number;
}

interface SysPayload {
  cpu_percent: number;
  ram_used_mb: number;
  ram_total_mb: number;
  processes: ProcInfo[];
}

interface HistoryPoint {
  time: string;
  cpu: number;
  ram: number;
}

export default function App() {
  const [sys, setSys] = useState<SysPayload | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);

  useEffect(() => {
    const unlisten = listen<SysPayload>('sysinfo', (event) => {
      const data = event.payload;
      setSys(data);
      
      setHistory(prev => {
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
        
        const newPoint = {
          time: timeStr,
          cpu: Math.round(data.cpu_percent),
          ram: Math.round((data.ram_used_mb / data.ram_total_mb) * 100)
        };
        
        const next = [...prev, newPoint];
        if (next.length > 30) next.shift(); // Keep last 30 seconds
        return next;
      });
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  if (!sys) return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-cyan-400">
      <Activity className="animate-pulse w-12 h-12 mr-3" />
      <h1 className="text-2xl font-bold tracking-widest">INITIALIZING SENSORS...</h1>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-200 overflow-hidden flex flex-col p-4 gap-4 font-sans select-none">
      
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4 h-32 shrink-0">
        <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 flex flex-col p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500/50" />
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-slate-400 font-medium flex items-center gap-2"><Cpu size={18}/> CPU UTILIZATION</h2>
            <span className="text-3xl font-bold text-cyan-400">{sys.cpu_percent.toFixed(1)}%</span>
          </div>
          <div className="flex-1 -mx-4 -mb-4 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Area type="monotone" dataKey="cpu" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 flex flex-col p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-fuchsia-500/50" />
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-slate-400 font-medium flex items-center gap-2"><MemoryStick size={18}/> MEMORY (RAM)</h2>
            <div className="text-right">
              <span className="text-3xl font-bold text-fuchsia-400">{((sys.ram_used_mb / sys.ram_total_mb) * 100).toFixed(1)}%</span>
              <div className="text-xs text-slate-500">{sys.ram_used_mb.toFixed(0)} MB / {sys.ram_total_mb.toFixed(0)} MB</div>
            </div>
          </div>
          <div className="flex-1 -mx-4 -mb-4 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Area type="monotone" dataKey="ram" stroke="#d946ef" strokeWidth={2} fillOpacity={1} fill="url(#colorRam)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Processes Table */}
      <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden flex flex-col">
        <div className="p-3 bg-slate-900/80 border-b border-slate-800/50 flex justify-between items-center shrink-0">
          <h2 className="text-sm font-semibold tracking-wider text-slate-300">TOP PROCESSES</h2>
        </div>
        <div className="overflow-auto flex-1 p-2">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-900 text-slate-500 text-xs uppercase">
              <tr>
                <th className="py-2 px-4 font-medium rounded-tl-md">PID</th>
                <th className="py-2 px-4 font-medium">Name</th>
                <th className="py-2 px-4 font-medium text-right">CPU</th>
                <th className="py-2 px-4 font-medium text-right rounded-tr-md">Memory</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sys.processes.map(p => (
                <tr key={p.pid} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-1.5 px-4 text-slate-500 font-mono text-xs">{p.pid}</td>
                  <td className="py-1.5 px-4 font-medium text-slate-300">{p.name}</td>
                  <td className="py-1.5 px-4 text-right font-mono text-cyan-400">{(p.cpu).toFixed(1)}%</td>
                  <td className="py-1.5 px-4 text-right font-mono text-fuchsia-400">{p.ram_mb.toFixed(1)} MB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
