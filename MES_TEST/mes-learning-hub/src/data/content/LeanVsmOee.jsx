import React from 'react';
import { FiMap, FiActivity, FiPieChart, FiAlertTriangle } from 'react-icons/fi';

export default function LeanVsmOee() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-8 rounded-2xl border border-blue-500/20 mb-8 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1">
          <h2 className="text-3xl font-black text-white mt-0 mb-4">
            Value Stream Mapping & OEE
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed m-0">
            การมองเห็นภาพรวมของกระบวนการทั้งหมด (VSM) และการวัดประสิทธิภาพของเครื่องจักรอย่างถูกต้อง (OEE) คือกุญแจสำคัญในการค้นหาคอขวดและจุดสูญเสียที่ซ่อนอยู่ในโรงงาน
          </p>
        </div>
        <div className="text-6xl text-blue-400/50 hidden md:block">
          <FiMap />
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">แผนภาพกระแสคุณค่า (Value Stream Mapping - VSM)</h3>
      <p className="mb-4">
        <strong>VSM</strong> คือเครื่องมือหลักของ Lean ที่ใช้วาดแผนผังกระแสการไหลของ <strong>"วัสดุ (Material Flow)"</strong> และ <strong>"ข้อมูล (Information Flow)"</strong> เริ่มตั้งแต่รับคำสั่งซื้อจากลูกค้า การสั่งซื้อวัตถุดิบ การผลิตแต่ละขั้นตอน จนกระทั่งส่งมอบสินค้า
      </p>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-10">
        <h4 className="text-xl font-bold text-blue-300 mt-0 mb-4">ข้อมูลที่ต้องเก็บลงในกล่องข้อมูล (Data Box)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-lg">
            <h5 className="text-cyan-400 font-bold mb-2">1. ข้อมูลกระบวนการ (Process)</h5>
            <ul className="text-sm text-slate-300 space-y-1 mb-0 pl-4">
              <li>Cycle Time (C/T)</li>
              <li>จำนวนพนักงาน (Operator)</li>
              <li>เวลาทำงานสุทธิ (Working Time)</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg">
            <h5 className="text-cyan-400 font-bold mb-2">2. ข้อมูลเครื่องจักร (Machine)</h5>
            <ul className="text-sm text-slate-300 space-y-1 mb-0 pl-4">
              <li>Changeover Time (C/O)</li>
              <li>Machine Uptime / Downtime</li>
              <li>OEE (Overall Equipment Effectiveness)</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg">
            <h5 className="text-cyan-400 font-bold mb-2">3. ข้อมูลคุณภาพ (Quality)</h5>
            <ul className="text-sm text-slate-300 space-y-1 mb-0 pl-4">
              <li>Defect Rate (%)</li>
              <li>Rework Rate (%)</li>
              <li>Scrap Rate (%)</li>
            </ul>
          </div>
        </div>
      </div>

      <hr className="border-slate-700 my-10" />

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6 flex items-center gap-2">
        <FiPieChart className="text-fuchsia-400" />
        ประสิทธิผลโดยรวมของเครื่องจักร (OEE)
      </h3>
      <p className="mb-4">
        OEE ย่อมาจาก <strong>Overall Equipment Effectiveness</strong> คือดัชนีชี้วัดความพร้อมของเครื่องจักร สมรรถนะ และคุณภาพ โดยพิจารณาจากเวลาที่สูญเสียไปในแต่ละด้าน สูตรการคำนวณคือ:
      </p>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl text-center text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-violet-400 border border-fuchsia-500/20 mb-10 shadow-lg">
        OEE = Availability × Performance × Quality
      </div>
      
      <h4 className="text-xl font-bold text-white mb-4">ความสูญเสียหลัก 6 ประการที่กดดัน OEE (6 Big Losses)</h4>
      <div className="space-y-4 mb-8">
        {/* Availability Losses */}
        <div className="flex flex-col md:flex-row gap-4 bg-slate-800 p-4 rounded-xl border-l-4 border-rose-500 items-start">
          <div className="bg-rose-500/20 text-rose-400 p-3 rounded-lg flex-shrink-0">
            <FiAlertTriangle className="text-xl" />
          </div>
          <div>
            <h5 className="text-lg font-bold text-white m-0 mb-1">1. Availability Loss (อัตราความพร้อมเดินเครื่อง)</h5>
            <p className="text-sm text-slate-300 m-0">สูญเสียจากเครื่องจักรต้องหยุดนิ่ง (Downtime)</p>
            <ul className="text-sm text-slate-400 mt-2 mb-0">
              <li><strong>Equipment Failure (เครื่องจักรเสีย):</strong> มอเตอร์ไหม้, สายพานขาด, เซนเซอร์พัง</li>
              <li><strong>Setup & Adjustments (การปรับตั้งเครื่อง):</strong> การเปลี่ยนรุ่นการผลิต (Changeover), การวอร์มเครื่อง</li>
            </ul>
          </div>
        </div>

        {/* Performance Losses */}
        <div className="flex flex-col md:flex-row gap-4 bg-slate-800 p-4 rounded-xl border-l-4 border-amber-500 items-start">
          <div className="bg-amber-500/20 text-amber-400 p-3 rounded-lg flex-shrink-0">
            <FiActivity className="text-xl" />
          </div>
          <div>
            <h5 className="text-lg font-bold text-white m-0 mb-1">2. Performance Loss (ประสิทธิภาพการเดินเครื่อง)</h5>
            <p className="text-sm text-slate-300 m-0">สูญเสียจากเครื่องจักรไม่สามารถเดินเครื่องได้เต็มสปีดตามสเปค (Speed Loss)</p>
            <ul className="text-sm text-slate-400 mt-2 mb-0">
              <li><strong>Idling & Minor Stops (การหยุดเล็กๆ น้อยๆ):</strong> ของติดขัด (Jam), เซนเซอร์รวน, พนักงานไปเข้าห้องน้ำ</li>
              <li><strong>Reduced Speed (ความเร็วลดลง):</strong> เครื่องเก่าเลยต้องลดสปีด, ใช้วัตถุดิบคุณภาพต่ำทำให้เดินเครื่องเร็วไม่ได้</li>
            </ul>
          </div>
        </div>

        {/* Quality Losses */}
        <div className="flex flex-col md:flex-row gap-4 bg-slate-800 p-4 rounded-xl border-l-4 border-emerald-500 items-start">
          <div className="bg-emerald-500/20 text-emerald-400 p-3 rounded-lg flex-shrink-0">
            <FiPieChart className="text-xl" />
          </div>
          <div>
            <h5 className="text-lg font-bold text-white m-0 mb-1">3. Quality Loss (อัตราคุณภาพ)</h5>
            <p className="text-sm text-slate-300 m-0">สูญเสียจากการผลิตงานไม่ได้คุณภาพ ทำให้ต้องทิ้งหรือนำกลับมาทำใหม่ (Defects)</p>
            <ul className="text-sm text-slate-400 mt-2 mb-0">
              <li><strong>Process Defects (งานเสียระหว่างผลิต):</strong> รอยขีดข่วน, ขนาดไม่ได้ตาม Spec, ชิ้นส่วนประกอบไม่สนิท</li>
              <li><strong>Reduced Yield (ของเสียช่วงเริ่มเครื่อง):</strong> งานเสียในช่วงตั้งเครื่อง หรือช่วงวอร์มเครื่องจักรแรกๆ</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
