import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet, TrendingUp, AlertTriangle, CheckCircle2,
  Link2, DollarSign, Truck, ShieldAlert, Upload, Search, Filter, X
} from 'lucide-react';
import { useInboundHub } from '../context/InboundHubContext';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import { evaluateInvoiceLinePrice } from '../utils/priceBenchmarkUtils';

// NOTE: Intentionally >50 lines — Executive & SCM 3-Way Reconciliation Matrix + Live Market/SAP Price Engine
export default function ScmWorkbenchView({ onSwitchToProxyUpload }) {
  const {
    marketRates,
    containers,
    invoices,
    updateMarketRate,
    matchAsyncInvoiceToContainer,
    updateInvoicePriceDecision,
  } = useInboundHub();

  const toast = useToast();
  const confirm = useConfirm();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('ALL'); // ALL, ALERT_ONLY, APPROVED, DISPUTED, PENDING

  const unmatchedContainers = containers.filter((c) => c.linkedInvoiceIds.length === 0);
  const discrepancyContainers = containers.filter((c) => c.status === 'DISCREPANCY');

  const totalInvoiceUsd = invoices.reduce(
    (sum, inv) => sum + inv.lines.reduce((lSum, l) => lSum + l.invoicedQty * l.docUnitPrice, 0),
    0
  );

  const priceAlertCount = invoices.reduce((count, inv) => {
    const hasLineAlert = inv.lines.some((line) => evaluateInvoiceLinePrice(line, marketRates).hasAlert);
    return count + (hasLineAlert && inv.priceApprovalStatus !== 'APPROVED' ? 1 : 0);
  }, 0);

  const getActualReceivedForInvoiceLine = (line) => {
    return line.containerBreakdown.reduce((sum, alloc) => {
      const cnt = containers.find((c) => c.containerId === alloc.containerId);
      const cntItem = cnt?.items.find((i) => i.customerPartNo === line.customerPartNo);
      return sum + (cntItem?.actualReceivedQty !== null && cntItem?.actualReceivedQty !== undefined ? cntItem.actualReceivedQty : 0);
    }, 0);
  };

  // Filter invoices based on search & price status
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        searchTerm.trim() === '' ||
        inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.lines.some(
          (l) =>
            l.customerPartNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.sapNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.partDescription.toLowerCase().includes(searchTerm.toLowerCase())
        );

      if (!matchSearch) return false;

      if (priceFilter === 'ALERT_ONLY') {
        const hasAlert = inv.lines.some((line) => evaluateInvoiceLinePrice(line, marketRates).hasAlert);
        return hasAlert && inv.priceApprovalStatus !== 'APPROVED';
      }
      if (priceFilter === 'APPROVED') return inv.priceApprovalStatus === 'APPROVED';
      if (priceFilter === 'DISPUTED') return inv.priceApprovalStatus === 'DISPUTED';
      if (priceFilter === 'PENDING') return inv.priceApprovalStatus === 'PENDING';

      return true;
    });
  }, [invoices, searchTerm, priceFilter, marketRates]);

  const handleDisputePrice = async (inv) => {
    const ok = await confirm({
      title: 'ทักท้วงราคาไปยังลูกค้า',
      message: `คุณต้องการส่งข้อทักท้วงราคาสำหรับอินวอยซ์ ${inv.invoiceNo} กลับไปยังคู่ค้า ${inv.partnerName} ใช่หรือไม่? (ระบบจะแจ้งเตือนบน Partner Portal ทันที)`,
      confirmText: 'ส่งข้อทักท้วง',
      cancelText: 'ยกเลิก',
      danger: true,
    });

    if (ok) {
      updateInvoicePriceDecision(inv.invoiceId, 'DISPUTED', 'ราคาต่อหน่วยสูงกว่าเกณฑ์สัญญาและตลาด LME');
      toast.warning(`ส่งข้อทักท้วงราคาสำหรับเอกสาร ${inv.invoiceNo} ไปยังคู่ค้าเรียบร้อยแล้ว`);
    }
  };

  const handleApprovePrice = async (inv) => {
    const ok = await confirm({
      title: 'อนุมัติผลการตรวจสอบราคา',
      message: `ยืนยันการอนุมัติราคาเอกสาร ${inv.invoiceNo} เข้าสู่ระบบบัญชีและเชื่อมต่อยอด SAP ใช่หรือไม่?`,
      confirmText: 'อนุมัติราคา',
      cancelText: 'ยกเลิก',
    });

    if (ok) {
      updateInvoicePriceDecision(inv.invoiceId, 'APPROVED', 'SCM ตรวจสอบและอนุมัติราคาแล้ว');
      toast.success(`อนุมัติราคาเอกสาร ${inv.invoiceNo} เรียบร้อยแล้ว`);
    }
  };

  const handleMatchAsync = (invId, cntId, cntNo, invNo) => {
    matchAsyncInvoiceToContainer(invId, cntId);
    toast.success(`ผูกตู้สินค้า ${cntNo} เข้ากับใบอินวอยซ์ ${invNo} สำเร็จ`);
  };

  return (
    <div className="space-y-4">
      {/* KPI สรุปภาพรวมสำหรับฝ่าย SCM และผู้บริหาร (Unified Industrial Left-Border Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>มูลค่า Consolidated Invoice รวม</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            ${totalInvoiceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            ประมาณ {(totalInvoiceUsd * marketRates.fxUsdThb).toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท ({invoices.length} ฉบับ)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>สถานะตู้สินค้าขาเข้าทั้งหมด</span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            {containers.filter((c) => c.status === 'COMPLETED').length} / {containers.length} ตู้
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            ถึงคลัง {containers.filter((c) => c.status === 'ARRIVED_GATE').length} ตู้ | เดินทาง {containers.filter((c) => c.status === 'IN_TRANSIT').length} ตู้
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>แจ้งเตือนส่วนต่างราคา (Price Alert)</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className={`text-xl font-bold font-mono mt-1 ${priceAlertCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
            {priceAlertCount} เอกสาร
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            เทียบราคามาตรฐาน SAP และราคาตลาด LME
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>ยอดคลาดเคลื่อน / รอผูกตู้</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
            {discrepancyContainers.length + unmatchedContainers.length} รายการ
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            ยอดรับจริงดิฟ {discrepancyContainers.length} ตู้ | ตู้รอผูกบิล {unmatchedContainers.length} ตู้
          </div>
        </div>
      </div>

      {/* แผงควบคุมตัวแปรราคาตลาดโลกและอัตราแลกเปลี่ยน (Live Market Benchmark Sandbox) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>ตัวแปรอ้างอิงราคาตลาดและอัตราแลกเปลี่ยนฝ่าย SCM (จำลองคำนวณ Variance สด)</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              อัปเดตล่าสุด: {marketRates.updatedDate} | ใช้เปรียบเทียบกับราคาต่อหน่วยใน Invoice อัตโนมัติ
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">FX (USD/THB)</label>
              <input
                type="number"
                step="0.05"
                value={marketRates.fxUsdThb}
                onChange={(e) => updateMarketRate('fxUsdThb', e.target.value)}
                className="mes-input font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">ทองแดง LME ($/kg)</label>
              <input
                type="number"
                step="0.05"
                value={marketRates.lmeCopperUsdPerKg}
                onChange={(e) => updateMarketRate('lmeCopperUsdPerKg', e.target.value)}
                className="mes-input font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">อลูมิเนียม LME ($/kg)</label>
              <input
                type="number"
                step="0.05"
                value={marketRates.lmeAluminumUsdPerKg}
                onChange={(e) => updateMarketRate('lmeAluminumUsdPerKg', e.target.value)}
                className="mes-input font-mono text-center"
              />
            </div>
            <button
              type="button"
              onClick={onSwitchToProxyUpload}
              className="mes-btn-secondary min-h-[34px] w-full"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>อัปโหลดแทนลูกค้า</span>
            </button>
          </div>
        </div>
      </div>

      {/* แถบค้นหาและกรองข้อมูลอินวอยซ์ (.mes-filter-bar) */}
      <div className="mes-filter-bar">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเลขที่ Invoice, ชื่อคู่ค้า, รหัสสินค้าลูกค้า, หรือรหัส SAP..."
              className="mes-input pl-8"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="mes-select min-w-[170px]"
            >
              <option value="ALL">สถานะราคา: ทั้งหมด</option>
              <option value="ALERT_ONLY">เฉพาะแจ้งเตือนราคา (Price Alert)</option>
              <option value="PENDING">รอตรวจสอบ (Pending)</option>
              <option value="APPROVED">อนุมัติแล้ว (Approved)</option>
              <option value="DISPUTED">ทักท้วงราคาแล้ว (Disputed)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 shrink-0 px-1">
          แสดง {filteredInvoices.length} จาก {invoices.length} เอกสาร
        </div>
      </div>

      {/* แจ้งเตือนกรณีมีตู้สินค้าเข้า Store ล่วงหน้าแล้ว รอผูก Consolidated Invoice */}
      {unmatchedContainers.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <div className="font-bold flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-amber-600" />
              <span>ตรวจพบตู้สินค้าที่รับเข้าคลังล่วงหน้า รอผูกกับ Consolidated Invoice ที่ส่งตามหลัง ({unmatchedContainers.length} ตู้)</span>
            </div>
            <div className="mt-0.5">
              ตู้หมายเลข <strong className="font-mono">{unmatchedContainers[0].containerNo}</strong> (SAP 10030912 จำนวน 900 PCS) ตรงกับยอดในบิล <strong className="font-mono">INV-ME-2026-0905</strong> พอดี 100%
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleMatchAsync('INV-02', unmatchedContainers[0].containerId, unmatchedContainers[0].containerNo, 'INV-ME-2026-0905')}
            className="mes-btn-amber min-h-[36px] shrink-0"
          >
            <Link2 className="w-4 h-4" />
            <span>ยืนยันผูกตู้เข้ากับ INV-ME-2026-0905</span>
          </button>
        </div>
      )}

      {/* รายการ Consolidated Invoices พร้อมการแตกยอดรายตู้และตารางเทียบราคา 2 ชั้น */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 dark:text-slate-400">
          ไม่พบรายการอินวอยซ์ที่ตรงกับเงื่อนไขการค้นหา
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((inv) => {
            const linkedContainers = containers.filter((c) => inv.containerIds.includes(c.containerId));
            const hasDiscrepancyInInv = linkedContainers.some((c) => c.status === 'DISCREPANCY');

            return (
              <div
                key={inv.invoiceId}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs"
              >
                {/* ส่วนหัวเอกสาร Invoice */}
                <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">{inv.invoiceNo}</span>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">— {inv.partnerName}</span>
                      <span className="mes-badge bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        มัดรวม {linkedContainers.length} ตู้คอนเทนเนอร์
                      </span>
                      {inv.uploadedSource === 'SCM_PROXY' && (
                        <span className="mes-badge bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          นำเข้าโดย SCM Proxy
                        </span>
                      )}
                      {hasDiscrepancyInInv && (
                        <span className="mes-badge bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <AlertTriangle className="w-3 h-3" /> พบยอดรับจริงจาก Store ไม่ตรงเอกสาร!
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      วันที่อินวอยซ์: <span className="font-mono">{inv.invoiceDate}</span> | สกุลเงิน: <span className="font-mono">{inv.currency}</span>
                      {inv.scmNote && (
                        <span className="text-amber-700 dark:text-amber-400 font-medium ml-2">
                          ({inv.scmNote})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {inv.priceApprovalStatus === 'APPROVED' ? (
                      <span className="mes-badge-pill bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 py-1 px-3">
                        <CheckCircle2 className="w-4 h-4" /> อนุมัติราคาพร้อมส่งเข้าบัญชี/SAP แล้ว
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleDisputePrice(inv)}
                          className="mes-btn-danger min-h-[34px]"
                        >
                          ทักท้วงราคาไปยังลูกค้า
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprovePrice(inv)}
                          className="mes-btn-success min-h-[34px]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>อนุมัติผลการตรวจสอบราคา</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* แถบแสดงสถานะตู้คอนเทนเนอร์ย่อยใน Invoice ใบนี้ (Live Store Sync) */}
                <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2">
                    การกระจายสินค้าและสถานะรับเข้าคลังรายตู้คอนเทนเนอร์ (Live Store Sync):
                  </div>
                  {linkedContainers.length === 0 ? (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      ยังไม่ได้ผูกตู้คอนเทนเนอร์ (กรุณากดปุ่มผูกตู้ด้านบน หรือรอลูกค้าอัปเดตใบ Packing List)
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {linkedContainers.map((cnt) => (
                        <div
                          key={cnt.containerId}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="font-mono text-slate-800 dark:text-white">{cnt.containerNo}</span>
                            <span
                              className={`text-[11px] font-semibold ${
                                cnt.status === 'COMPLETED'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : cnt.status === 'DISCREPANCY'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : cnt.status === 'ARRIVED_GATE'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {cnt.status === 'COMPLETED' && 'สโตร์รับครบ 100%'}
                              {cnt.status === 'DISCREPANCY' && 'พบของขาด/ชำรุด!'}
                              {cnt.status === 'ARRIVED_GATE' && 'ถึงหน้าคลัง (รอรับ)'}
                              {cnt.status === 'IN_TRANSIT' && `กำลังเดินทาง (ETA ${cnt.etaDatetime})`}
                            </span>
                          </div>
                          <div className="mt-1 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                            {cnt.items.map((item) => (
                              <div key={item.contItemId} className="flex justify-between">
                                <span>SAP {item.sapNo}:</span>
                                <span className="font-medium font-mono">
                                  {item.actualReceivedQty !== null
                                    ? `รับจริง ${item.actualReceivedQty}/${item.packedQty} ${item.uom}`
                                    : `ในตู้ ${item.packedQty} ${item.uom}`}
                                </span>
                              </div>
                            ))}
                          </div>
                          {cnt.items.some((i) => i.discrepancyRemark) && (
                            <div className="mt-1.5 p-1.5 rounded bg-rose-50 dark:bg-rose-950/50 text-[11px] text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              หมายเหตุจาก Store: {cnt.items.find((i) => i.discrepancyRemark)?.discrepancyRemark}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ตารางกระทบยอดจำนวน 3 ทาง + เทียบราคา 2 ชั้น (Unified High Density Table) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-3 py-2.5">รหัส SAP / รายการสินค้า</th>
                        <th className="px-3 py-2.5 text-right">ยอดรวมในบิล</th>
                        <th className="px-3 py-2.5 text-right">Store รับจริงสะสม</th>
                        <th className="px-3 py-2.5 text-right">ราคาบิล (Doc)</th>
                        <th className="px-3 py-2.5 text-right">ราคาในระบบ (SAP)</th>
                        <th className="px-3 py-2.5 text-right">ราคาตลาด ({marketRates.fxUsdThb}฿/$)</th>
                        <th className="px-3 py-2.5 text-center">ผลตรวจสอบราคา</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {inv.lines.map((line) => {
                        const check = evaluateInvoiceLinePrice(line, marketRates);
                        const actualReceived = getActualReceivedForInvoiceLine(line);
                        return (
                          <tr
                            key={line.invLineId}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${
                              check.hasAlert ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                            }`}
                          >
                            <td className="px-3 py-2.5">
                              <div className="font-mono font-bold text-slate-900 dark:text-white">
                                SAP {line.sapNo}{' '}
                                <span className="text-[11px] font-normal text-slate-400">({line.customerPartNo})</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">{line.partDescription}</div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-white">
                              {line.invoicedQty.toLocaleString()} {line.uom}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              <span className="font-bold text-blue-700 dark:text-blue-400">
                                {actualReceived.toLocaleString()} / {line.invoicedQty.toLocaleString()} {line.uom}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              <div className="font-bold text-slate-900 dark:text-white">${line.docUnitPrice.toFixed(2)}</div>
                              <div className="text-[11px] text-slate-500">{check.docPriceThb.toLocaleString()} ฿</div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              <div className="text-slate-800 dark:text-slate-200">{check.sapStdCostThb.toLocaleString()} ฿</div>
                              <div
                                className={`text-[11px] font-semibold ${
                                  Math.abs(check.sysVariancePct) > 1 ? 'text-rose-600' : 'text-emerald-600'
                                }`}
                              >
                                {check.sysVariancePct > 0 ? `+${check.sysVariancePct}%` : `${check.sysVariancePct}%`} vs SAP
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono">
                              <div className="text-slate-800 dark:text-slate-200">
                                ${check.marketPriceUsd.toFixed(2)}{' '}
                                <span className="text-[10px] text-slate-500">({check.commodityLabel})</span>
                              </div>
                              <div
                                className={`text-[11px] font-semibold ${
                                  Math.abs(check.marketVariancePct) > 2 ? 'text-rose-600' : 'text-emerald-600'
                                }`}
                              >
                                {check.marketVariancePct > 0 ? `+${check.marketVariancePct}%` : `${check.marketVariancePct}%`} vs ตลาด
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {check.hasAlert ? (
                                <span className="mes-badge bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  <AlertTriangle className="w-3 h-3" /> เกินเกณฑ์มาตรฐาน
                                </span>
                              ) : (
                                <span className="mes-badge bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" /> ราคาปกติ
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
