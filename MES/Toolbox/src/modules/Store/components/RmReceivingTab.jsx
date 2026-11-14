import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Boxes, Package, Search, Filter, RefreshCw, Printer, Download,
  Trash2, QrCode, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  X, CheckSquare, Square, ChevronLeft, ChevronRight, Eye, Layers,
  ExternalLink, FileSpreadsheet, MapPin
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { QRCodeSVG } from 'qrcode.react';
import { storeApi } from '../../../shared/services/storeApi';
import { storeOfflineEngine } from '../utils/storeOfflineEngine';

export default function RmReceivingTab() {
  // Filters & State
  const todayStr = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('PENDING'); // Default to PENDING like legacy
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);

  // Data
  const [tags, setTags] = useState([]);
  const [kpi, setKpi] = useState({ total_tags: 0, total_qty: 0, printed_tags: 0, pending_tags: 0 });
  const [pagination, setPagination] = useState({ total_records: 0, current_page: 1, total_pages: 1 });
  const [loading, setLoading] = useState(true);

  // Selection
  const [selectedSerials, setSelectedSerials] = useState([]);

  // Locations for receiving
  const [locations, setLocations] = useState([]);

  // Modals
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);

  // Trace Modal
  const [isTraceModalOpen, setIsTraceModalOpen] = useState(false);
  const [traceSearchCode, setTraceSearchCode] = useState('');
  const [traceData, setTraceData] = useState(null);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [traceError, setTraceError] = useState('');

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printTagsData, setPrintTagsData] = useState([]);
  const [loadingPrint, setLoadingPrint] = useState(false);

  // Load Tags List
  const fetchTags = async (targetPage = page) => {
    setLoading(true);
    try {
      const res = await storeApi.getRmHistory({
        startDate,
        endDate,
        search,
        status: statusFilter,
        page: targetPage,
        limit
      });

      if (res && res.success) {
        setTags(res.data || []);
        if (res.kpi) setKpi(res.kpi);
        if (res.pagination) {
          setPagination(res.pagination);
          setPage(res.pagination.current_page || targetPage);
        }
      }
    } catch (err) {
      console.error('Failed to load RM tags:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load warehouse locations once
  useEffect(() => {
    storeApi.getLocationZones()
      .then(res => {
        if (res && res.success) {
          // Flatten locations
          const locs = [];
          (res.data || []).forEach(zone => {
            (zone.locations || []).forEach(l => {
              locs.push({
                location_id: l.location_id,
                location_name: l.location_name,
                zone_name: zone.zone_name
              });
            });
          });
          setLocations(locs);
          if (locs.length > 0) setSelectedLocationId(String(locs[0].location_id));
        }
      })
      .catch(err => console.error('Failed to load locations:', err));
  }, []);

  // Fetch when filters change
  useEffect(() => {
    setPage(1);
    setSelectedSerials([]);
    fetchTags(1);
  }, [startDate, endDate, statusFilter, limit]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchTags(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handleSynced = (event) => {
      if (event.detail?.modules?.includes('rm_receiving')) {
        fetchTags(page);
      }
    };
    window.addEventListener('mes-store-offline-synced', handleSynced);
    return () => window.removeEventListener('mes-store-offline-synced', handleSynced);
  }, [page]);

  // Toggle selection
  const handleToggleSelect = (serialNo) => {
    setSelectedSerials(prev => 
      prev.includes(serialNo) ? prev.filter(s => s !== serialNo) : [...prev, serialNo]
    );
  };

  const handleSelectAllCurrentPage = () => {
    if (selectedSerials.length === tags.length && tags.length > 0) {
      setSelectedSerials([]);
    } else {
      setSelectedSerials(tags.map(t => t.serial_no));
    }
  };

  // Bulk Receive
  const handleConfirmReceive = async () => {
    if (!selectedLocationId) {
      alert('กรุณาเลือกคลัง/จุดจัดเก็บปลายทาง');
      return;
    }
    if (selectedSerials.length === 0) return;

    const locationIdNum = parseInt(selectedLocationId, 10);
    const queueReceiveOffline = async () => {
      await storeOfflineEngine.enqueue({
        module: 'rm_receiving',
        action: 'bulk_receive_tags',
        payload: {
          serials: [...selectedSerials],
          locationId: locationIdNum
        },
        summary: `รับเข้า ${selectedSerials.length} แท็ก -> Location #${locationIdNum}`
      });
      alert(`โหมดออฟไลน์: บันทึกคิวรับเข้า ${selectedSerials.length} แท็กไว้ในเครื่องเรียบร้อย จะซิงค์อัตโนมัติเมื่อมีสัญญาณ`);
      setIsReceiveModalOpen(false);
      setSelectedSerials([]);
    };

    if (!storeOfflineEngine.isOnline()) {
      await queueReceiveOffline();
      return;
    }

    setIsReceiving(true);
    try {
      const res = await storeApi.bulkReceiveTags({
        serials: selectedSerials,
        locationId: locationIdNum
      });

      if (res && res.success) {
        alert(res.message || 'รับเข้าสต็อกสำเร็จ');
        setIsReceiveModalOpen(false);
        setSelectedSerials([]);
        fetchTags(page);
      } else {
        alert('เกิดข้อผิดพลาด: ' + (res?.message || 'ไม่สามารถรับเข้าได้'));
      }
    } catch (err) {
      if (err?.isNetworkError || !storeOfflineEngine.isOnline()) {
        await queueReceiveOffline();
      } else {
        alert('เกิดข้อผิดพลาด: ' + (err.message || err));
      }
    } finally {
      setIsReceiving(false);
    }
  };

  // Bulk Delete
  const handleDeleteSelected = async () => {
    if (selectedSerials.length === 0) return;
    const ok = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบแท็กที่เลือกจำนวน ${selectedSerials.length} รายการ?\n(แท็กที่ถูกใช้งานแล้วจะไม่สามารถลบได้)`);
    if (!ok) return;

    try {
      const res = await storeApi.deleteBulkTags(selectedSerials);
      if (res && res.success) {
        alert('ลบแท็กสำเร็จ');
        setSelectedSerials([]);
        fetchTags(page);
      } else {
        alert('เกิดข้อผิดพลาด: ' + (res?.message || 'ไม่สามารถลบได้'));
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.message || err));
    }
  };

  // Delete single
  const handleDeleteSingle = async (serialNo) => {
    const ok = window.confirm(`ต้องการลบแท็ก ${serialNo} หรือไม่?`);
    if (!ok) return;

    try {
      const res = await storeApi.deleteTag(serialNo);
      if (res && res.success) {
        alert('ลบแท็กสำเร็จ');
        setSelectedSerials(prev => prev.filter(s => s !== serialNo));
        fetchTags(page);
      } else {
        alert('เกิดข้อผิดพลาด: ' + (res?.message || 'ไม่สามารถลบได้'));
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.message || err));
    }
  };

  // Print Selected Tags
  const handleOpenPrintModal = async () => {
    if (selectedSerials.length === 0) return;
    setIsPrintModalOpen(true);
    setLoadingPrint(true);
    try {
      const res = await storeApi.getPrintTags(selectedSerials);
      if (res && res.success) {
        setPrintTagsData(res.data || []);
      }
    } catch (err) {
      console.error('Print fetch error:', err);
    } finally {
      setLoadingPrint(false);
    }
  };

  const handlePrintSubmit = async () => {
    // Call update print status
    try {
      await storeApi.updatePrintStatus(selectedSerials);
      window.print();
      fetchTags(page);
    } catch (err) {
      console.error('Update print count error:', err);
      window.print();
    }
  };

  // Trace tag
  const handleOpenTrace = (serialNo = '') => {
    setTraceSearchCode(serialNo);
    setTraceData(null);
    setTraceError('');
    setIsTraceModalOpen(true);
    if (serialNo) {
      executeTrace(serialNo);
    }
  };

  const executeTrace = async (code) => {
    if (!code) return;
    setLoadingTrace(true);
    setTraceError('');
    try {
      const res = await storeApi.traceTag(code);
      if (res && res.success) {
        setTraceData(res.data);
      } else {
        setTraceError(res?.message || 'ไม่พบข้อมูลแท็กในระบบ');
      }
    } catch (err) {
      setTraceError(err.message || 'เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setLoadingTrace(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const res = await storeApi.getRmHistory({
        startDate,
        endDate,
        search,
        status: statusFilter,
        exportData: true
      });

      const exportRows = (res?.data || tags).map(t => ({
        'Serial No': t.serial_no,
        'Master Pallet': t.master_pallet_no || '-',
        'Part No': t.item_no || '-',
        'Description': t.part_description || '-',
        'Qty (PCS)': Number(t.qty_per_pallet || 0),
        'Current Qty': Number(t.current_qty || 0),
        'Status': t.status,
        'PO Number': t.po_number || '-',
        'Pallet No': t.pallet_no || '-',
        'Location / Warehouse': t.warehouse_no || '-',
        'Print Count': Number(t.print_count || 0),
        'Created Date': t.created_at ? new Date(t.created_at).toLocaleString('th-TH') : '-'
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'RM_Tags');
      XLSX.writeFile(wb, `RM_Tags_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      alert('ส่งออก Excel ผิดพลาด: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col h-full gap-2.5 sm:gap-3 overflow-hidden">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 flex-shrink-0">
        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              รวมแท็กทั้งหมด
            </div>
            <div className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">
              {Number(kpi.total_tags || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">Tags ในช่วงเวลา</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ปริมาณรวมทั้งหมด
            </div>
            <div className="text-lg sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">
              {Number(kpi.total_qty || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">PCS (ชิ้น)</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              พิมพ์แล้ว
            </div>
            <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {Number(kpi.printed_tags || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">Printed Tags</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              รอพิมพ์ / รอรับเข้า
            </div>
            <div className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              {Number(kpi.pending_tags || 0).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">Pending Tags</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search & Actions */}
      <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหา Serial, Part, PO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs bg-transparent focus:outline-none text-slate-700 dark:text-slate-300"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs bg-transparent focus:outline-none text-slate-700 dark:text-slate-300"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
          >
            <option value="ALL">ทุกสถานะ (All)</option>
            <option value="PENDING">รอรับเข้า (Pending)</option>
            <option value="AVAILABLE">อยู่ในคลัง (Available)</option>
            <option value="ISSUED">เบิกจ่ายแล้ว (Issued)</option>
          </select>

          {/* Rows limit */}
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="px-2 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none"
          >
            <option value={50}>50 แถว</option>
            <option value={100}>100 แถว</option>
            <option value={200}>200 แถว</option>
          </select>

          {/* Refresh button */}
          <button
            onClick={() => fetchTags(page)}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => handleOpenTrace('')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 text-white hover:bg-cyan-700 transition-colors shadow-sm"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>สแกน / ค้นหาแท็ก</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Batch Operations Bar (Floats or sticky when items selected) */}
      {selectedSerials.length > 0 && (
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-2 shadow-lg animate-fadeIn flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold pl-2">
            <CheckSquare className="w-4 h-4 text-blue-400" />
            <span>เลือกแล้ว {selectedSerials.length} รายการ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReceiveModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ยืนยันรับเข้าสต็อก</span>
            </button>

            <button
              onClick={handleOpenPrintModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์แท็ก ({selectedSerials.length})</span>
            </button>

            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบ</span>
            </button>

            <button
              onClick={() => setSelectedSerials([])}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="ยกเลิกการเลือก"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Table / Grid */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedSerials.length === tags.length && tags.length > 0}
                    onChange={handleSelectAllCurrentPage}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="p-3 font-bold text-slate-600 dark:text-slate-300">Serial No / Master Pallet</th>
                <th className="p-3 font-bold text-slate-600 dark:text-slate-300">Part No / Description</th>
                <th className="p-3 font-bold text-slate-600 dark:text-slate-300 text-right">จำนวน (PCS)</th>
                <th className="p-3 font-bold text-slate-600 dark:text-slate-300">PO / Pallet</th>
                <th className="p-3 font-bold text-slate-600 dark:text-slate-300">Location</th>
                <th className="p-3 font-bold text-slate-600 dark:text-slate-300 text-center">สถานะ</th>
                <th className="p-3 font-bold text-slate-600 dark:text-slate-300 text-center">พิมพ์</th>
                <th className="p-3 font-bold text-slate-600 dark:text-slate-300 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>กำลังโหลดข้อมูลแท็ก...</span>
                  </td>
                </tr>
              ) : tags.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <span>ไม่พบรายการแท็กตามเงื่อนไขที่เลือก</span>
                  </td>
                </tr>
              ) : (
                tags.map((t) => {
                  const isSelected = selectedSerials.includes(t.serial_no);
                  return (
                    <tr
                      key={t.serial_no}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-blue-50/60 dark:bg-blue-950/40' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(t.serial_no)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenTrace(t.serial_no)}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            title="คลิกเพื่อดูประวัติแท็ก"
                          >
                            <span>{t.serial_no}</span>
                            <Eye className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                        {t.master_pallet_no && (
                          <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
                            Pallet: {t.master_pallet_no}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {t.item_no || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs" title={t.part_description}>
                          {t.part_description || '-'}
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono font-bold">
                        <div className="text-slate-900 dark:text-slate-100">
                          {Number(t.qty_per_pallet || 0).toLocaleString()}
                        </div>
                        {t.current_qty !== t.qty_per_pallet && (
                          <div className="text-[10px] text-amber-600">
                            เหลือ: {Number(t.current_qty || 0).toLocaleString()}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-mono text-slate-700 dark:text-slate-300">{t.po_number || '-'}</div>
                        <div className="text-[10px] text-slate-400">{t.pallet_no || '-'}</div>
                      </td>

                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {t.warehouse_no || '-'}
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : t.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {t.status === 'AVAILABLE' ? 'อยู่ในคลัง' : t.status === 'PENDING' ? 'รอรับเข้า' : t.status}
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono">
                        {Number(t.print_count || 0) > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold">
                            {t.print_count} ครั้ง
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenTrace(t.serial_no)}
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="ส่องประวัติแท็ก"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {t.status === 'PENDING' && (
                            <button
                              onClick={() => {
                                setSelectedSerials([t.serial_no]);
                                setIsReceiveModalOpen(true);
                              }}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="รับเข้าสต็อก"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {['PENDING', 'AVAILABLE'].includes(t.status) && (
                            <button
                              onClick={() => handleDeleteSingle(t.serial_no)}
                              className="p-1 rounded text-red-500 hover:bg-red-50 transition-colors"
                              title="ลบแท็ก"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-2.5 sm:p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <div>
            ทั้งหมด <span className="font-bold text-slate-800 dark:text-slate-200">{pagination.total_records || 0}</span> รายการ (หน้า {page} / {pagination.total_pages || 1})
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchTags(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold px-2">{page}</span>
            <button
              onClick={() => fetchTags(page + 1)}
              disabled={page >= pagination.total_pages || loading}
              className="p-1 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-30 hover:bg-slate-200 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Receive to Location */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  ยืนยันรับเข้าสต็อก (Receive Tags)
                </h3>
              </div>
              <button onClick={() => setIsReceiveModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 py-2">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs">
                คุณกำลังจะรับเข้าสต็อกจำนวน <strong>{selectedSerials.length}</strong> รายการ
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เลือกตำแหน่งจัดเก็บ (Destination Location): <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full p-2 rounded-lg text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                >
                  {locations.map(loc => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.location_name} {loc.zone_name ? `(โซน ${loc.zone_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmReceive}
                disabled={isReceiving}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isReceiving ? 'กำลังรับเข้า...' : 'ยืนยันรับเข้า'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Trace Tag Lifecycle */}
      {isTraceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  ตรวจสอบประวัติแท็ก (Trace Tag Lifecycle)
                </h3>
              </div>
              <button onClick={() => setIsTraceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Trace Search input */}
            <div className="flex items-center gap-2 mb-3 flex-shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="สแกนหรือพิมพ์ Serial No, Pallet No..."
                  value={traceSearchCode}
                  onChange={(e) => setTraceSearchCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeTrace(traceSearchCode)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
              <button
                onClick={() => executeTrace(traceSearchCode)}
                disabled={loadingTrace || !traceSearchCode}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingTrace ? 'ค้นหา...' : 'ตรวจสอบ'}
              </button>
            </div>

            {/* Trace Body */}
            <div className="flex-1 overflow-auto pr-1">
              {loadingTrace ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <span>กำลังดึงข้อมูลแท็ก...</span>
                </div>
              ) : traceError ? (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
                  {traceError}
                </div>
              ) : traceData ? (
                <div className="space-y-4">
                  {/* Tag Info Card */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-base font-black text-slate-900 dark:text-slate-100">
                          {traceData.tag_info?.serial_no}
                        </div>
                        <div className="text-xs font-bold text-blue-600 mt-0.5">
                          {traceData.tag_info?.item_no} - {traceData.tag_info?.part_description}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {traceData.tag_info?.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">จำนวนเริ่มต้น:</span>
                        <span className="font-mono font-bold">{traceData.tag_info?.qty_per_pallet} PCS</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">คงเหลือปัจจุบัน:</span>
                        <span className="font-mono font-bold text-emerald-600">{traceData.tag_info?.current_qty} PCS</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">PO Number:</span>
                        <span className="font-mono font-bold">{traceData.tag_info?.po_number || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">ตำแหน่ง:</span>
                        <span className="font-bold">{traceData.tag_info?.location_name || traceData.tag_info?.warehouse_no || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Timeline */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>ประวัติเส้นทาง (Timeline History)</span>
                    </h4>

                    {(!traceData.history || traceData.history.length === 0) ? (
                      <div className="text-xs text-slate-400 p-4 text-center">ไม่มีประวัติการทำรายการ</div>
                    ) : (
                      <div className="space-y-2 border-l-2 border-blue-200 dark:border-blue-900 ml-3 pl-3">
                        {traceData.history.map((h, idx) => (
                          <div key={idx} className="relative pb-2">
                            <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900" />
                            <div className="text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  {h.transaction_type}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  {h.transaction_timestamp}
                                </span>
                              </div>
                              <div className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                                {h.notes || 'ทำรายการ'} {h.quantity_changed ? `(${h.quantity_changed} PCS)` : ''} โดย {h.actor_name || 'System'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  สแกนหรือใส่หมายเลขแท็กเพื่อดูประวัติ
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Printable Tags Preview */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  ตัวอย่างการพิมพ์แท็ก (Print Tags Preview)
                </h3>
              </div>
              <button onClick={() => setIsPrintModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto pr-1 print:p-0">
              {loadingPrint ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                  <span>กำลังเตรียมแบบแท็กสำหรับพิมพ์...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="printable-tags-area">
                  {printTagsData.map((item) => (
                    <div
                      key={item.serial_no}
                      className="p-3.5 rounded-xl border-2 border-slate-800 bg-white text-black font-sans text-xs flex flex-col justify-between shadow-sm"
                      style={{ minHeight: '190px' }}
                    >
                      {/* Tag Header */}
                      <div className="border-b-2 border-black pb-1.5 mb-2 flex items-start justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                            SNC FORMER - RM TAG
                          </div>
                          <div className="text-sm font-black tracking-tight">{item.part_no || item.item_no}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 border border-black rounded">
                            {item.warehouse_no || 'STORE'}
                          </span>
                        </div>
                      </div>

                      {/* Tag Body */}
                      <div className="flex items-center justify-between gap-2 my-auto">
                        <div className="flex-1 space-y-1">
                          <div className="text-[11px] font-bold line-clamp-2 leading-tight">
                            {item.part_description}
                          </div>
                          <div className="text-xs">
                            <span className="text-slate-500">Qty: </span>
                            <span className="text-base font-black font-mono">{Number(item.qty || 0).toLocaleString()}</span> PCS
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono">
                            PO: {item.po_number || '-'} | Pallet: {item.pallet_no || '-'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Date: {item.received_date || new Date().toISOString().slice(0, 10)}
                          </div>
                        </div>

                        {/* QR Code */}
                        <div className="p-1 border border-slate-300 rounded bg-white flex-shrink-0">
                          <QRCodeSVG value={item.serial_no} size={84} level="M" />
                        </div>
                      </div>

                      {/* Tag Footer */}
                      <div className="border-t border-dashed border-black pt-1.5 mt-2 flex items-center justify-between font-mono text-[11px] font-black">
                        <span>{item.serial_no}</span>
                        <span className="text-[9px] font-sans font-normal text-slate-500">FIFO TAG</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
              >
                ปิด
              </button>
              <button
                onClick={handlePrintSubmit}
                disabled={loadingPrint || printTagsData.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>สั่งพิมพ์ ({printTagsData.length} แท็ก)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
