import React, { createContext, useContext, useState } from 'react';
import {
  INITIAL_CONTAINERS,
  INITIAL_INVOICES,
  INITIAL_MARKET_RATES,
  PARTNER_ITEM_DICTIONARY,
} from '../data/mockInboundData';
import { useToast } from '../../../shared/contexts/FeedbackContext';

const InboundHubContext = createContext(null);

export function InboundHubProvider({ children }) {
  const toast = useToast();
  const [marketRates, setMarketRates] = useState(INITIAL_MARKET_RATES);
  const [containers, setContainers] = useState(INITIAL_CONTAINERS);
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [tagCounter, setTagCounter] = useState(9);

  const updateMarketRate = (field, value) => {
    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric <= 0) return;
    setMarketRates((prev) => ({
      ...prev,
      [field]: numeric,
      updatedDate: '04/11/2026 09:00',
    }));
  };

  const generateContainerTags = (containerId) => {
    let nextSeq = tagCounter;
    setContainers((prev) =>
      prev.map((cnt) => {
        if (cnt.containerId !== containerId) return cnt;
        const updatedItems = cnt.items.map((item) => {
          if (item.tagGenerated) return item;
          const startTag = `RM-2611-${String(nextSeq).padStart(4, '0')}`;
          const endTag = `RM-2611-${String(nextSeq + item.palletCount - 1).padStart(4, '0')}`;
          nextSeq += item.palletCount;
          return {
            ...item,
            tagGenerated: true,
            tagRange: item.palletCount > 1 ? `${startTag} ถึง ${endTag}` : startTag,
          };
        });
        return { ...cnt, items: updatedItems };
      })
    );
    setTagCounter(nextSeq);
    toast.success('สร้างป้าย RM Serial Tag (สถานะ PENDING) สำหรับเตรียมรับเข้าคลังสำเร็จ');
  };

  // NOTE: Intentionally >50 lines — handles atomic container item receiving & cross-status derivation
  const recordContainerReceiving = (containerId, receivedEntries) => {
    let hasDiscrepancy = false;
    setContainers((prev) =>
      prev.map((cnt) => {
        if (cnt.containerId !== containerId) return cnt;
        const updatedItems = cnt.items.map((item) => {
          const entry = receivedEntries[item.contItemId];
          if (!entry) return item;
          const actualQty = Number(entry.actualReceivedQty);
          const damagedQty = Number(entry.damagedQty || 0);
          if (actualQty !== item.packedQty || damagedQty > 0) {
            hasDiscrepancy = true;
          }
          return {
            ...item,
            actualReceivedQty: actualQty,
            damagedQty,
            discrepancyRemark: entry.discrepancyRemark || '',
            receivedBy: 'เจ้าหน้าที่คลังสินค้า (บันทึกผ่านหน้างาน)',
            receivedAt: '04/11/2026 10:45',
          };
        });
        return {
          ...cnt,
          status: hasDiscrepancy ? 'DISCREPANCY' : 'COMPLETED',
          completedAt: '04/11/2026 10:45',
          items: updatedItems,
        };
      })
    );

    if (hasDiscrepancy) {
      toast.warning('บันทึกยอดรับจริงแล้ว พบส่วนต่าง/ของชำรุด ระบบส่งแจ้งเตือน Discrepancy ไปยังฝ่าย SCM และลูกค้าทันที');
    } else {
      toast.success('ยืนยันรับสินค้าเข้าคลังครบถ้วน อัปเดตสถานะไปยังฝ่าย SCM และพอร์ทัลลูกค้าเรียบร้อยแล้ว');
    }
  };

  const matchAsyncInvoiceToContainer = (invoiceId, containerId) => {
    const targetCnt = containers.find((c) => c.containerId === containerId);
    if (!targetCnt) return;

    setContainers((prev) =>
      prev.map((cnt) =>
        cnt.containerId === containerId
          ? { ...cnt, linkedInvoiceIds: Array.from(new Set([...cnt.linkedInvoiceIds, invoiceId])) }
          : cnt
      )
    );

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.invoiceId !== invoiceId) return inv;
        const updatedLines = inv.lines.map((line) => {
          const matchItem = targetCnt.items.find((i) => i.customerPartNo === line.customerPartNo);
          if (!matchItem) return line;
          return {
            ...line,
            containerBreakdown: [
              ...line.containerBreakdown,
              { containerId: targetCnt.containerId, containerNo: targetCnt.containerNo, qty: matchItem.packedQty },
            ],
          };
        });
        return {
          ...inv,
          containerIds: Array.from(new Set([...inv.containerIds, containerId])),
          scmNote: `ผูกความสัมพันธ์กับตู้ ${targetCnt.containerNo} ที่รับเข้าคลังล่วงหน้าเรียบร้อยแล้ว`,
          lines: updatedLines,
        };
      })
    );
    toast.success(`ผูกเอกสารอินวอยซ์เข้ากับตู้สินค้า ${targetCnt.containerNo} เรียบร้อยแล้ว`);
  };

  const updateInvoicePriceDecision = (invoiceId, status, scmNote = '') => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.invoiceId === invoiceId ? { ...inv, priceApprovalStatus: status, scmNote } : inv
      )
    );
    if (status === 'APPROVED') {
      toast.success('อนุมัติผลการตรวจสอบราคาเรียบร้อย พร้อมส่งข้อมูลทำรับเข้าบัญชี/SAP');
    } else {
      toast.warning('บันทึกการทักท้วงราคา (Price Dispute) และแจ้งเตือนไปยังพอร์ทัลของลูกค้าแล้ว');
    }
  };

  // NOTE: Intentionally >50 lines — builds linked invoice + multiple container manifests in one atomic submit
  const submitExtractedShipment = (extractedData, uploadedSource = 'PARTNER_PORTAL') => {
    const exists = invoices.some((inv) => inv.invoiceNo === extractedData.invoiceNo);
    const suffix = exists ? `-${Math.floor(10 + Math.random() * 89)}` : '';
    const newInvoiceId = `INV-${Date.now()}`;

    const createdContainers = extractedData.containers.map((c, idx) => {
      const containerId = `CNT-NEW-${Date.now()}-${idx}`;
      const items = extractedData.lines
        .filter((line) => (line.allocations[c.tempId] || 0) > 0)
        .map((line, lIdx) => {
          const qty = line.allocations[c.tempId];
          const spec = PARTNER_ITEM_DICTIONARY[line.customerPartNo];
          const palletCount = Math.max(1, Math.ceil(qty / (spec?.stdPalletQty || 200)));
          return {
            contItemId: `CI-NEW-${Date.now()}-${idx}-${lIdx}`,
            customerPartNo: line.customerPartNo,
            sapNo: line.sapNo,
            partDescription: line.partDescription,
            uom: line.uom,
            packedQty: qty,
            palletCount,
            actualReceivedQty: null,
            damagedQty: 0,
            discrepancyRemark: '',
            tagGenerated: false,
            tagRange: '',
            receivedBy: null,
            receivedAt: null,
          };
        });

      return {
        tempId: c.tempId,
        containerId,
        partnerId: extractedData.partnerId,
        containerNo: `${c.containerNo}${suffix}`,
        sealNo: c.sealNo,
        truckLicense: c.truckLicense,
        etaDatetime: c.etaDatetime,
        arrivedAt: idx === 0 ? '04/11/2026 11:00' : null,
        completedAt: null,
        status: idx === 0 ? 'ARRIVED_GATE' : 'IN_TRANSIT',
        linkedInvoiceIds: [newInvoiceId],
        items,
      };
    });

    const newInvoice = {
      invoiceId: newInvoiceId,
      partnerId: extractedData.partnerId,
      partnerName: extractedData.partnerName,
      invoiceNo: `${extractedData.invoiceNo}${suffix}`,
      invoiceDate: extractedData.invoiceDate,
      currency: extractedData.currency,
      uploadedSource,
      priceApprovalStatus: 'MATCHED',
      scmNote: '',
      containerIds: createdContainers.map((c) => c.containerId),
      lines: extractedData.lines.map((line, idx) => ({
        invLineId: `IL-NEW-${Date.now()}-${idx}`,
        customerPartNo: line.customerPartNo,
        sapNo: line.sapNo,
        partDescription: line.partDescription,
        uom: line.uom,
        invoicedQty: line.invoicedQty,
        docUnitPrice: line.docUnitPrice,
        containerBreakdown: createdContainers
          .filter((c) => (line.allocations[c.tempId] || 0) > 0)
          .map((c) => ({
            containerId: c.containerId,
            containerNo: c.containerNo,
            qty: line.allocations[c.tempId],
          })),
      })),
    };

    setContainers((prev) => [...createdContainers, ...prev]);
    setInvoices((prev) => [newInvoice, ...prev]);
    toast.success(`นำเข้าข้อมูล ${newInvoice.invoiceNo} (${createdContainers.length} ตู้สินค้า) สำเร็จ ข้อมูลซิงค์ไปยัง SCM และ Store ทันที`);
  };

  const resetDemoData = () => {
    setMarketRates(INITIAL_MARKET_RATES);
    setContainers(INITIAL_CONTAINERS);
    setInvoices(INITIAL_INVOICES);
    setTagCounter(9);
    toast.info('รีเซ็ตข้อมูลจำลองกลับสู่ค่าเริ่มต้นสำหรับการนำเสนอเรียบร้อยแล้ว');
  };

  return (
    <InboundHubContext.Provider
      value={{
        marketRates,
        containers,
        invoices,
        updateMarketRate,
        generateContainerTags,
        recordContainerReceiving,
        matchAsyncInvoiceToContainer,
        updateInvoicePriceDecision,
        submitExtractedShipment,
        resetDemoData,
      }}
    >
      {children}
    </InboundHubContext.Provider>
  );
}

export function useInboundHub() {
  const ctx = useContext(InboundHubContext);
  if (!ctx) throw new Error('useInboundHub must be used within InboundHubProvider');
  return ctx;
}
