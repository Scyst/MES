import React, { useState, useEffect, useMemo } from 'react';
import {
  Warehouse, Printer, QrCode, CheckCircle2, AlertTriangle,
  Truck, EyeOff, Camera, PackageCheck, Clock, Search, X, Image as ImageIcon
} from 'lucide-react';
import { useInboundHub } from '../context/InboundHubContext';
import { useToast } from '../../../shared/contexts/FeedbackContext';

// NOTE: Intentionally >50 lines — Store Container Receiving Queue + RM Tag Generator + Discrepancy Modal
export default function StoreReceivingView() {
  const { containers, invoices, generateContainerTags, recordContainerReceiving } = useInboundHub();
  const toast = useToast();

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeContainer, setActiveContainer] = useState(null);
  const [receiveDraft, setReceiveDraft] = useState({});
  const [hasSimulatedPhoto, setHasSimulatedPhoto] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeContainer) {
        setActiveContainer(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeContainer]);

  const filteredContainers = useMemo(() => {
    return containers.filter((cnt) => {
      const matchStatus = filterStatus === 'ALL' || cnt.status === filterStatus;
      if (!matchStatus) return false;

      if (searchTerm.trim() === '') return true;
      const term = searchTerm.toLowerCase();
      return (
        cnt.containerNo.toLowerCase().includes(term) ||
        cnt.truckLicense.toLowerCase().includes(term) ||
        cnt.sealNo.toLowerCase().includes(term) ||
        cnt.items.some(
          (i) =>
            i.sapNo.toLowerCase().includes(term) ||
            i.customerPartNo.toLowerCase().includes(term) ||
            i.partDescription.toLowerCase().includes(term)
        )
      );
    });
  }, [containers, filterStatus, searchTerm]);

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
    setHasSimulatedPhoto(false);
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
    setHasSimulatedPhoto(true);
    toast.info('จำลองพบสินค้าขาด 15 ชิ้น และชำรุด 5 ชิ้น พร้อมแนบรูปถ่ายหลักฐาน');
  };

  const handleConfirmReceive = (e) => {
    e.preventDefault();
    if (!activeContainer) return;
    recordContainerReceiving(activeContainer.containerId, receiveDraft);
    toast.success(`บันทึกผลการตรวจรับตู้สินค้า ${activeContainer.containerNo} สำเร็จ ส่งยอดอัปเดต SCM แล้ว`);
    setActiveContainer(null);
  };

  const handleGenerateTags = (cnt) => {
    generateContainerTags(cnt.containerId);
    toast.success(`สร้างและพิมพ์ป้าย RM_SERIAL_TAGS สำหรับตู้ ${cnt.containerNo} เรียบร้อยแล้ว`);
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
      {/* แถบกรองข้อมูลและสถานะความปลอดภัยข้อมูลสำหรับคลังสินค้า (.mes-filter-bar) */}
      <div className="mes-filter-bar">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'ALL', label: `ทั้งหมด (${containers.length})` },
            { key: 'ARRIVED_GATE', label: `ถึงหน้าคลัง (${containers.filter((c) => c.status === 'ARRIVED_GATE').length})` },
            { key: 'IN_TRANSIT', label: `กำลังเดินทาง (${containers.filter((c) => c.status === 'IN_TRANSIT').length})` },
            { key: 'COMPLETED', label: `รับครบแล้ว (${containers.filter((c) => c.status === 'COMPLETED').length})` },
            { key: 'DISCREPANCY', label: `พบคลาดเคลื่อน (${containers.filter((c) => c.status === 'DISCREPANCY').length})` },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setFilterStatus(btn.key)}
              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterStatus === btn.key
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาเลขตู้, ทะเบียนรถ, SAP..."
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

          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg shrink-0">
            <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>ซ่อนราคาและยอดเงินในเอกสารทั้งหมด 100%</span>
          </div>
        </div>
      </div>

      {/* รายการตู้คอนเทนเนอร์แยกใบสำหรับหน้างาน Store */}
      {filteredContainers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500 dark:text-slate-400">
          ไม่พบรายการตู้สินค้าที่ตรงกับเงื่อนไขการค้นหา
        </div>
      ) : (
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
                        ทะเบียนรถ: <strong className="text-slate-700 dark:text-slate-200">{cnt.truckLicense}</strong> | เลขซีล: <span className="font-mono">{cnt.sealNo}</span> | ETA: <span className="font-mono">{cnt.etaDatetime}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        อ้างอิงเอกสาร SCM: <span className="font-medium text-blue-600 dark:text-blue-400">{resolveLinkedInvoiceNumbers(cnt.linkedInvoiceIds)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ตารางสินค้าเฉพาะในตู้นี้ */}
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
                            <tr key={item.contItemId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-2.5 py-2">
                                <div className="font-mono font-bold text-slate-800 dark:text-white">SAP {item.sapNo}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{item.partDescription}</div>
                              </td>
                              <td className="px-2.5 py-2 text-right font-mono font-semibold text-slate-800 dark:text-white">
                                {item.packedQty.toLocaleString()} {item.uom}
                                <div className="text-[10px] text-slate-400 font-sans">{item.palletCount} พาเลท</div>
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
                              <td className="px-2.5 py-2 text-right font-mono">
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
                    onClick={() => handleGenerateTags(cnt)}
                    className="mes-btn-secondary min-h-[40px]"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{allTagsReady ? 'พิมพ์ป้าย RM Tag ครบแล้ว' : 'สร้างป้าย RM Serial Tag ล่วงหน้า'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openReceivingModal(cnt)}
                    className="mes-btn-primary min-h-[40px]"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>{cnt.status === 'COMPLETED' || cnt.status === 'DISCREPANCY' ? 'แก้ไขผลตรวจรับหน้างาน' : 'บันทึกยอดรับเข้าคลังจริง'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal หน้าต่างบันทึกยอดตรวจรับจริงและแจ้งของขาด/ชำรุด (Unified Industrial Modal) */}
      {activeContainer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveContainer(null);
          }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-blue-600" />
                  <span>บันทึกผลตรวจรับสินค้าหน้าตู้: {activeContainer.containerNo}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ยอดรับจริงจะถูกส่งไปอัปเดตตารางกระทบยอดของฝ่าย SCM ทันที
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyShortageSimulation}
                  className="mes-btn-amber shrink-0 min-h-[34px]"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>จำลองกรณีของขาด/ชำรุด</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveContainer(null)}
                  className="mes-btn-icon"
                  aria-label="ปิดหน้าต่าง"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleConfirmReceive} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {activeContainer.items.map((item) => {
                const draft = receiveDraft[item.contItemId] || {};
                return (
                  <div
                    key={item.contItemId}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">SAP {item.sapNo}</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white ml-2">{item.partDescription}</span>
                      </div>
                      <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-200">
                        แจ้งส่ง: {item.packedQty.toLocaleString()} {item.uom}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          จำนวนรับเข้าจริง ({item.uom}) <span className="text-rose-500">*</span>
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
                          className="mes-input font-mono min-h-[38px]"
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
                          className="mes-input font-mono min-h-[38px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        หมายเหตุความผิดปกติ / หลักฐานภาพถ่ายหน้าตู้
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
                        <button
                          type="button"
                          onClick={() => {
                            setHasSimulatedPhoto(!hasSimulatedPhoto);
                            toast.info(hasSimulatedPhoto ? 'ยกเลิกรูปถ่ายแนบ' : 'จำลองแนบรูปถ่ายหลักฐานหน้าตู้สำเร็จ');
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 rounded-lg border text-xs font-semibold shrink-0 transition-colors ${
                            hasSimulatedPhoto
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{hasSimulatedPhoto ? 'แนบรูปแล้ว' : 'แนบรูป'}</span>
                        </button>
                      </div>

                      {hasSimulatedPhoto && (
                        <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-200">
                          <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>ไฟล์หลักฐาน: <strong>damage_container_proof_01.jpg</strong> (2.4 MB) — ถ่ายเมื่อ 10:25 น.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveContainer(null)}
                  className="mes-btn-secondary min-h-[40px]"
                >
                  ยกเลิก
                </button>
                <button type="submit" className="mes-btn-success min-h-[40px]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ยืนยันบันทึกผลรับของและส่งยอดให้ SCM</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
