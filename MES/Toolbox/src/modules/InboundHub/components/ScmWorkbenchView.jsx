import React from 'react';
import {
  FileSpreadsheet, TrendingUp, AlertTriangle, CheckCircle2,
  Link2, DollarSign, Truck, ShieldAlert, Upload
} from 'lucide-react';
import { useInboundHub } from '../context/InboundHubContext';
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

  return (
    <div className="space-y-4">
      {/* KPI สรุปภาพรวมสำหรับฝ่าย SCM และผู้บริหาร */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>มูลค่า Consolidated Invoice รวม</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            ${totalInvoiceUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            ประมาณ {(totalInvoiceUsd * marketRates.fxUsdThb).toLocaleString(undefined, { maximumFractionDigits: 0 })} บาท ({invoices.length} ฉบับ)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>สถานะตู้สินค้าขาเข้าทั้งหมด</span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {containers.filter((c) => c.status === 'COMPLETED').length} / {containers.length} ตู้ (รับเข้าแล้ว)
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            ถึงหน้าคลัง {containers.filter((c) => c.status === 'ARRIVED_GATE').length} ตู้ | กำลังเดินทาง {containers.filter((c) => c.status === 'IN_TRANSIT').length} ตู้
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>แจ้งเตือนส่วนต่างราคา (Price Alert)</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className={`text-xl font-bold mt-1 ${priceAlertCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
            {priceAlertCount} เอกสารรอตรวจสอบ
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            เทียบราคามาตรฐาน SAP/สัญญา และราคาตลาด LME
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>รายการคลาดเคลื่อน / รอผูกตู้ย้อนหลัง</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {discrepancyContainers.length + unmatchedContainers.length} รายการ
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            ยอดรับจริงดิฟ {discrepancyContainers.length} ตู้ | ตู้รอผูกบิล {unmatchedContainers.length} ตู้
          </div>
        </div>
      </div>

      {/* แผงควบคุมตัวแปรราคาตลาดโลกและอัตราแลกเปลี่ยน (ทดลองปรับค่าเพื่อดูผลกระทบต้นทุนสดได้ทันที) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              ตัวแปรอ้างอิงราคาตลาดและอัตราแลกเปลี่ยนของฝ่าย SCM (ทดลองปรับตัวเลขเพื่อจำลองการคำนวณ Variance สดได้)
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              อัปเดตล่าสุด: {marketRates.updatedDate} | ใช้คำนวณเทียบกับราคาต่อหน่วยใน Invoice ของลูกค้าอัตโนมัติ
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
                className="mes-input font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">ทองแดง LME ($/kg)</label>
              <input
                type="number"
                step="0.05"
                value={marketRates.lmeCopperUsdPerKg}
                onChange={(e) => updateMarketRate('lmeCopperUsdPerKg', e.target.value)}
                className="mes-input font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">อลูมิเนียม LME ($/kg)</label>
              <input
                type="number"
                step="0.05"
                value={marketRates.lmeAluminumUsdPerKg}
                onChange={(e) => updateMarketRate('lmeAluminumUsdPerKg', e.target.value)}
                className="mes-input font-mono"
              />
            </div>
            <button
              type="button"
              onClick={onSwitchToProxyUpload}
              className="mes-btn-secondary min-h-[34px]"
            >
              <Upload className="w-3.5 h-3.5" />
              อัปโหลดแทนลูกค้า
            </button>
          </div>
        </div>
      </div>

      {/* แจ้งเตือนกรณีมีตู้สินค้าเข้า Store ล่วงหน้าแล้ว และเพิ่งมี Consolidated Invoice ส่งตามมา */}
      {unmatchedContainers.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="text-xs text-amber-900 dark:text-amber-200">
            <div className="font-bold flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-amber-600" />
              ตรวจพบรายการตู้สินค้าที่รับเข้าคลังล่วงหน้าแล้ว รอผูกเข้ากับ Consolidated Invoice ที่ส่งตามหลัง ({unmatchedContainers.length} ตู้)
            </div>
            <div className="mt-0.5">
              ตู้หมายเลข <strong>{unmatchedContainers[0].containerNo}</strong> (SAP 10030912 จำนวน 900 PCS) ตรงกับยอดในใบอินวอยซ์ <strong>INV-ME-2026-0905</strong> พอดี 100%
            </div>
          </div>
          <button
            type="button"
            onClick={() => matchAsyncInvoiceToContainer('INV-02', unmatchedContainers[0].containerId)}
            className="mes-btn-amber min-h-[38px] shrink-0"
          >
            <Link2 className="w-4 h-4" />
            กดยืนยันผูกตู้เข้ากับ INV-ME-2026-0905 อัตโนมัติ
          </button>
        </div>
      )}

      {/* รายการ Consolidated Invoices พร้อมการแตกยอดรายตู้และตารางเทียบราคา 2 ชั้น */}
      <div className="space-y-4">
        {invoices.map((inv) => {
          const linkedContainers = containers.filter((c) => inv.containerIds.includes(c.containerId));
          const hasDiscrepancyInInv = linkedContainers.some((c) => c.status === 'DISCREPANCY');

          return (
            <div key={inv.invoiceId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              {/* ส่วนหัวเอกสาร Invoice */}
              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{inv.invoiceNo}</span>
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
                    วันที่อินวอยซ์: {inv.invoiceDate} | สกุลเงิน: {inv.currency}
                    {inv.scmNote && <span className="text-amber-700 dark:text-amber-400 font-medium ml-2">({inv.scmNote})</span>}
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
                        onClick={() => updateInvoicePriceDecision(inv.invoiceId, 'DISPUTED', 'ราคาต่อหน่วยสูงกว่าเกณฑ์สัญญาและตลาด LME')}
                        className="mes-btn-danger min-h-[36px]"
                      >
                        ทักท้วงราคาไปยังลูกค้า
                      </button>
                      <button
                        type="button"
                        onClick={() => updateInvoicePriceDecision(inv.invoiceId, 'APPROVED', 'SCM ตรวจสอบและอนุมัติราคาแล้ว')}
                        className="mes-btn-success min-h-[36px]"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        อนุมัติผลการตรวจสอบราคา
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* แถบแสดงสถานะตู้คอนเทนเนอร์ย่อยใน Invoice ใบนี้ (แก้ปัญหา SCM ไม่รู้ว่าของอยู่ตู้ไหน) */}
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
                      <div key={cnt.containerId} className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="font-mono text-slate-800 dark:text-white">{cnt.containerNo}</span>
                          <span
                            className={`text-[11px] ${
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
                              <span className="font-medium">
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

              {/* ตารางกระทบยอดจำนวน 3 ทาง (Invoice vs รายตู้ vs รับจริง) + เทียบราคา 2 ชั้น */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2">รหัส SAP / สินค้า</th>
                      <th className="px-3 py-2 text-right">ยอดรวมในบิล</th>
                      <th className="px-3 py-2 text-right">Store รับจริงสะสม</th>
                      <th className="px-3 py-2 text-right">ราคาบิล (Doc)</th>
                      <th className="px-3 py-2 text-right">ราคาในระบบ (SAP)</th>
                      <th className="px-3 py-2 text-right">ราคาตลาด ({marketRates.fxUsdThb}฿/$)</th>
                      <th className="px-3 py-2 text-center">ผลตรวจสอบราคา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {inv.lines.map((line) => {
                      const check = evaluateInvoiceLinePrice(line, marketRates);
                      const actualReceived = getActualReceivedForInvoiceLine(line);
                      return (
                        <tr key={line.invLineId} className={check.hasAlert ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}>
                          <td className="px-3 py-2.5">
                            <div className="font-mono font-bold text-slate-900 dark:text-white">
                              SAP {line.sapNo} <span className="text-[11px] font-normal text-slate-400">({line.customerPartNo})</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{line.partDescription}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-800 dark:text-white">
                            {line.invoicedQty.toLocaleString()} {line.uom}
                          </td>
                          <td className="px-3 py-2.5 text-right">
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
                            <div className={`text-[11px] font-semibold ${Math.abs(check.sysVariancePct) > 1 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {check.sysVariancePct > 0 ? `+${check.sysVariancePct}%` : `${check.sysVariancePct}%`} vs SAP
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono">
                            <div className="text-slate-800 dark:text-slate-200">${check.marketPriceUsd.toFixed(2)} ({check.commodityLabel})</div>
                            <div className={`text-[11px] font-semibold ${Math.abs(check.marketVariancePct) > 2 ? 'text-rose-600' : 'text-emerald-600'}`}>
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
    </div>
  );
}
