import React from 'react';
import { FiCheckCircle, FiAlertTriangle, FiShield, FiFileText, FiTruck, FiUsers, FiLock } from 'react-icons/fi';

export function Customer56DocsLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-teal-900/50 to-emerald-900/50 p-8 rounded-2xl border border-teal-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-teal-500/20 text-teal-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Retailer QA Audit</span>
          <span className="text-slate-400 text-sm">Customer Audit Step 1</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300 mt-0 mb-4">
          เมทริกซ์ 56 เอกสารบังคับ และ 9 เสาหลักการตรวจโรงงาน (Lowe's & Retailers)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          คู่มือแม่บทในการจัดเตรียม <strong>ห้องรับรองผู้ตรวจ (Audit War Room)</strong> ครอบคลุมเอกสาร 56 ฉบับ และเกณฑ์การประเมิน 102 ข้อ เพื่อให้ผ่านเกณฑ์คะแนน ≥ 85% และไม่มีข้อบกพร่องระดับวิกฤต (Zero Major NC)
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">9 เสาหลักการตรวจประเมินคุณภาพโรงงานสากล</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-slate-900 rounded-lg"><strong>1. Management System:</strong> ผังองค์กร, JD, และการทบทวนของฝ่ายบริหาร (SP-MRS-001)</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>2. NPI & ECN:</strong> ผังการพัฒนาผลิตภัณฑ์ใหม่ และการควบคุม ECN (SP-PDD-003)</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>3. Supplier Management:</strong> ทะเบียน AVL และการประเมินผู้ขาย (SP-PUD-003/010)</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>4. Incoming Control:</strong> ตรวจรับวัตถุดิบ IQC AQL Level II Ac=0, Re=1</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>5. Manufacturing Control:</strong> Control Plan, WI, First Piece Inspection, และ FPY</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>6. Finished Goods & Storage:</strong> การตรวจ FQC/OQC, FIFO, และการสแกนบาร์โค้ด</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>7. NC & CAPA:</strong> กักกันของเสียกรงแดง และการแก้ปัญหาแบบ 8D Report</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>8. Measuring Equipment:</strong> ทะเบียนและสติกเกอร์สอบเทียบจากแล็บ ISO 17025</div>
          <div className="p-3 bg-slate-900 rounded-lg"><strong>9. Post Delivery:</strong> การจัดการข้อร้องเรียน และการวัดอัตราส่งมอบตรงเวลา OTIF</div>
        </div>
      </div>
    </div>
  );
}

export function CustomerNpiEcnLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-blue-900/50 to-cyan-900/50 p-8 rounded-2xl border border-blue-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Engineering Governance</span>
          <span className="text-slate-400 text-sm">Customer Audit Step 2</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mt-0 mb-4">
          การเปิดตัวผลิตภัณฑ์ใหม่ (NPI) และการควบคุม ECN (SP-PDD-003)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          กฎเกณฑ์การพัฒนาผลิตภัณฑ์ใหม่ผ่าน Phase-Gate, การวิเคราะห์ความเสี่ยง Team Feasibility Risk Analysis, การคำนวณขีดความสามารถกระบวนการ ($C_{pk} \ge 1.33$) และข้อห้ามการเปลี่ยนแบบโดยพลการ
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-amber-500">
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <FiAlertTriangle className="text-amber-400" /> กฎเหล็กด้านการควบคุมแบบ (ECN Golden Rule)
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed m-0">
          ห้ามเปลี่ยนแปลงแบบ Drawing, สูตรการผลิต (BOM), แม่พิมพ์ หรือซัพพลายเออร์ชิ้นส่วนวิกฤตโดยพลการเด็ดขาด ทุกการเปลี่ยนแปลงต้องได้รับ <strong>หนังสืออนุมัติเป็นลายลักษณ์อักษรจากลูกค้า (Customer Written Approval)</strong> ก่อนนำมาผลิตจริงเสมอ
        </p>
      </div>
    </div>
  );
}

export function CustomerSupplierIqcLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 p-8 rounded-2xl border border-purple-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Supply Chain Quality</span>
          <span className="text-slate-400 text-sm">Customer Audit Step 3</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300 mt-0 mb-4">
          การจัดการคุณภาพซัพพลายเออร์ และการตรวจรับวัตถุดิบ (IQC AQL)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การประเมินทะเบียน AVL (`SP-PUD-003/010`), การสุ่มตรวจ IQC MIL-STD-105E ระดับ II ปรกติ $Ac=0, Re=1$ (`SP-QCS-001`), และการควบคุมสารอายุสั้น (กาว/ฟลักซ์/สี FEFO)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="text-emerald-400 font-bold mb-2">🟢 Green Tag (ผ่าน)</div>
          <p className="text-xs text-slate-300">ผ่านการตรวจรับ 100% พร้อมให้ฝ่ายผลิตเบิกไปใช้งาน</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="text-amber-400 font-bold mb-2">🟡 Yellow Tag (รอตรวจ)</div>
          <p className="text-xs text-slate-300">อยู่ระหว่างสุ่มตรวจหรือรอผลแล็บ ห้ามเบิกจ่ายเด็ดขาด</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="text-rose-400 font-bold mb-2">🔴 Red Tag (กักกัน/ของเสีย)</div>
          <p className="text-xs text-slate-300">ไม่ผ่านเกณฑ์ ย้ายเข้ากรงกักกันของเสียสีแดงที่มีกุญแจล็อกทันที</p>
        </div>
      </div>
    </div>
  );
}

export function CustomerCapaClaimsLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-rose-900/50 to-pink-900/50 p-8 rounded-2xl border border-rose-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Corrective Action</span>
          <span className="text-slate-400 text-sm">Customer Audit Step 4</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-300 mt-0 mb-4">
          การจัดการงาน NC, มาตรฐาน Rework และการตอบสนอง 8D CAR
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          ขั้นตอนจัดการของเสียตาม `SP-QCS-003`, การซ่อมงานตามคู่มือ `Assy WI for NG Rework` พร้อมการตรวจซ้ำ 100% และกรอบเวลาตอบกลับใบ CAR ของลูกค้าสากล
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-2">กรอบเวลาการตอบสนองใบ CAR ของลูกค้าสากล (SLA)</h3>
        <ul className="text-sm text-slate-300 space-y-2">
          <li>• <strong>ภายใน 24 ชั่วโมง:</strong> ส่งรายงานมาตรการกักกันชั่วคราว (D1 - D3 Containment Action) ยืนยันว่าไม่มีของเสียหลุดรอด</li>
          <li>• <strong>ภายใน 14 วัน:</strong> ส่งรายงานสาเหตุรากเหง้า (D4 5-Why) และมาตรการแก้ไขถาวร (D5 - D7 PCA)</li>
          <li>• <strong>การปิดเคสถาวร:</strong> ตรวจติดตามผลในล็อตการผลิตจริงต่อเนื่องอย่างน้อย 3 ล็อต (Zero Recurrence)</li>
        </ul>
      </div>
    </div>
  );
}

export function CustomerEsgHumanRightsLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-emerald-900/50 to-green-900/50 p-8 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Social Compliance</span>
          <span className="text-slate-400 text-sm">Customer Audit Step 5</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300 mt-0 mb-4">
          นโยบายสิทธิมนุษยชน SNC026/2565 และการต่อต้านการสวมสิทธิ์ส่งออก
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การปฏิบัติตามปฏิญญาสากลของ UN Global Compact และอนุสัญญา ILO: การขจัดแรงงานเด็ก (อายุขั้นต่ำ 18 ปีบริบูรณ์), การต่อต้านแรงงานบังคับ, ห้ามยึดพาสปอร์ต, และนโยบายห้ามสวมสิทธิ์ส่งออก (Anti-Transshipment)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">เกณฑ์สิทธิมนุษยชนวิกฤต</h3>
          <p className="text-sm text-slate-300">ห้ามจ้างเด็กอายุต่ำกว่า 18 ปีในงานอุตสาหกรรม, ชั่วโมงทำงานล่วงเวลารวมไม่เกิน 36 ชม./สัปดาห์, และมีช่องทางแจ้งเบาะแส Whistleblower ที่คุ้มครองผู้แจ้ง 100%</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">การป้องกันการสวมสิทธิ์ส่งออก</h3>
          <p className="text-sm text-slate-300">ต้องมีหลักฐานพิสูจน์การผลิตจริงในประเทศไทย (Made in Thailand) เช่น บิลค่านำเข้าวัตถุดิบ, บันทึกเวลาทำงานของพนักงาน, บิลค่าไฟโรงงาน, และ Log ในระบบ MES</p>
        </div>
      </div>
    </div>
  );
}

export function CustomerGmpRecallLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-yellow-900/50 to-amber-900/50 p-8 rounded-2xl border border-yellow-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-yellow-500/20 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Facility & Security</span>
          <span className="text-slate-400 text-sm">Customer Audit Step 6</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-300 mt-0 mb-4">
          Costco Non-Food GMP, การควบคุมของมีคม และการเรียกคืนผลิตภัณฑ์ (Mock Recall)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          มาตรฐานสุขอนามัยโรงงานค้าปลีก, ระเบียบควบคุมมีดคัตเตอร์ผูกสายสลิงและตู้ล็อก, แผนซ้อมเรียกคืนผลิตภัณฑ์จำลอง (Mock Recall ภายใน 4 ชม. ตาม `SP-QCS-014`), และการตรวจตู้คอนเทนเนอร์ 7 จุด C-TPAT
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-2">การฝึกซ้อมแผนเรียกคืนผลิตภัณฑ์จำลอง (Mock Recall Exercise)</h3>
        <p className="text-sm text-slate-300 mb-4">โรงงานต้องจัดซ้อมแผนเรียกคืนสินค้าจำลองอย่างน้อยปีละ 1 ครั้ง โดยต้องสามารถสืบย้อนกลับข้อมูลครบถ้วนทั้งล็อตวัตถุดิบ, วันที่ผลิต, เครื่องจักร, ปริมาณคงคลัง, และปลายทางที่ส่งมอบ ได้เสร็จสิ้นภายใน <strong>4 ชั่วโมง</strong> ด้วยความถูกต้อง ≥ 99.0%</p>
      </div>
    </div>
  );
}
