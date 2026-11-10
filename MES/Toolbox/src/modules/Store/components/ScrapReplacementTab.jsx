import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  AlertTriangle, PlusCircle, BarChart3, FileSpreadsheet, Search,
  Calendar, Filter, CheckCircle2, XCircle, RefreshCw, Layers,
  DollarSign, Package, Users, Factory, X, CheckSquare, Square,
  ChevronLeft, ChevronRight, ShieldAlert
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';
import { useAuth } from '../../../shared/contexts/AuthContext';

export default function ScrapReplacementTab() {
  const { user } = useAuth();
  const canApprove = ['admin', 'creator', 'store', 'supervisor'].includes(
    (user?.role || '').toLowerCase()
  ) || (user?.permissions || []).includes('manage_warehouse');

  // Default 7-day range matching legacy storeRequest.php
  const todayStr = new Date().toISOString().split('T')[0];
  const sevenDaysAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const [requests, setRequests] = useState([]);
  const [kpi, setKpi] = useState({ total_count: 0, total_qty: 0, total_cost: 0 });
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_records: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(sevenDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [lineFilter, setLineFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [page, setPage] = useState(1);

  // Master data (locations & items)
  const [masterLocations, setMasterLocations] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [productionLines, setProductionLines] = useState([]);

  // Selection for Bulk Approve/Reject
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);

  // New Scrap Request Modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [wipLocationId, setWipLocationId] = useState('');
  const [storeLocationId, setStoreLocationId] = useState('');
  const [defectSource, setDefectSource] = useState('SNC');
  const [itemQuery, setItemQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [reqQty, setReqQty] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [submittingNew, setSubmittingNew] = useState(false);

  // Reject Reason Modal state
  const [rejectTarget, setRejectTarget] = useState(null); // { mode: 'SINGLE' | 'BULK', id?: number }
  const [rejectReason, setRejectReason] = useState('');

  // Analytics Dashboard Modal state
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Load Master Data once
  useEffect(() => {
    const loadMaster = async () => {
      try {
        const res = await storeApi.getMasterData();
        if (res?.success && res.data) {
          const locs = res.data.locations || [];
          const items = res.data.items || [];
          setMasterLocations(locs);
          setMasterItems(items);

          const lines = [...new Set(
            locs
              .filter((l) => l.location_type === 'WIP' && l.production_line)
              .map((l) => l.production_line)
          )].sort();
          setProductionLines(lines);

          // Pre-select default store & user WIP location
          const storeLocs = locs.filter((l) => l.location_type === 'STORE');
          const defaultStore = storeLocs.find((l) => l.location_name.toUpperCase().includes('RM')) || storeLocs[0];
          if (defaultStore) setStoreLocationId(String(defaultStore.location_id));

          const wipLocs = locs.filter((l) => l.location_type === 'WIP');
          if (res.user_line) {
            const myWip = wipLocs.find((l) => l.production_line === res.user_line);
            if (myWip) setWipLocationId(String(myWip.location_id));
          }
        }
      } catch (err) {
        console.error('Failed to load master data for Scrap tab:', err);
      }
    };
    loadMaster();
  }, []);

  const fetchRequests = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await storeApi.getScrapRequests({
        status: statusFilter,
        search: search.trim(),
        startDate,
        endDate,
        line: lineFilter,
        team: teamFilter,
        page: targetPage,
        limit: 100
      });
      if (res?.success) {
        setRequests(res.data || []);
        setKpi(res.kpi || { total_count: 0, total_qty: 0, total_cost: 0 });
        setPagination(res.pagination || { current_page: 1, total_pages: 1, total_records: 0 });
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Error fetching scrap requests:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, startDate, endDate, lineFilter, teamFilter, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests(page);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchRequests, page]);

  const pendingRows = requests.filter((r) => r.status === 'PENDING');
  const allPendingSelected = pendingRows.length > 0 && pendingRows.every((r) => selectedIds.includes(r.transfer_id));

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingRows.map((r) => r.transfer_id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Single Approve
  const handleApproveSingle = async (row) => {
    if (!window.confirm(`กรุณายืนยันการอนุมัติจ่ายของทดแทน:\nรหัสคำขอ: ${row.transfer_uuid}\nสินค้า: ${row.part_no} จำนวน ${Number(row.quantity).toLocaleString()} Pcs`)) {
      return;
    }
    setProcessing(true);
    try {
      const res = await storeApi.approveScrapRequest(row.transfer_id);
      if (res?.success) {
        fetchRequests(page);
      } else {
        alert(res?.message || 'ไม่สามารถอนุมัติรายการได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการอนุมัติ');
    } finally {
      setProcessing(false);
    }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`กรุณายืนยันการอนุมัติจ่ายของทดแทนจำนวน ${selectedIds.length} รายการที่เลือก?`)) {
      return;
    }
    setProcessing(true);
    try {
      const res = await storeApi.bulkApproveScrapRequests(selectedIds);
      if (res?.success) {
        fetchRequests(page);
      } else {
        alert(res?.message || 'ไม่สามารถอนุมัติรายการได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการอนุมัติหลายรายการ');
    } finally {
      setProcessing(false);
    }
  };

  // Confirm Reject (Single or Bulk)
  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert('กรุณาระบุเหตุผลในการปฏิเสธคำขอ');
      return;
    }
    setProcessing(true);
    try {
      let res;
      if (rejectTarget?.mode === 'SINGLE') {
        res = await storeApi.rejectScrapRequest(rejectTarget.id, rejectReason.trim());
      } else {
        res = await storeApi.bulkRejectScrapRequests(selectedIds, rejectReason.trim());
      }
      if (res?.success) {
        setRejectTarget(null);
        setRejectReason('');
        fetchRequests(page);
      } else {
        alert(res?.message || 'ไม่สามารถปฏิเสธคำขอได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ');
    } finally {
      setProcessing(false);
    }
  };

  // Submit New Scrap Request
  const handleCreateScrapRequest = async (e) => {
    e.preventDefault();
    if (!wipLocationId || !storeLocationId || !selectedItem) {
      alert('กรุณาเลือกไลน์ผลิต (WIP), คลังสโตร์ และรหัสสินค้าให้ครบถ้วน');
      return;
    }
    const qtyNum = parseFloat(reqQty);
    if (!qtyNum || qtyNum <= 0) {
      alert('กรุณาระบุจำนวนของเสียที่ต้องการเบิกทดแทนให้มากกว่า 0');
      return;
    }
    if (!reqReason.trim()) {
      alert('กรุณาระบุสาเหตุของเสีย (Defect Reason)');
      return;
    }

    setSubmittingNew(true);
    try {
      const res = await storeApi.createScrapRequest({
        itemId: selectedItem.item_id,
        quantity: qtyNum,
        wipLocationId: Number(wipLocationId),
        storeLocationId: Number(storeLocationId),
        defectSource,
        reason: reqReason.trim()
      });
      if (res?.success) {
        setIsNewModalOpen(false);
        setSelectedItem(null);
        setItemQuery('');
        setReqQty('');
        setReqReason('');
        fetchRequests(1);
      } else {
        alert(res?.message || 'ไม่สามารถสร้างคำขอเบิกทดแทนได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกคำขอ');
    } finally {
      setSubmittingNew(false);
    }
  };

  // Export Table to Excel
  const handleExportExcel = async () => {
    try {
      const res = await storeApi.getScrapRequests({
        status: statusFilter,
        search: search.trim(),
        startDate,
        endDate,
        line: lineFilter,
        team: teamFilter,
        exportData: true
      });
      const rows = res?.data || [];
      if (rows.length === 0) {
        alert('ไม่มีข้อมูลสำหรับส่งออก Excel');
        return;
      }

      const excelRows = rows.map((r) => {
        const qty = parseFloat(r.quantity || 0);
        const unitCost = parseFloat(r.unit_cost || 0);
        return {
          'Request ID': r.transfer_uuid,
          'Date/Time': r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : '-',
          'SAP No.': r.sap_no || '-',
          'Part No.': r.part_no || '-',
          'Part Description': r.part_description || '-',
          'Quantity (Pcs)': qty,
          'Unit Cost (THB)': unitCost,
          'Total Cost (THB)': Number((qty * unitCost).toFixed(2)),
          'From Store': r.from_loc || '-',
          'To WIP Line': r.to_loc || '-',
          'Reason / Notes': (r.notes || '').replace('Replacement: ', ''),
          'Requester': r.requester || '-',
          'Status': r.status || '-',
          'Approver': r.approver || '-'
        };
      });

      const ws = XLSX.utils.json_to_sheet(excelRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Scrap_Requests');
      XLSX.writeFile(wb, `Scrap_Replacement_${startDate}_to_${endDate}.xlsx`);
    } catch (err) {
      alert('ส่งออก Excel ไม่สำเร็จ: ' + (err.message || ''));
    }
  };

  // Load Analytics Dashboard
  const openAnalyticsModal = async () => {
    setIsAnalyticsOpen(true);
    setLoadingAnalytics(true);
    try {
      const res = await storeApi.getScrapDashboard({
        status: statusFilter,
        search: search.trim(),
        startDate,
        endDate,
        line: lineFilter,
        team: teamFilter
      });
      if (res?.success) {
        setAnalyticsData(res);
      }
    } catch (err) {
      console.error('Failed to load scrap analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleExportAnalyticsExcel = () => {
    if (!analyticsData) return;
    const wb = XLSX.utils.book_new();
    const s = analyticsData.summary || {};

    const kpiRows = [
      { Metric: 'Total Scrap Tickets', Value: Number(s.total_tickets || 0) },
      { Metric: 'Total Scrap Pcs', Value: Number(s.total_pcs || 0) },
      { Metric: 'Total Scrap Cost (THB)', Value: Number(s.total_cost || 0) },
      { Metric: 'Top Defect Line', Value: s.top_line || 'N/A' }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), 'Summary_KPI');
    if (analyticsData.line?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analyticsData.line), 'By_Line');
    }
    if (analyticsData.reasons?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analyticsData.reasons), 'By_Reason');
    }
    if (analyticsData.top_parts?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analyticsData.top_parts), 'Top_Parts');
    }
    XLSX.writeFile(wb, `Scrap_Analytics_${startDate}_to_${endDate}.xlsx`);
  };

  const filteredAutocompleteItems = itemQuery.trim().length >= 1
    ? masterItems
        .filter((it) => {
          const q = itemQuery.toLowerCase();
          return (
            (it.sap_no || '').toLowerCase().includes(q) ||
            (it.part_no || '').toLowerCase().includes(q) ||
            (it.part_description || '').toLowerCase().includes(q)
          );
        })
        .slice(0, 20)
    : [];

  const wipLocations = masterLocations.filter((l) => l.location_type === 'WIP');
  const storeLocations = masterLocations.filter((l) => l.location_type === 'STORE');

  return (
    <div className="flex flex-col h-full space-y-3 animate-fadeIn">
      {/* Top KPI & Actions Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 flex-shrink-0">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1">
          <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">รายการคำขอ (Items)</div>
            <div className="text-sm sm:text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
              {Number(kpi.total_count || 0).toLocaleString()}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">จำนวนของเสีย (Total Pcs)</div>
            <div className="text-sm sm:text-lg font-black text-amber-700 dark:text-amber-300 font-mono">
              {Number(kpi.total_qty || 0).toLocaleString()}
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-800/50">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">มูลค่าความเสียหาย (฿)</div>
            <div className="text-sm sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
              ฿{Number(kpi.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAnalyticsModal}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>แจ้งของเสีย / เบิกทดแทน</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-sm flex flex-wrap items-center gap-2 flex-shrink-0">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ค้นหา SAP, Part No., Req ID, ผู้ขอเบิก..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <option value="ALL">ทุกสถานะ (All Status)</option>
          <option value="PENDING">รออนุมัติ (Pending)</option>
          <option value="COMPLETED">อนุมัติแล้ว (Completed)</option>
          <option value="REJECTED">ปฏิเสธ (Rejected)</option>
        </select>

        <select
          value={lineFilter}
          onChange={(e) => { setLineFilter(e.target.value); setPage(1); }}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <option value="">ทุกไลน์ผลิต (All Lines)</option>
          {productionLines.map((ln) => (
            <option key={ln} value={ln}>{ln}</option>
          ))}
        </select>

        <select
          value={teamFilter}
          onChange={(e) => { setTeamFilter(e.target.value); setPage(1); }}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          <option value="">ทุกทีม (All Teams)</option>
          <option value="A">Team A</option>
          <option value="B">Team B</option>
        </select>

        <button
          type="button"
          onClick={() => fetchRequests(page)}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          title="รีเฟรชข้อมูล"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Bulk Action Bar (Manual Approval Only) */}
      {canApprove && selectedIds.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
            <ShieldAlert className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>เลือกแล้ว {selectedIds.length} รายการ (การอนุมัติด้วยมือโดยผู้มีสิทธิ์เท่านั้น)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={processing}
              onClick={handleBulkApprove}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>อนุมัติจ่ายของ ({selectedIds.length})</span>
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => { setRejectTarget({ mode: 'BULK' }); setRejectReason(''); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>ปฏิเสธ ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table / Mobile List */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/70 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              <tr>
                {canApprove && (
                  <th className="py-2.5 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-slate-500 hover:text-indigo-600 cursor-pointer"
                    >
                      {allPendingSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                )}
                <th className="py-2.5 px-3">วันที่ / รหัสคำขอ</th>
                <th className="py-2.5 px-3">รหัสสินค้า (SAP / Part No.)</th>
                <th className="py-2.5 px-3 text-right">จำนวน</th>
                <th className="py-2.5 px-3 text-right">มูลค่า (฿)</th>
                <th className="py-2.5 px-3">ต้นทาง → ปลายทาง (WIP)</th>
                <th className="py-2.5 px-3">สาเหตุของเสีย / หมายเหตุ</th>
                <th className="py-2.5 px-3">ผู้แจ้งเบิก</th>
                <th className="py-2.5 px-3 text-center">สถานะ / การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={canApprove ? 9 : 8} className="py-12 text-center text-slate-400">
                    กำลังโหลดข้อมูลรายการเบิกของเสียและทดแทน...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={canApprove ? 9 : 8} className="py-12 text-center text-slate-400">
                    ไม่พบรายการแจ้งของเสีย / เบิกทดแทนในช่วงเวลาที่เลือก
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const qty = parseFloat(r.quantity || 0);
                  const unitCost = parseFloat(r.unit_cost || 0);
                  const totalCost = qty * unitCost;
                  const cleanNote = (r.notes || '').replace('Replacement: ', '');
                  const isVendor = cleanNote.includes('[Vendor]');
                  const isChecked = selectedIds.includes(r.transfer_id);

                  return (
                    <tr
                      key={r.transfer_id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {canApprove && (
                        <td className="py-2.5 px-3 text-center">
                          {r.status === 'PENDING' ? (
                            <button
                              type="button"
                              onClick={() => toggleSelectOne(r.transfer_id)}
                              className="text-slate-500 hover:text-indigo-600 cursor-pointer"
                            >
                              {isChecked ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                            </button>
                          ) : null}
                        </td>
                      )}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{r.transfer_uuid}</div>
                        <div className="text-[11px] text-slate-400">
                          {r.created_at ? new Date(r.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800 dark:text-slate-100 font-mono">
                          {r.part_no} <span className="text-[10px] font-normal text-slate-400">({r.sap_no})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {r.part_description}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        {qty.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          ฿{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400">@฿{unitCost.toFixed(2)}</div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          {r.from_loc}
                        </span>
                        <span className="mx-1 text-slate-400">→</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                          {r.to_loc}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-[240px]">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                          isVendor
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {isVendor ? 'Vendor' : 'SNC'}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {cleanNote.replace('[SNC] ', '').replace('[Vendor] ', '')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        {r.requester}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {r.status === 'PENDING' ? (
                          canApprove ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={processing}
                                onClick={() => handleApproveSingle(r)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer"
                              >
                                อนุมัติจ่าย
                              </button>
                              <button
                                type="button"
                                disabled={processing}
                                onClick={() => { setRejectTarget({ mode: 'SINGLE', id: r.transfer_id }); setRejectReason(''); }}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold cursor-pointer"
                              >
                                ปฏิเสธ
                              </button>
                            </div>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                              รออนุมัติ (PENDING)
                            </span>
                          )
                        ) : r.status === 'COMPLETED' ? (
                          <div>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                              จ่ายแล้ว (COMPLETED)
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">โดย {r.approver}</div>
                          </div>
                        ) : (
                          <div>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                              ปฏิเสธ (REJECTED)
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">โดย {r.approver}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 flex-shrink-0">
          <span>
            แสดงหน้า {pagination.current_page || 1} จาก {Math.max(1, pagination.total_pages || 1)} (ทั้งหมด {Number(pagination.total_records || 0).toLocaleString()} รายการ)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= (pagination.total_pages || 1)}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal 1: New Scrap Request Modal */}
      {isNewModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="px-5 py-3.5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>แจ้งของเสีย & ขอเบิกชิ้นส่วนทดแทน (Scrap & Replacement)</span>
              </div>
              <button type="button" onClick={() => setIsNewModalOpen(false)} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateScrapRequest} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    1. ไลน์ผลิตที่เกิดของเสีย (WIP) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={wipLocationId}
                    onChange={(e) => setWipLocationId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- เลือกไลน์ผลิต (WIP) --</option>
                    {wipLocations.map((l) => (
                      <option key={l.location_id} value={l.location_id}>
                        {l.location_name} {l.production_line ? `(${l.production_line})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    2. คลังสินค้าที่ขอเบิก (Store) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={storeLocationId}
                    onChange={(e) => setStoreLocationId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  >
                    <option value="">-- เลือกคลังสโตร์ --</option>
                    {storeLocations.map((l) => (
                      <option key={l.location_id} value={l.location_id}>
                        {l.location_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Defect Source */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  3. แหล่งที่มาของปัญหา (Defect Source) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDefectSource('SNC')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center cursor-pointer transition-all ${
                      defectSource === 'SNC'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    เสียจากกระบวนการผลิต (SNC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDefectSource('Vendor')}
                    className={`py-2 px-3 rounded-xl border font-bold text-center cursor-pointer transition-all ${
                      defectSource === 'Vendor'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    เสียจากวัตถุดิบซัพพลายเออร์ (Vendor)
                  </button>
                </div>
              </div>

              {/* Item Autocomplete */}
              <div className="relative">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  4. ค้นหาและเลือกรหัสชิ้นส่วน (Item / Part No.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={itemQuery}
                  onChange={(e) => {
                    setItemQuery(e.target.value);
                    setSelectedItem(null);
                  }}
                  placeholder="พิมพ์รหัส SAP, Part No. หรือชื่อชิ้นส่วน..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                />
                {selectedItem && (
                  <div className="mt-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                    <span>เลือกแล้ว: <strong>{selectedItem.part_no || selectedItem.sap_no}</strong> — {selectedItem.part_description}</span>
                    <button type="button" onClick={() => { setSelectedItem(null); setItemQuery(''); }} className="text-emerald-600 font-bold">เปลี่ยน</button>
                  </div>
                )}
                {!selectedItem && filteredAutocompleteItems.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredAutocompleteItems.map((it) => (
                      <button
                        type="button"
                        key={it.item_id}
                        onClick={() => {
                          setSelectedItem(it);
                          setItemQuery(`${it.part_no || it.sap_no} - ${it.part_description}`);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-slate-700 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold font-mono text-slate-800 dark:text-slate-100">{it.part_no || it.sap_no}</div>
                          <div className="text-[11px] text-slate-500">{it.part_description}</div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">SAP: {it.sap_no}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity & Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    5. จำนวน (Pcs) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    value={reqQty}
                    onChange={(e) => setReqQty(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-rose-600 font-mono font-bold text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    6. สาเหตุของเสีย (Defect Reason) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reqReason}
                    onChange={(e) => setReqReason(e.target.value)}
                    placeholder="เช่น ชิ้นงานบุบ, รอยขีดข่วน, เกลียวเสีย..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submittingNew}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {submittingNew ? 'กำลังบันทึก...' : 'ยืนยันแจ้งของเสียและขอเบิก'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 2: Reject Confirmation Modal */}
      {rejectTarget && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4 text-xs animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-rose-600 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>ยืนยันการปฏิเสธคำขอเบิกทดแทน</span>
              </h3>
              <button type="button" onClick={() => setRejectTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                ระบุเหตุผลในการปฏิเสธ <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุสาเหตุที่ไม่อนุมัติจ่ายของ..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                ยืนยันปฏิเสธคำขอ
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 3: Scrap Analytics Executive Dashboard */}
      {isAnalyticsOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    Scrap & Replacement Analytics Dashboard
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ข้อมูลช่วงวันที่ {startDate} ถึง {endDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAnalyticsExcel}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAnalyticsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {loadingAnalytics || !analyticsData ? (
                <div className="py-16 text-center text-slate-400">กำลังประมวลผลสถิติของเสีย...</div>
              ) : (
                <>
                  {/* 6 KPI Cards matching legacy storeRequest.js */}
                  {(() => {
                    const s = analyticsData.summary || {};
                    const tickets = Number(s.total_tickets || 0);
                    const pcs = Number(s.total_pcs || 0);
                    const cost = Number(s.total_cost || 0);
                    const avgTicket = tickets > 0 ? cost / tickets : 0;
                    const avgPc = pcs > 0 ? cost / pcs : 0;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Total Tickets</div>
                          <div className="text-base font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5">{tickets.toLocaleString()}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                          <div className="text-[10px] font-bold text-amber-600 uppercase">Total Scrap Pcs</div>
                          <div className="text-base font-black text-amber-700 dark:text-amber-300 font-mono mt-0.5">{pcs.toLocaleString()}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                          <div className="text-[10px] font-bold text-rose-600 uppercase">Total Scrap Cost</div>
                          <div className="text-base font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">฿{cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                          <div className="text-[10px] font-bold text-indigo-600 uppercase">Top Defect Line</div>
                          <div className="text-base font-black text-indigo-700 dark:text-indigo-300 font-mono mt-0.5 truncate">{s.top_line || 'N/A'}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Avg Cost / Ticket</div>
                          <div className="text-base font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5">฿{avgTicket.toFixed(0)}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Avg Cost / Pc</div>
                          <div className="text-base font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5">฿{avgPc.toFixed(2)}</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Breakdown Grids */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cost by Production Line */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">มูลค่าของเสียแยกตามไลน์ผลิต (Cost by Line)</h4>
                      <div className="space-y-2">
                        {(analyticsData.line || []).map((item, idx) => {
                          const maxVal = Math.max(...(analyticsData.line || []).map((x) => Number(x.total_cost || 0)), 1);
                          const pct = Math.min(100, Math.round((Number(item.total_cost || 0) / maxVal) * 100));
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-semibold">{item.line}</span>
                                <span className="font-mono font-bold text-rose-600">฿{Number(item.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Top 5 Defective Parts */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Top 5 ชิ้นส่วนที่มีมูลค่าความเสียหายสูงสุด</h4>
                      <div className="space-y-2">
                        {(analyticsData.top_parts || []).map((item, idx) => {
                          const maxVal = Math.max(...(analyticsData.top_parts || []).map((x) => Number(x.total_cost || 0)), 1);
                          const pct = Math.min(100, Math.round((Number(item.total_cost || 0) / maxVal) * 100));
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-mono font-semibold">{item.part_no}</span>
                                <span className="font-mono font-bold text-amber-600">฿{Number(item.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Top Defect Reasons */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">สาเหตุของเสียหลัก (Top Defect Reasons)</h4>
                      <div className="space-y-2">
                        {(analyticsData.reasons || []).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 last:border-none">
                            <span className="text-slate-700 dark:text-slate-300 truncate pr-3">{item.reason}</span>
                            <span className="font-mono font-bold text-rose-600 whitespace-nowrap">
                              ฿{Number(item.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Requesters & Team Breakdown */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">ผู้แจ้งเบิกสูงสุด & สัดส่วนตามทีม (Requesters & Team)</h4>
                      <div className="space-y-2">
                        {(analyticsData.requesters || []).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800 last:border-none">
                            <span className="text-slate-700 dark:text-slate-300">{item.requester}</span>
                            <span className="font-mono font-bold text-indigo-600">
                              ฿{Number(item.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
