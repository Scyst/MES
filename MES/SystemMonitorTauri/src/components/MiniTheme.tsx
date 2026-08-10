import React from 'react';
import type { SysPayload } from '../types';

interface MiniThemeProps {
  sys: SysPayload;
  onToggleSettings: () => void;
}

export const MiniTheme: React.FC<MiniThemeProps> = ({ sys, onToggleSettings }) => {
  // Severity colors
  const getColor = (val: number, reverse = false) => {
    if (reverse) {
      if (val < 10) return '#ef4444'; // Red if very low
      if (val < 20) return '#f59e0b'; // Yellow if low
      return '#10b981'; // Green
    }
    if (val > 90) return '#ef4444'; // Red
    if (val > 75) return '#f59e0b'; // Yellow
    return '#10b981'; // Green
  };

  const gpuUtil = sys.gpus && sys.gpus.length > 0 ? sys.gpus.reduce((acc, curr) => acc + curr.util, 0) / sys.gpus.length : 0;
  
  const ramPercent = (sys.ram_used_mb / sys.ram_total_mb) * 100;

  return (
    <div 
      className="h-screen w-screen bg-[#060810]/95 text-[#cbd5e1] overflow-hidden flex items-center px-3 font-mono text-xs select-none border border-[#1a2b50]/60 rounded-lg shadow-xl"
      onContextMenu={(e) => {
        e.preventDefault();
        onToggleSettings();
      }}
    >
      {/* DRAG REGION BACKGROUND LAYER */}
      <div data-tauri-drag-region className="absolute inset-0 z-0 cursor-move" />

      <div className="flex w-full items-center justify-between z-10 pointer-events-none gap-2">
        {/* CPU */}
        <div className="flex items-center gap-2 flex-1">
          <span className="font-bold w-9" style={{ color: getColor(sys.cpu_percent) }}>CPU</span>
          <div className="h-1.5 w-16 bg-[#1a2b50] rounded-full overflow-hidden">
            <div className="h-full transition-all duration-500" style={{ width: `${sys.cpu_percent}%`, backgroundColor: getColor(sys.cpu_percent) }} />
          </div>
          <span className="text-[10px] w-8 text-right">{sys.cpu_percent.toFixed(0)}%</span>
        </div>

        <div className="w-px h-6 bg-[#1a2b50]/60" />

        {/* RAM */}
        <div className="flex items-center gap-2 flex-1">
          <span className="font-bold w-9" style={{ color: getColor(ramPercent) }}>RAM</span>
          <div className="h-1.5 w-16 bg-[#1a2b50] rounded-full overflow-hidden">
            <div className="h-full transition-all duration-500" style={{ width: `${ramPercent}%`, backgroundColor: getColor(ramPercent) }} />
          </div>
          <span className="text-[10px] w-8 text-right">{ramPercent.toFixed(0)}%</span>
        </div>

        <div className="w-px h-6 bg-[#1a2b50]/60" />

        {/* GPU */}
        <div className="flex items-center gap-2 flex-1">
          <span className="font-bold w-9" style={{ color: getColor(gpuUtil) }}>GPU</span>
          <div className="h-1.5 w-16 bg-[#1a2b50] rounded-full overflow-hidden">
            <div className="h-full transition-all duration-500" style={{ width: `${gpuUtil}%`, backgroundColor: getColor(gpuUtil) }} />
          </div>
          <span className="text-[10px] w-8 text-right">{gpuUtil.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};
