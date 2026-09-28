const fs = require('fs');
let file = 'E:/MES/MES/MES/mes-v2/src/modules/PaintChem/pages/PaintChemEntryPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldOfflineBanner = `{/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-red-600 text-white text-sm px-4 py-2 rounded-lg mb-3">
          <WifiOff size={16} /> ไม่มีการเชื่อมต่อ — กรุณาอย่ากรอกข้อมูลจนกว่าจะออนไลน์
        </div>
      )}`;

const newBanners = `{/* Time-Lock Banner */}
      {isTimeLocked && header?.status === 'DRAFT' && (
        <div className="flex items-center justify-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium px-4 py-3 rounded-lg mb-4 shadow-sm">
          <span>🔒 เอกสารนี้ถูกล็อคเนื่องจากหมดเวลาบันทึก (เกิน 12:00 น. ของวันถัดไป) หากต้องการแก้ไข กรุณาติดต่อหัวหน้างาน</span>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-3 rounded-lg mb-4 shadow-sm">
          <WifiOff size={18} /> ไม่มีการเชื่อมต่ออินเทอร์เน็ต — กรุณาอย่ากรอกข้อมูลจนกว่าจะออนไลน์
        </div>
      )}`;

content = content.replace(oldOfflineBanner, newBanners);
fs.writeFileSync(file, content, 'utf8');
