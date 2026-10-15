import React from 'react';
import { FiShield, FiCheckCircle, FiFileText, FiActivity, FiLayers, FiAlertTriangle, FiTarget, FiAward } from 'react-icons/fi';

export function Iso9001Lesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 p-8 rounded-2xl border border-blue-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Quality Management</span>
          <span className="text-slate-400 text-sm">ISO 9001:2015</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mt-0 mb-4">
          ISO 9001:2015 ระบบบริหารงานคุณภาพแม่บท (45 ระเบียบปฏิบัติ)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          มาตรฐานสากลด้านระบบบริหารงานคุณภาพ ครอบคลุมการบริหารบริบทองค์กร, การประเมินความเสี่ยงและโอกาส, การควบคุมสารสนเทศเอกสาร (`SP-DCC-001`), การควบคุมกระบวนการผลิต, การควบคุมงาน NC (`SP-QCS-003`), และการตรวจประเมินภายใน (`SP-DCC-002`)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">1. การควบคุมเอกสารและบันทึก (DCC Control)</h3>
          <p className="text-sm text-slate-300">ควบคุมเอกสารตามระเบียบ `SP-DCC-001` และ `SP-DCC-003` เอกสารฉบับจริงต้องมีตราประทับ 'CONTROLLED DOCUMENT' และเรียกเก็บฉบับเก่าคืน 100% พร้อมประทับตรา 'OBSOLETE' ก่อนทำลาย</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">2. การทบทวนฝ่ายบริหารและการตรวจภายใน</h3>
          <p className="text-sm text-slate-300">จัดทำแผนตรวจประเมินภายในประจำปี (`FM-DCC-003`), ตรวจประเมินโดยผู้ตรวจที่ได้รับใบรับรองคุณสมบัติ (`FM-DCC-008`), และประชุมทบทวนฝ่ายบริหารปีละอย่างน้อย 1 ครั้ง (`SP-MRS-001`)</p>
        </div>
      </div>
    </div>
  );
}

export function Iso14001Lesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 p-8 rounded-2xl border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Environmental Management</span>
          <span className="text-slate-400 text-sm">ISO 14001:2015</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-0 mb-4">
          ISO 14001:2015 ระบบการจัดการสิ่งแวดล้อม (19 ระเบียบปฏิบัติ)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การบริหารจัดการสิ่งแวดล้อมตามคู่มือ `EM-001`: การประเมินประเด็นสิ่งแวดล้อม (Aspect &amp; Impact), กฎหมายสิ่งแวดล้อม (`ESP-DCO-001`), การคัดแยกและกำจัดขยะอันตราย, และแผนระงับเหตุสารเคมีรั่วไหลฉุกเฉิน
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-2">การจัดการของเสียและสารเคมีตามกฎหมาย</h3>
        <ul className="text-sm text-slate-300 space-y-2">
          <li>• <strong>การประเมินประเด็นสิ่งแวดล้อม:</strong> ชี้บ่งและประเมินระดับความสำคัญของน้ำเสีย, อากาศเสีย, ขยะอันตราย, และการใช้ทรัพยากร ทั้งในภาวะปกติ ผิดปกติ และฉุกเฉิน</li>
          <li>• <strong>การจัดการของเสียอันตราย:</strong> กากตะกอนเคมี บรรจุภัณฑ์สารเคมี และน้ำมันหล่อลื่นใช้แล้ว ต้องส่งกำจัดกับผู้รับกำจัดที่ได้รับอนุญาต พร้อมมีใบกำกับอิเล็กทรอนิกส์ กอ.1 / สก.2</li>
          <li>• <strong>อ่างกักเก็บสารหก (Secondary Containment):</strong> ถังสารเคมีต้องวางบนถาดรองรับความจุไม่น้อยกว่า 110% พร้อมติดตั้งชุดดูดซับสารเคมีฉุกเฉิน (Spill Kit)</li>
        </ul>
      </div>
    </div>
  );
}

export function Iso45001Lesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-amber-900/50 to-orange-900/50 p-8 rounded-2xl border border-amber-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Health &amp; Safety</span>
          <span className="text-slate-400 text-sm">ISO 45001:2018</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300 mt-0 mb-4">
          ISO 45001:2018 อาชีวอนามัยและความปลอดภัย (25 ระเบียบปฏิบัติ)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          มาตรฐานความปลอดภัยในการทำงาน: การชี้บ่งอันตรายและการประเมินความเสี่ยง (HIRA / JSA), ระบบใบอนุญาตทำงานเสี่ยงสูง (Work Permit), ระบบตัดแยกพลังงานอันตราย LOTO, และการสอบสวนอุบัติเหตุ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">ระบบใบอนุญาตทำงานเสี่ยงสูง (Work Permit)</h3>
          <p className="text-sm text-slate-300">งานที่เกิดความร้อนและประกายไฟ (Hot Work), งานในที่อับอากาศ (Confined Space), งานบนที่สูงเกิน 2 เมตร, และงานตัดต่อระบบไฟฟ้าแรงสูง ต้องขอใบอนุญาตก่อนเริ่มงาน 100%</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">การตัดแยกพลังงานอันตราย (LOTO System)</h3>
          <p className="text-sm text-slate-300">ก่อนเข้าซ่อมบำรุงเครื่องจักร ต้องตัดแหล่งจ่ายพลังงานไฟฟ้า ลม ไฮดรอลิก และคล้องกุญแจล็อกพร้อมติดป้ายเตือนอันตราย (Lockout / Tagout) เสมอ</p>
        </div>
      </div>
    </div>
  );
}

export function Iso17025Lesson() {
  return (
    <div className="prose prose-invert max-w-none space-y-8">
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-8 rounded-2xl border border-purple-500/20">
        <div className="flex items-center gap-3 mb-2">
          <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Laboratory Competence</span>
          <span className="text-slate-400 text-sm">ISO/IEC 17025:2017</span>
        </div>
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 mt-0 mb-4">
          ISO/IEC 17025:2017 ความสามารถของห้องปฏิบัติการทดสอบและสอบเทียบ (24 ฉบับ)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          มาตรฐานห้องแล็บสากล: ความเป็นกลางและการรักษาความลับ (`SP-LAB-001/002`), การควบคุมสภาพแวดล้อม, การทวนสอบวิธีทดสอบ (Method Validation), การประมาณค่าความไม่แน่นอน ($U_{exp}$), และการทดสอบความชำนาญ (Proficiency Testing)
        </p>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-2">การประมาณค่าความไม่แน่นอนในการวัด (Measurement Uncertainty: GUM)</h3>
        <p className="text-sm text-slate-300 mb-4">การรายงานผลการทดสอบและสอบเทียบต้องระบุค่าความไม่แน่นอนขยาย (Expanded Uncertainty: $U = k \times u_c$) ที่ระดับความเชื่อมั่น 95% ($k = 2$) พร้อมการสืบย้อนกลับทางมาตรวิทยา (Metrological Traceability) สู่หน่วย SI สากล</p>
      </div>
    </div>
  );
}
