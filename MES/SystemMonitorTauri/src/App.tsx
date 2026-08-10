import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Zap } from 'lucide-react';
import type { SysPayload } from './types';

import { ClassicTheme } from './components/ClassicTheme';
import { ModernTheme } from './components/ModernTheme';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function App() {
  const [sys, setSys] = useState<SysPayload | null>(null);
  const [history, setHistory] = useState<{time: string, cpu: number, ram: number}[]>([]);
  const [theme, setTheme] = useState<'modern' | 'classic'>('modern');
  
  useEffect(() => {
    const unlisten = listen<SysPayload>('sysinfo', (event) => {
      setSys(event.payload);
      
      setHistory(prev => {
        const newHist = [...prev, {
          time: new Date().toLocaleTimeString(),
          cpu: event.payload.cpu_percent,
          ram: (event.payload.ram_used_mb / event.payload.ram_total_mb) * 100,
        }];
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
    await getCurrentWindow().close();
  };

  const toggleTheme = () => {
    setTheme(t => t === 'modern' ? 'classic' : 'modern');
  };

  if (theme === 'classic') {
    return <ClassicTheme sys={sys} history={history} onClose={handleClose} onToggleTheme={toggleTheme} />;
  }

  return <ModernTheme sys={sys} onClose={handleClose} onToggleTheme={toggleTheme} />;
}
