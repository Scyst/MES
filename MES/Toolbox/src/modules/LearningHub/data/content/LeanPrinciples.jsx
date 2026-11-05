import React from 'react';
import { FiTarget, FiActivity, FiRefreshCw, FiZap, FiTrendingUp } from 'react-icons/fi';

export default function LeanPrinciples() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="bg-gradient-to-r from-violet-900/50 to-fuchsia-900/50 p-8 rounded-2xl border border-fuchsia-500/20 mb-8">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 mt-0 mb-4">
          ลีน (Lean) คืออะไร?
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          <strong>ลีน (Lean)</strong> คือ แนวคิดและแนวปฏิบัติที่เป็นระบบในการกำจัด <strong>ความสูญเปล่า หรือสิ่งที่ไม่เพิ่มคุณค่า (Wastes / Muda)</strong> ภายในกระแสคุณค่าของกระบวนการทำงานทั้งหมด โดยมุ่งเน้นการสร้าง <strong>คุณค่า (Value)</strong> ให้แก่ลูกค้า หรือผู้รับบริการด้วยทรัพยากรที่น้อยที่สุด (Less effort, less space, less capital, and less time)
        </p>
      </div>

      <div className="mb-10">
        <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">ความแตกต่างระหว่างโลกดั้งเดิมและโลกของ Lean</h3>
        <p className="mb-4 text-slate-300">
          ในอดีต (Mass Production) องค์กรมักจะใช้วิธีการกำหนดราคาขายจากการบวกกำไรที่ต้องการเข้าไปในต้นทุน (Price = Cost + Profit) ซึ่งหากต้นทุนสูงขึ้น องค์กรก็จะผลักภาระไปให้ลูกค้าด้วยการขึ้นราคา
        </p>
        <p className="mb-4 text-slate-300">
          แต่ในแนวคิดของ Lean <strong>ราคาขายถูกกำหนดโดยตลาดและลูกค้า</strong> (Price - Cost = Profit) ดังนั้นหากองค์กรต้องการกำไรเพิ่มขึ้น สิ่งเดียวที่ทำได้คือ <strong>"การลดต้นทุน (Cost Reduction)"</strong> ผ่านการกำจัดความสูญเปล่านั่นเอง
        </p>
      </div>

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">หลักการของลีน 5 ประการ (5 Lean Principles)</h3>
      
      <div className="space-y-6">
        {/* Principle 1 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-violet-500/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-2xl">
              <FiTarget />
            </div>
            <h4 className="text-xl font-bold text-violet-300 m-0">1. Specify Value (การระบุคุณค่า)</h4>
          </div>
          <p className="text-slate-300 ml-16">
            คุณค่าจะต้องถูกกำหนดโดย <strong>"มุมมองของลูกค้า (Customer Perspective)"</strong> เท่านั้น ไม่ใช่มุมมองของผู้ผลิต กิจกรรมใดที่ลูกค้าพร้อมจะจ่ายเงินให้ ถือว่ามีคุณค่า (Value-Added) ส่วนกิจกรรมอื่นๆ ที่จำเป็นต้องทำแต่ลูกค้าไม่ได้ประโยชน์คือ Non-Value Added (แต่จำเป็น) และกิจกรรมที่เปล่าประโยชน์คือ Waste
          </p>
          <div className="ml-16 mt-4 p-4 bg-slate-900/50 rounded-lg text-sm">
            <strong className="text-violet-400">เครื่องมือที่ใช้:</strong> SIPOC Model (Supplier, Input, Process, Output, Customer), Voice of Customer (VOC)
          </div>
        </div>

        {/* Principle 2 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-fuchsia-500/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400 text-2xl">
              <FiActivity />
            </div>
            <h4 className="text-xl font-bold text-fuchsia-300 m-0">2. Map the Value Stream (เขียนแผนผังสายธารคุณค่า)</h4>
          </div>
          <p className="text-slate-300 ml-16">
            เป็นการทำความเข้าใจตั้งแต่ต้นน้ำจนถึงปลายน้ำ (End-to-End) เพื่อระบุกระบวนการทั้งหมดที่เกิดขึ้นจริง การเขียนแผนผังจะช่วยให้เรามองเห็น <strong>"จุดคอขวด (Bottleneck)"</strong> และ "ความสูญเปล่าแฝง" ได้อย่างชัดเจน
          </p>
          <div className="ml-16 mt-4 p-4 bg-slate-900/50 rounded-lg text-sm">
            <strong className="text-fuchsia-400">เครื่องมือที่ใช้:</strong> Value Stream Mapping (VSM), Process Flowchart
          </div>
        </div>

        {/* Principle 3 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-2xl">
              <FiZap />
            </div>
            <h4 className="text-xl font-bold text-blue-300 m-0">3. Create Flow (การสร้างการไหลที่ต่อเนื่อง)</h4>
          </div>
          <p className="text-slate-300 ml-16">
            เมื่อกำจัดความสูญเปล่าออกไปแล้ว ต้องจัดเรียงขั้นตอนที่เหลือให้เชื่อมโยงกันอย่างราบรื่น ไม่มีการสะดุด ไม่มีการรอคอย หรือการทำงานแบบ Batch ขนาดใหญ่ (ซึ่งจะทำให้เกิดคิวและงานค้าง) ควรทำให้งานไหลแบบชิ้นต่อชิ้น (One-Piece Flow) หรือเป็น Lot ที่เล็กที่สุด
          </p>
        </div>

        {/* Principle 4 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-cyan-500/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-2xl">
              <FiRefreshCw />
            </div>
            <h4 className="text-xl font-bold text-cyan-300 m-0">4. Establish Pull (การใช้ระบบดึง)</h4>
          </div>
          <p className="text-slate-300 ml-16">
            แทนที่จะผลิตสินค้าออกมาตุนไว้ล่วงหน้า (Push System) ซึ่งเสี่ยงต่อการเกิดของล้นสต็อก ระบบลีนจะผลิตก็ต่อเมื่อ "ลูกค้ามีความต้องการเท่านั้น" เปรียบเสมือนชั้นวางของในซูเปอร์มาร์เก็ตที่จะเติมของก็ต่อเมื่อมีของถูกหยิบออกไป
          </p>
          <div className="ml-16 mt-4 p-4 bg-slate-900/50 rounded-lg text-sm">
            <strong className="text-cyan-400">เครื่องมือที่ใช้:</strong> Kanban, Just-In-Time (JIT)
          </div>
        </div>

        {/* Principle 5 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl">
              <FiTrendingUp />
            </div>
            <h4 className="text-xl font-bold text-emerald-300 m-0">5. Seek Perfection (การมุ่งสู่ความสมบูรณ์แบบ)</h4>
          </div>
          <p className="text-slate-300 ml-16">
            ลีนไม่ใช่จุดหมายปลายทาง แต่เป็นการเดินทางที่ไม่มีวันสิ้นสุด (Continuous Improvement) เมื่อทำครบทั้ง 4 ข้อแล้ว ให้กลับไปทำข้อ 1 ใหม่ เพราะสภาพแวดล้อม เทคโนโลยี และความต้องการของลูกค้ามีการเปลี่ยนแปลงตลอดเวลา
          </p>
          <div className="ml-16 mt-4 p-4 bg-slate-900/50 rounded-lg text-sm">
            <strong className="text-emerald-400">เครื่องมือที่ใช้:</strong> Kaizen, PDCA, CAP-DO
          </div>
        </div>
      </div>

      <div className="mt-12 bg-slate-900 p-8 rounded-2xl border-l-4 border-rose-500 shadow-lg">
        <h3 className="text-2xl font-bold text-white mt-0 mb-4">ศัตรูตัวฉกาจของ Lean: 3M</h3>
        <p className="mb-6 text-slate-300">แนวคิดแบบโตโยต้า (Toyota Production System - TPS) ได้ระบุความสูญเสียหลักไว้ 3 ประการ (3M):</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 p-5 rounded-lg border border-slate-700">
            <h4 className="text-rose-400 text-lg font-bold mt-0">Muda (Wastes)</h4>
            <p className="text-sm text-slate-300 mb-0"><strong>ความสูญเปล่า</strong> สิ่งที่กินทรัพยากรแต่ไม่สร้างมูลค่าให้ลูกค้า (เช่น งานแก้, การรอ, สต็อกบวม) ซึ่งมีทั้งหมด 8 ประการ ที่เราจะเรียนในบทถัดไป</p>
          </div>
          <div className="bg-slate-800 p-5 rounded-lg border border-slate-700">
            <h4 className="text-orange-400 text-lg font-bold mt-0">Mura (Unevenness)</h4>
            <p className="text-sm text-slate-300 mb-0"><strong>ความไม่สม่ำเสมอ</strong> หรือความแปรปรวนในกระบวนการ เช่น วันนี้งานล้นมือ พรุ่งนี้ไม่มีงานทำ ทำให้ต้องสต็อกของเผื่อไว้</p>
          </div>
          <div className="bg-slate-800 p-5 rounded-lg border border-slate-700">
            <h4 className="text-yellow-400 text-lg font-bold mt-0">Muri (Overburden)</h4>
            <p className="text-sm text-slate-300 mb-0"><strong>การทำงานที่เกินกำลัง</strong> หรือภาระหนักเกินไปทั้งกับคนและเครื่องจักร ทำให้เกิดความล้า เครื่องเสียไว และเกิดของเสียตามมา</p>
          </div>
        </div>
        
        <div className="mt-6 text-center text-slate-400 italic font-medium">
          "เป้าหมายสูงสุดคือการสร้างกระบวนการผลิตที่มีความสมดุล โดยปราศจาก Muda, Mura และ Muri"
        </div>
      </div>
    </div>
  );
}
