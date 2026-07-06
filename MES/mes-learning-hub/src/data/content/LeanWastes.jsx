import React from 'react';
import { FiXCircle, FiLayers, FiClock, FiUsers, FiTruck, FiBox, FiMove, FiTool } from 'react-icons/fi';

export default function LeanWastes() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="bg-gradient-to-r from-red-900/50 to-orange-900/50 p-8 rounded-2xl border border-red-500/20 mb-8">
        <h2 className="text-3xl font-black text-white mt-0 mb-4">
          ความสูญเปล่า 8 ประการ (8 Wastes - DOWNTIME)
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          คำว่า <strong>Muda (ความสูญเปล่า)</strong> ในภาษาญี่ปุ่น หมายถึง กิจกรรมใดๆ ที่ใช้ทรัพยากร (เวลา เงิน แรงงาน) แต่ไม่ได้สร้างมูลค่าเพิ่ม (Value-Added) ในสายตาของลูกค้า เพื่อให้จดจำได้ง่าย เรามักใช้ตัวย่อ <strong>DOWNTIME</strong> ซึ่งครอบคลุมความสูญเปล่าทั้ง 8 ประเภทหลักในโรงงานอุตสาหกรรม
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Defect */}
        <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-red-500 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-slate-700/30 text-8xl group-hover:scale-110 transition-transform">
            <FiXCircle />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black text-red-500">D</span>
              <h3 className="text-xl font-bold text-white m-0">Defects (งานเสีย / ข้อบกพร่อง)</h3>
            </div>
            <p className="text-slate-300 text-sm mb-3">
              ผลิตภัณฑ์ที่ไม่ตรงตามข้อกำหนดของลูกค้า ทำให้ต้องนำไปแก้ไข (Rework) หรือทิ้ง (Scrap) ซึ่งเป็นการสูญเสียทั้งวัตถุดิบและเวลาแรงงาน
            </p>
            <div className="bg-slate-900/50 p-3 rounded-lg text-sm border border-slate-700">
              <strong className="text-red-400">ตัวอย่าง:</strong> การประกอบชิ้นส่วนผิดพลาด, รอยขีดข่วนบนชิ้นงาน, พิมพ์ฉลากผิด
            </div>
          </div>
        </div>

        {/* Overproduction */}
        <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-orange-500 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-slate-700/30 text-8xl group-hover:scale-110 transition-transform">
            <FiLayers />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black text-orange-500">O</span>
              <h3 className="text-xl font-bold text-white m-0">Overproduction (การผลิตมากเกินไป)</h3>
            </div>
            <p className="text-slate-300 text-sm mb-3">
              การผลิตสินค้าจำนวนมากเกินกว่าที่ลูกค้าสั่งซื้อ หรือผลิตเร็วกว่ากำหนด ถือเป็น <strong>"ต้นตอของความสูญเปล่าอื่นๆ ทั้งหมด"</strong>
            </p>
            <div className="bg-slate-900/50 p-3 rounded-lg text-sm border border-slate-700">
              <strong className="text-orange-400">ตัวอย่าง:</strong> เดินเครื่องจักรทิ้งไว้เพราะกลัวเครื่องว่าง, ผลิตเผื่อของเสียล่วงหน้าเป็นจำนวนมาก
            </div>
          </div>
        </div>

        {/* Waiting */}
        <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-amber-500 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-slate-700/30 text-8xl group-hover:scale-110 transition-transform">
            <FiClock />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black text-amber-500">W</span>
              <h3 className="text-xl font-bold text-white m-0">Waiting (การรอคอย)</h3>
            </div>
            <p className="text-slate-300 text-sm mb-3">
              พนักงานหรือเครื่องจักรที่ต้องหยุดนิ่งโดยไม่ได้สร้างชิ้นงาน เกิดจากการวางแผนที่ไม่ดี หรือกระบวนการที่ไม่สมดุล (Line Unbalance)
            </p>
            <div className="bg-slate-900/50 p-3 rounded-lg text-sm border border-slate-700">
              <strong className="text-amber-400">ตัวอย่าง:</strong> รอวัตถุดิบจากแผนกก่อนหน้า, รอหัวหน้าเซ็นอนุมัติ, เครื่องจักรเสีย (Breakdown)
            </div>
          </div>
        </div>

        {/* Non-Utilized Talent */}
        <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-yellow-400 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-slate-700/30 text-8xl group-hover:scale-110 transition-transform">
            <FiUsers />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black text-yellow-400">N</span>
              <h3 className="text-xl font-bold text-white m-0">Non-Utilized Talent (ละเลยศักยภาพ)</h3>
            </div>
            <p className="text-slate-300 text-sm mb-3">
              การไม่รับฟังความคิดเห็น ไม่ส่งเสริมการฝึกอบรม หรือให้พนักงานที่มีทักษะสูงไปทำงานที่จำเจ ทำให้เสียโอกาสในการพัฒนางาน (Kaizen)
            </p>
            <div className="bg-slate-900/50 p-3 rounded-lg text-sm border border-slate-700">
              <strong className="text-yellow-400">ตัวอย่าง:</strong> ผู้บริหารสั่งการทางเดียว (Top-down), พนักงานหน้างานรู้ปัญหาแต่ไม่มีช่องทางเสนอแนะ
            </div>
          </div>
        </div>

        {/* Transportation */}
        <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-lime-500 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-slate-700/30 text-8xl group-hover:scale-110 transition-transform">
            <FiTruck />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black text-lime-500">T</span>
              <h3 className="text-xl font-bold text-white m-0">Transportation (การขนส่ง/เคลื่อนย้าย)</h3>
            </div>
            <p className="text-slate-300 text-sm mb-3">
              การเคลื่อนย้ายวัตถุดิบหรือสินค้าคงคลังจากจุดหนึ่งไปยังอีกจุดหนึ่งโดยไม่จำเป็น ซึ่งไม่เพิ่มมูลค่า ซ้ำยังเพิ่มความเสี่ยงที่ของจะเสียหาย
            </p>
            <div className="bg-slate-900/50 p-3 rounded-lg text-sm border border-slate-700">
              <strong className="text-lime-400">ตัวอย่าง:</strong> การจัด Layout โรงงานที่ทำให้ต้องใช้รถโฟล์คลิฟท์ขับวนไปมา, ย้ายของข้ามตึก
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-green-500 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-slate-700/30 text-8xl group-hover:scale-110 transition-transform">
            <FiBox />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black text-green-500">I</span>
              <h3 className="text-xl font-bold text-white m-0">Inventory (สินค้าคงคลังมากเกินไป)</h3>
            </div>
            <p className="text-slate-300 text-sm mb-3">
              การเก็บวัตถุดิบ งานระหว่างทำ (WIP) หรือสินค้าสำเร็จรูปมากเกินไป สต็อกที่เยอะเปรียบเสมือน <strong>"น้ำที่ท่วมระดับจนบังโขดหินปัญหา"</strong>
            </p>
            <div className="bg-slate-900/50 p-3 rounded-lg text-sm border border-slate-700">
              <strong className="text-green-400">ตัวอย่าง:</strong> เงินทุนจมกับสต็อก, สต็อกหมดอายุ (Dead Stock), กินพื้นที่โกดังมหาศาล
            </div>
          </div>
        </div>

        {/* Motion */}
        <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-emerald-500 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-slate-700/30 text-8xl group-hover:scale-110 transition-transform">
            <FiMove />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black text-emerald-500">M</span>
              <h3 className="text-xl font-bold text-white m-0">Motion (การเคลื่อนไหวที่ไม่จำเป็น)</h3>
            </div>
            <p className="text-slate-300 text-sm mb-3">
              การเคลื่อนไหวของพนักงานที่ไม่ก่อให้เกิดมูลค่า ทำให้เกิดความเหนื่อยล้า เสียเวลา และอาจนำไปสู่อุบัติเหตุทางการยศาสตร์ (Ergonomics)
            </p>
            <div className="bg-slate-900/50 p-3 rounded-lg text-sm border border-slate-700">
              <strong className="text-emerald-400">ตัวอย่าง:</strong> พนักงานต้องก้มหยิบของที่พื้น, ต้องเดินไปหยิบเครื่องมือไกลๆ, หันซ้ายหันขวาบ่อยๆ
            </div>
          </div>
        </div>

        {/* Extra-Processing */}
        <div className="bg-slate-800 p-6 rounded-xl border-l-4 border-teal-500 shadow-lg relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-slate-700/30 text-8xl group-hover:scale-110 transition-transform">
            <FiTool />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-black text-teal-500">E</span>
              <h3 className="text-xl font-bold text-white m-0">Extra-Processing (กระบวนการส่วนเกิน)</h3>
            </div>
            <p className="text-slate-300 text-sm mb-3">
              การทำงานหรือกระบวนการที่มากเกินความจำเป็น หรือเกินกว่าสเปคที่ลูกค้าคาดหวังและยอมจ่ายเงินให้
            </p>
            <div className="bg-slate-900/50 p-3 rounded-lg text-sm border border-slate-700">
              <strong className="text-teal-400">ตัวอย่าง:</strong> การขัดเงาชิ้นส่วนที่ถูกซ่อนอยู่ด้านในเครื่องโดยที่ลูกค้ามองไม่เห็น, ขั้นตอนการตรวจสอบซ้ำซ้อน
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
