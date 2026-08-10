import { useEffect, useState, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Zap } from 'lucide-react';
import type { SysPayload } from './types';
import { invoke } from '@tauri-apps/api/core';

import { ClassicTheme } from './components/ClassicTheme';
import { ModernTheme } from './components/ModernTheme';
import { MiniTheme } from './components/MiniTheme';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [sys, setSys] = useState<SysPayload | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [theme, setTheme] = useState<string>('modern');
  const [mode, setMode] = useState<string>('window');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const highCpuTicks = useRef(0);
  const highRamTicks = useRef(0);

  useEffect(() => {
    // Load initial settings
    const savedTheme = localStorage.getItem('app_theme') || 'modern';
    const savedMode = localStorage.getItem('app_mode') || 'window';
    setTheme(savedTheme);
    setMode(savedMode);

    // Apply saved mode
    if (savedMode === 'widget') invoke('set_widget_mode');
    else if (savedMode === 'mini') invoke('set_mini_mode');
    else invoke('set_window_mode');

    // Request notification permissions
    const initNotifications = async () => {
      if ('Notification' in window && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
    };
    initNotifications();

    const unlisten = listen<SysPayload>('sysinfo', (event) => {
      setSys(event.payload);
      
      const payload = event.payload;
      const ramPercent = (payload.ram_used_mb / payload.ram_total_mb) * 100;
      
      // Handle Notifications
      const cpuThreshold = parseInt(localStorage.getItem('notify_cpu_threshold') || '90', 10);
      const ramThreshold = parseInt(localStorage.getItem('notify_ram_threshold') || '90', 10);
      
      if (payload.cpu_percent > cpuThreshold) {
        highCpuTicks.current += 1;
        if (highCpuTicks.current === 15) { // 15 seconds sustained
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('System Monitor Alert', { body: `CPU usage is critically high (${payload.cpu_percent.toFixed(0)}%)!` });
          }
        }
      } else {
        highCpuTicks.current = 0;
      }

      if (ramPercent > ramThreshold) {
        highRamTicks.current += 1;
        if (highRamTicks.current === 15) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('System Monitor Alert', { body: `RAM usage is critically high (${ramPercent.toFixed(0)}%)!` });
          }
        }
      } else {
        highRamTicks.current = 0;
      }

      setHistory(prev => {
        const histItem: any = {
          time: new Date().toLocaleTimeString(),
          cpu: payload.cpu_percent,
          ram: ramPercent,
          disk: payload.disk_read_kbps + payload.disk_write_kbps,
          net: payload.net_down_kbps + payload.net_up_kbps,
        };
        payload.gpus.forEach((gpu, i) => {
          histItem[`gpu${i}`] = gpu.util;
        });

        const newHist = [...prev, histItem];
        return newHist.slice(-60);
      });
    });

    return () => {
      unlisten.then(f => f());
    };
  }, []);

  if (!sys) return (
    <div className="h-screen w-screen bg-[#060810] flex items-center justify-center text-[#00d4ff] font-mono" data-tauri-drag-region>
      <Zap className="animate-ping mr-2" /> INIT SYSTEM...
    </div>
  );

  const handleClose = async () => {
    await invoke('exit_app');
  };

  const renderActiveTheme = () => {
    if (mode === 'mini') {
      return <MiniTheme sys={sys} onToggleSettings={() => setIsSettingsOpen(true)} />;
    }
    
    if (theme === 'classic') {
      return <ClassicTheme sys={sys} history={history} onClose={handleClose} onToggleTheme={() => setIsSettingsOpen(true)} />;
    }
    return <ModernTheme sys={sys} history={history} onClose={handleClose} onToggleTheme={() => setIsSettingsOpen(true)} />;
  };

  return (
    <>
      {renderActiveTheme()}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        currentTheme={theme}
        onThemeChange={setTheme}
        currentMode={mode}
        onModeChange={setMode}
      />
    </>
  );
}
