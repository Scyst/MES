import { useEffect, useState, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Zap } from 'lucide-react';
import type { SysPayload, ServerStatus } from './types';
import { invoke } from '@tauri-apps/api/core';

import { ClassicTheme } from './components/ClassicTheme';
import { ModernTheme } from './components/ModernTheme';
import { MiniTheme } from './components/MiniTheme';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [sys, setSys] = useState<SysPayload | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [serverHistory, setServerHistory] = useState<any[]>([]);
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

    // Mode switching helper (shared by SettingsModal and tray)
    const handleModeChange = async (newMode: string) => {
      setMode(newMode);
      localStorage.setItem('app_mode', newMode);
      if (newMode === 'widget') await invoke('set_widget_mode');
      else if (newMode === 'mini') await invoke('set_mini_mode');
      else await invoke('set_window_mode');
    };

    // Apply saved mode on startup
    handleModeChange(savedMode);

    // Request notification permissions
    const initNotifications = async () => {
      if ('Notification' in window && Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
    };
    initNotifications();

    // MES Server Status Polling
    const fetchServerStatus = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/data?range=4h');
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          setServerStatus(json.data[json.data.length - 1]);
          setServerHistory(json.data);
        }
      } catch (err) {
        // Silently ignore if server is unreachable
      }
    };
    fetchServerStatus();
    const serverInterval = setInterval(fetchServerStatus, 10000);

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

    // Listen for System Tray commands
    const trayUnlisten = listen<string>('tray_cmd', async (event) => {
      const cmd = event.payload;
      let newMode = 'window';
      if (cmd === 'mini_mode')   newMode = 'mini';
      if (cmd === 'widget_mode') newMode = 'widget';

      setMode(newMode);
      setIsSettingsOpen(false); // Close modal when changing mode from tray
      localStorage.setItem('app_mode', newMode);
      if (newMode === 'widget') await invoke('set_widget_mode');
      else if (newMode === 'mini') await invoke('set_mini_mode');
      else await invoke('set_window_mode');
    });

    return () => {
      clearInterval(serverInterval);
      unlisten.then(f => f());
      trayUnlisten.then(f => f());
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

  const handleModeChange = async (newMode: string) => {
    setMode(newMode);
    localStorage.setItem('app_mode', newMode);
    if (newMode !== 'window') {
      setIsSettingsOpen(false);
    }
    if (newMode === 'widget') await invoke('set_widget_mode');
    else if (newMode === 'mini') await invoke('set_mini_mode');
    else await invoke('set_window_mode');
  };

  const renderActiveTheme = () => {
    if (mode === 'mini') {
      return <MiniTheme sys={sys} />;
    }
    
    if (theme === 'classic') {
      return <ClassicTheme sys={sys} history={history} onClose={handleClose} onToggleTheme={() => setIsSettingsOpen(true)} />;
    }
    return <ModernTheme sys={sys} history={history} serverStatus={serverStatus} serverHistory={serverHistory} onClose={handleClose} onToggleTheme={() => setIsSettingsOpen(true)} />;
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
        onModeChange={handleModeChange}
      />
    </>
  );
}
