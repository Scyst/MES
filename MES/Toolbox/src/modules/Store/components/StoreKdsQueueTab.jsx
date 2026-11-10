import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardList, PackageCheck, FileCode2, RotateCcw, RefreshCw,
  Search, Calendar, CheckCircle2, XCircle, QrCode, Tag,
  User, Clock, AlertCircle, ArrowRight, Check, X, Layers
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';

export default function StoreKdsQueueTab() {
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  // Mode: 'STOCK' | 'K2' | 'PRD_RETURN'
  const [mode, setMode] = useState('STOCK');

  // Shared Date & Search Filters
  const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState('');

  // STOCK KDS State
  const [orderStatus, setOrderStatus] = useState('ACTIVE');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail] = useState(null); // { header, items }
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [issueMap, setIssueMap] = useState({}); // { [row_id]: { qty_issued, scanned_tags: [] } }
  const [processingOrder, setProcessingOrder] = useState(false);

  // Tag Picker Modal State (for STOCK KDS item)
  const [tagModalItem, setTagModalItem] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // K2 Queue State
  const [k2Status, setK2Status] = useState('WAITING');
  const [k2Items, setK2Items] = useState([]);
  const [loadingK2, setLoadingK2] = useState(false);
  const [selectedK2Item, setSelectedK2Item] = useState(null);
  const [k2Details, setK2Details] = useState([]);
  const [k2PrNoInput, setK2PrNoInput] = useState('');
  const [submittingK2, setSubmittingK2] = useState(false);

  // PRD Return State
  const [returnSerialInput, setReturnSerialInput] = useState('');
  const [checkedTag, setCheckedTag] = useState(null);
  const [storeLocations, setStoreLocations] = useState([]);
  const [returnLocationId, setReturnLocationId] = useState('');
  const [returnQty, setReturnQty] = useState('');
  const [returnReason, setReturnReason] = useState('งานเหลือจากไลน์ผลิต นำส่งคืนคลัง Store');
  const [checkingTag, setCheckingTag] = useState(false);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnFeedback, setReturnFeedback] = useState(null);

  // Fetch STOCK Orders
  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await storeApi.getOrders({
        status: orderStatus,
        startDate,
        endDate
      });
      if (res?.success) {
        const list = res.data || [];
        setOrders(list);
        if (list.length > 0 && (!selectedOrderId || !list.some((o) => o.id === selectedOrderId))) {
          setSelectedOrderId(list[0].id);
        } else if (list.length === 0) {
          setSelectedOrderId(null);
          setOrderDetail(null);
        }
      }
    } catch (err) {
      console.error('Error loading KDS orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [orderStatus, startDate, endDate, selectedOrderId]);

  // Fetch Selected Order Details
  const fetchOrderDetail = useCallback(async (reqId) => {
    if (!reqId) {
      setOrderDetail(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const res = await storeApi.getOrderDetails(reqId);
      if (res?.success) {
        setOrderDetail({ header: res.header, items: res.items || [] });
        const initMap = {};
        (res.items || []).forEach((it) => {
          const preTags = it.requested_tags
            ? String(it.requested_tags).split(',').map((s) => s.trim()).filter(Boolean)
            : [];
          initMap[it.row_id] = {
            item_code: it.item_code,
            qty_issued: it.qty_issued !== null && it.qty_issued !== undefined
              ? Number(it.qty_issued)
              : Number(it.qty_requested || 0),
            scanned_tags: preTags
          };
        });
        setIssueMap(initMap);
      }
    } catch (err) {
      console.error('Error loading order detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Fetch K2 Summary
  const fetchK2List = useCallback(async () => {
    setLoadingK2(true);
    try {
      const res = await storeApi.getK2Summary({
        status: k2Status,
        startDate,
        endDate
      });
      if (res?.success) {
        const list = res.data || [];
        setK2Items(list);
        if (list.length > 0) {
          handleSelectK2Item(list[0]);
        } else {
          setSelectedK2Item(null);
          setK2Details([]);
        }
      }
    } catch (err) {
      console.error('Error loading K2 summary:', err);
    } finally {
      setLoadingK2(false);
    }
  }, [k2Status, startDate, endDate]);

  const handleSelectK2Item = async (item) => {
    setSelectedK2Item(item);
    setK2PrNoInput(item?.k2_ref || '');
    try {
      const res = await storeApi.getK2ItemDetails({
        itemCode: item.item_code,
        status: k2Status,
        startDate,
        endDate
      });
      if (res?.success) {
        setK2Details(res.data || []);
      }
    } catch (err) {
      console.error('Error loading K2 item details:', err);
    }
  };

  useEffect(() => {
    if (mode === 'STOCK') {
      fetchOrders();
    } else if (mode === 'K2') {
      fetchK2List();
    }
  }, [mode, fetchOrders, fetchK2List]);

  useEffect(() => {
    if (mode === 'STOCK' && selectedOrderId) {
      fetchOrderDetail(selectedOrderId);
    }
  }, [mode, selectedOrderId, fetchOrderDetail]);

  // Accept Order (NEW ORDER -> PREPARING)
  const handleAcceptOrder = async () => {
    if (!orderDetail?.header) return;
    setProcessingOrder(true);
    try {
      const res = await storeApi.acceptOrder(orderDetail.header.id);
      if (res?.success) {
        await fetchOrders();
        await fetchOrderDetail(orderDetail.header.id);
      } else {
        alert(res?.message || 'ไม่สามารถรับออเดอร์ได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการรับออเดอร์');
    } finally {
      setProcessingOrder(false);
    }
  };

  // Reject Order
  const handleRejectOrder = async () => {
    if (!orderDetail?.header) return;
    const reason = window.prompt('กรุณาระบุเหตุผลในการปฏิเสธใบเบิกนี้:', 'สต็อกไม่เพียงพอ / ยกเลิกตามคำขอ');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('กรุณาระบุเหตุผลในการปฏิเสธ');
      return;
    }
    setProcessingOrder(true);
    try {
      const res = await storeApi.rejectOrder(orderDetail.header.id, reason.trim());
      if (res?.success) {
        await fetchOrders();
      } else {
        alert(res?.message || 'ไม่สามารถปฏิเสธใบเบิกได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการปฏิเสธใบเบิก');
    } finally {
      setProcessingOrder(false);
    }
  };

  // Open Tag Picker for an item
  const openTagPicker = async (item) => {
    setTagModalItem(item);
    setLoadingTags(true);
    try {
      const res = await storeApi.getAvailableTagsForItem({
        itemCode: item.item_code,
        itemId: item.item_id,
        locationId: 'STORE'
      });
      if (res?.success) {
        setAvailableTags(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch available tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  const toggleTagForItem = (rowId, serialNo, tagQty) => {
    setIssueMap((prev) => {
      const curr = prev[rowId] || { qty_issued: 0, scanned_tags: [] };
      const exists = curr.scanned_tags.includes(serialNo);
      const nextTags = exists
        ? curr.scanned_tags.filter((t) => t !== serialNo)
        : [...curr.scanned_tags, serialNo];

      // Calculate total qty of selected tags if any selected
      const selectedTotal = availableTags
        .filter((t) => nextTags.includes(t.serial_no))
        .reduce((acc, t) => acc + parseFloat(t.current_qty || 0), 0);

      return {
        ...prev,
        [rowId]: {
          ...curr,
          scanned_tags: nextTags,
          qty_issued: nextTags.length > 0 ? selectedTotal : curr.qty_issued
        }
      };
    });
  };

  // Confirm Issue (Cut stock & transfer tags to WIP)
  const handleConfirmIssue = async () => {
    if (!orderDetail?.header) return;
    const payloadItems = (orderDetail.items || []).map((it) => {
      const entry = issueMap[it.row_id] || {};
      return {
        row_id: it.row_id,
        item_code: it.item_code,
        qty_issued: parseFloat(entry.qty_issued || 0),
        scanned_tags: entry.scanned_tags || []
      };
    });

    if (payloadItems.some((i) => i.qty_issued <= 0)) {
      alert('จำนวนที่จ่ายจริง (Qty Issued) ต้องมากกว่า 0 ทุกรายการ');
      return;
    }

    if (!window.confirm(`ยืนยันการตัดจ่ายพัสดุสำหรับใบเบิก ${orderDetail.header.req_number} จำนวน ${payloadItems.length} รายการ?`)) {
      return;
    }

    setProcessingOrder(true);
    try {
      const res = await storeApi.confirmIssue({
        reqId: orderDetail.header.id,
        reqNumber: orderDetail.header.req_number,
        items: payloadItems
      });
      if (res?.success) {
        await fetchOrders();
      } else {
        alert(res?.message || 'ไม่สามารถยืนยันการจ่ายพัสดุได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการตัดจ่ายพัสดุ');
    } finally {
      setProcessingOrder(false);
    }
  };

  // Submit K2 PR Number
  const handleSubmitK2Pr = async (e) => {
    e.preventDefault();
    if (!selectedK2Item || !k2PrNoInput.trim()) {
      alert('กรุณาระบุหมายเลขใบขอซื้อ K2 PR No.');
      return;
    }
    setSubmittingK2(true);
    try {
      const res = await storeApi.submitK2Pr({
        itemCode: selectedK2Item.item_code,
        k2PrNo: k2PrNoInput.trim()
      });
      if (res?.success) {
        fetchK2List();
      } else {
        alert(res?.message || 'ไม่สามารถบันทึก K2 PR ได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึก K2 PR');
    } finally {
      setSubmittingK2(false);
    }
  };

  // PRD Return: Check Tag
  const handleCheckPrdTag = async (e) => {
    if (e) e.preventDefault();
    if (!returnSerialInput.trim()) return;
    setCheckingTag(true);
    setReturnFeedback(null);
    try {
      const res = await storeApi.checkPrdReturnTag(returnSerialInput.trim());
      if (res?.success && res.data) {
        setCheckedTag(res.data);
        const locs = res.locations || [];
        setStoreLocations(locs);
        setReturnQty(String(parseFloat(res.data.current_qty || res.data.qty_per_pallet || 1)));
        if (locs.length > 0 && !returnLocationId) {
          setReturnLocationId(String(locs[0].location_id));
        }
      } else {
        setCheckedTag(null);
        alert(res?.message || 'ไม่พบข้อมูลแท็กนี้');
      }
    } catch (err) {
      setCheckedTag(null);
      alert(err.message || 'ไม่พบหมายเลขแท็กในระบบ');
    } finally {
      setCheckingTag(false);
    }
  };

  // PRD Return: Submit Return
  const handleConfirmPrdReturn = async (e) => {
    e.preventDefault();
    if (!checkedTag || !returnLocationId || parseFloat(returnQty) <= 0) {
      alert('กรุณาระบุคลังปลายทางและจำนวนรับคืนให้ถูกต้อง');
      return;
    }
    setSubmittingReturn(true);
    try {
      const res = await storeApi.processPrdReturn({
        serialNo: checkedTag.serial_no,
        locationId: Number(returnLocationId),
        returnQty: parseFloat(returnQty),
        reason: returnReason.trim()
      });
      if (res?.success) {
        setReturnFeedback({
          type: 'success',
          message: res.message || 'รับคืนวัตถุดิบเข้าคลังสโตร์สำเร็จ'
        });
        setCheckedTag(null);
        setReturnSerialInput('');
      } else {
        alert(res?.message || 'ไม่สามารถรับคืนวัตถุดิบได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการรับคืนวัตถุดิบ');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o.req_number || '').toLowerCase().includes(q) ||
      (o.requester_name || '').toLowerCase().includes(q) ||
      (o.remark || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full space-y-3 animate-fadeIn">
      {/* Top Mode Switcher & Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-sm flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
        {/* 3 Modes */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('STOCK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              mode === 'STOCK'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>คิวจ่ายพัสดุ (Store KDS)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('K2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              mode === 'K2'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>รายการรอเปิด K2 PR</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('PRD_RETURN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              mode === 'PRD_RETURN'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>รับคืนวัตถุดิบจากผลิต (PRD Return)</span>
          </button>
        </div>

        {/* Filters for STOCK & K2 */}
        {mode !== 'PRD_RETURN' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาเลขบิล, ผู้เบิก..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>

            {mode === 'STOCK' ? (
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="ACTIVE">คิวรอจัดของ (Active Queue)</option>
                <option value="COMPLETED">จ่ายเสร็จสิ้น (Completed)</option>
                <option value="REJECTED">ปฏิเสธ/ยกเลิก (Rejected)</option>
                <option value="ALL">ทั้งหมด (All Orders)</option>
              </select>
            ) : (
              <select
                value={k2Status}
                onChange={(e) => setK2Status(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="WAITING">รอเปิดใบขอซื้อ K2 (Waiting)</option>
                <option value="K2_OPENED">เปิด K2 แล้ว (K2 Opened)</option>
              </select>
            )}

            <div className="flex items-center gap-1 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
              <span className="text-slate-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => (mode === 'STOCK' ? fetchOrders() : fetchK2List())}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loadingOrders || loadingK2 ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* MODE 1: STOCK KDS SPLIT-PANE */}
      {mode === 'STOCK' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
          {/* Left Pane: Order Queue */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0">
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                รายการใบเบิกพัสดุ ({filteredOrders.length})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {loadingOrders ? (
                <div className="py-12 text-center text-xs text-slate-400">กำลังโหลดคิวใบเบิก...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">ไม่มีรายการใบเบิกในคิวนี้</div>
              ) : (
                filteredOrders.map((ord) => {
                  const active = ord.id === selectedOrderId;
                  return (
                    <button
                      type="button"
                      key={ord.id}
                      onClick={() => setSelectedOrderId(ord.id)}
                      className={`w-full text-left p-3.5 transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                        active
                          ? 'bg-indigo-50/90 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          {ord.req_number}
                        </div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                          ผู้เบิก: {ord.requester_name || '-'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{ord.req_time}</span>
                          <span>• {ord.total_items} รายการ</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                        ord.status === 'NEW ORDER'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : ord.status === 'PREPARING'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          : ord.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {ord.status}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Pick List & Issue Confirmation */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0">
            {!orderDetail?.header ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-xs">
                <PackageCheck className="w-10 h-10 mb-2 stroke-1" />
                <span>เลือกใบเบิกจากคิวด้านซ้ายเพื่อจัดเตรียมพัสดุและตัดจ่ายสต็อก</span>
              </div>
            ) : loadingDetail ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                กำลังโหลดรายละเอียดใบเบิก...
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black font-mono text-slate-800 dark:text-slate-100">
                        {orderDetail.header.req_number}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        {orderDetail.header.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                      <span>ผู้ขอเบิก: <strong>{orderDetail.header.requester_name}</strong></span>
                      <span>เวลาขอเบิก: {orderDetail.header.req_time}</span>
                      {orderDetail.header.remark && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          หมายเหตุ: {orderDetail.header.remark}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Header Action Buttons */}
                  <div className="flex items-center gap-2">
                    {orderDetail.header.status === 'NEW ORDER' && (
                      <>
                        <button
                          type="button"
                          disabled={processingOrder}
                          onClick={handleAcceptOrder}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>รับออเดอร์เข้าคิวจัดของ (Accept)</span>
                        </button>
                        <button
                          type="button"
                          disabled={processingOrder}
                          onClick={handleRejectOrder}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold cursor-pointer"
                        >
                          ปฏิเสธบิล
                        </button>
                      </>
                    )}

                    {(orderDetail.header.status === 'PREPARING' || orderDetail.header.status === 'PARTIAL') && (
                      <>
                        <button
                          type="button"
                          disabled={processingOrder}
                          onClick={handleConfirmIssue}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ยืนยันจ่ายของและตัดสต็อก (Confirm Issue)</span>
                        </button>
                        <button
                          type="button"
                          disabled={processingOrder}
                          onClick={handleRejectOrder}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold cursor-pointer"
                        >
                          ปฏิเสธบิล
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Pick List Items Table */}
                <div className="flex-1 overflow-y-auto p-4">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                        <th className="py-2 px-2">รหัสสินค้า / รายละเอียด</th>
                        <th className="py-2 px-2 text-right">สต็อกคงเหลือ</th>
                        <th className="py-2 px-2 text-right">ยอดขอเบิก</th>
                        <th className="py-2 px-2 text-right">ยอดจ่ายจริง</th>
                        <th className="py-2 px-2 text-center">แท็ก FIFO / ระบุแท็ก</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(orderDetail.items || []).map((it) => {
                        const state = issueMap[it.row_id] || { qty_issued: it.qty_requested, scanned_tags: [] };
                        const isEditable = orderDetail.header.status === 'PREPARING' || orderDetail.header.status === 'PARTIAL';

                        return (
                          <tr key={it.row_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                            <td className="py-3 px-2">
                              <div className="font-mono font-bold text-slate-800 dark:text-slate-100">{it.item_code}</div>
                              <div className="text-[11px] text-slate-500">{it.description}</div>
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-semibold text-slate-600 dark:text-slate-300">
                              {Number(it.onhand_qty || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-bold text-indigo-600">
                              {Number(it.qty_requested || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-right">
                              {isEditable ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={state.qty_issued}
                                  onChange={(e) =>
                                    setIssueMap((prev) => ({
                                      ...prev,
                                      [it.row_id]: {
                                        ...state,
                                        qty_issued: e.target.value
                                      }
                                    }))
                                  }
                                  className="w-24 px-2 py-1 text-right font-mono font-bold rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-emerald-600"
                                />
                              ) : (
                                <span className="font-mono font-bold text-emerald-600">
                                  {Number(it.qty_issued ?? it.qty_requested ?? 0).toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {isEditable && (
                                  <button
                                    type="button"
                                    onClick={() => openTagPicker(it)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Tag className="w-3 h-3" />
                                    <span>
                                      {state.scanned_tags?.length > 0
                                        ? `เลือกแล้ว ${state.scanned_tags.length} แท็ก`
                                        : 'เลือกแท็ก / Auto-FIFO'}
                                    </span>
                                  </button>
                                )}
                                {state.scanned_tags?.length > 0 && (
                                  <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 max-w-[180px] truncate">
                                    {state.scanned_tags.join(', ')}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: K2 PR WAITING LIST */}
      {mode === 'K2' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-50/60 dark:bg-slate-800/40">
              รายการสินค้าที่ขอเปิดซื้อผ่าน K2 ({k2Items.length})
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {loadingK2 ? (
                <div className="py-12 text-center text-xs text-slate-400">กำลังโหลดรายการ K2...</div>
              ) : k2Items.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">ไม่มีรายการค้างเปิด K2 PR</div>
              ) : (
                k2Items.map((it) => {
                  const active = selectedK2Item?.item_code === it.item_code;
                  return (
                    <button
                      type="button"
                      key={it.item_code}
                      onClick={() => handleSelectK2Item(it)}
                      className={`w-full text-left p-3.5 cursor-pointer flex items-center justify-between gap-2 ${
                        active ? 'bg-amber-50/90 dark:bg-amber-950/30 border-l-4 border-amber-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100">{it.item_code}</div>
                        <div className="text-[11px] text-slate-500 truncate">{it.description}</div>
                        <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                          รวม {it.request_count} ใบเบิก {it.k2_ref ? `• K2: ${it.k2_ref}` : ''}
                        </div>
                      </div>
                      <div className="text-right font-mono font-black text-sm text-amber-600">
                        {Number(it.total_qty || 0).toLocaleString()}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden p-4">
            {!selectedK2Item ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                เลือกรายการสินค้าทางซ้ายเพื่อดูผู้ขอเบิกและบันทึกเลข K2 PR
              </div>
            ) : (
              <div className="flex flex-col h-full space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100">
                      {selectedK2Item.item_code} — {selectedK2Item.description}
                    </h3>
                    <p className="text-slate-500 mt-0.5">
                      ยอดขอซื้อรวมทั้งหมด: <strong className="text-amber-600 font-mono">{Number(selectedK2Item.total_qty || 0).toLocaleString()}</strong> ชิ้น
                    </p>
                  </div>

                  {k2Status === 'WAITING' && (
                    <form onSubmit={handleSubmitK2Pr} className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={k2PrNoInput}
                        onChange={(e) => setK2PrNoInput(e.target.value)}
                        placeholder="ระบุเลขที่ K2 PR..."
                        className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-slate-800 font-mono font-bold"
                      />
                      <button
                        type="submit"
                        disabled={submittingK2}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
                      >
                        บันทึกเลข K2 PR
                      </button>
                    </form>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 uppercase">
                        <th className="py-2 px-2">เลขที่ใบเบิก</th>
                        <th className="py-2 px-2">วันที่ขอ</th>
                        <th className="py-2 px-2">ผู้ขอเบิก</th>
                        <th className="py-2 px-2 text-right">จำนวนที่ขอ</th>
                        <th className="py-2 px-2">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {k2Details.map((d) => (
                        <tr key={d.k2_id}>
                          <td className="py-2.5 px-2 font-mono font-bold text-indigo-600">{d.req_number}</td>
                          <td className="py-2.5 px-2 text-slate-500">{d.req_date}</td>
                          <td className="py-2.5 px-2 font-semibold">{d.fullname}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-600">
                            {Number(d.qty_requested || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 text-slate-500">{d.remark || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: PRD MATERIAL RETURN */}
      {mode === 'PRD_RETURN' && (
        <div className="max-w-2xl mx-auto w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 space-y-4 text-xs">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                รับคืนวัตถุดิบจากฝ่ายผลิตเข้าคลังสโตร์ (PRD Material Return)
              </h3>
              <p className="text-[11px] text-slate-500">
                สแกนหรือพิมพ์รหัสแท็ก QR (RM Serial Tag) ที่เบิกไปไลน์ผลิตแล้วต้องการส่งคืนเข้าคลัง Store
              </p>
            </div>
          </div>

          {returnFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center justify-between">
              <span>{returnFeedback.message}</span>
              <button type="button" onClick={() => setReturnFeedback(null)}>✕</button>
            </div>
          )}

          <form onSubmit={handleCheckPrdTag} className="flex items-center gap-2">
            <div className="relative flex-1">
              <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={returnSerialInput}
                onChange={(e) => setReturnSerialInput(e.target.value)}
                placeholder="สแกนหรือระบุหมายเลขแท็ก เช่น RM-261101-0001..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={checkingTag}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
            >
              {checkingTag ? 'กำลังตรวจสอบ...' : 'ตรวจสอบแท็ก'}
            </button>
          </form>

          {checkedTag && (
            <form onSubmit={handleConfirmPrdReturn} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-4 animate-fadeIn">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold">หมายเลขแท็ก (Serial No.)</span>
                  <div className="font-mono font-bold text-sm text-indigo-600">{checkedTag.serial_no}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold">สถานะปัจจุบัน / คลังล่าสุด</span>
                  <div className="font-bold text-slate-800 dark:text-slate-100">
                    {checkedTag.status} ({checkedTag.location_name || 'N/A'})
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] uppercase text-slate-400 font-bold">รหัสสินค้า / รายละเอียด</span>
                  <div className="font-bold text-slate-800 dark:text-slate-100">
                    {checkedTag.item_no} ({checkedTag.sap_no}) — {checkedTag.part_description}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-700">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    คลังสโตร์ที่รับคืน (Target Store Location) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={returnLocationId}
                    onChange={(e) => setReturnLocationId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="">-- เลือกคลังสโตร์ --</option>
                    {storeLocations.map((loc) => (
                      <option key={loc.location_id} value={loc.location_id}>
                        {loc.location_name} ({loc.zone_name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    จำนวนที่รับคืนจริง (Return Qty) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    value={returnQty}
                    onChange={(e) => setReturnQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หมายเหตุการรับคืน (Reason / Notes)
                </label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckedTag(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  {submittingReturn ? 'กำลังบันทึก...' : 'ยืนยันรับคืนเข้าคลังสโตร์'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Tag Picker Modal for STOCK KDS */}
      {tagModalItem && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden text-xs">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100">
                  เลือกแท็กจ่ายพัสดุ (FIFO Tag Selection) — {tagModalItem.item_code}
                </h4>
                <p className="text-[11px] text-slate-500">
                  ยอดขอเบิก: {Number(tagModalItem.qty_requested || 0).toLocaleString()} (หากไม่เลือก ระบบจะตัดแบบ Auto-FIFO อัตโนมัติ)
                </p>
              </div>
              <button type="button" onClick={() => setTagModalItem(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingTags ? (
                <div className="py-10 text-center text-slate-400">กำลังค้นหาแท็กคงเหลือในสโตร์...</div>
              ) : availableTags.length === 0 ? (
                <div className="py-10 text-center text-slate-400">ไม่พบแท็ก Serial ของสินค้านี้ในคลัง Store</div>
              ) : (
                <div className="space-y-2">
                  {availableTags.map((t) => {
                    const selected = (issueMap[tagModalItem.row_id]?.scanned_tags || []).includes(t.serial_no);
                    return (
                      <button
                        type="button"
                        key={t.serial_no}
                        onClick={() => toggleTagForItem(tagModalItem.row_id, t.serial_no, t.current_qty)}
                        className={`w-full text-left p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selected
                            ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-950/40 dark:border-indigo-500'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{t.serial_no}</div>
                          <div className="text-[11px] text-slate-500">
                            คลัง: {t.location_name || '-'} • รับเข้า: {t.received_date ? new Date(t.received_date).toLocaleDateString('th-TH') : '-'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-black text-sm text-emerald-600">
                            {Number(t.current_qty || 0).toLocaleString()} Pcs
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            {selected ? '✓ เลือกจ่าย' : 'คลิกเพื่อเลือก'}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setTagModalItem(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold cursor-pointer"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
