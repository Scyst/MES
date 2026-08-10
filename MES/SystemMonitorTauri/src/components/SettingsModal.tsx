import React, { useState, useEffect } from 'react';
import { Settings, X, Monitor, MonitorUp, PictureInPicture2, Palette, BellRing } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  currentMode: string;
  onModeChange: (mode: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, currentTheme, onThemeChange, currentMode, onModeChange
}) => {
  const [notifyCpu, setNotifyCpu] = useState(90);
  const [notifyRam, setNotifyRam] = useState(90);

  useEffect(() => {
    const savedCpu = localStorage.getItem('notify_cpu_threshold');
    const savedRam = localStorage.getItem('notify_ram_threshold');
    if (savedCpu) setNotifyCpu(parseInt(savedCpu, 10));
    if (savedRam) setNotifyRam(parseInt(savedRam, 10));
  }, []);

  const handleSaveNotification = (type: 'cpu' | 'ram', val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num)) {
      if (type === 'cpu') {
        setNotifyCpu(num);
        localStorage.setItem('notify_cpu_threshold', num.toString());
      } else {
        setNotifyRam(num);
        localStorage.setItem('notify_ram_threshold', num.toString());
      }
    }
  };

  const setWindowMode = async (mode: string) => {
    onModeChange(mode);
    localStorage.setItem('app_mode', mode);
    
    if (mode === 'widget') {
      await invoke('set_widget_mode');
    } else if (mode === 'mini') {
      await invoke('set_mini_mode');
    } else {
      await invoke('set_window_mode');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-xs font-mono select-none">
      <div className="bg-[#0b1120] border border-[#1a2b50] rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center bg-[#1a2b50]/30 p-3 border-b border-[#1a2b50]">
          <div className="flex items-center gap-2 text-[#e2e8f0]">
            <Settings size={16} className="text-[#00d4ff]" />
            <h2 className="font-bold tracking-widest text-sm">SETTINGS</h2>
          </div>
          <button onClick={onClose} className="text-[#64748b] hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-6 text-[#94a3b8] max-h-[70vh] overflow-y-auto">
          
          <div>
            <div className="flex items-center gap-2 mb-3 text-[#e2e8f0]">
              <Monitor size={14} className="text-[#f43f5e]" />
              <h3 className="font-bold uppercase tracking-wide">Display Mode</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button 
                onClick={() => setWindowMode('window')}
                className={`p-3 rounded border flex flex-col items-center gap-2 cursor-pointer transition-colors ${currentMode === 'window' ? 'bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]' : 'bg-[#1a2b50]/20 border-[#1a2b50] hover:border-[#1a2b50]/60'}`}
              >
                <Monitor size={20} />
                <span>Window</span>
              </button>
              <button 
                onClick={() => setWindowMode('widget')}
                className={`p-3 rounded border flex flex-col items-center gap-2 cursor-pointer transition-colors ${currentMode === 'widget' ? 'bg-[#10b981]/10 border-[#10b981] text-[#10b981]' : 'bg-[#1a2b50]/20 border-[#1a2b50] hover:border-[#1a2b50]/60'}`}
                title="Glued to Desktop"
              >
                <MonitorUp size={20} />
                <span>Widget</span>
              </button>
              <button 
                onClick={() => setWindowMode('mini')}
                className={`p-3 rounded border flex flex-col items-center gap-2 cursor-pointer transition-colors ${currentMode === 'mini' ? 'bg-[#f59e0b]/10 border-[#f59e0b] text-[#f59e0b]' : 'bg-[#1a2b50]/20 border-[#1a2b50] hover:border-[#1a2b50]/60'}`}
                title="Compact Floating Overlay"
              >
                <PictureInPicture2 size={20} />
                <span>Mini</span>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 text-[#e2e8f0]">
              <Palette size={14} className="text-[#a855f7]" />
              <h3 className="font-bold uppercase tracking-wide">UI Theme</h3>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => { onThemeChange('modern'); localStorage.setItem('app_theme', 'modern'); }}
                className={`px-3 py-2 rounded border flex-1 cursor-pointer transition-colors ${currentTheme === 'modern' ? 'bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]' : 'bg-[#1a2b50]/20 border-[#1a2b50] hover:border-[#1a2b50]/60'}`}
              >
                Modern Default
              </button>
              <button 
                onClick={() => { onThemeChange('classic'); localStorage.setItem('app_theme', 'classic'); }}
                className={`px-3 py-2 rounded border flex-1 cursor-pointer transition-colors ${currentTheme === 'classic' ? 'bg-[#00d4ff]/10 border-[#00d4ff] text-[#00d4ff]' : 'bg-[#1a2b50]/20 border-[#1a2b50] hover:border-[#1a2b50]/60'}`}
              >
                Classic Dense
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 text-[#e2e8f0]">
              <BellRing size={14} className="text-[#eab308]" />
              <h3 className="font-bold uppercase tracking-wide">Alert Thresholds</h3>
            </div>
            <div className="space-y-3 bg-[#1a2b50]/10 p-3 rounded border border-[#1a2b50]/40">
              <div className="flex justify-between items-center">
                <span>CPU Usage Alert (%)</span>
                <input 
                  type="number" 
                  value={notifyCpu}
                  onChange={(e) => handleSaveNotification('cpu', e.target.value)}
                  className="bg-[#0b1120] border border-[#1a2b50] text-[#e2e8f0] px-2 py-1 rounded w-16 text-center outline-none focus:border-[#00d4ff]"
                  min="50" max="100"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>RAM Usage Alert (%)</span>
                <input 
                  type="number" 
                  value={notifyRam}
                  onChange={(e) => handleSaveNotification('ram', e.target.value)}
                  className="bg-[#0b1120] border border-[#1a2b50] text-[#e2e8f0] px-2 py-1 rounded w-16 text-center outline-none focus:border-[#00d4ff]"
                  min="50" max="100"
                />
              </div>
              <div className="text-[10px] text-[#64748b] mt-2">
                * Native OS notifications will trigger when usage exceeds the threshold for a sustained period (15s).
              </div>
            </div>
          </div>

        </div>

        <div className="p-3 bg-[#1a2b50]/30 border-t border-[#1a2b50] text-center">
          <button onClick={onClose} className="px-6 py-2 bg-[#00d4ff] hover:bg-[#00b3cc] text-black font-bold rounded cursor-pointer transition-colors w-full uppercase tracking-widest text-[10px]">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
