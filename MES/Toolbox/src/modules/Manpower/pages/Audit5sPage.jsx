import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import Audit5sCommitteePanel from '../components/Audit5sCommitteePanel';

export default function Audit5sPage() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div className="w-full space-y-3">
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
          <WifiOff className="h-4 w-4 shrink-0" />
          ออฟไลน์ — ปิดการบันทึกชั่วคราวเพื่อป้องกันข้อมูลสูญหาย
        </div>
      )}
      <Audit5sCommitteePanel standaloneHeader isOnline={isOnline} />
    </div>
  );
}
