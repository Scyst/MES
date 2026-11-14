import React, { useEffect, useState } from 'react';
import { Copy, Plus, Save, Search, Trash2, Wand2, X } from 'lucide-react';
import { autoInvoiceApi } from '../../../shared/services/autoInvoiceApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { formatDecimal } from '../utils/invoiceHelpers';

const EMPTY_ITEM = {
  sku: '',
  product_type: '',
  description: '',
  po: '',
  carton: '',
  qty: 0,
  price: 0,
  nw: 0,
  gw: 0,
  cbm: 0,
  marks: 'N/M',
};

const EMPTY_CUSTOMER = {
  name: '',
  address: '',
  incoterms: 'FOB LAEM CHABANG,THAILAND',
  consignee: 'SAME AS CONSIGNEE',
  notify_party: 'SAME AS CONSIGNEE',
  payment_terms: 'O/A 30 DAYS AFTER B/L DATE.',
};

const EMPTY_SHIPPING = {
  team_name: '',
  booking_no: '',
  port_loading: 'LAEM CHABANG, THAILAND',
  port_discharge: '',
  feeder_vessel: '',
  mother_vessel: '',
  container_no: '',
  seal_no: '',
  invoice_date: '',
  etd_date: '',
  eta_date: '',
  container_qty: '',
};

const clampDec = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(6, Math.round(n))) : fallback;
};

/**
 * Create / Edit Invoice modal creating versioned snapshots via `sp_Finance_ImportInvoice`.
 */
export default function InvoiceEditModal({ invoiceId = null, isOffline, onClose, onSaved }) {
  const toast = useToast();
  const [loading, setLoading] = useState(Boolean(invoiceId));
  const [saving, setSaving] = useState(false);

  const [invoiceNo, setInvoiceNo] = useState('AUTO');
  const [reportId, setReportId] = useState('');
  const [remark, setRemark] = useState('');
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [shipping, setShipping] = useState(EMPTY_SHIPPING);
  const [details, setDetails] = useState([{ ...EMPTY_ITEM }]);
  const [decimals, setDecimals] = useState({
    weight_decimals: 2,
    price_decimals: 4,
    qty_decimals: 0,
    cbm_decimals: 2,
    amount_decimals: 2,
  });

  const applyBundle = (bundle) => {
    if (!bundle) return;
    setInvoiceNo(bundle.header?.invoice_no || 'AUTO');
    setReportId(bundle.header?.report_id ? String(bundle.header.report_id) : '');
    setCustomer({ ...EMPTY_CUSTOMER, ...(bundle.customer || {}) });
    setShipping({ ...EMPTY_SHIPPING, ...(bundle.shipping || {}) });
    setDecimals({
      weight_decimals: bundle.weight_decimals ?? 2,
      price_decimals: bundle.price_decimals ?? 4,
      qty_decimals: bundle.qty_decimals ?? 0,
      cbm_decimals: bundle.cbm_decimals ?? 2,
      amount_decimals: bundle.amount_decimals ?? 2,
    });
    const lines = Array.isArray(bundle.details) ? bundle.details : [];
    setDetails(
      lines.length > 0
        ? lines.map((d) => ({
            sku: d.sku || '',
            product_type: d.product_type || '',
            description: d.description || '',
            po: d.po_number ?? d.po ?? '',
            carton: d.carton_no ?? d.carton ?? '',
            qty: Number(d.qty_carton ?? d.qty ?? 0),
            price: Number(d.unit_price ?? d.price ?? 0),
            nw: Number(d.net_weight ?? d.nw ?? 0),
            gw: Number(d.gross_weight ?? d.gw ?? 0),
            cbm: Number(d.cbm ?? 0),
            marks: d.shipping_marks ?? d.marks ?? 'N/M',
          }))
        : [{ ...EMPTY_ITEM }],
    );
  };

  useEffect(() => {
    if (!invoiceId) return;
    let active = true;
    setLoading(true);
    autoInvoiceApi
      .getDetail(invoiceId)
      .then((res) => {
        if (active) applyBundle(res.data);
      })
      .catch((err) => {
        if (active) toast.error(err.message || 'ไม่สามารถโหลดข้อมูล Invoice ได้');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [invoiceId, toast]);

  const handleLookupNo = async () => {
    const clean = invoiceNo.trim();
    if (!clean || clean.toUpperCase() === 'AUTO') {
      toast.warning('กรุณากรอกเลข Invoice ที่ต้องการดึงข้อมูล');
      return;
    }
    setLoading(true);
    try {
      const res = await autoInvoiceApi.getByNo(clean);
      applyBundle(res.data);
      toast.success(`โหลดข้อมูล ${clean} สำเร็จ`);
    } catch (err) {
      toast.error(err.message || 'ไม่พบเลข Invoice ดังกล่าว');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDefaults = async () => {
    try {
      const res = await autoInvoiceApi.getLastDefaults();
      const d = res.data || {};
      if (d.customer) setCustomer((c) => ({ ...c, ...d.customer }));
      if (d.shipping) setShipping((s) => ({ ...s, ...d.shipping, invoice_date: s.invoice_date || '' }));
      toast.success('ดึงค่าเริ่มต้นจาก Invoice ล่าสุดเรียบร้อย');
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถดึงค่าเริ่มต้นได้');
    }
  };

  const handleAutofillSku = async (index) => {
    const sku = details[index]?.sku?.trim();
    if (!sku) {
      toast.warning('กรุณากรอกรหัส SKU ก่อนดึงข้อมูล Master');
      return;
    }
    try {
      const res = await autoInvoiceApi.getItemInfo(sku);
      const item = res.data;
      if (!item) return;
      setDetails((cur) =>
        cur.map((line, idx) => {
          if (idx !== index) return line;
          const qty = Number(line.qty || 0);
          return {
            ...line,
            sku: item.sku || line.sku,
            product_type: item.invoice_product_type || line.product_type,
            description: item.invoice_description || item.part_description || line.description,
            price: item.Price_USD != null ? Number(item.Price_USD) : line.price,
            nw: item.net_weight != null && qty > 0 ? Number((Number(item.net_weight) * qty).toFixed(4)) : line.nw,
            gw: item.gross_weight != null && qty > 0 ? Number((Number(item.gross_weight) * qty).toFixed(4)) : line.gw,
            cbm: item.cbm != null && qty > 0 ? Number((Number(item.cbm) * qty).toFixed(4)) : line.cbm,
          };
        }),
      );
      toast.success(`ดึงข้อมูลสินค้า ${item.sku} เรียบร้อย`);
    } catch (err) {
      toast.error(err.message || 'ไม่พบรหัสสินค้าในระบบ Master');
    }
  };

  const updateLine = (idx, field, val) => {
    setDetails((cur) => cur.map((item, i) => (i === idx ? { ...item, [field]: val } : item)));
  };

  const totalAmount = details.reduce((sum, d) => sum + Number(d.qty || 0) * Number(d.price || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isOffline || saving) return;
    if (!customer.name.trim()) {
      toast.error('กรุณาระบุชื่อลูกค้า (Customer Name)');
      return;
    }
    if (!remark.trim()) {
      toast.error('กรุณาระบุหมายเหตุการบันทึก / แก้ไขเวอร์ชัน (Remark)');
      return;
    }
    const cleanDetails = details.filter((d) => d.sku.trim() || d.description.trim());
    if (cleanDetails.length === 0) {
      toast.error('ต้องมีรายการสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    setSaving(true);
    try {
      const res = await autoInvoiceApi.importInvoice({
        invoice_no: invoiceNo.trim() || 'AUTO',
        report_id: reportId ? Number(reportId) : null,
        remark: remark.trim(),
        customer,
        shipping,
        details: cleanDetails,
        decimals,
      });
      toast.success(
        `บันทึก Invoice ${res.data?.invoice_no || ''} (V${res.data?.version || 1}) เรียบร้อยแล้ว`,
      );
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'บันทึก Invoice ไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {invoiceId ? `สร้างเวอร์ชันใหม่ / แก้ไข Invoice: ${invoiceNo}` : 'สร้างหรือแก้ไข Invoice'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ทุกการบันทึกจะสร้างเวอร์ชันใหม่อัตโนมัติ (Version Control) เพื่อเก็บประวัติครบถ้วน
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadDefaults}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 px-3 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700"
            >
              <Copy className="h-4 w-4" />
              <span>ดึงค่าเริ่มต้นล่าสุด</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-5 space-y-5 text-xs">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">กำลังโหลดข้อมูล Invoice...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div>
                  <label className="mb-1 block font-semibold">Invoice No. (หรือ AUTO)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={invoiceNo}
                      onChange={(e) => setInvoiceNo(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 font-mono font-bold dark:border-slate-700 dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleLookupNo}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900"
                      aria-label="ค้นหา Invoice"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-semibold">Loading Report ID (ถ้ามี)</label>
                  <input
                    type="number"
                    value={reportId}
                    onChange={(e) => setReportId(e.target.value)}
                    placeholder="Optional"
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block font-semibold text-red-600">หมายเหตุการบันทึก / แก้ไขเวอร์ชัน (Remark) *</label>
                  <input
                    type="text"
                    required
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="เช่น ออกบิลใหม่ / ปรับแก้ไขจำนวน CBM..."
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              </div>

              {/* Decimal Settings */}
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="mb-2 font-bold text-slate-800 dark:text-slate-200">ตั้งค่าจำนวนทศนิยม (0 - 6 ตำแหน่ง)</div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    ['qty_decimals', 'Qty'],
                    ['price_decimals', 'Unit Price'],
                    ['amount_decimals', 'Amount'],
                    ['weight_decimals', 'N.W / G.W'],
                    ['cbm_decimals', 'CBM'],
                  ].map(([k, lbl]) => (
                    <div key={k}>
                      <label className="mb-1 block text-[11px] text-slate-500">{lbl}</label>
                      <input
                        type="number"
                        min={0}
                        max={6}
                        value={decimals[k]}
                        onChange={(e) => setDecimals({ ...decimals, [k]: clampDec(e.target.value, decimals[k]) })}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer & Shipping */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="font-bold text-slate-800 dark:text-slate-200">ข้อมูลลูกค้าและเงื่อนไข (Customer Info)</div>
                  <div>
                    <label className="mb-1 block font-semibold">Customer Name *</label>
                    <input
                      type="text"
                      required
                      value={customer.name || ''}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold">Customer Address (ใช้ *ข้อความ* เพื่อทำตัวหนา)</label>
                    <textarea
                      rows={2}
                      value={customer.address || ''}
                      onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-semibold">Consignee</label>
                      <textarea
                        rows={2}
                        value={customer.consignee || ''}
                        onChange={(e) => setCustomer({ ...customer, consignee: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold">Notify Party</label>
                      <textarea
                        rows={2}
                        value={customer.notify_party || ''}
                        onChange={(e) => setCustomer({ ...customer, notify_party: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 p-2.5 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block font-semibold">Incoterms</label>
                      <input
                        type="text"
                        value={customer.incoterms || ''}
                        onChange={(e) => setCustomer({ ...customer, incoterms: e.target.value })}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-semibold">Payment Terms</label>
                      <input
                        type="text"
                        value={customer.payment_terms || ''}
                        onChange={(e) => setCustomer({ ...customer, payment_terms: e.target.value })}
                        className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="font-bold text-slate-800 dark:text-slate-200">ข้อมูลเรือและตู้คอนเทนเนอร์ (Shipping Info)</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['team_name', 'Team'],
                      ['booking_no', 'Booking No.'],
                      ['invoice_date', 'Invoice Date (DD/MM/YYYY)'],
                      ['container_qty', 'Container Qty (e.g. 1x40HQ)'],
                      ['etd_date', 'ETD Date (DD/MM/YYYY)'],
                      ['eta_date', 'ETA Date (DD/MM/YYYY)'],
                      ['port_loading', 'Port of Loading'],
                      ['port_discharge', 'Port of Discharge'],
                      ['feeder_vessel', 'Feeder Vessel'],
                      ['mother_vessel', 'Mother Vessel'],
                      ['container_no', 'Container No(s)'],
                      ['seal_no', 'Seal No(s)'],
                    ].map(([field, label]) => (
                      <div key={field}>
                        <label className="mb-1 block font-semibold">{label}</label>
                        <input
                          type="text"
                          value={shipping[field] || ''}
                          onChange={(e) => setShipping({ ...shipping, [field]: e.target.value })}
                          className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    รายการสินค้า ({details.length} รายการ) · ยอดรวม USD {formatDecimal(totalAmount, decimals.amount_decimals)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetails((cur) => [...cur, { ...EMPTY_ITEM }])}
                    className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-blue-600"
                  >
                    <Plus className="h-4 w-4" />
                    <span>เพิ่มแถวสินค้า</span>
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-2 py-2.5 text-left">SKU / Lookup</th>
                        <th className="px-2 py-2.5 text-left">Type &amp; Description</th>
                        <th className="px-2 py-2.5 text-left">PO / Carton / Marks</th>
                        <th className="px-2 py-2.5 text-right">Qty / Price</th>
                        <th className="px-2 py-2.5 text-right">N.W / G.W / CBM</th>
                        <th className="px-2 py-2.5 text-center">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {details.map((line, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-2 align-top min-w-[140px] space-y-1">
                            <input
                              type="text"
                              value={line.sku}
                              onChange={(e) => updateLine(idx, 'sku', e.target.value)}
                              placeholder="SKU"
                              className="w-full rounded border border-slate-300 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-800"
                            />
                            <button
                              type="button"
                              onClick={() => handleAutofillSku(idx)}
                              className="flex w-full items-center justify-center gap-1 rounded bg-blue-50 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300"
                            >
                              <Wand2 className="h-3 w-3" />
                              <span>Auto-fill Master</span>
                            </button>
                          </td>

                          <td className="px-2 py-2 align-top min-w-[200px] space-y-1">
                            <input
                              type="text"
                              value={line.product_type}
                              onChange={(e) => updateLine(idx, 'product_type', e.target.value)}
                              placeholder="Product Type"
                              className="w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                            />
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => updateLine(idx, 'description', e.target.value)}
                              placeholder="Description"
                              className="w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                            />
                          </td>

                          <td className="px-2 py-2 align-top min-w-[170px] space-y-1">
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={line.po}
                                onChange={(e) => updateLine(idx, 'po', e.target.value)}
                                placeholder="PO"
                                className="w-1/2 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                              />
                              <input
                                type="text"
                                value={line.carton}
                                onChange={(e) => updateLine(idx, 'carton', e.target.value)}
                                placeholder="Carton No."
                                className="w-1/2 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                              />
                            </div>
                            <input
                              type="text"
                              value={line.marks}
                              onChange={(e) => updateLine(idx, 'marks', e.target.value)}
                              placeholder="Shipping Marks"
                              className="w-full rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-800"
                            />
                          </td>

                          <td className="px-2 py-2 align-top min-w-[130px] space-y-1">
                            <input
                              type="number"
                              step="any"
                              value={line.qty}
                              onChange={(e) => updateLine(idx, 'qty', e.target.value)}
                              placeholder="Qty"
                              className="w-full rounded border border-slate-300 px-2 py-1 text-right font-mono dark:border-slate-700 dark:bg-slate-800"
                            />
                            <input
                              type="number"
                              step="any"
                              value={line.price}
                              onChange={(e) => updateLine(idx, 'price', e.target.value)}
                              placeholder="Unit Price"
                              className="w-full rounded border border-slate-300 px-2 py-1 text-right font-mono dark:border-slate-700 dark:bg-slate-800"
                            />
                            <div className="text-right text-[11px] font-bold text-emerald-600">
                              ${formatDecimal(Number(line.qty || 0) * Number(line.price || 0), decimals.amount_decimals)}
                            </div>
                          </td>

                          <td className="px-2 py-2 align-top min-w-[140px] space-y-1">
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="any"
                                value={line.nw}
                                onChange={(e) => updateLine(idx, 'nw', e.target.value)}
                                placeholder="N.W"
                                className="w-1/2 rounded border border-slate-300 px-1.5 py-1 text-right font-mono dark:border-slate-700 dark:bg-slate-800"
                              />
                              <input
                                type="number"
                                step="any"
                                value={line.gw}
                                onChange={(e) => updateLine(idx, 'gw', e.target.value)}
                                placeholder="G.W"
                                className="w-1/2 rounded border border-slate-300 px-1.5 py-1 text-right font-mono dark:border-slate-700 dark:bg-slate-800"
                              />
                            </div>
                            <input
                              type="number"
                              step="any"
                              value={line.cbm}
                              onChange={(e) => updateLine(idx, 'cbm', e.target.value)}
                              placeholder="CBM"
                              className="w-full rounded border border-slate-300 px-2 py-1 text-right font-mono dark:border-slate-700 dark:bg-slate-800"
                            />
                          </td>

                          <td className="px-2 py-2 align-top text-center">
                            <button
                              type="button"
                              disabled={details.length <= 1}
                              onClick={() => setDetails((cur) => cur.filter((_, i) => i !== idx))}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30"
                              aria-label="ลบแถว"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-semibold dark:border-slate-700"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving || isOffline || loading}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'กำลังบันทึก...' : 'บันทึกเวอร์ชันใหม่ (Save Invoice)'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
