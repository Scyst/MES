import React, { useState } from 'react';
import {
  UploadCloud, FileSpreadsheet, FileText, CheckCircle2,
  Truck, PackageCheck, AlertTriangle, Clock, Sparkles, ArrowRight, ShieldCheck
} from 'lucide-react';
import { useInboundHub } from '../context/InboundHubContext';
import { SAMPLE_EXTRACTED_SHIPMENT } from '../data/mockInboundData';

function ContainerTimelineBadge({ status }) {
  if (status === 'COMPLETED') {
    return (
      <span className="mes-badge-pill bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
        <CheckCircle2 className="w-3.5 h-3.5" /> คลังตรวจรับครบสมบูรณ์
      </span>
    );
  }
  if (status === 'DISCREPANCY') {
    return (
      <span className="mes-badge-pill bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
        <AlertTriangle className="w-3.5 h-3.5" /> พบส่วนต่างยอดรับจริง (รอตรวจสอบ)
      </span>
    );
  }
  if (status === 'ARRIVED_GATE') {
    return (
      <span className="mes-badge-pill bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
        <Truck className="w-3.5 h-3.5" /> รถถึงหน้าคลังสินค้า (รอเปิดตู้)
      </span>
    );
  }
  return (
    <span className="mes-badge-pill bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
      <Clock className="w-3.5 h-3.5" /> กำลังเดินทาง (In-Transit)
    </span>
  );
}

// NOTE: Intentionally >50 lines — encapsulates full Partner Dropzone, Auto-Match Preview, and Live Shipment Tracker
export default function PartnerPortalView({ isProxyMode = false }) {
  const { invoices, containers, submitExtractedShipment } = useInboundHub();
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [uploadedFileNames, setUploadedFileNames] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const partnerInvoices = invoices.filter((inv) => inv.partnerId === 'PTN-01');

  const triggerExtraction = (filesList = ['DK_Consolidated_INV_0912.pdf', 'DK_Container_PackingList_2x40HQ.xlsx']) => {
    setIsExtracting(true);
    setUploadedFileNames(filesList);
    setTimeout(() => {
      setIsExtracting(false);
      setPreviewData(SAMPLE_EXTRACTED_SHIPMENT);
    }, 900);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    triggerExtraction(files.map((f) => f.name));
  };

  const handleConfirmSubmit = () => {
    if (!previewData || isSubmitting) return;
    setIsSubmitting(true);
    submitExtractedShipment(previewData, isProxyMode ? 'SCM_PROXY' : 'PARTNER_PORTAL');
    setPreviewData(null);
    setUploadedFileNames([]);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4">
      {/* แถบแสดงบริบทความปลอดภัยและสิทธิประโยชน์ของฝั่งลูกค้า */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-100">
            <ShieldCheck className="w-4 h-4" />
            {isProxyMode ? 'โหมดเจ้าหน้าที่ SCM อัปโหลดเอกสารแทนลูกค้า (Onboarding Proxy)' : 'SNC B2B Partner Portal — บัญชีคู่ค้า: Daikin Industries'}
          </div>
          <h2 className="text-base md:text-lg font-bold mt-1">
            ส่งข้อมูลล่วงหน้าด้วยไฟล์เดิมที่มีอยู่แล้ว (ไม่ต้องกรอกแบบฟอร์มทีละรายการ)
          </h2>
          <p className="text-xs text-blue-100 mt-0.5">
            เพียงลากไฟล์ Commercial Invoice (มัดรวมหลายตู้ได้) คู่กับไฟล์ Packing List รายตู้ ระบบจะจับคู่รหัสสินค้าและตรวจสอบยอดรวมให้อัตโนมัติ
          </p>
        </div>
        <button
          type="button"
          onClick={() => triggerExtraction()}
          disabled={isExtracting}
          className="min-h-[44px] px-4 py-2 rounded-lg bg-white text-blue-700 hover:bg-blue-50 font-semibold text-xs flex items-center justify-center gap-2 shadow-xs shrink-0 cursor-pointer disabled:opacity-60"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          {isExtracting ? 'กำลังสกัดข้อมูลจากเอกสาร...' : 'ทดลองจำลองโยนไฟล์ลูกค้า (1 Invoice + 2 ตู้)'}
        </button>
      </div>

      {/* โซนลากวางเอกสาร (Zero-Data-Entry Dropzone) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-blue-300 dark:border-blue-800 hover:border-blue-500 bg-blue-50/40 dark:bg-slate-800/40 rounded-xl p-6 transition-colors cursor-pointer">
          <input
            type="file"
            multiple
            accept=".xlsx,.xls,.csv,.pdf"
            onChange={handleFileInput}
            className="hidden"
          />
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
              <FileText className="w-5 h-5" />
            </div>
            <UploadCloud className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <div className="p-2.5 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-white text-center">
            คลิกเลือกไฟล์ หรือลากไฟล์ Commercial Invoice (PDF/Excel) และ Packing List รายตู้ (Excel) มาวางพร้อมกันที่นี่
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
            ระบบจดจำรูปแบบตารางของบริษัทท่านอัตโนมัติ (Template: DK_STD_EXCEL_V2) — ใช้เวลาตรวจสอบไม่เกิน 30 วินาที
          </p>
        </label>

        {isExtracting && (
          <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center gap-3 text-xs text-blue-800 dark:text-blue-200">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>กำลังอ่านตารางและแปลงรหัสสินค้าจากไฟล์: <strong>{uploadedFileNames.join(', ')}</strong>...</span>
          </div>
        )}

        {/* ตารางตรวจสอบความถูกต้องก่อนกดยืนยัน (Human-in-the-Loop Preview) */}
        {previewData && (
          <div className="mt-4 border border-emerald-300 dark:border-emerald-800 rounded-xl overflow-hidden bg-emerald-50/30 dark:bg-slate-800/60">
            <div className="p-3 bg-emerald-100/70 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  สกัดข้อมูลและตรวจสอบยอดรวมสำเร็จ: ยอดรวมทุกตู้ตรงกับยอดใน Invoice {previewData.invoiceNo} ครบ 100%
                </div>
                <div className="text-[11px] text-emerald-800 dark:text-emerald-300 mt-0.5">
                  ไฟล์ต้นทาง: {uploadedFileNames.join(' + ')} | วิธีประมวลผล: {previewData.extractionMethod}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewData(null)}
                  className="mes-btn-secondary min-h-[38px]"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmSubmit}
                  className="mes-btn-success min-h-[38px]"
                >
                  <PackageCheck className="w-4 h-4" />
                  ยืนยันส่งข้อมูลเข้าคลังและ SCM
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-3 py-2">รหัสสินค้าลูกค้า</th>
                    <th className="px-3 py-2">จับคู่รหัสโรงงานอัตโนมัติ</th>
                    <th className="px-3 py-2">รายละเอียด</th>
                    <th className="px-3 py-2 text-right">ราคา/หน่วย (Doc)</th>
                    <th className="px-3 py-2 text-right">ยอดรวม Invoice</th>
                    {previewData.containers.map((c) => (
                      <th key={c.tempId} className="px-3 py-2 text-right bg-blue-50/70 dark:bg-blue-950/30">
                        ตู้ {c.containerNo}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-xs bg-white dark:bg-slate-900">
                  {previewData.lines.map((line) => (
                    <tr key={line.customerPartNo}>
                      <td className="px-3 py-2 font-semibold text-slate-800 dark:text-white">{line.customerPartNo}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[11px]">
                          <ArrowRight className="w-3 h-3" /> SAP {line.sapNo}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{line.partDescription}</td>
                      <td className="px-3 py-2 text-right font-mono">${line.docUnitPrice.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">
                        {line.invoicedQty.toLocaleString()} {line.uom}
                      </td>
                      {previewData.containers.map((c) => (
                        <td key={c.tempId} className="px-3 py-2 text-right font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-950/10">
                          {(line.allocations[c.tempId] || 0).toLocaleString()} {line.uom}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* กระดานติดตามสถานะตู้สินค้าแบบเรียลไทม์ (Value Giveback ให้ลูกค้าไม่ต้องโทรตาม SCM) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              สถานะเอกสารและการตรวจรับเข้าคลังแบบเรียลไทม์ (Live Shipment & Container Tracking)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              อัปเดตทันทีเมื่อรถถึงหน้าคลังหรือคลังสินค้าตรวจรับเสร็จสิ้น ลดการส่งอีเมลสอบถามสถานะ
            </p>
          </div>
          <span className="mes-badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            ซ่อนข้อมูลต้นทุนภายในโรงงาน 100%
          </span>
        </div>

        <div className="space-y-3">
          {partnerInvoices.map((inv) => {
            const linkedContainers = containers.filter((c) => inv.containerIds.includes(c.containerId));
            return (
              <div key={inv.invoiceId} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{inv.invoiceNo}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">วันที่เอกสาร: {inv.invoiceDate}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">| จำนวนรวม {linkedContainers.length} ตู้สินค้า</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.priceApprovalStatus === 'DISPUTED' && (
                      <span className="mes-badge-pill bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        <AlertTriangle className="w-3.5 h-3.5" /> ฝ่ายจัดซื้อส่งคำถามเรื่องราคาเอกสาร ({inv.scmNote || 'กรุณาตรวจสอบราคา'})
                      </span>
                    )}
                    {inv.priceApprovalStatus === 'APPROVED' && (
                      <span className="mes-badge-pill bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" /> เอกสารผ่านการตรวจสอบแล้ว
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-3">
                  {linkedContainers.map((cnt) => (
                    <div key={cnt.containerId} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-white">{cnt.containerNo}</span>
                        <ContainerTimelineBadge status={cnt.status} />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                        <div>ทะเบียนรถ: {cnt.truckLicense} | ซีล: {cnt.sealNo}</div>
                        <div>กำหนดถึง (ETA): {cnt.etaDatetime}</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                        {cnt.items.map((item) => (
                          <div key={item.contItemId} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-600 dark:text-slate-300 truncate pr-2">{item.customerPartNo}</span>
                            <span className="font-semibold text-slate-800 dark:text-white shrink-0">
                              {item.actualReceivedQty !== null
                                ? `รับแล้ว ${item.actualReceivedQty.toLocaleString()} / ${item.packedQty.toLocaleString()} ${item.uom}`
                                : `แจ้งส่ง ${item.packedQty.toLocaleString()} ${item.uom}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
