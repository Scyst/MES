import React from 'react';
import { FiEye, FiMapPin, FiBox, FiClipboard, FiAlertOctagon, FiCheckSquare } from 'react-icons/fi';

export default function DigitalGemba() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 p-8 rounded-2xl border border-yellow-500/20 mb-8 flex items-start gap-6">
        <div className="bg-yellow-500/20 p-4 rounded-full text-yellow-400 text-4xl hidden md:block">
          <FiEye />
        </div>
        <div>
          <h2 className="text-3xl font-black text-white mt-0 mb-4">
            Digital Gemba (การเดินหน้างานยุคดิจิทัล)
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed m-0">
            <strong>Gemba (เก็มบะ)</strong> แปลว่า "สถานที่จริง" ในภาษาญี่ปุ่น ผู้บริหารและหัวหน้างานยุคเก่ามักจะนั่งอยู่ในห้องแอร์ (Physical Isolation) และรออ่านรายงาน (Paper Report) ที่อาจถูกบิดเบือนไปแล้ว การทำ Gemba Walk คือการเดินลงไปดูปัญหาที่สถานที่จริง แต่ในยุคนี้เราจะยกระดับเป็น <strong>Digital Gemba</strong>
          </p>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">หลักการ 5 ประการสำหรับ Gemba (5 Gen Principles)</h3>
      <p className="mb-6">เมื่อเกิดปัญหาขึ้นบน Shop Floor อย่าเพิ่งเดาสาเหตุ แต่ให้ยึดหลัก 5 Gen:</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <div className="bg-slate-800 p-5 rounded-xl border-t-4 border-yellow-500">
          <h4 className="text-yellow-400 flex items-center gap-2 mt-0 mb-2"><FiMapPin /> 1. Genba</h4>
          <div className="text-slate-300 text-sm">
            <strong>สถานที่จริง:</strong> เดินไปยังจุดที่เกิดปัญหาทันที ไม่ใช่คุยกันผ่านโทรศัพท์ หรือไลน์
          </div>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border-t-4 border-amber-500">
          <h4 className="text-amber-400 flex items-center gap-2 mt-0 mb-2"><FiBox /> 2. Genbutsu</h4>
          <div className="text-slate-300 text-sm">
            <strong>สิ่งของจริง:</strong> หยิบชิ้นงานที่เสีย (Defect Part) ขึ้นมาดูด้วยตาตนเอง หรือจับดู
          </div>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border-t-4 border-orange-500">
          <h4 className="text-orange-400 flex items-center gap-2 mt-0 mb-2"><FiAlertOctagon /> 3. Genjitsu</h4>
          <div className="text-slate-300 text-sm">
            <strong>สถานการณ์จริง:</strong> สังเกตสิ่งที่กำลังเกิดขึ้น ดู Data จาก Dashboard แบบ Real-time ณ ตอนนั้น
          </div>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border-t-4 border-rose-500">
          <h4 className="text-rose-400 flex items-center gap-2 mt-0 mb-2"><FiClipboard /> 4. Gensoku</h4>
          <div className="text-slate-300 text-sm">
            <strong>มาตรฐาน (Standard):</strong> เทียบสิ่งที่เกิดขึ้นกับมาตรฐาน (SOP) ว่ามีการทำนอกเหนือหรือข้ามขั้นตอนหรือไม่
          </div>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border-t-4 border-red-500 lg:col-span-2">
          <h4 className="text-red-400 flex items-center gap-2 mt-0 mb-2"><FiCheckSquare /> 5. Genri</h4>
          <div className="text-slate-300 text-sm">
            <strong>ทฤษฎี/หลักการ (Logic/Theory):</strong> ใช้ตรรกะทางวิศวกรรม วิเคราะห์ทางฟิสิกส์ เคมี หรือกลไก ว่าปัญหาเกิดจากจุดไหนอย่างมีเหตุผล (Root Cause Analysis)
          </div>
        </div>
      </div>

      <hr className="border-slate-700 my-10" />

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">Leader Standard Work (LSW)</h3>
      <p className="mb-4">
        หัวหน้างานที่ประสบความสำเร็จต้องมีการกำหนด <strong>ตารางการทำงานมาตรฐาน (LSW)</strong> เพื่อให้มั่นใจว่าครอบคลุมการตรวจสอบ 4M (Man, Machine, Material, Method) อย่างครบถ้วน ตัวอย่างกิจวัตรประจำวันของ Supervisor มีดังนี้:
      </p>

      <div className="relative border-l-2 border-slate-700 pl-6 ml-4 space-y-8 mb-8 mt-8">
        {/* Step 1 */}
        <div className="relative">
          <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-blue-500"></div>
          <h4 className="text-blue-400 mt-0 mb-1">07:30 - Pre-Shift (เตรียมความพร้อม)</h4>
          <p className="text-sm text-slate-300 m-0">ตรวจสอบหน้าจอ Digital Dashboard ดูกำลังคน สภาพเครื่องจักร และแผนการผลิตของวันนี้</p>
        </div>
        
        {/* Step 2 */}
        <div className="relative">
          <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-cyan-500"></div>
          <h4 className="text-cyan-400 mt-0 mb-1">08:00 - Asakai Meeting (ประชุมอาซาไก)</h4>
          <p className="text-sm text-slate-300 m-0">การประชุมยืนแบบสั้นๆ (5-10 นาที) หน้าบอร์ดหรือจอทีวี เพื่อสื่อสารเป้าหมาย (KPI) ของวัน แจ้งปัญหาค้างเก่า (Carry over issues) และเน้นย้ำความปลอดภัย (Safety Talk)</p>
        </div>

        {/* Step 3 */}
        <div className="relative">
          <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-emerald-500"></div>
          <h4 className="text-emerald-400 mt-0 mb-1">09:00 & 14:00 - Digital Gemba Walk</h4>
          <p className="text-sm text-slate-300 m-0">เดินตรวจสอบหน้างานจริง (ควรใช้เวลา 40-50% ของวันบนหน้างาน) พร้อม Tablet เพื่อบันทึกความผิดปกติ ตรวจเช็คว่าพนักงานทำตาม SOP หรือไม่</p>
        </div>

        {/* Step 4 */}
        <div className="relative">
          <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-slate-900 border-2 border-violet-500"></div>
          <h4 className="text-violet-400 mt-0 mb-1">16:30 - Shift Handover (ส่งมอบกะ)</h4>
          <p className="text-sm text-slate-300 m-0">บันทึกข้อมูลแบบดิจิทัล (Digital Logbook) ส่งต่อปัญหางานที่ยังไม่เสร็จ (Pending Issues) ให้หัวหน้ากะถัดไปอย่างครบถ้วน ไม่ตกหล่น</p>
        </div>
      </div>
    </div>
  );
}
