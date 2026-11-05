import React from 'react';
import { FiAlertTriangle, FiCheckCircle, FiShield, FiTool, FiBox, FiClock, FiActivity, FiLayers } from 'react-icons/fi';

export function PpapPfmeaLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-8 rounded-2xl border border-blue-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Core Engineering Tool</span>
          <span className="text-slate-400 text-sm">PPAP Step 1</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mt-0 mb-4">
          การวิเคราะห์ความล้มเหลวและผลกระทบในกระบวนการผลิต (Process FMEA)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          <strong>Process FMEA (PFMEA)</strong> คือระเบียบวิธีเชิงวิศวกรรมในการวิเคราะห์และประเมินความเสี่ยงที่อาจเกิดขึ้นในแต่ละขั้นตอนการผลิต เพื่อหามาตรการป้องกันก่อนที่ของเสียจะหลุดรอดไปถึงลูกค้า ครอบคลุม 12 ขั้นตอนการผลิตคอนเดนเซอร์
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="text-rose-400 font-bold text-lg mb-2">Severity (S) — ความรุนแรง</div>
          <p className="text-sm text-slate-300">วัดผลกระทบต่อลูกค้าและผู้ใช้งาน ระดับ 1 (ไม่มีผล) ถึง 10 (อันตรายต่อชีวิตโดยไม่มีสัญญาณเตือนล่วงหน้า)</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="text-amber-400 font-bold text-lg mb-2">Occurrence (O) — โอกาสเกิด</div>
          <p className="text-sm text-slate-300">ความถี่หรือโอกาสที่สาเหตุของความล้มเหลวจะเกิดขึ้นในไลน์ผลิต ระดับ 1 (&lt; 0.01 PPM) ถึง 10 (&gt; 10%)</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="text-emerald-400 font-bold text-lg mb-2">Detection (D) — การตรวจจับ</div>
          <p className="text-sm text-slate-300">ความสามารถของระบบควบคุมในการตรวจพบข้อบกพร่องก่อนส่งมอบ ระดับ 1 (Poka-Yoke 100%) ถึง 10 (ไม่สามารถตรวจพบได้)</p>
        </div>
      </div>

      <div className="bg-slate-800/80 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FiAlertTriangle className="text-amber-400" /> สูตรคำนวณค่าดัชนีความเสี่ยง (Risk Priority Number - RPN)
        </h3>
        <div className="p-4 bg-slate-900 rounded-lg text-center text-2xl font-mono text-cyan-400 font-bold border border-cyan-500/30 mb-4">
          RPN = Severity (S) × Occurrence (O) × Detection (D)
        </div>
        <p className="text-sm text-slate-300 m-0">
          <strong>เกณฑ์ปฏิบัติการของโรงงาน:</strong> หากค่า RPN &gt; 100 หรือค่า Severity (S) ≥ 9 ต้องกำหนดมาตรการลดความเสี่ยง (Corrective Action) ทันที โดยมีเป้าหมายลดค่า RPN ลงไม่น้อยกว่า 50%
        </p>
      </div>

      <div>
        <h3 className="text-2xl font-bold text-white mb-4">จุดควบคุมวิกฤต 12 กระบวนการผลิตคอนเดนเซอร์</h3>
        <div className="space-y-4">
          <div className="bg-slate-800 p-5 rounded-xl border-l-4 border-rose-500">
            <h4 className="font-bold text-white text-lg m-0 mb-1">กระบวนการบัดกรีเตาบรรยากาศไนโตรเจน (AD Brazing in CAB Furnace)</h4>
            <p className="text-sm text-slate-300 mb-2"><strong>ลักษณะความล้มเหลว:</strong> รอยต่อท่อบัดกรีไม่ติด (Un-brazed) หรือเกิดรูพรุนตามด (Pinholes)</p>
            <div className="text-xs bg-slate-900 p-3 rounded-lg text-slate-300">
              <strong className="text-blue-400">การควบคุม:</strong> ควบคุมอุณหภูมิเตา Peak &lt; 700°C, ความเข้มข้นก๊าซไนโตรเจนควบคุมออกซิเจน &lt; 100 ppm, และอัตราส่วนฟลักซ์พ่น 15% / แปรง 38%
            </div>
          </div>

          <div className="bg-slate-800 p-5 rounded-xl border-l-4 border-rose-500">
            <h4 className="font-bold text-white text-lg m-0 mb-1">การทดสอบการรั่วไหลด้วยก๊าซฮีเลียม (Helium Leak Test)</h4>
            <p className="text-sm text-slate-300 mb-2"><strong>ลักษณะความล้มเหลว:</strong> ตรวจไม่พบรอยรั่วซึมขนาดเล็ก (Micro-leak) ทำให้สารทำความเย็นรั่วไหลในตลาด</p>
            <div className="text-xs bg-slate-900 p-3 rounded-lg text-slate-300">
              <strong className="text-blue-400">การควบคุม:</strong> อัดสุญญากาศห้อง Chamber ตรวจวัดด้วย Mass Spectrometer พร้อมทดสอบยืนยันด้วย Golden Master Leak ประจำวัน (OK/NG Master) ก่อนเริ่มเดินกะ
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PpapQPointsLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 p-8 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Shopfloor Visual Control</span>
          <span className="text-slate-400 text-sm">PPAP Step 2</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-0 mb-4">
          จุดควบคุมคุณภาพวิกฤตหน้างาน (Q-Points 030 - 035)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          <strong>Q-Point (Quality Point)</strong> คือจุดควบคุมคุณภาพที่กำหนดไว้ประจำสถานีงาน เพื่อให้พนักงานสังเกตเห็นและสกัดกั้นของเสียด้วยสายตาทันที ยึดถือหลักการ <strong>"3 ไม่ (3-No Principles)"</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border-t-4 border-rose-500">
          <div className="text-xl font-bold text-white mb-2">1. ไม่รับ (Do not accept)</div>
          <p className="text-sm text-slate-300">ไม่รับชิ้นงานที่มีข้อบกพร่อง รอยบุบ หรือรอยแตกร้าวจากสถานีงานก่อนหน้าเข้ามาทำต่อ</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border-t-4 border-amber-500">
          <div className="text-xl font-bold text-white mb-2">2. ไม่ทำ (Do not produce)</div>
          <p className="text-sm text-slate-300">ไม่ผลิตงานที่ฝ่าฝืนสเปก หรือผลิตโดยใช้เครื่องมือวัด/จิ๊กฟิกซ์เจอร์ที่ชำรุดเสียหาย</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border-t-4 border-emerald-500">
          <div className="text-xl font-bold text-white mb-2">3. ไม่ส่ง (Do not pass)</div>
          <p className="text-sm text-slate-300">ไม่ส่งต่องานที่ไม่แน่ใจ หรือชิ้นงานที่ยังไม่ผ่านการลงผลอนุมัติจาก QC ไปยังสถานีถัดไป</p>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">ขั้นตอนการปฏิบัติเมื่อพบสิ่งผิดปกติ (Stop - Call - Wait)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900 rounded-lg text-center">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 font-black flex items-center justify-center mx-auto mb-2 text-lg">1</div>
            <strong className="text-rose-400 block mb-1">STOP (หยุด)</strong>
            <span className="text-xs text-slate-400">หยุดสายการผลิตทันที ไม่ฝืนเดินเครื่องต่อ</span>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 font-black flex items-center justify-center mx-auto mb-2 text-lg">2</div>
            <strong className="text-amber-400 block mb-1">CALL (เรียก)</strong>
            <span className="text-xs text-slate-400">กดสัญญาณ Andon เรียกหัวหน้างานและ QC ตรวจสอบ</span>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg text-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 font-black flex items-center justify-center mx-auto mb-2 text-lg">3</div>
            <strong className="text-blue-400 block mb-1">WAIT (รอ)</strong>
            <span className="text-xs text-slate-400">ติดป้ายแดงกักกัน และรอคำสั่งตัดสินใจก่อนเริ่มผลิต</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PpapTraceabilityLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-violet-900/50 to-purple-900/50 p-8 rounded-2xl border border-violet-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-violet-500/20 text-violet-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Product Liability</span>
          <span className="text-slate-400 text-sm">PPAP Step 3</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-300 mt-0 mb-4">
          การควบคุมล็อตสินค้าและการสืบย้อนกลับ 20 ปี (Traceability)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          โครงสร้างรหัสล็อตและการจัดเก็บบันทึกคุณภาพตามมาตรฐาน <strong>`HVAC-QA-FM-047 Rev.00`</strong> เพื่อรองรับกฎหมายความรับผิดชอบต่อผลิตภัณฑ์ (Product Liability) ย้อนหลัง 20 ปี
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">โครงสร้างรหัสล็อตคอนเดนเซอร์ (Lot Number Syntax)</h3>
        <div className="p-4 bg-slate-900 rounded-lg text-center text-2xl font-mono text-purple-400 font-bold border border-purple-500/30 mb-4">
          CD10-01 ──► A001
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <strong className="text-purple-300 block mb-1">CD</strong>
            <span className="text-slate-400">ประเภทสินค้า (Condenser)</span>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <strong className="text-purple-300 block mb-1">10-01</strong>
            <span className="text-slate-400">วันที่ผลิต (วันที่ 1 ตุลาคม)</span>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <strong className="text-purple-300 block mb-1">A</strong>
            <span className="text-slate-400">กะการทำงาน (กะ A / กลางวัน)</span>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg">
            <strong className="text-purple-300 block mb-1">001</strong>
            <span className="text-slate-400">ลำดับชิ้นงานประจำกะ</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-2">กฎเกณฑ์การจัดเก็บบันทึกคุณภาพ (Retention Period)</h3>
        <ul className="text-sm text-slate-300 space-y-2">
          <li>• <strong>เอกสารกระดาษ (Hard Copy):</strong> จัดเก็บในห้องเก็บเอกสารไม่น้อยกว่า <strong>5 ปี</strong> ป้องกันความชื้นและปลวก</li>
          <li>• <strong>บันทึกดิจิทัลในระบบ MES (Electronic Records):</strong> จัดเก็บสำรองข้อมูลในเซิร์ฟเวอร์และคลาวด์ไม่น้อยกว่า <strong>20 ปี</strong> พร้อมสืบค้นได้ภายใน 5 นาที</li>
        </ul>
      </div>
    </div>
  );
}

export function PpapInspectionLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 p-8 rounded-2xl border border-amber-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Quality Assurance</span>
          <span className="text-slate-400 text-sm">PPAP Step 4</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300 mt-0 mb-4">
          มาตรฐานการตรวจสอบคุณภาพ IQS (Incoming, In-process, Final)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          มาตรฐานแผ่นตรวจเช็ค IQS (`CH-QCS-052, 056, 057, 062`) ครอบคลุมการตรวจด้วยสายตา 100% (Visual 9 จุด), มิติวิกฤต 3 จุด และนโยบายของเสียเป็นศูนย์ ($Ac=0, Re=1$)
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">9 จุดตรวจสอบรูปลักษณ์ด้วยสายตา 100% (Visual Inspection)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-slate-300">
          <div className="p-3 bg-slate-900 rounded-lg">1. ครีบฟินล้ม (Bent Fins)</div>
          <div className="p-3 bg-slate-900 rounded-lg">2. รอยขูดขีดบนท่อ (Scratches)</div>
          <div className="p-3 bg-slate-900 rounded-lg">3. คราบน้ำมันหลงเหลือ (Oil Stains)</div>
          <div className="p-3 bg-slate-900 rounded-lg">4. รอยไหม้จากเตา (Burn Marks)</div>
          <div className="p-3 bg-slate-900 rounded-lg">5. รอยต่อบัดกรีไม่เต็ม (Void)</div>
          <div className="p-3 bg-slate-900 rounded-lg">6. ครีบฟอยล์ฉีกขาด (Torn Fins)</div>
          <div className="p-3 bg-slate-900 rounded-lg">7. สิ่งแปลกปลอมในท่อ (Foreign Dust)</div>
          <div className="p-3 bg-slate-900 rounded-lg">8. ฉลากบาร์โค้ดไม่ชัด (Label Blur)</div>
          <div className="p-3 bg-slate-900 rounded-lg">9. การบิดเบี้ยวของโครง (Twisted Frame)</div>
        </div>
      </div>
    </div>
  );
}

export function PpapMaintenanceLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 p-8 rounded-2xl border border-cyan-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-cyan-500/20 text-cyan-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Plant Maintenance</span>
          <span className="text-slate-400 text-sm">PPAP Step 5</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-300 mt-0 mb-4">
          การบำรุงรักษาเครื่องจักร PM และการควบคุมอายุแม่พิมพ์ (Tooling)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การบำรุงรักษาด้วยตนเองประจำวัน (Autonomous Maintenance 10 นาที), แผนบำรุงรักษาประจำเดือน/ปี, และการควบคุมอายุแม่พิมพ์ปั๊มด้วยตัวนับสโตรก (Stroke Counter)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">การบำรุงรักษาด้วยตนเอง (AM 10 นาที)</h3>
          <p className="text-sm text-slate-300">พนักงานผู้ควบคุมเครื่องจักรต้องตรวจเช็คก่อนเริ่มงานทุกวัน: ระดับน้ำมันหล่อลื่น, แรงดันลม (Air Pressure), อุณหภูมิไฮดรอลิก, และปุ่มหยุดฉุกเฉิน (E-Stop)</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">การควบคุมอายุแม่พิมพ์ (Stroke Life)</h3>
          <p className="text-sm text-slate-300">ติดตั้งตัวนับสโตรกบนแม่พิมพ์ปั๊มฟินและเครื่องตัดท่อ กำหนดรอบเจียรแต่งคมมีดทุก 50,000 สโตรก เพื่อป้องกันการเกิดเสี้ยน (Burrs) บนชิ้นงาน</p>
        </div>
      </div>
    </div>
  );
}

export function PpapPackagingLesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-8 rounded-2xl border border-indigo-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-indigo-500/20 text-indigo-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Logistics & Shipping</span>
          <span className="text-slate-400 text-sm">PPAP Step 6</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300 mt-0 mb-4">
          มาตรฐานการบรรจุหีบห่อพาเลทและการจัดส่ง (Standard Packaging)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          มาตรฐานการแพ็คกิ้งตามสเปก `STD. Packing - Condenser.pdf`: จำนวน 30 ชิ้น/พาเลท น้ำหนักรวม 93 กิโลกรัม การติดตั้งฉากกันกระแทก และการพันฟิล์มยืด
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4">กฎเหล็กการแพ็คกิ้งและการจัดส่ง</h3>
        <ul className="text-sm text-slate-300 space-y-2">
          <li>• <strong>การจัดวางชิ้นงาน:</strong> เรียงชิ้นงานคอนเดนเซอร์ 30 ชิ้นต่อพาเลท โดยมีแผ่นกระดาษลูกฟูกรองคั่นระหว่างชั้น</li>
          <li>• <strong>การป้องกันมุม:</strong> ติดตั้งฉากกระดาษแข็งกันกระแทก (Corner Edge Guards) ทั้ง 4 มุม เพื่อรับแรงรัดจากสายรัดพลาสติก</li>
          <li>• <strong>การพันฟิล์มยืด (Stretch Film):</strong> พันฟิล์มยืดรอบพาเลทอย่างน้อย 3 รอบจากฐานพาเลทขึ้นไปถึงชั้นบนสุด เพื่อป้องกันฝุ่นและความชื้น</li>
          <li>• <strong>ป้ายกำกับการขนส่ง (Shipping Tag):</strong> ติดป้ายระบุ Part No., PO Number, Lot No., จำนวน, และบาร์โค้ดที่สามารถสแกนได้ 100%</li>
        </ul>
      </div>
    </div>
  );
}
