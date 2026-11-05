import React from 'react';
import { FiTarget, FiBarChart2, FiCheckSquare, FiSearch, FiEdit3, FiPlayCircle } from 'react-icons/fi';

export default function KpiCapdo() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="bg-gradient-to-r from-emerald-900/50 to-teal-900/50 p-8 rounded-2xl border border-emerald-500/20 mb-8">
        <h2 className="text-3xl font-black text-white mt-0 mb-4 flex items-center gap-3">
          <FiTarget className="text-emerald-400" />
          การถ่ายทอด KPI และวงจร CAP-DO
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          ปัญหาคลาสสิกของโรงงานคือ <strong>"ระดับบริหารมองแต่ตัวเลขกำไร แต่ระดับหน้างานมองแค่จำนวนชิ้นที่ผลิตได้"</strong> ทำให้เป้าหมายไม่สอดคล้องกัน การถ่ายทอดเป้าหมาย (Goal Alignment) จาก Macro สู่ Micro จึงเป็นหน้าที่สำคัญของหัวหน้างาน
        </p>
      </div>

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">การถ่ายทอด KPI (From Macro to Micro)</h3>
      
      <div className="overflow-x-auto mb-10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 border-b-2 border-emerald-500">
              <th className="p-4 text-white font-bold rounded-tl-lg">ระดับการบริหาร</th>
              <th className="p-4 text-white font-bold">ตัวชี้วัด (KPIs)</th>
              <th className="p-4 text-white font-bold rounded-tr-lg">บทบาทของการใช้ Digital & Kaizen</th>
            </tr>
          </thead>
          <tbody className="bg-slate-800/50">
            <tr className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
              <td className="p-4">
                <span className="inline-block px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-sm font-bold border border-rose-500/30 mb-2">Macro Level</span>
                <div className="text-slate-300 text-sm">ระดับผู้บริหาร (Executive)</div>
              </td>
              <td className="p-4">
                <ul className="text-sm text-slate-300 m-0 pl-4">
                  <li>Net Profit (กำไรสุทธิ)</li>
                  <li>COGS (ต้นทุนขาย)</li>
                  <li>ESG / Carbon Footprint</li>
                </ul>
              </td>
              <td className="p-4 text-sm text-slate-300">
                <strong>Financial Alignment:</strong> นำข้อมูลดิจิทัลมาแปลงจากประสิทธิภาพ (Efficiency) ให้กลายเป็นตัวเลขทางการเงิน (Financial) เพื่อการตัดสินใจลงทุน
              </td>
            </tr>
            <tr className="border-b border-slate-700 hover:bg-slate-700/30 transition-colors">
              <td className="p-4">
                <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-bold border border-amber-500/30 mb-2">Tactical Level</span>
                <div className="text-slate-300 text-sm">ระดับผู้จัดการ (Manager)</div>
              </td>
              <td className="p-4">
                <ul className="text-sm text-slate-300 m-0 pl-4">
                  <li>OEE (Overall Equipment Effectiveness)</li>
                  <li>OLE (Overall Labor Effectiveness)</li>
                  <li>Yield & Scrap Rate</li>
                </ul>
              </td>
              <td className="p-4 text-sm text-slate-300">
                <strong>Data Integration:</strong> รวบรวมข้อมูลเพื่อหาจุดที่เกิดความสูญเสีย (Bottleneck / 6 Big Losses) และจัดสรรทรัพยากรไปแก้ปัญหาให้ถูกจุด
              </td>
            </tr>
            <tr className="hover:bg-slate-700/30 transition-colors">
              <td className="p-4 rounded-bl-lg">
                <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-bold border border-emerald-500/30 mb-2">Micro Level</span>
                <div className="text-slate-300 text-sm">ระดับหัวหน้างาน (Supervisor)</div>
              </td>
              <td className="p-4">
                <ul className="text-sm text-slate-300 m-0 pl-4">
                  <li>4M Stability (ความนิ่งของ 4M)</li>
                  <li>Cycle Time, Changeover Time</li>
                  <li>Daily Output</li>
                </ul>
              </td>
              <td className="p-4 text-sm text-slate-300 rounded-br-lg">
                <strong>Digital Standard:</strong> ใช้ระบบดิจิทัล (IoT, Dashboard) ในการควบคุม "สภาวะมาตรฐาน" ไม่ให้เกิดความเบี่ยงเบนในการทำงานแต่ละวัน
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <hr className="border-slate-700 my-10" />

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">วงจรแก้ปัญหาด้วยข้อมูล (Data-Driven CAP-DO Model)</h3>
      <p className="mb-6">
        ในอดีตเราคุ้นเคยกับวงจร PDCA (Plan-Do-Check-Act) ซึ่งมักถูกใช้ในลักษณะ "ลองผิดลองถูก" แต่ในยุคดิจิทัลที่มีข้อมูล (Data) พร้อมอยู่แล้ว เราจึงควรเปลี่ยนมุมมองมาเริ่มที่ <strong>"การตรวจสอบข้อเท็จจริง (Check)"</strong> ก่อนเสมอ
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* C */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex gap-4 items-start">
          <div className="bg-emerald-500/20 p-3 rounded-lg text-emerald-400 text-2xl flex-shrink-0">
            <FiCheckSquare />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white mt-0 mb-2">C = Check (ตรวจสอบสภาวะปัจจุบัน)</h4>
            <p className="text-sm text-slate-300 m-0">
              ทำความเข้าใจ "สภาวะเดิม (Current State)" โดยดูจาก Dashboard หรือรายงานในระบบ MES เพื่อหาความผิดปกติ (Anomaly) ที่เบี่ยงเบนไปจากมาตรฐาน
            </p>
          </div>
        </div>
        
        {/* A */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex gap-4 items-start">
          <div className="bg-blue-500/20 p-3 rounded-lg text-blue-400 text-2xl flex-shrink-0">
            <FiSearch />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white mt-0 mb-2">A = Analyze / Act (วิเคราะห์สาเหตุ)</h4>
            <p className="text-sm text-slate-300 m-0">
              เมื่อพบปัญหา ห้ามเดาสาเหตุเด็ดขาด แต่ให้ใช้เทคนิค <strong>5-Whys</strong> เจาะลึกลงไปที่ข้อมูลของ 4M1E เพื่อหาสาเหตุรากเหง้า (Root Cause) ที่แท้จริง
            </p>
          </div>
        </div>

        {/* P */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex gap-4 items-start">
          <div className="bg-fuchsia-500/20 p-3 rounded-lg text-fuchsia-400 text-2xl flex-shrink-0">
            <FiEdit3 />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white mt-0 mb-2">P = Plan (วางแผนแก้ไข)</h4>
            <p className="text-sm text-slate-300 m-0">
              ออกแบบวิธีการแก้ไขปัญหา (Countermeasure) โดยอิงจากข้อเท็จจริง กำหนดผู้รับผิดชอบ และกรอบเวลาที่ชัดเจน
            </p>
          </div>
        </div>

        {/* D */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex gap-4 items-start">
          <div className="bg-rose-500/20 p-3 rounded-lg text-rose-400 text-2xl flex-shrink-0">
            <FiPlayCircle />
          </div>
          <div>
            <h4 className="text-xl font-bold text-white mt-0 mb-2">D = Do (ลงมือปฏิบัติ)</h4>
            <p className="text-sm text-slate-300 m-0">
              นำแผนไปปฏิบัติจริง และที่สำคัญคือ <strong>การสร้างมาตรฐานใหม่ (Standardization)</strong> แล้วนำเข้าระบบดิจิทัล (เช่น Digital SOP) เพื่อป้องกันไม่ให้ปัญหากลับมาเกิดซ้ำ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
