import React from 'react';
import { FiCpu, FiDatabase, FiWifi, FiServer, FiCheckCircle } from 'react-icons/fi';

export default function LeanIndustry4() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="bg-gradient-to-r from-teal-900/50 to-emerald-900/50 p-8 rounded-2xl border border-teal-500/20 mb-8">
        <h2 className="text-3xl font-black text-white mt-0 mb-4 flex items-center gap-3">
          <FiCpu className="text-teal-400" />
          Lean + Industry 4.0
        </h2>
        <p className="text-lg text-slate-300 leading-relaxed m-0">
          การนำแนวคิด Lean มาทำเพียงอย่างเดียวอาจไปถึงทางตัน (Limit of Manual Kaizen) และการใช้เทคโนโลยี Industry 4.0 ทันทีโดยไม่ปรับปรุงกระบวนการก่อน ก็จะทำให้ <strong>"ทำความสูญเปล่าได้เร็วขึ้นและแพงขึ้น"</strong> การบูรณาการทั้งสองอย่างเข้าด้วยกัน (Integrated Approach) จึงเป็นกุญแจสู่ <strong>Smart Factory</strong> ที่แท้จริง
        </p>
      </div>

      <h3 className="text-2xl font-bold text-white border-b border-slate-700 pb-2 mb-6">4 Steps of Smart Factory Transformation</h3>
      
      <div className="space-y-4 mb-10">
        {/* Step 1 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex gap-4">
          <div className="bg-slate-900 w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-slate-400 border border-slate-700 flex-shrink-0">1</div>
          <div>
            <h4 className="text-xl font-bold text-teal-400 mt-0 mb-2">Lean Process (ทำรากฐานให้แน่น)</h4>
            <p className="text-slate-300 text-sm m-0">
              กำจัด Non-value added (Wastes) ปรับปรุงกระบวนการและกำหนดมาตรฐานการทำงาน (Standardization) ให้พนักงานหน้างานเข้าใจการไหลของข้อมูล (Information Flow) และวัสดุ (Material Flow)
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex gap-4">
          <div className="bg-slate-900 w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-slate-400 border border-slate-700 flex-shrink-0">2</div>
          <div>
            <h4 className="text-xl font-bold text-teal-400 mt-0 mb-2">Digital Model Line (สร้างโปรเจกต์ต้นแบบ)</h4>
            <p className="text-slate-300 text-sm m-0">
              เลือกสายการผลิตที่มีปัญหาคอขวด สร้าง Quick Win โดยใช้เซนเซอร์ IoT ดึงข้อมูลแบบ Real-time (Process, Condition, Machine, Energy) เพื่อแสดงผลบน Dashboard (Visual Control) ให้ผู้บริหารเห็นผลลัพธ์
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex gap-4">
          <div className="bg-slate-900 w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-slate-400 border border-slate-700 flex-shrink-0">3</div>
          <div>
            <h4 className="text-xl font-bold text-teal-400 mt-0 mb-2">Vertical Integration System (เชื่อมโยงข้อมูลแนวดิ่ง)</h4>
            <p className="text-slate-300 text-sm m-0">
              การเชื่อมโยงระบบระดับหน้างาน (Shop Floor: PLC, SCADA, MES) เข้ากับระบบระดับบริหาร (Enterprise Level: ERP) เพื่อให้ข้อมูลการสั่งซื้อ วัตถุดิบ และสถานะการผลิต ซิงค์กันโดยอัตโนมัติ
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex gap-4">
          <div className="bg-slate-900 w-12 h-12 rounded-full flex items-center justify-center text-xl font-black text-slate-400 border border-slate-700 flex-shrink-0">4</div>
          <div>
            <h4 className="text-xl font-bold text-teal-400 mt-0 mb-2">Horizontal Integration System (เชื่อมโยงแบบ End-to-End)</h4>
            <p className="text-slate-300 text-sm m-0">
              การเชื่อมโยงข้อมูลตั้งแต่คู่ค้า (Supplier/Vendor) กระบวนการผลิต ไปจนถึงลูกค้า (Customer) เกิดเป็น Value Chain ที่ทุกคนเห็นข้อมูลชุดเดียวกัน (Single Source of Truth)
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl">
          <FiWifi />
        </div>
        <h3 className="text-2xl font-bold text-white mt-0 mb-6">เทคโนโลยีที่นำมาเสริม Lean (Lean 4.0 Enablers)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <div>
            <h5 className="flex items-center gap-2 text-emerald-400 font-bold text-lg mb-2"><FiDatabase /> IoT & Big Data</h5>
            <p className="text-sm text-slate-400">เก็บข้อมูลสภาวะของเครื่องจักร (ความสั่น อุณหภูมิ) ตลอดเวลา เพื่อให้ไม่ต้องรอให้เครื่องพังแล้วค่อยซ่อม (Predictive Maintenance) ลดปัญหางานค้าง (Muda of Waiting)</p>
          </div>
          <div>
            <h5 className="flex items-center gap-2 text-emerald-400 font-bold text-lg mb-2"><FiServer /> Cloud & MES</h5>
            <p className="text-sm text-slate-400">ระบบ Manufacturing Execution System แบบ Cloud-based ช่วยลดการใช้กระดาษ (Paperless) และอัปเดตสถานะงาน (WIP) ทุกวินาที ช่วยกำจัด Overproduction</p>
          </div>
          <div>
            <h5 className="flex items-center gap-2 text-emerald-400 font-bold text-lg mb-2"><FiCheckCircle /> AI Vision</h5>
            <p className="text-sm text-slate-400">ใช้กล้อง AI ตรวจสอบคุณภาพสินค้า (Quality Inspection) แทนสายตามนุษย์ ทำงานได้เร็วกว่า แม่นยำกว่า ลดปัญหา Defect & Rework อย่างสมบูรณ์แบบ</p>
          </div>
          <div>
            <h5 className="flex items-center gap-2 text-emerald-400 font-bold text-lg mb-2"><FiCpu /> Advanced Robotics (AGV)</h5>
            <p className="text-sm text-slate-400">หุ่นยนต์ลำเลียงอัตโนมัติ (Automated Guided Vehicles) ขนย้ายชิ้นงานตามระบบดึง (Pull) อย่างแม่นยำ กำจัด Muda of Transportation และ Motion ของพนักงาน</p>
          </div>
        </div>
      </div>
    </div>
  );
}
