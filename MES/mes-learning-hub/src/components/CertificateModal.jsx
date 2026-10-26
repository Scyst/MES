import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiPrinter, FiX, FiCheckCircle, FiShield, FiAward } from 'react-icons/fi';

const PRINT_BODY_CLASS = 'printing-certificate';

export default function CertificateModal({ isOpen, onClose, data }) {
  const printRef = useRef(null);

  // Remove the print isolation class once the print dialog closes (or if the modal unmounts mid-print)
  useEffect(() => {
    const clearPrintMode = () => document.body.classList.remove(PRINT_BODY_CLASS);
    window.addEventListener('afterprint', clearPrintMode);
    return () => {
      window.removeEventListener('afterprint', clearPrintMode);
      clearPrintMode();
    };
  }, []);

  if (!isOpen || !data) return null;

  const {
    recipientName = 'ผู้เข้าอบรมระบบ MES',
    empId = 'EMP-MES',
    department = 'ฝ่ายผลิตและวิศวกรรม (Production & PE)',
    courseTitle = 'Enterprise Application Design, Development & Integration',
    courseId = 'c-enterprise-app',
    certificateId = 'SNC-CERT-2026-9901',
    completedDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
    scorePercentage = 100,
    hours = '24 ชั่วโมงฝึกอบรม (3 วันปฏิบัติการ)',
    instructorName = 'ณภัทร นุ่มทอง',
    instructorTitle = 'วิทยากรผู้เชี่ยวชาญและหัวหน้าฝ่ายวิศวกรรม (Lead Enterprise Architect)'
  } = data;

  const handlePrint = () => {
    document.body.classList.add(PRINT_BODY_CLASS);
    window.print();
  };

  return createPortal(
    <div className="certificate-print-root fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-5xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden my-auto border border-amber-300 print:border-none print:shadow-none print:rounded-none print:max-w-none print:w-full">
        
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print bg-slate-900 px-6 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-xs sm:text-sm">
            <FiAward className="w-5 h-5 text-amber-400" />
            <span>ใบประกาศนียบัตรรับรองสมรรถนะทางการ (Official Certificate of Competency)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
            >
              <FiPrinter className="w-4 h-4" />
              <span>พิมพ์ใบประกาศฯ (Print / PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="ปิดหน้าต่าง"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Canvas (A4 Landscape Orientation) */}
        <div 
          ref={printRef}
          className="certificate-canvas relative p-8 sm:p-12 md:p-16 bg-white selection:bg-amber-100 print:p-8"
          style={{
            fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif",
            minHeight: '620px'
          }}
        >
          {/* Double Ornate Border */}
          <div className="absolute inset-4 sm:inset-6 border-[3px] border-amber-600/70 rounded-2xl pointer-events-none print:inset-2">
            <div className="absolute inset-1.5 border border-amber-500/40 rounded-xl"></div>
            
            {/* Corner Badges / Ornaments */}
            <div className="absolute -top-3 -left-3 w-7 h-7 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-serif font-black shadow-md">✦</div>
            <div className="absolute -top-3 -right-3 w-7 h-7 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-serif font-black shadow-md">✦</div>
            <div className="absolute -bottom-3 -left-3 w-7 h-7 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-serif font-black shadow-md">✦</div>
            <div className="absolute -bottom-3 -right-3 w-7 h-7 bg-amber-600 text-white rounded-full flex items-center justify-center text-xs font-serif font-black shadow-md">✦</div>
          </div>

          {/* Watermark Logo in Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
            <span className="text-[140px] font-black tracking-widest font-serif text-amber-900">SNC</span>
          </div>

          <div className="relative z-10 flex flex-col justify-between h-full space-y-6 sm:space-y-8 text-center">
            
            {/* Header: Company & Platform Recognition */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-center gap-3">
                <div className="h-0.5 w-12 sm:w-20 bg-gradient-to-r from-transparent to-amber-500"></div>
                <div className="text-[11px] sm:text-xs font-extrabold tracking-widest uppercase text-amber-800 font-sans">
                  SNC FORMER PUBLIC COMPANY LIMITED &middot; 99 INDUSTRIAL SOLUTIONS
                </div>
                <div className="h-0.5 w-12 sm:w-20 bg-gradient-to-l from-transparent to-amber-500"></div>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight font-serif mt-2">
                ใบประกาศนียบัตรรับรองสมรรถนะวิชาชีพ
              </h1>
              <div className="text-xs sm:text-sm font-bold text-amber-700 tracking-wide uppercase font-sans">
                Certificate of Professional Competency
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 max-w-xl mx-auto pt-0.5">
                ตามเกณฑ์มาตรฐานสากล ISO 9001:2015 Clause 7.2 &amp; โครงการพัฒนาบุคลากรทักษะสูง BOI STEMPlus Platform
              </p>
            </div>

            {/* Recipient Section */}
            <div className="space-y-2 py-1">
              <div className="text-xs sm:text-sm text-slate-600 font-medium">
                ขอมอบใบประกาศนียบัตรฉบับนี้เพื่อแสดงว่า
              </div>
              <div className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 font-serif tracking-normal border-b-2 border-amber-400/80 inline-block px-8 pb-1.5 min-w-[280px]">
                {recipientName}
              </div>
              <div className="text-xs sm:text-sm text-slate-600 font-medium flex items-center justify-center gap-4 pt-1">
                <span>รหัสพนักงาน: <strong className="text-slate-900 font-bold">{empId}</strong></span>
                <span>&bull;</span>
                <span>สังกัด: <strong className="text-slate-900 font-bold">{department}</strong></span>
              </div>
            </div>

            {/* Achievement & Course Details */}
            <div className="space-y-3 max-w-3xl mx-auto">
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                ได้ผ่านการฝึกอบรมและทดสอบวัดผลสัมฤทธิ์ตามเกณฑ์มาตรฐานความรู้และทักษะปฏิบัติการในหลักสูตร
              </div>

              <div className="p-4 bg-gradient-to-r from-amber-50/80 via-amber-100/40 to-amber-50/80 border border-amber-300/80 rounded-2xl shadow-sm">
                <div className="text-base sm:text-lg md:text-xl font-black text-amber-950 font-sans">
                  {courseTitle}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-2 text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <FiCheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ระยะเวลา: <strong>{hours}</strong></span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1.5">
                    <FiShield className="w-3.5 h-3.5 text-cyan-600" />
                    <span>ระดับสมรรถนะ: <strong>Level 3 (Certified Specialist)</strong></span>
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1.5">
                    <FiAward className="w-3.5 h-3.5 text-amber-600" />
                    <span>ผลการประเมิน: <strong className="text-emerald-700">{scorePercentage}% (เกณฑ์ผ่าน &ge; 80%)</strong></span>
                  </span>
                </div>
              </div>
            </div>

            {/* Footer: Signatures, Seal & Official Certification Code */}
            <div className="pt-4 border-t border-slate-200/80 grid grid-cols-3 items-end gap-4 text-xs">
              
              {/* Left Column: Cert ID & Verification */}
              <div className="text-left space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Verification Code
                </div>
                <div className="font-mono font-black text-xs sm:text-sm text-slate-900 tracking-tight">
                  {certificateId}
                </div>
                <div className="text-[10px] text-slate-500">
                  วันที่สำเร็จการฝึกอบรม: <strong className="text-slate-800">{completedDate}</strong>
                </div>
                <div className="text-[9px] text-emerald-700 font-bold flex items-center gap-1 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                  <span>บันทึกลงทะเบียนทักษะ SQL Server เรียบร้อย</span>
                </div>
              </div>

              {/* Center Column: Golden Seal Graphic */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
                  <div className="w-full h-full rounded-full border border-dashed border-amber-100 flex flex-col items-center justify-center p-1 text-center bg-gradient-to-br from-yellow-500 to-amber-700 text-white">
                    <span className="text-[7px] sm:text-[8px] font-black tracking-widest uppercase opacity-90">SNC FORMER</span>
                    <span className="text-[12px] sm:text-[14px]">🎖️</span>
                    <span className="text-[6px] sm:text-[7px] font-extrabold tracking-tight uppercase">VERIFIED STEM+</span>
                  </div>
                </div>
                <div className="text-[9px] font-bold text-amber-800 mt-1 uppercase tracking-wider">
                  Official Seal
                </div>
              </div>

              {/* Right Column: Signature of Instructor */}
              <div className="text-right space-y-1">
                <div className="inline-block text-center border-b border-slate-400 pb-1 w-44 sm:w-52">
                  <div className="font-serif italic font-bold text-sm sm:text-base text-slate-900 tracking-wide">
                    {instructorName}
                  </div>
                </div>
                <div className="text-[11px] font-bold text-slate-900 pt-0.5">
                  ({instructorName})
                </div>
                <div className="text-[9px] sm:text-[10px] text-slate-500 max-w-[210px] ml-auto leading-tight">
                  {instructorTitle}
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
