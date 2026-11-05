import React from 'react';
import { 
  FiZap, 
  FiShield, 
  FiCpu, 
  FiBatteryCharging, 
  FiSliders, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiTool, 
  FiActivity 
} from 'react-icons/fi';

export function EvConversionMod1() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-emerald-950/70 via-teal-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
          <FiZap className="w-4 h-4" /> โมดูลที่ 1 (Module 1)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          พื้นฐานไฟฟ้าและเครื่องมือวัดทางไฟฟ้าเบื้องต้นในรถ EV
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ความแตกต่างระหว่างไฟฟ้ากระแสตรง (DC) และกระแสสลับ (AC), กฎของโอห์ม (Ohm's Law), 
          กำลังไฟฟ้า (Power Law: P = V × I), และการใช้มัลติมิเตอร์วัดแรงดันและความต้านทานอย่างปลอดภัย
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          ระบบไฟฟ้ากระแสตรง (DC) vs กระแสสลับ (AC) ในยานยนต์ไฟฟ้า
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">ระบบไฟฟ้ากระแสตรง (High Voltage DC)</h3>
            <p className="text-slate-300">กระแสไฟที่ไหลทิศทางเดียว ออกจากเซลล์แบตเตอรี่แรงดันสูง (เช่น 72V, 96V, 300VDC) ป้อนเข้าสู่อินเวอร์เตอร์ และระบบชาร์จเร็ว DC Fast Charge</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-teal-300 text-sm">ระบบไฟฟ้ากระแสสลับ 3 เฟส (3-Phase AC)</h3>
            <p className="text-slate-300">กระแสไฟที่กลับทิศทางเป็นรูปคลื่นไซน์ สร้างขึ้นโดยอินเวอร์เตอร์ (Motor Controller) เพื่อจ่ายให้มอเตอร์ซิงโครนัสแม่เหล็กถาวร (PMSM) ขับเคลื่อนล้อ</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function EvConversionMod2() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-red-950/70 via-orange-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-red-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold mb-3 border border-red-500/30">
          <FiShield className="w-4 h-4" /> โมดูลที่ 2 (Module 2)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          อันตรายจากไฟฟ้าแรงสูง การตอบสนองฉุกเฉิน และ PPE
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          มาตรฐานความปลอดภัย High Voltage Safety: อันตรายจากประกายไฟอาร์ก (Arc Flash), 
          ขั้นตอนการถอดปลั๊กตัดตอนไฟฟ้าฉุกเฉิน (Manual Service Disconnect: MSD) และการสวมถุงมือหุ้มฉนวน Class 0
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-red-600/30 text-red-400 flex items-center justify-center text-sm font-black border border-red-500/40">1</span>
          ขั้นตอนการตัดระบบไฟ (High Voltage De-energize Protocol)
        </h2>
        <div className="space-y-2.5 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">Step 1</span>
            <p className="text-slate-300 m-0"><strong>บิดกุญแจ OFF และปลดขั้วลบแบตเตอรี่ 12V:</strong> ตัดไฟเลี้ยงระบบควบคุมและคอนแทกเตอร์หลัก</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">Step 2</span>
            <p className="text-slate-300 m-0"><strong>สวมถุงมือฉนวน Class 0 (ทนแรงดัน 1,000V) และดึงปลั๊ก MSD:</strong> แยกสตริงแบตเตอรี่ออกเป็นสองส่วน ป้องกันไฟดูด</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold">Step 3</span>
            <p className="text-slate-300 m-0"><strong>รอเวลา 10 นาที (Capacitor Discharge):</strong> ให้ตัวเก็บประจุภายในอินเวอร์เตอร์คายประจุจนหมด ป้องกันไฟช็อตตกค้าง</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Step 4</span>
            <p className="text-slate-300 m-0"><strong>วัดทวนสอบแรงดันศูนย์ (Live-Dead-Live Test):</strong> ใช้มัลติมิเตอร์วัดขั้วคอนแทกเตอร์ ยืนยันแรงดันต่ำกว่า 5V ก่อนเริ่มซ่อม</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function EvConversionMod3() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-blue-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-500/30">
          <FiCpu className="w-4 h-4" /> โมดูลที่ 3 (Module 3)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          สถาปัตยกรรมยานยนต์ไฟฟ้าดัดแปลง (EV Conversion Architecture)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การทำงานประสานกันของ 5 อุปกรณ์หลัก: Traction Motor, Inverter, High Voltage Battery Pack, 
          DC-DC Converter (แปลงไฟ 12V เลี้ยงไฟเลี้ยว/พวงมาลัยพาวเวอร์) และ Onboard Charger (OBC)
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/40">1</span>
          ผังวงจรไฟฟ้ากำลังและระบบควบคุม (Power &amp; Control Architecture)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-blue-300 text-sm">High Voltage Loop (สายไฟสีส้มสากล)</h3>
            <p className="text-slate-300">เชื่อมโยงจาก Battery Pack ผ่าน Main Fuse → Pre-charge Relay (ป้องกันกระแสกระชาก) → Main Contactor → Inverter → Motor และพอร์ตชาร์จไฟ</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">Low Voltage Loop (ระบบ 12V ปกติ)</h3>
            <p className="text-slate-300">รับไฟจาก DC-DC Converter เพื่อเลี้ยงกล่องควบคุม ECU, ระบบไฟหน้า-ไฟเลี้ยว, ปั๊มลมเบรกสุญญากาศ (Vacuum Brake Booster), และคอยล์รีเลย์นิรภัย</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function EvConversionMod4() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-teal-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-teal-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-3 border border-teal-500/30">
          <FiBatteryCharging className="w-4 h-4" /> โมดูลที่ 4 (Module 4)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          ทฤษฎีเคมีภัณฑ์แบตเตอรี่และการคำนวณระยะทาง
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การเปรียบเทียบคุณสมบัติเคมี LFP vs NMC, รูปแบบเซลล์ (Cylindrical 18650/21700, Prismatic, Pouch), 
          การคำนวณการต่ออนุกรม (Series: เพิ่มโวลต์) และขนาน (Parallel: เพิ่มความจุ), และการประเมินระยะทางวิ่ง (kWh/100km)
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">1</span>
          เปรียบเทียบเคมีภัณฑ์แบตเตอรี่: LFP vs NMC
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">LiFePO4 (LFP - ลิเธียมไอรอนฟอสเฟต)</h3>
            <ul className="text-slate-300 space-y-1 list-disc list-inside">
              <li><strong>แรงดันปกติ:</strong> 3.2V ต่อเซลล์ (Full 3.65V, Cut-off 2.5V)</li>
              <li><strong>ความปลอดภัย:</strong> สูงมาก ทนความร้อนสูง ไม่ติดไฟง่าย (Thermal Runaway สูง)</li>
              <li><strong>อายุการใช้งาน:</strong> 3,000 - 5,000 รอบชาร์จ (Cycle Life)</li>
              <li><strong>การใช้งาน:</strong> นิยมใช้สูงสุดในรถ EV Conversion เชิงพาณิชย์และกระบะ</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-2">
            <h3 className="font-bold text-blue-300 text-sm">NMC (ลิเธียมนิกเกิลแมงกานีสโคบอลต์)</h3>
            <ul className="text-slate-300 space-y-1 list-disc list-inside">
              <li><strong>แรงดันปกติ:</strong> 3.7V ต่อเซลล์ (Full 4.2V, Cut-off 3.0V)</li>
              <li><strong>ความหนาแน่นพลังงาน:</strong> สูงมาก น้ำหนักเบา กักเก็บพลังงานได้มากในปริมาตรจำกัด</li>
              <li><strong>อายุการใช้งาน:</strong> 1,500 - 2,500 รอบชาร์จ</li>
              <li><strong>การใช้งาน:</strong> รถสปอร์ต หรือรถมอเตอร์ไซค์ไฟฟ้าที่ต้องการพื้นที่กะทัดรัด</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export function EvConversionMod5() {
  return (
    <div className="space-y-8 text-slate-200">
      <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 p-6 md:p-8 rounded-2xl border border-purple-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold mb-3 border border-purple-500/30">
          <FiTool className="w-4 h-4" /> โมดูลที่ 5 (Module 5)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          BMS และการออกแบบประกอบแบตเตอรี่แพ็ค
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          หน้าที่ของ Battery Management System (BMS): การบาลานซ์แรงดันเซลล์ (Passive/Active Balancing), 
          การติดตั้งฟิวส์และบัสบาร์ทองแดง (Busbar Sizing), และ Workshop ประกอบแบตเตอรี่ 12V 4S2P
        </p>
      </div>

      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center text-sm font-black border border-purple-500/40">1</span>
          4 ฟังก์ชันป้องกันวิกฤตของระบบ Smart BMS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <h3 className="font-bold text-purple-300 text-sm">1. Over-Voltage Protection (OVP)</h3>
            <p className="text-slate-300">ตัดการชาร์จทันทีเมื่อเซลล์ใดเซลล์หนึ่งมีแรงดันเกิน 3.65V (LFP) เพื่อป้องกันเซลล์บวมและระเบิด</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <h3 className="font-bold text-amber-300 text-sm">2. Under-Voltage Protection (UVP)</h3>
            <p className="text-slate-300">ตัดการจ่ายไฟเมื่อแรงดันเซลล์ต่ำกว่า 2.50V ป้องกันสารละลายอิเล็กโทรไลต์เสื่อมสภาพอย่างถาวร</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <h3 className="font-bold text-rose-300 text-sm">3. Over-Current &amp; Short Circuit (OCP)</h3>
            <p className="text-slate-300">ตัดวงจรในเสี้ยวไมโครวินาที (µs) ผ่านมอสเฟตหรือรีเลย์เมื่อกระแสไฟจ่ายเกินสเปกหรือลัดวงจร</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <h3 className="font-bold text-teal-300 text-sm">4. Over-Temperature Protection (OTP)</h3>
            <p className="text-slate-300">เซนเซอร์ NTC ตรวจจับความร้อนของแพ็ค หากอุณหภูมิเกิน 60°C จะหยุดการทำงานและส่งสัญญาณเตือนหน้าจอ</p>
          </div>
        </div>
      </section>
    </div>
  );
}
