import React from 'react';
import { FiDollarSign, FiBox, FiUsers, FiSettings, FiArrowDownRight } from 'react-icons/fi';

export default function CogsManagement() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 p-8 rounded-2xl border border-cyan-500/20 mb-8">
        <h2 className="text-3xl font-black text-white mt-0 mb-4 flex items-center gap-3">
          <FiDollarSign className="text-cyan-400" />
          การบริหารต้นทุนขาย (COGS Management)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          หัวหน้างาน (Supervisor) และผู้จัดการ (Manager) ในยุคปัจจุบันไม่สามารถโฟกัสแค่ "ยอดผลิต" ได้อีกต่อไป แต่ต้องมีความเข้าใจใน <strong>COGS (Cost of Goods Sold)</strong> หรือต้นทุนขาย เพื่อสร้างผลกำไรที่แท้จริงให้องค์กรท่ามกลางวิกฤติความท้าทาย
        </p>
      </div>

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">ความท้าทายเชิงโครงสร้างในปัจจุบัน</h3>
      <div className="flex flex-col md:flex-row gap-6 mb-10">
        <div className="flex-1 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-rose-400 font-bold mt-0 flex items-center gap-2"><FiArrowDownRight /> Industrial Overcapacity</h4>
          <p className="text-sm text-slate-300 m-0">การทะลักเข้ามาของสินค้าอุปทานส่วนเกินจากต่างประเทศ ทำให้การแข่งขันทวีความรุนแรง ไม่สามารถตั้งราคาสูงได้อีกต่อไป</p>
        </div>
        <div className="flex-1 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-amber-400 font-bold mt-0 flex items-center gap-2"><FiArrowDownRight /> Cost Escalation</h4>
          <p className="text-sm text-slate-300 m-0">ต้นทุนการผลิตพุ่งสูงขึ้น ทั้งจากราคาพลังงาน, วัตถุดิบ และค่าแรงขั้นต่ำที่ปรับตัวสูงขึ้น</p>
        </div>
        <div className="flex-1 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h4 className="text-yellow-400 font-bold mt-0 flex items-center gap-2"><FiArrowDownRight /> Sluggish Demand</h4>
          <p className="text-sm text-slate-300 m-0">กำลังซื้อในประเทศตึงตัว จากปัญหาหนี้ครัวเรือน ทำให้ยอดขายเติบโตช้าลง</p>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">โครงสร้างของ COGS และการบริหารแบบ End-to-End</h3>
      <p className="mb-6">ต้นทุน COGS ประกอบด้วย 3 ส่วนหลัก ซึ่งหัวหน้างานต้องเข้าไปจัดการ <strong>ความสูญเสีย (Losses)</strong> ในแต่ละส่วนอย่างเป็นระบบ:</p>

      <div className="space-y-6">
        {/* DM */}
        <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-cyan-500 relative">
          <div className="absolute right-6 top-6 text-cyan-500/20 text-6xl">
            <FiBox />
          </div>
          <h4 className="text-xl font-bold text-cyan-400 mt-0 mb-3">1. Direct Material (DM) - ต้นทุนวัตถุดิบทางตรง</h4>
          <p className="text-slate-300 mb-4 w-3/4">โดยปกติ DM จะคิดเป็นสัดส่วนสูงที่สุด (ประมาณ 60-70% ของต้นทุน) การบริหาร DM เน้นที่การลดของเสียและการใช้วัตถุดิบให้คุ้มค่าที่สุด</p>
          <ul className="text-sm text-slate-300 space-y-2 mb-0">
            <li><strong>Price Variance:</strong> การจัดซื้อให้ได้ราคาดีที่สุด (Sourcing)</li>
            <li><strong>Quantity/Yield Variance:</strong> การควบคุมให้ได้ปริมาณผลผลิต (Yield) สูงสุด ลด Scrap และงานเสียที่ต้องทิ้ง</li>
            <li><strong>Inventory Carrying Cost:</strong> ต้นทุนค่าเสียโอกาสและค่าเช่าโกดังจากสต็อกที่บวมเกินไป</li>
          </ul>
        </div>

        {/* DL */}
        <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-violet-500 relative">
          <div className="absolute right-6 top-6 text-violet-500/20 text-6xl">
            <FiUsers />
          </div>
          <h4 className="text-xl font-bold text-violet-400 mt-0 mb-3">2. Direct Labor (DL) - ต้นทุนแรงงานทางตรง</h4>
          <p className="text-slate-300 mb-4 w-3/4">ค่าใช้จ่ายสำหรับพนักงานสายการผลิตโดยตรง หัวหน้างานต้องบริหารเพื่อให้เกิดผลิตภาพ (Productivity) สูงสุดในเวลาทำงานปกติ</p>
          <ul className="text-sm text-slate-300 space-y-2 mb-0">
            <li><strong>Productivity:</strong> การเพิ่มผลผลิตต่อหัว (Pieces per person) กำจัด Motion waste</li>
            <li><strong>Overtime (OT) Control:</strong> ควบคุมการทำ OT ที่เกิดจากปัญหาเครื่องจักรเสีย หรืองานแทรก (Mura)</li>
            <li><strong>Rework Labor:</strong> เวลาแรงงานที่สูญเสียไปกับการมานั่งแก้ไขงานเสีย (Defects)</li>
          </ul>
        </div>

        {/* OH */}
        <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-fuchsia-500 relative">
          <div className="absolute right-6 top-6 text-fuchsia-500/20 text-6xl">
            <FiSettings />
          </div>
          <h4 className="text-xl font-bold text-fuchsia-400 mt-0 mb-3">3. Factory Overhead (OH) - ค่าใช้จ่ายการผลิต (โสหุ้ย)</h4>
          <p className="text-slate-300 mb-4 w-3/4">ค่าใช้จ่ายอื่นๆ ในโรงงาน เช่น พลังงาน ค่าเสื่อมราคาเครื่องจักร และการซ่อมบำรุง ซึ่งเป็นส่วนที่มักจะถูกละเลยมากที่สุด</p>
          <ul className="text-sm text-slate-300 space-y-2 mb-0">
            <li><strong>Energy Loss:</strong> ลมรั่ว (Air leak), ไฟฟ้าที่เปิดทิ้งไว้ตอนเครื่องไม่เดิน, หรือเดินเครื่องเปล่า (Idling)</li>
            <li><strong>Maintenance Cost:</strong> ค่าอะไหล่, สารหล่อลื่น, การจ้างช่างภายนอก</li>
            <li><strong>Depreciation (ค่าเสื่อม):</strong> หาก OEE ต่ำ แปลว่าเครื่องจักรผลิตได้น้อยชิ้น ทำให้ต้นทุนค่าเสื่อมราคาต่อชิ้นสูงขึ้น</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
