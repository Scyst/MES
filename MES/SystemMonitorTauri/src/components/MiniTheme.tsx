import React from 'react';
import type { SysPayload } from '../types';
interface MiniThemeProps {
  sys: SysPayload;
}

export const MiniTheme: React.FC<MiniThemeProps> = ({ sys }) => {
  const getColor = (val: number, reverse = false) => {
    if (reverse) {
      if (val < 10) return '#ef4444'; 
      if (val < 20) return '#f59e0b'; 
      return '#10b981'; 
    }
    if (val > 90) return '#ef4444'; 
    if (val > 75) return '#f59e0b'; 
    return '#10b981'; 
  };

  const gpuUtil = sys.gpus && sys.gpus.length > 0 ? sys.gpus.reduce((acc, curr) => acc + curr.util, 0) / sys.gpus.length : 0;
  
  const validTemps = sys.gpus?.filter(g => g.temp > 0) || [];
  const gpuTemp = validTemps.length > 0 ? Math.max(...validTemps.map(g => g.temp)) : 0;

  const ramPercent = (sys.ram_used_mb / sys.ram_total_mb) * 100;
  const netTotal = sys.net_down_kbps + sys.net_up_kbps;
  // Calculate relative net load (assuming 100MB/s is max for scale, just for visual)
  const netPercent = Math.min((netTotal / 100000) * 100, 100); 

  return (
    <div 
      data-tauri-drag-region
      className="h-screen w-screen bg-[#060810]/95 text-[#cbd5e1] overflow-hidden flex items-center px-3 font-mono text-xs select-none border border-[#1a2b50]/60 rounded-lg shadow-xl cursor-move"
    >


      <div className="flex w-full items-center justify-between z-10 pointer-events-none gap-3">
        {/* CPU */}
        <div className="flex items-center gap-1.5 flex-1">
          <span className="font-bold w-7" style={{ color: getColor(sys.cpu_percent) }}>CPU</span>
          <div className="h-1.5 w-12 bg-[#1a2b50] rounded-full overflow-hidden shrink-0">
            <div className="h-full transition-all duration-500" style={{ width: `${sys.cpu_percent}%`, backgroundColor: getColor(sys.cpu_percent) }} />
          </div>
          <span className="text-[10px] w-7 text-right">{sys.cpu_percent.toFixed(0)}%</span>
        </div>

        <div className="w-px h-6 bg-[#1a2b50]/60" />

        {/* RAM */}
        <div className="flex items-center gap-1.5 flex-1">
          <span className="font-bold w-7" style={{ color: getColor(ramPercent) }}>RAM</span>
          <div className="h-1.5 w-12 bg-[#1a2b50] rounded-full overflow-hidden shrink-0">
            <div className="h-full transition-all duration-500" style={{ width: `${ramPercent}%`, backgroundColor: getColor(ramPercent) }} />
          </div>
          <span className="text-[10px] w-7 text-right">{ramPercent.toFixed(0)}%</span>
        </div>

        <div className="w-px h-6 bg-[#1a2b50]/60" />

        {/* GPU */}
        <div className="flex items-center gap-1.5 flex-1">
          <span className="font-bold w-7" style={{ color: getColor(gpuUtil) }}>GPU</span>
          <div className="h-1.5 w-12 bg-[#1a2b50] rounded-full overflow-hidden shrink-0">
            <div className="h-full transition-all duration-500" style={{ width: `${gpuUtil}%`, backgroundColor: getColor(gpuUtil) }} />
          </div>
          <span className="text-[10px] w-7 text-right">{gpuUtil.toFixed(0)}%</span>
        </div>

        <div className="w-px h-6 bg-[#1a2b50]/60" />

        {/* TEMP */}
        <div className="flex items-center gap-1.5 flex-1 justify-center">
          <span className="font-bold text-rose-400">TEMP</span>
          <span className="text-[11px] font-bold" style={{ color: getColor(gpuTemp) }}>{gpuTemp.toFixed(1)}°C</span>
        </div>

        <div className="w-px h-6 bg-[#1a2b50]/60" />

        {/* NET */}
        <div className="flex items-center gap-1.5 flex-1">
          <span className="font-bold w-7 text-emerald-400">NET</span>
          <div className="h-1.5 w-12 bg-[#1a2b50] rounded-full overflow-hidden shrink-0">
            <div className="h-full transition-all duration-500" style={{ width: `${netPercent}%`, backgroundColor: '#10b981' }} />
          </div>
          <span className="text-[9px] text-right whitespace-nowrap overflow-hidden text-ellipsis w-12">
            {netTotal > 1024 ? (netTotal / 1024).toFixed(1) + ' MB' : netTotal.toFixed(0) + ' KB'}
          </span>
        </div>
      </div>
    </div>
  );
};
