const fs = require('fs');
let file = 'E:/MES/MES/MES/mes-v2/src/modules/PaintChem/pages/PaintChemEntryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add useMemo to imports
content = content.replace(
  "import { useState, useEffect, useCallback } from 'react';",
  "import { useState, useEffect, useCallback, useMemo } from 'react';"
);

// 2. Add isTimeLocked logic before isReadOnly
const oldReadOnly = "const isReadOnly = header?.status === 'APPROVED' || header?.status === 'SUBMITTED';";
const newReadOnly = `  // Time-Lock Constraint: Lock if the sheet date is older than today 12:00 PM (noon)
  const isTimeLocked = useMemo(() => {
    if (!date) return false;
    const now = new Date();
    const [y, m, d] = date.split('-').map(Number);
    
    // Cutoff is 12:00 PM the day AFTER the sheet date
    const cutoff = new Date(y, m - 1, d);
    cutoff.setDate(cutoff.getDate() + 1);
    cutoff.setHours(12, 0, 0, 0);
    
    return now > cutoff;
  }, [date]);

  const isReadOnly = header?.status === 'APPROVED' || header?.status === 'SUBMITTED' || isTimeLocked;`;

content = content.replace(oldReadOnly, newReadOnly);

// 3. Add Time-Lock Banner if locked
const oldOfflineBanner = `{/* Offline banner */}
      {!isOnline && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center justify-center gap-2">
          <WifiOff size={18} />
          <span className="text-sm font-medium">คุณกำลังออฟไลน์ (Offline) ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</span>
        </div>
      )}`;

const newBanners = `{/* Time-Lock Banner */}
      {isTimeLocked && header?.status === 'DRAFT' && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm">
          <span className="text-sm font-medium">
            🔒 เอกสารนี้หมดเวลาบันทึกแล้ว (เกิน 12:00 น. ของวันถัดไป) หากต้องการแก้ไขหรือส่งใบ กรุณาติดต่อหัวหน้างาน
          </span>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center justify-center gap-2 shadow-sm">
          <WifiOff size={18} />
          <span className="text-sm font-medium">คุณกำลังออฟไลน์ (Offline) ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</span>
        </div>
      )}`;

content = content.replace(oldOfflineBanner, newBanners);

fs.writeFileSync(file, content, 'utf8');
