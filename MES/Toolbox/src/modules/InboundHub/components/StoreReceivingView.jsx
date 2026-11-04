import React, { useState } from 'react';
import {
  Warehouse, Printer, QrCode, CheckCircle2, AlertTriangle,
  Truck, EyeOff, Camera, PackageCheck, Clock
} from 'lucide-react';
import { useInboundHub } from '../context/InboundHubContext';

// NOTE: Intentionally >50 lines — Store Container Receiving Queue + RM Tag Generator + Discrepancy Modal
export default function StoreReceivingView() {
  const { containers, invoices, generateContainerTags, recordContainerReceiving } = useInboundHub();
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [activeContainer, setActiveContainer] = useState(null);
  const [receiveDraft, setReceiveDraft] = useState({});

  const filteredContainers = containers.filter((cnt) => {
    if (filterStatus === 'ALL') return true;
    return cnt.status === filterStatus;
  });

  const openReceivingModal = (cnt) => {
    const initialDraft = {};
    cnt.items.forEach((item) => {
      initialDraft[item.contItemId] = {
        actualReceivedQty: item.actualReceivedQty !== null ? item.actualReceivedQty : item.packedQty,
        damagedQty: item.damagedQty || 0,
        discrepancyRemark: item.discrepancyRemark || '',
      };
    });
    setReceiveDraft(initialDraft);
    setActiveContainer(cnt);
  };

  const applyShortageSimulation = () => {
    if (!activeContainer) return;
    const simulated = {};
    activeContainer.items.forEach((item, idx) => {
      if (idx === 0) {
        simulated[item.contItemId] = {
          actualReceivedQty: Math.max(0, item.packedQty - 15),
          damagedQty: 5,
          discrepancyRemark: 'ตรวจพบสินค้าขาด 15 ชิ้น และกล่องบรรจุภัณฑ์ยุบชำรุด 5 ชิ้น (แนบภาพถ่ายหน้าตู้แล้ว)',
        };
      } else {
        simulated[item.contItemId] = {
          actualReceivedQty: item.packedQty,
          damagedQty: 0,
          discrepancyRemark: '',
        };
      }
    });
    setReceiveDraft(simulated);
  };

  const handleConfirmReceive = (e) => {
    e.preventDefault();
    if (!activeContainer) return;
    recordContainerReceiving(activeContainer.containerId, receiveDraft);
    setActiveContainer(null);
  };

  const resolveLinkedInvoiceNumbers = (linkedIds) => {
    if (!linkedIds || linkedIds.length === 0) return 'ยังไม่ผูกใบอินวอยซ์ (รับตู้เข้าคลังก่อนได้)';
    return linkedIds
      .map((id) => invoices.find((inv) => inv.invoiceId === id)?.invoiceNo)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="space-y-4">
      {/* แถบแจ้งสถานะความปลอดภัยข้อมูลสำหรับคลังสินค้า */}
      <div className="mes-filter-bar">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'ALL', label: `ตู้สินค้าทั้งหมด (${containers.length})` },
            { key: 'ARRIVED_GATE', label: `ถึงหน้าคลัง / รอรับ (${containers.filter((c) => c.status === 'ARRIVED_GATE').length})` },
            { key: 'IN_TRANSIT', label: `กำลังเดินทาง (${containers.filter((c) => c.status === 'IN_TRANSIT').length})` },
            { key: 'COMPLETED', label: `รับครบแล้ว (${containers.filter((c) => c.status === 'COMPLETED').length})` },
            { key: 'DISCREPANCY', label: `พบยอดคลาดเคลื่อน (${containers.filter((c) => c.status === 'DISCREPANCY').length})` },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setFilterStatus(btn.key)}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterStatus === btn.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
          <EyeOff className="w-4 h-4 text-slate-500 shrink-0" />
          <span>โหมดคลังสินค้า: ซ่อนราคาต่อหน่วยและยอดเงินในเอกสารทั้งหมด</span>
        </div>
      </div>

      {/* รายการตู้คอนเทนเนอร์แยกใบสำหรับหน้างาน Store */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredContainers.map((cnt) => {
          const allTagsReady = cnt.items.every((i) => i.tagGenerated);
          return (
            <div
              key={cnt.containerId}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-4 h-4 text-blue-600" />
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{cnt.containerNo}</span>
                      {cnt.status === 'ARRIVED_GATE' && (
                        <span className="mes-badge bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          <Truck className="w-3 h-3" /> ถึงหน้าคลังพร้อมเปิดตู้
                        </span>
                      )}
                      {cnt.status === 'IN_TRANSIT' && (
                        <span className="mes-badge bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          <Clock className="w-3 h-3" /> กำลังเดินทาง
                        </span>
                      )}
                      {cnt.status === 'COMPLETED' && (
                        <span className="mes-badge bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> รับเข้าคลังครบแล้ว
                        </span>
                      )}
                      {cnt.status === 'DISCREPANCY' && (
                        <span className="mes-badge bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          <AlertTriangle className="w-3 h-3" /> แจ้งยอดคลาดเคลื่อนไปที่ SCM แล้ว
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      ทะเบียนรถ: <strong className="text-slate-700 dark:text-slate-200">{cnt.truckLicense}</strong> | เลขซีล: {cnt.sealNo} | ETA: {cnt.etaDatetime}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      อ้างอิงเอกสาร SCM: <span className="font-medium text-blue-600 dark:text-blue-400">{resolveLinkedInvoiceNumbers(cnt.linkedInvoiceIds)}</span>
                    </div>
                  </div>
                </div>

                {/* ตารางสินค้าเฉพาะในตู้นี้ (ไม่ปนกับตู้อื่นใน Invoice เดียวกัน) */}
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                        <th className="px-2.5 py-2">รหัส SAP / สินค้า</th>
                        <th className="px-2.5 py-2 text-right">แจ้งส่งในตู้นี้</th>
                        <th className="px-2.5 py-2 text-center">ป้ายพาเลท (RM Tag)</th>
                        <th className="px-2.5 py-2 text-right">นับรับจริง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {cnt.items.map((item) => {
                        const isShort = item.actualReceivedQty !== null && (item.actualReceivedQty !== item.packedQty || item.damagedQty > 0);
                        return (
                          <tr key={item.contItemId}>
                            <td className="px-2.5 py-2">
                              <div className="font-mono font-bold text-slate-800 dark:text-white">{item.sapNo}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{item.partDescription}</div>
                            </td>
                            <td className="px-2.5 py-2 text-right font-semibold text-slate-800 dark:text-white">
                              {item.packedQty.toLocaleString()} {item.uom}
                              <div className="text-[10px] text-slate-400">{item.palletCount} พาเลท</div>
                            </td>
                            <td className="px-2.5 py-2 text-center">
                              {item.tagGenerated ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[11px]">
                                  <QrCode className="w-3 h-3" /> {item.tagRange}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">ยังไม่สร้างป้าย</span>
                              )}
                            </td>
                            <td className="px-2.5 py-2 text-right">
                              {item.actualReceivedQty === null ? (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">รอตรวจนับ</span>
                              ) : (
                                <div>
                                  <span className={`font-bold ${isShort ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {item.actualReceivedQty.toLocaleString()} {item.uom}
                                  </span>
                                  {item.damagedQty > 0 && (
                                    <div className="text-[10px] text-rose-600">ชำรุด {item.damagedQty} {item.uom}</div>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ปุ่มปฏิบัติการหน้างานคลังสินค้า (Touch-friendly >= 40px) */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={allTagsReady}
                  onClick={() => generateContainerTags(cnt.containerId)}
                  className="mes-btn-secondary min-h-[40px]"
                >
                  <Printer className="w-4 h-4" />
                  {allTagsReady ? 'พิมพ์ป้าย RM Tag ครบแล้ว' : 'สร้างป้าย RM Serial Tag ล่วงหน้า'}
                </button>
                <button
                  type="button"
                  onClick={() => openReceivingModal(cnt)}
                  className="mes-btn-primary min-h-[40px]"
                >
                  <PackageCheck className="w-4 h-4" />
                  {cnt.status === 'COMPLETED' || cnt.status === 'DISCREPANCY' ? 'แก้ไขผลตรวจรับหน้างาน' : 'บันทึกยอดรับเข้าคลังจริง'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* หน้าต่างบันทึกยอดตรวจรับจริงและแจ้งของขาด/ชำรุด */}
      {activeContainer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-2xl w-full p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  บันทึกผลตรวจรับสินค้าหน้าตู้: {activeContainer.containerNo}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ยอดรับจริงจะถูกส่งไปอัปเดตตารางกระทบยอดของฝ่าย SCM ทันที (ห้ามปรับปรุงยอดเอกสารอัตโนมัติโดยไม่ผ่าน SCM)
                </p>
              </div>
              <button
                type="button"
                onClick={applyShortageSimulation}
                className="mes-btn-amber shrink-0 min-h-[36px]"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                จำลองกรณีพบของขาด / ชำรุด
              </button>
            </div>

            <form onSubmit={handleConfirmReceive} className="mt-4 space-y-4">
              {activeContainer.items.map((item) => {
                const draft = receiveDraft[item.contItemId] || {};
                return (
                  <div key={item.contItemId} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">SAP {item.sapNo}</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white ml-2">{item.partDescription}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        แจ้งส่ง: {item.packedQty.toLocaleString()} {item.uom}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          จำนวนรับเข้าจริง ({item.uom})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={draft.actualReceivedQty ?? ''}
                          onChange={(e) =>
                            setReceiveDraft((prev) => ({
                              ...prev,
                              [item.contItemId]: { ...prev[item.contItemId], actualReceivedQty: e.target.value },
                            }))
                          }
                          className="mes-input min-h-[38px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          จำนวนที่พบชำรุดเสียหาย ({item.uom})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={draft.damagedQty ?? 0}
                          onChange={(e) =>
                            setReceiveDraft((prev) => ({
                              ...prev,
                              [item.contItemId]: { ...prev[item.contItemId], damagedQty: e.target.value },
                            }))
                          }
                          className="mes-input min-h-[38px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        หมายเหตุความผิดปกติ / หลักฐานภาพถ่ายหน้าตู้ (กรณีไม่ตรงยอด)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="ระบุสาเหตุ เช่น ของขาดจากต้นทาง, กล่องฉีกขาด..."
                          value={draft.discrepancyRemark ?? ''}
                          onChange={(e) =>
                            setReceiveDraft((prev) => ({
                              ...prev,
                              [item.contItemId]: { ...prev[item.contItemId], discrepancyRemark: e.target.value },
                            }))
                          }
                          className="mes-input min-h-[38px]"
                        />
                        <span className="inline-flex items-center gap-1 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 shrink-0">
                          <Camera className="w-3.5 h-3.5" /> แนบรูป
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveContainer(null)}
                  className="mes-btn-secondary min-h-[40px]"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="mes-btn-success min-h-[40px]">
                  <CheckCircle2 className="w-4 h-4" />
                  ยืนยันบันทึกผลรับของและส่งยอดให้ SCM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
