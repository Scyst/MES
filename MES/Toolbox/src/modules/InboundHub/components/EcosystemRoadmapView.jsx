import React from 'react';
import {
  QrCode, Database, Truck, ShieldCheck, BarChart3, CalendarClock, Layers, CheckCircle2
} from 'lucide-react';

const ECOSYSTEM_MODULES = [
  {
    title: '1. ระบบคลังสินค้าและป้ายแท็ก (Store & RM_SERIAL_TAGS)',
    target: 'rmReceiving.php / INVENTORY_ONHAND',
    icon: QrCode,
    description: 'แปลงข้อมูลรายตู้จากลูกค้าเป็นรายการป้าย RM Serial Tag สถานะรอรับ (PENDING) ทันที ลดภาระพนักงานคลังไม่ต้องคีย์รหัสและจำนวนซ้ำซ้อน',
  },
  {
    title: '2. ระบบเทียบต้นทุนมาตรฐาน SAP (SAP Valuation Sync)',
    target: 'SAP_STG_OPERATION_SLIP / ITEMS',
    icon: Database,
    description: 'ดึงต้นทุนมาตรฐานจาก SAP และราคาตามสัญญามาตรวจสอบส่วนต่างราคาในใบอินวอยซ์ของลูกค้าอัตโนมัติตั้งแต่วินาทีแรกที่อัปโหลด',
  },
  {
    title: '3. ระบบควบคุมรถเข้า-ออกและตาชั่ง (Area Access & Fleet Log)',
    target: 'areaAccess.php / fleetLog.php',
    icon: Truck,
    description: 'ส่งเลขตู้คอนเทนเนอร์และทะเบียนรถหัวลากไปที่ป้อม รปภ. ล่วงหน้า เมื่อรถมาถึงและกด Check-in ระบบแจ้งเตือนทั้งคลังสินค้าและ SCM ทันที',
  },
  {
    title: '4. ระบบจองรถโฟร์คลิฟต์และท่าลงสินค้า (Forklift & Dock Slot)',
    target: 'forkliftUI.php',
    icon: CalendarClock,
    description: 'นำเวลากำหนดถึง (ETA) ของแต่ละตู้คอนเทนเนอร์ไปจัดตารางคิวรถโฟร์คลิฟต์และช่องโหลดสินค้าล่วงหน้า ลดปัญหารถติดหน้าคลัง',
  },
  {
    title: '5. ระบบควบคุมคุณภาพรับเข้าและการเคลม (iQMS / IQC)',
    target: 'qmsDashboard.php / IQS',
    icon: ShieldCheck,
    description: 'เมื่อคลังสินค้าตรวจพบของชำรุดหรือยอดขาด ระบบส่งรูปถ่ายหน้าตู้ไปสร้างใบแจ้งเคลม/NCR เชื่อมกับเลขตู้และแจ้งลูกค้าผ่านพอร์ทัลทันที',
  },
  {
    title: '6. ระบบวางแผนการผลิตและงบกำไรขาดทุน (Planning & Daily P&L)',
    target: 'forecast_rm.php / pl_entry.php',
    icon: BarChart3,
    description: 'ฝ่ายวางแผนเห็นยอดวัตถุดิบที่กำลังเดินทางรายตู้ (In-Transit Stock) และส่งผลต่างราคาซื้อจริงเทียบมาตรฐาน (PPV) เข้างบผู้บริหารอัตโนมัติ',
  },
];

const PHASES = [
  {
    phase: 'Phase 1: Core Bridge & Hybrid Upload (MVP)',
    duration: 'ระยะที่ 1 (เห็นผลแก้ปัญหาหลักทันที)',
    items: [
      'พอร์ทัลลูกค้าอัปโหลดไฟล์เดิม (Excel Packing List + Digital PDF Invoice) พร้อมโหมด SCM อัปโหลดแทนช่วงเริ่มต้น',
      'ระบบจำคู่รหัสสินค้าลูกค้า <-> รหัส SAP โรงงานอัตโนมัติ (Partner Item Dictionary)',
      'กระดาน SCM แตกยอด Consolidated Invoice รายตู้ และเทียบราคา 2 ชั้น (SAP/สัญญา + ราคาตลาด LME)',
      'กระดาน Store ดูรายการของแยกตามเลขตู้ (ซ่อนราคา 100%) และบันทึกยอดรับจริง/แจ้งยอดดิฟแบบเรียลไทม์',
    ],
  },
  {
    phase: 'Phase 2: Deep Store Tagging & AI Scanned PDF',
    duration: 'ระยะที่ 2 (ลดงานหน้าคลังเต็มรูปแบบ)',
    items: [
      'เชื่อมปุ่มสร้างป้าย RM_SERIAL_TAGS เข้ากับตารางคลังสินค้าจริง สแกนรับเข้า INVENTORY_ONHAND ในคลิกเดียว',
      'เพิ่ม AI Vision OCR สำหรับอ่านเอกสาร PDF สแกนภาพจากกระดาษ',
      'ระบบแจ้งเตือนผ่านอีเมลและลิงก์ด่วน (Magic Link) สำหรับลูกค้าอัปเดตทะเบียนรถและเวลาถึง (ETA)',
    ],
  },
  {
    phase: 'Phase 3: Full Yard, IQC & Accounting Automation',
    duration: 'ระยะที่ 3 (เชื่อมครบวงจรทั้งโรงงาน)',
    items: [
      'เชื่อมคิวรถเข้าป้อม รปภ. (Area Access) และการจองคิวรถโฟร์คลิฟต์อัตโนมัติ',
      'เชื่อมระบบตรวจรับคุณภาพวัตถุดิบ (IQC) และเปิดใบเคลมของเสีย/ของขาดใน iQMS อัตโนมัติ',
      'ส่งออกข้อมูลที่ผ่านการอนุมัติครบ 3 ทาง (3-Way Match) เพื่อทำรับเข้าบัญชี/SAP แบบไร้กระดาษ',
    ],
  },
];

export default function EcosystemRoadmapView() {
  return (
    <div className="space-y-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              แผนผังการต่อยอดเชื่อมโยงกับระบบ MES เดิมของโรงงาน (Seamless Ecosystem Integration)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ข้อมูลที่ลูกค้าอัปโหลดเพียงครั้งเดียวที่ต้นน้ำ จะไหลไปขับเคลื่อนอีก 6 ระบบภายในโรงงานโดยไม่ต้องคีย์ซ้ำ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {ECOSYSTEM_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div key={mod.title} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{mod.title}</div>
                    <div className="font-mono text-[10px] text-blue-600 dark:text-blue-400">{mod.target}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{mod.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {PHASES.map((p, idx) => (
          <div key={p.phase} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="mes-badge bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                STEP {idx + 1}
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{p.duration}</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">{p.phase}</h4>
            <ul className="space-y-2">
              {p.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
