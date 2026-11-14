import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, Edit3, Printer, QrCode, RefreshCw, RotateCcw,
  Search, ShoppingBag, Trash2, Usb, X
} from 'lucide-react';
import Pagination from '../../../shared/components/Pagination';
import { productionApi } from '../../../shared/services/productionApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import ItemSearchSelect from './ItemSearchSelect';
import { PrintableTagSheet } from './PrintableTagSheet';
import {
  buildLotCode,
  buildTransferQrUrl,
  connectUsbPrinter,
  disconnectUsbPrinter,
  isUsbPrinterConnected,
  isWebSerialSupported,
  parseTransferScanCode,
  parseUuidParts,
  printSheetElementHtml,
  sendZplBatchToUsb,
} from '../utils/thermalPrinter';

const todayIso = () => new Date().toISOString().slice(0, 10);

const TAG_STATUS_BADGE = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  SHIPPED: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  SOLD: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  CANCELLED: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
};

/**
 * Thermal 4"x2" WIP/FG Tag Printer & QR Transfer Confirmation Workspace.
 */
export default function TagPrinterTab({ metadata, isOffline, initialTransferId = '', initialSubMode = 'printer' }) {
  const toast = useToast();
  const confirm = useConfirm();
  const printSheetRef = useRef(null);

  const [subMode, setSubMode] = useState(initialSubMode === 'transfer' ? 'transfer' : 'printer');
  const [usbConnected, setUsbConnected] = useState(() => isUsbPrinterConnected());

  // Tag Generation Form State
  const [form, setForm] = useState({
    item_id: '',
    quantity: '1',
    total_lot_qty: '100',
    print_count: '1',
    parent_lot: '',
    from_location_id: '',
    to_location_id: '',
    prod_date: todayIso(),
    notes: '',
  });
  const [selectedItemObj, setSelectedItemObj] = useState(null);
  const [lotAutoLocked, setLotAutoLocked] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // History State
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [historyRows, setHistoryRows] = useState([]);
  const [summary, setSummary] = useState({});
  const [totalItems, setTotalItems] = useState(0);
  const [selectedUuids, setSelectedUuids] = useState([]);
  const [loading, setLoading] = useState(false);

  // Print queue rendered in PrintableTagSheet
  const [labelsToPrint, setLabelsToPrint] = useState([]);

  // Range Print & Bulk Edit Modals
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [rangeForm, setRangeForm] = useState({ lot_no: '', start_no: '1', end_no: '10' });
  const [editTagModal, setEditTagModal] = useState(null);
  const [editTagForm, setEditTagForm] = useState({ quantity: '', from_location_id: '', prod_date: todayIso(), notes: '' });

  // Transfer QR Mode State
  const [scanInput, setScanInput] = useState(initialTransferId);
  const [scannedOrder, setScannedOrder] = useState(null);
  const [rerouteLocId, setRerouteLocId] = useState('');
  const [confirmQty, setConfirmQty] = useState('');
  const [pendingQueueType, setPendingQueueType] = useState('receive'); // receive | sell
  const [pendingQueueRows, setPendingQueueRows] = useState([]);
  const [bulkQueueSelected, setBulkQueueSelected] = useState([]);

  const locations = metadata?.locations || [];
  const items = metadata?.items || [];

  // Auto-build parent_lot when item/date/lotQty changes if auto-lot is active
  useEffect(() => {
    if (!lotAutoLocked || !selectedItemObj) return;
    const key = selectedItemObj.sku || selectedItemObj.sap_no;
    const nextLot = buildLotCode(key, form.prod_date, form.total_lot_qty);
    setForm((prev) => ({ ...prev, parent_lot: nextLot }));
  }, [lotAutoLocked, selectedItemObj, form.prod_date, form.total_lot_qty]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productionApi.getLabelHistory({
        status: statusFilter,
        search: search.trim(),
        page,
        limit: pageSize,
      });
      setHistoryRows(res?.data?.rows || []);
      setSummary(res?.data?.summary || {});
      setTotalItems(res?.data?.pagination?.total || 0);
    } catch {
      // Handled globally
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, page, pageSize]);

  const loadPendingQueue = useCallback(async () => {
    try {
      const fn = pendingQueueType === 'receive' ? productionApi.getPendingReceive : productionApi.getPendingSell;
      const res = await fn({ limit: 50 });
      setPendingQueueRows(res?.data?.rows || []);
    } catch {
      // Handled globally
    }
  }, [pendingQueueType]);

  useEffect(() => {
    if (subMode === 'printer') {
      const t = setTimeout(() => loadHistory(), 200);
      return () => clearTimeout(t);
    }
    loadPendingQueue();
    return undefined;
  }, [subMode, loadHistory, loadPendingQueue]);

  // If URL carries transfer_id, look it up automatically
  useEffect(() => {
    if (!initialTransferId) return;
    setSubMode('transfer');
    const clean = parseTransferScanCode(initialTransferId);
    setScanInput(clean);
    productionApi
      .getTransferDetails(clean)
      .then((res) => {
        if (res?.data) {
          setScannedOrder(res.data);
          setRerouteLocId(String(res.data.to_location_id || ''));
          setConfirmQty(String(Math.floor(Number(res.data.quantity || 0))));
        }
      })
      .catch(() => {});
  }, [initialTransferId]);

  const triggerPrintBatch = useCallback(
    async (labelObjects) => {
      if (!labelObjects || labelObjects.length === 0) return;
      const prepared = labelObjects.map((lbl) => ({
        ...lbl,
        qr_url: buildTransferQrUrl(lbl.transfer_uuid),
      }));

      if (isUsbPrinterConnected()) {
        try {
          await sendZplBatchToUsb(prepared);
          toast.success(`ส่งคำสั่งพิมพ์ ZPL ผ่าน USB จำนวน ${prepared.length} ดวงสำเร็จ`);
          return;
        } catch (err) {
          toast.warning(`USB Print ล้มเหลว (${err.message}) กำลังสลับไปโหมดพิมพ์ผ่านเบราว์เซอร์`);
        }
      }

      setLabelsToPrint(prepared);
      setTimeout(() => {
        if (printSheetRef.current) {
          printSheetElementHtml(printSheetRef.current.innerHTML, `WIP_FG_Tags_${prepared.length}`);
        }
      }, 150);
    },
    [toast]
  );

  const handleToggleUsb = async () => {
    try {
      if (usbConnected) {
        await disconnectUsbPrinter();
        setUsbConnected(false);
        toast.info('ตัดการเชื่อมต่อเครื่องพิมพ์ USB แล้ว');
      } else {
        await connectUsbPrinter();
        setUsbConnected(true);
        toast.success('เชื่อมต่อเครื่องพิมพ์ ZPL (USB Serial) สำเร็จ');
      }
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถเชื่อมต่อเครื่องพิมพ์ USB ได้');
    }
  };

  const handleItemSelect = (item) => {
    setSelectedItemObj(item);
    setForm((prev) => ({
      ...prev,
      item_id: item ? String(item.item_id) : '',
      quantity: item && Number(item.CTN) > 0 ? String(Math.floor(Number(item.CTN))) : prev.quantity,
    }));
  };

  const handleCreateAndPrint = async (e) => {
    e.preventDefault();
    if (isOffline) return toast.warning('ขณะนี้อยู่ในโหมด Offline');
    if (!form.item_id || !form.from_location_id || !form.to_location_id || !form.parent_lot) {
      return toast.warning('กรุณากรอกข้อมูลสินค้า ต้นทาง ปลายทาง และเลข Lot ให้ครบถ้วน');
    }

    setSubmitting(true);
    try {
      const res = await productionApi.createBatchLabels({
        parent_lot: form.parent_lot.trim().toUpperCase(),
        print_count: Number(form.print_count),
        item_id: Number(form.item_id),
        quantity: Number(form.quantity),
        from_location_id: Number(form.from_location_id),
        to_location_id: Number(form.to_location_id),
        prod_date: form.prod_date,
        notes: form.notes.trim(),
      });
      const created = res?.data?.labels || [];
      toast.success(res?.message || `สร้างแท็กสำเร็จ ${created.length} ดวง`);
      loadHistory();

      if (created.length > 0) {
        const uuids = created.map((l) => l.transfer_uuid);
        const detailRes = await productionApi.getLabelsByRange({ uuids });
        await triggerPrintBatch(detailRes?.data || []);
      }
    } catch {
      // Handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const handleReprintSingle = async (uuid) => {
    try {
      const res = await productionApi.getTransferDetails(uuid);
      if (res?.data) await triggerPrintBatch([res.data]);
    } catch {
      // Handled globally
    }
  };

  const handleBatchPrintSelected = async () => {
    if (selectedUuids.length === 0) return;
    try {
      const res = await productionApi.getLabelsByRange({ uuids: selectedUuids });
      await triggerPrintBatch(res?.data || []);
    } catch {
      // Handled globally
    }
  };

  const handleRangePrint = async (e) => {
    e.preventDefault();
    try {
      const res = await productionApi.getLabelsByRange({
        lot_no: rangeForm.lot_no.trim().toUpperCase(),
        start_no: Number(rangeForm.start_no),
        end_no: Number(rangeForm.end_no),
      });
      const list = res?.data || [];
      if (list.length === 0) return toast.warning('ไม่พบสติ๊กเกอร์ในช่วงเลขรันที่ระบุ');
      setRangeModalOpen(false);
      await triggerPrintBatch(list);
    } catch {
      // Handled globally
    }
  };

  const handleCancelSingleTag = async (uuid) => {
    if (isOffline) return;
    const ok = await confirm({
      title: `ยกเลิกแท็ก ${uuid}?`,
      message: 'เฉพาะแท็กสถานะ PENDING เท่านั้นที่สามารถยกเลิกและคืนเลขรันได้',
      confirmText: 'ยืนยันยกเลิกแท็ก',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await productionApi.cancelLabel(uuid);
      toast.success(res?.message || 'ยกเลิกแท็กสำเร็จ');
      loadHistory();
    } catch {
      // Handled globally
    }
  };

  const handleSaveEditTag = async (e) => {
    e.preventDefault();
    if (!editTagModal || isOffline) return;
    setSubmitting(true);
    try {
      const res = await productionApi.updateLabel({
        transfer_uuid: editTagModal.transfer_uuid,
        item_id: editTagModal.item_id,
        quantity: Number(editTagForm.quantity),
        from_location_id: Number(editTagForm.from_location_id),
        prod_date: editTagForm.prod_date,
        notes: editTagForm.notes.trim(),
      });
      toast.success(res?.message || 'อัปเดตสติ๊กเกอร์สำเร็จ');
      setEditTagModal(null);
      loadHistory();
    } catch {
      // Handled globally
    } finally {
      setSubmitting(false);
    }
  };

  // --- Transfer Scanner Handlers ---
  const handleLookupTag = async (e) => {
    e?.preventDefault?.();
    const uuid = parseTransferScanCode(scanInput);
    if (!uuid) return;
    try {
      const res = await productionApi.getTransferDetails(uuid);
      if (res?.data) {
        setScannedOrder(res.data);
        setRerouteLocId(String(res.data.to_location_id || ''));
        setConfirmQty(String(Math.floor(Number(res.data.quantity || 0))));
      }
    } catch {
      setScannedOrder(null);
    }
  };

  const handleConfirmScannedTransfer = async () => {
    if (!scannedOrder || isOffline) return;
    try {
      const res = await productionApi.confirmTransfer({
        transfer_uuid: scannedOrder.transfer_uuid,
        confirmed_quantity: Number(confirmQty || scannedOrder.quantity),
        to_location_id: rerouteLocId ? Number(rerouteLocId) : null,
      });
      toast.success(res?.message || 'รับเข้าคลังสำเร็จ');
      const refresh = await productionApi.getTransferDetails(scannedOrder.transfer_uuid);
      setScannedOrder(refresh?.data || null);
      loadPendingQueue();
    } catch {
      // Handled globally
    }
  };

  const handleReverseScannedTransfer = async () => {
    if (!scannedOrder || isOffline) return;
    const ok = await confirm({
      title: `ตีกลับแท็ก ${scannedOrder.transfer_uuid}?`,
      message: 'ยอดสต็อกจะถูกย้อนกลับและเปลี่ยนสถานะแท็กเป็น PENDING',
      confirmText: 'ยืนยันตีกลับ (Reverse)',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await productionApi.reverseTransfer(scannedOrder.transfer_uuid);
      toast.success(res?.message || 'ตีกลับเป็น PENDING แล้ว');
      const refresh = await productionApi.getTransferDetails(scannedOrder.transfer_uuid);
      setScannedOrder(refresh?.data || null);
      loadPendingQueue();
    } catch {
      // Handled globally
    }
  };

  const handleScanSale = async () => {
    if (!scannedOrder || isOffline) return;
    const ok = await confirm({
      title: `ยืนยันตัดขาย/โหลดส่ง ${scannedOrder.transfer_uuid}?`,
      message: `จำนวน ${Number(scannedOrder.quantity).toLocaleString()} ชิ้นจะถูกตัดออกจากคลังปลายทาง`,
      confirmText: 'ยืนยันตัดส่งขาย (SHIPPED)',
    });
    if (!ok) return;
    try {
      const res = await productionApi.executeScanSale(scannedOrder.transfer_uuid);
      toast.success(res?.message || 'บันทึกจัดส่งขายเรียบร้อย');
      const refresh = await productionApi.getTransferDetails(scannedOrder.transfer_uuid);
      setScannedOrder(refresh?.data || null);
      loadPendingQueue();
    } catch {
      // Handled globally
    }
  };

  const handleBulkQueueExecute = async () => {
    if (bulkQueueSelected.length === 0 || isOffline) return;
    try {
      const res =
        pendingQueueType === 'receive'
          ? await productionApi.bulkConfirmTransfer(bulkQueueSelected)
          : await productionApi.bulkExecuteScanSale(bulkQueueSelected);
      toast.success(res?.message || 'ดำเนินการแบบกลุ่มสำเร็จ');
      setBulkQueueSelected([]);
      loadPendingQueue();
    } catch {
      // Handled globally
    }
  };

  return (
    <div className="space-y-4">
      <PrintableTagSheet ref={printSheetRef} labels={labelsToPrint} />

      {/* Sub-mode + Printer Connection Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubMode('printer')}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-xs font-bold ${
              subMode === 'printer'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Printer className="h-4 w-4" />
            พิมพ์แท็ก WIP / FG (4"×2")
          </button>
          <button
            type="button"
            onClick={() => setSubMode('transfer')}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-xs font-bold ${
              subMode === 'transfer'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <QrCode className="h-4 w-4" />
            สแกนรับเข้า / ตีกลับ / ตัดขาย
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleUsb}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3.5 text-xs font-bold ${
              usbConnected
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            <Usb className="h-4 w-4" />
            {usbConnected
              ? 'เชื่อมต่อ ZPL USB แล้ว'
              : isWebSerialSupported()
                ? 'เชื่อมต่อเครื่องพิมพ์ ZPL (USB)'
                : 'โหมดพิมพ์ผ่านเบราว์เซอร์'}
          </button>
        </div>
      </div>

      {subMode === 'printer' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* Left: Tag Generator Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs xl:col-span-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-extrabold text-slate-900 dark:text-white">
              สร้างและสั่งพิมพ์สติ๊กเกอร์ 4"×2"
            </h3>
            <form onSubmit={handleCreateAndPrint} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">สินค้า (SAP / Part No) *</label>
                <ItemSearchSelect items={items} value={form.item_id} onSelect={handleItemSelect} />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold">บรรจุต่อกล่อง (Qty) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={form.quantity}
                    onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">จำนวนดวง (สูงสุด 500) *</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    step="1"
                    required
                    value={form.print_count}
                    onChange={(e) => setForm((p) => ({ ...p, print_count: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mb-1 block text-xs font-semibold">วันที่ผลิต (MFG Date)</label>
                  <input
                    type="date"
                    value={form.prod_date}
                    onChange={(e) => setForm((p) => ({ ...p, prod_date: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">ยอดรวม Lot (ใช้สร้างรหัส Lot)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.total_lot_qty}
                    onChange={(e) => setForm((p) => ({ ...p, total_lot_qty: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-semibold">รหัส Lot ต้นฉบับ (Parent Lot) *</label>
                  <button
                    type="button"
                    onClick={() => setLotAutoLocked((p) => !p)}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    {lotAutoLocked ? 'แก้ไขรหัส Lot เอง' : 'สร้างรหัส Lot อัตโนมัติ'}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={form.parent_lot}
                  onChange={(e) => {
                    setLotAutoLocked(false);
                    setForm((p) => ({ ...p, parent_lot: e.target.value.toUpperCase() }));
                  }}
                  placeholder="เช่น SKU-1126-100"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm font-bold uppercase dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">สถานีต้นทาง (From) *</label>
                  <select
                    required
                    value={form.from_location_id}
                    onChange={(e) => setForm((p) => ({ ...p, from_location_id: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">-- เลือกต้นทาง --</option>
                    {locations.map((l) => (
                      <option key={l.location_id} value={l.location_id}>
                        {l.location_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">คลังปลายทาง (To) *</label>
                  <select
                    required
                    value={form.to_location_id}
                    onChange={(e) => setForm((p) => ({ ...p, to_location_id: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">-- เลือกปลายทาง --</option>
                    {locations.map((l) => (
                      <option key={l.location_id} value={l.location_id}>
                        {l.location_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">หมายเหตุ</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Remark บนสติ๊กเกอร์ (ถ้ามี)"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || isOffline}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Printer className="h-4 w-4" />
                {submitting ? 'กำลังสร้างแท็ก...' : 'บันทึกและสั่งพิมพ์แท็ก'}
              </button>
            </form>
          </div>

          {/* Right: Label History & Batch Controls */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs xl:col-span-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-xl bg-amber-50 p-2.5 text-xs dark:bg-amber-950/40">
                <div className="font-semibold text-amber-700 dark:text-amber-300">รอรับเข้า (PENDING)</div>
                <div className="text-lg font-black text-amber-900 dark:text-amber-100">{Number(summary.total_pending || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-2.5 text-xs dark:bg-emerald-950/40">
                <div className="font-semibold text-emerald-700 dark:text-emerald-300">รับเข้าแล้ว (COMPLETED)</div>
                <div className="text-lg font-black text-emerald-900 dark:text-emerald-100">{Number(summary.total_completed || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-xl bg-blue-50 p-2.5 text-xs dark:bg-blue-950/40">
                <div className="font-semibold text-blue-700 dark:text-blue-300">ตัดขายแล้ว (SHIPPED)</div>
                <div className="text-lg font-black text-blue-900 dark:text-blue-100">{Number(summary.total_shipped || 0).toLocaleString()}</div>
              </div>
              <div className="rounded-xl bg-rose-50 p-2.5 text-xs dark:bg-rose-950/40">
                <div className="font-semibold text-rose-700 dark:text-rose-300">ยกเลิก (CANCELLED)</div>
                <div className="text-lg font-black text-rose-900 dark:text-rose-100">{Number(summary.total_cancelled || 0).toLocaleString()}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="ค้นหา UUID, Lot, SAP No, Part No..."
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                aria-label="กรองสถานะแท็ก"
                className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="ACTIVE">ไม่รวมที่ยกเลิก (ACTIVE)</option>
                <option value="PENDING">รอรับเข้า (PENDING)</option>
                <option value="COMPLETED">รับเข้าแล้ว (COMPLETED)</option>
                <option value="SHIPPED">จัดส่งแล้ว (SHIPPED)</option>
                <option value="ALL">ทั้งหมด</option>
              </select>
              <button
                type="button"
                onClick={() => setRangeModalOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
              >
                <Printer className="h-4 w-4" /> พิมพ์ตามช่วง Lot
              </button>
              {selectedUuids.length > 0 && (
                <button
                  type="button"
                  onClick={handleBatchPrintSelected}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white"
                >
                  <Printer className="h-4 w-4" /> พิมพ์ที่เลือก ({selectedUuids.length})
                </button>
              )}
              <button
                type="button"
                onClick={loadHistory}
                className="flex min-h-[44px] w-11 items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="w-9 px-2.5 py-2.5">
                      <input
                        type="checkbox"
                        checked={historyRows.length > 0 && selectedUuids.length === historyRows.length}
                        onChange={(e) =>
                          setSelectedUuids(e.target.checked ? historyRows.map((r) => r.transfer_uuid) : [])
                        }
                      />
                    </th>
                    <th className="px-3 py-2.5">Tag UUID / Lot</th>
                    <th className="px-3 py-2.5">SAP / Part No</th>
                    <th className="px-3 py-2.5 text-right">จำนวน</th>
                    <th className="px-3 py-2.5">สถานะ</th>
                    <th className="px-3 py-2.5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyRows.map((row) => {
                    const checked = selectedUuids.includes(row.transfer_uuid);
                    const { displayLot } = parseUuidParts(row.transfer_uuid);
                    return (
                      <tr key={row.transfer_uuid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-2.5 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedUuids((prev) =>
                                e.target.checked
                                  ? [...prev, row.transfer_uuid]
                                  : prev.filter((id) => id !== row.transfer_uuid)
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-mono font-bold text-blue-700 dark:text-blue-400">{displayLot}</div>
                          <div className="text-[10px] text-slate-400">
                            {row.from_location_name || '-'} → {row.to_location_name || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-bold">{row.part_no}</div>
                          <div className="text-[11px] text-slate-500">{row.sap_no}</div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-extrabold">
                          {Math.floor(Number(row.quantity || 0)).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${TAG_STATUS_BADGE[row.status] || ''}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-center">
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleReprintSingle(row.transfer_uuid)}
                              aria-label="พิมพ์ซ้ำ"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 dark:border-slate-700"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            {row.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  disabled={isOffline}
                                  onClick={() => {
                                    setEditTagForm({
                                      quantity: String(Math.floor(Number(row.quantity || 0))),
                                      from_location_id: String(row.from_location_id || ''),
                                      prod_date: String(row.prod_date || todayIso()).slice(0, 10),
                                      notes: row.notes || '',
                                    });
                                    setEditTagModal(row);
                                  }}
                                  aria-label="แก้ไขแท็ก"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-amber-600 hover:bg-amber-50 dark:border-slate-700"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isOffline}
                                  onClick={() => handleCancelSingleTag(row.transfer_uuid)}
                                  aria-label="ยกเลิกแท็ก"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {historyRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">ไม่พบประวัติการพิมพ์สติ๊กเกอร์</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setPage(1);
              }}
            />
          </div>
        </div>
      ) : (
        /* Transfer QR Scanner & Batch Receive/Ship Panel */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs lg:col-span-5 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-extrabold">สแกนหรือระบุรหัสแท็ก (Transfer Tag)</h3>
            <form onSubmit={handleLookupTag} className="flex gap-2">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="ยิง QR หรือวาง transfer_uuid..."
                className="min-h-[44px] flex-1 rounded-xl border border-slate-300 px-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="submit"
                className="min-h-[44px] rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700"
              >
                ตรวจสอบ
              </button>
            </form>

            {scannedOrder && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-700 dark:bg-slate-800/60">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-300">
                    {scannedOrder.transfer_uuid}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${TAG_STATUS_BADGE[scannedOrder.status] || ''}`}>
                    {scannedOrder.status}
                  </span>
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{scannedOrder.part_no}</div>
                  <div className="text-slate-500">{scannedOrder.sap_no} • {scannedOrder.part_description}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>ต้นทาง: <strong>{scannedOrder.from_location_name}</strong></div>
                  <div>ปลายทาง: <strong>{scannedOrder.to_location_name}</strong></div>
                </div>

                {scannedOrder.status === 'PENDING' && (
                  <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold">จำนวนรับจริง</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={confirmQty}
                          onChange={(e) => setConfirmQty(e.target.value)}
                          className="min-h-[40px] w-full rounded-lg border border-slate-300 px-2.5 text-sm font-bold dark:border-slate-600 dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold">คลังรับเข้า (เปลี่ยนได้)</label>
                        <select
                          value={rerouteLocId}
                          onChange={(e) => setRerouteLocId(e.target.value)}
                          className="min-h-[40px] w-full rounded-lg border border-slate-300 px-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                        >
                          {locations.map((l) => (
                            <option key={l.location_id} value={l.location_id}>
                              {l.location_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={handleConfirmScannedTransfer}
                      className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" /> ยืนยันรับเข้าสต็อก (Confirm Receive)
                    </button>
                  </div>
                )}

                {scannedOrder.status === 'COMPLETED' && (
                  <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-700">
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={handleScanSale}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700"
                    >
                      <ShoppingBag className="h-4 w-4" /> สแกนตัดขาย (Shipped)
                    </button>
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={handleReverseScannedTransfer}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:bg-slate-900"
                    >
                      <RotateCcw className="h-4 w-4" /> ตีกลับ (Reverse)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs lg:col-span-7 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPendingQueueType('receive');
                    setBulkQueueSelected([]);
                  }}
                  className={`min-h-[40px] rounded-xl px-3 text-xs font-bold ${
                    pendingQueueType === 'receive' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  คิวรอรับเข้าคลัง (PENDING)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingQueueType('sell');
                    setBulkQueueSelected([]);
                  }}
                  className={`min-h-[40px] rounded-xl px-3 text-xs font-bold ${
                    pendingQueueType === 'sell' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  คิวพร้อมจัดส่งขาย (COMPLETED)
                </button>
              </div>
              {bulkQueueSelected.length > 0 && (
                <button
                  type="button"
                  disabled={isOffline}
                  onClick={handleBulkQueueExecute}
                  className="min-h-[40px] rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white"
                >
                  {pendingQueueType === 'receive' ? 'ยืนยันรับเข้ากลุ่ม' : 'ตัดส่งขายกลุ่ม'} ({bulkQueueSelected.length})
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                  <tr>
                    <th className="w-9 px-2.5 py-2">
                      <input
                        type="checkbox"
                        checked={pendingQueueRows.length > 0 && bulkQueueSelected.length === pendingQueueRows.length}
                        onChange={(e) =>
                          setBulkQueueSelected(e.target.checked ? pendingQueueRows.map((r) => r.transfer_uuid) : [])
                        }
                      />
                    </th>
                    <th className="px-3 py-2">Tag UUID</th>
                    <th className="px-3 py-2">สินค้า</th>
                    <th className="px-3 py-2 text-right">จำนวน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingQueueRows.map((q) => (
                    <tr
                      key={q.transfer_uuid}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      onClick={() => {
                        setScanInput(q.transfer_uuid);
                        productionApi.getTransferDetails(q.transfer_uuid).then((res) => {
                          if (res?.data) {
                            setScannedOrder(res.data);
                            setRerouteLocId(String(res.data.to_location_id || ''));
                            setConfirmQty(String(Math.floor(Number(res.data.quantity || 0))));
                          }
                        });
                      }}
                    >
                      <td className="px-2.5 py-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={bulkQueueSelected.includes(q.transfer_uuid)}
                          onChange={(e) =>
                            setBulkQueueSelected((prev) =>
                              e.target.checked
                                ? [...prev, q.transfer_uuid]
                                : prev.filter((id) => id !== q.transfer_uuid)
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-indigo-700 dark:text-indigo-300">{q.transfer_uuid}</td>
                      <td className="px-3 py-2">
                        <div className="font-bold">{q.part_no}</div>
                        <div className="text-[10px] text-slate-500">{q.sap_no}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{Math.floor(Number(q.quantity)).toLocaleString()}</td>
                    </tr>
                  ))}
                  {pendingQueueRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">ไม่มีรายการค้างในคิวนี้</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Range Print Modal */}
      {rangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">พิมพ์สติ๊กเกอร์ตามช่วง Lot (Range Print)</h3>
              <button type="button" onClick={() => setRangeModalOpen(false)}>
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleRangePrint} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">เลข Parent Lot *</label>
                <input
                  type="text"
                  required
                  value={rangeForm.lot_no}
                  onChange={(e) => setRangeForm((p) => ({ ...p, lot_no: e.target.value.toUpperCase() }))}
                  placeholder="เช่น 70341-1126-104"
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 font-mono text-sm uppercase dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">ตั้งแต่ดวงที่</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={rangeForm.start_no}
                    onChange={(e) => setRangeForm((p) => ({ ...p, start_no: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-center text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">ถึงดวงที่</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={rangeForm.end_no}
                    onChange={(e) => setRangeForm((p) => ({ ...p, end_no: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-center text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setRangeModalOpen(false)} className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-bold">
                  ยกเลิก
                </button>
                <button type="submit" className="min-h-[44px] rounded-xl bg-blue-600 px-5 text-xs font-bold text-white">
                  สั่งพิมพ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Single Pending Tag Modal */}
      {editTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="mb-3 text-base font-bold">แก้ไขสติ๊กเกอร์ {editTagModal.transfer_uuid}</h3>
            <form onSubmit={handleSaveEditTag} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">บรรจุต่อกล่อง (Qty) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editTagForm.quantity}
                  onChange={(e) => setEditTagForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">สถานีต้นทาง</label>
                <select
                  value={editTagForm.from_location_id}
                  onChange={(e) => setEditTagForm((p) => ({ ...p, from_location_id: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  {locations.map((l) => (
                    <option key={l.location_id} value={l.location_id}>
                      {l.location_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">วันที่ผลิต (MFG Date)</label>
                <input
                  type="date"
                  value={editTagForm.prod_date}
                  onChange={(e) => setEditTagForm((p) => ({ ...p, prod_date: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">หมายเหตุ</label>
                <input
                  type="text"
                  value={editTagForm.notes}
                  onChange={(e) => setEditTagForm((p) => ({ ...p, notes: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditTagModal(null)} className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-bold">
                  ยกเลิก
                </button>
                <button type="submit" disabled={submitting} className="min-h-[44px] rounded-xl bg-amber-600 px-5 text-xs font-bold text-white">
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
