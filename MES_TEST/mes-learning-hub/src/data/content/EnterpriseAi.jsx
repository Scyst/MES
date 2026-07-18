import React from 'react';
import { FiCpu, FiMessageSquare, FiTrendingUp, FiShield, FiAlertTriangle } from 'react-icons/fi';

export default function EnterpriseAi() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="bg-gradient-to-r from-indigo-900/50 to-violet-900/50 p-8 rounded-2xl border border-indigo-500/20 mb-8">
        <h2 className="text-3xl font-black text-white mt-0 mb-4 flex items-center gap-3">
          <FiCpu className="text-indigo-400" />
          Enterprise In-House AI
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การนำ AI มาใช้ในโรงงาน ไม่ใช่เพียงแค่ให้พนักงานเปิด ChatGPT แล้วถามคำถาม แต่คือการสร้าง <strong>In-House AI</strong> ที่เรียนรู้ข้อมูลของโรงงานคุณเอง (เช่น ข้อมูล PLC, ERP, เซนเซอร์) และเก็บเป็นความลับ (Data Privacy) เพื่อให้ AI เป็นผู้ช่วยในการแก้ปัญหาหน้างานอย่างแท้จริง
        </p>
      </div>

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">ความล้มเหลวของการสื่อสาร (Management Loss)</h3>
      <p className="mb-6">
        ในวัฒนธรรมองค์กรแบบญี่ปุ่น มีแนวคิด <strong>Ho-Ren-So (โฮ-เรน-โซ)</strong> ซึ่งประกอบด้วย:
      </p>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-1">
          <h4 className="text-fuchsia-400 mt-0 mb-2">Hokoku (รายงาน)</h4>
          <p className="text-sm text-slate-300 m-0">การรายงานผลการปฏิบัติงานหรือปัญหาให้หัวหน้าทราบทันที</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-1">
          <h4 className="text-fuchsia-400 mt-0 mb-2">Renraku (ประสานงาน)</h4>
          <p className="text-sm text-slate-300 m-0">การแจ้งให้ผู้เกี่ยวข้องทราบถึงสถานการณ์หรือการเปลี่ยนแปลง</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex-1">
          <h4 className="text-fuchsia-400 mt-0 mb-2">Sodan (ปรึกษา)</h4>
          <p className="text-sm text-slate-300 m-0">การปรึกษาหารือเพื่อหาทางออกเมื่อเจอข้อสงสัยหรืออุปสรรค</p>
        </div>
      </div>

      <div className="bg-rose-500/10 p-6 rounded-xl border-l-4 border-rose-500 mb-10">
        <h4 className="text-rose-400 font-bold flex items-center gap-2 mt-0 mb-3"><FiAlertTriangle /> ปัญหาที่มักเกิดขึ้น (The Reality)</h4>
        <p className="text-sm text-slate-300 m-0">
          พนักงานหน้างานมักจะไม่กล้ารายงานปัญหาเพราะกลัวโดนตำหนิ (No Hokoku), การประสานงานเกิดความล่าช้า ข้อมูลตกหล่น (Poor Renraku), และเมื่อปรึกษาหัวหน้า หัวหน้าก็ไม่อยู่ หรือไม่มีเวลาให้ (No Sodan) นำไปสู่การเกิด <strong>"Management Loss"</strong> (ความสูญเสียเชิงการจัดการ)
        </p>
      </div>

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">3 ระดับของการประยุกต์ใช้ AI เพื่ออุดช่องโหว่การสื่อสาร</h3>
      
      <div className="space-y-6 mb-10">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-indigo-500 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-indigo-500/20 p-3 rounded-lg text-indigo-400 text-2xl flex-shrink-0">
              <span className="font-black">Level 1</span>
            </div>
            <h4 className="text-xl font-bold text-white m-0">AI as a Tool (เครื่องมือช่วยลดงาน)</h4>
          </div>
          <p className="text-sm text-slate-300 mb-0 ml-16">
            ใช้ AI ในการร่างเอกสาร, แปลคู่มือเครื่องจักรจากภาษาต่างประเทศ, สรุปรายงานการผลิตประจำวัน เพื่อลดภาระงานเอกสาร (Paperwork) ของหัวหน้างาน ทำให้หัวหน้ามีเวลาไปเดิน Gemba Walk มากขึ้น
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-violet-500 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-violet-500/20 p-3 rounded-lg text-violet-400 text-2xl flex-shrink-0">
              <span className="font-black">Level 2</span>
            </div>
            <h4 className="text-xl font-bold text-white m-0">AI as a Co-worker (เพื่อนร่วมงานดิจิทัล)</h4>
          </div>
          <p className="text-sm text-slate-300 mb-0 ml-16">
            AI เฝ้าดู Dashboard แทนเรา (24/7) หากพบแนวโน้มที่เครื่องจักรจะเสีย หรือ Yield กำลังตก (Anomaly Detection) AI จะส่งแจ้งเตือน (Hokoku/Renraku) ไปยังช่างซ่อมบำรุงผ่านแอปพลิเคชันทันที โดยไม่ถูกความรู้สึกส่วนตัวมาบิดเบือนข้อเท็จจริง
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-fuchsia-500 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-fuchsia-500/20 p-3 rounded-lg text-fuchsia-400 text-2xl flex-shrink-0">
              <span className="font-black">Level 3</span>
            </div>
            <h4 className="text-xl font-bold text-white m-0">AI as an Expert (ผู้เชี่ยวชาญ/ที่ปรึกษา)</h4>
          </div>
          <p className="text-sm text-slate-300 mb-0 ml-16">
            พนักงานหน้างานสามารถสอบถาม AI (Sodan) ผ่าน Tablet ว่า "เครื่องจักรมีเสียงดังผิดปกติที่แกน X ต้องตรวจเช็คจุดไหน?" AI ซึ่งเรียนรู้คู่มือซ่อมบำรุงและประวัติการซ่อมทั้งหมดของโรงงาน จะสามารถแนะนำวิธีแก้ไขเบื้องต้นได้อย่างแม่นยำ ทลายข้อจำกัดเรื่อง "หัวหน้าไม่อยู่" ได้อย่างสิ้นเชิง
          </p>
        </div>
      </div>
    </div>
  );
}
