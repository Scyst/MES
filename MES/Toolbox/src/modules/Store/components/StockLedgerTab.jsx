import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  FileText, Search, RefreshCw, ArrowUpRight, ArrowDownLeft,
  ChevronLeft, ChevronRight, Download, ListFilter, RotateCcw
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import SecurityWatermark from '../../../shared/components/SecurityWatermark';

function getIsoDateOffset(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

export default function StockLedgerTab() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [kpi, setKpi] = useState({ total_trans: 0, total_in: 0, total_out: 0 });
  const [pagination, setPagination] = useState({ total_records: 0, current_page: 1, total_pages: 1 });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [locationType, setLocationType] = useState('STORE');
  const [locationId, setLocationId] = useState('ALL');
  const [txType, setTxType] = useState('ALL');
  const [materialType, setMaterialType] = useState('ALL');
  const [startDate, setStartDate] = useState(() => getIsoDateOffset(-7));
  const [endDate, setEndDate] = useState(() => getIsoDateOffset(0));
  const [page, setPage] = useState(1);
  const rowsPerPage = 100;

  useEffect(() => {
    let active = true;
    storeApi.getMasterData()
      .then((res) => {
        if (active && res?.data?.locations) {
          setLocations(res.data.locations);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const filteredLocations = useMemo(() => {
    if (locationType === 'ALL') return locations;
    return locations.filter((loc) => loc.location_type === locationType);
  }, [locations, locationType]);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await storeApi.getStockLedger({
        page,
        limit: rowsPerPage,
        search: appliedSearch,
        transactionType: txType,
        locationType,
        locationId,
        materialType,
        startDate,
        endDate
      });

      if (res && res.success) {
        setTransactions(res.transactions || res.data || []);
        if (res.kpi) {
          setKpi({
            total_trans: Number(res.kpi.total_trans || 0),
            total_in: Number(res.kpi.total_in || 0),
            total_out: Number(res.kpi.total_out || 0)
          });
        }
        if (res.pagination) {
          setPagination({
            total_records: Number(res.pagination.total_records || 0),
            current_page: Number(res.pagination.current_page || page),
            total_pages: Math.max(1, Number(res.pagination.total_pages || 1))
          });
        }
      }
    } catch (err) {
      console.error('Failed to load stock ledger:', err);
      showToast('ไม่สามารถโหลดข้อมูลประวัติความเคลื่อนไหวได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, txType, locationType, locationId, materialType, startDate, endDate, appliedSearch, showToast]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const nextSearch = search.trim();
    if (page === 1 && appliedSearch === nextSearch) {
      fetchLedger();
    } else {
      setPage(1);
      setAppliedSearch(nextSearch);
    }
  };

  const handleResetFilters = () => {
    setStartDate(getIsoDateOffset(-7));
    setEndDate(getIsoDateOffset(0));
    setLocationType('STORE');
    setLocationId('ALL');
    setTxType('ALL');
    setMaterialType('ALL');
    setSearch('');
    setAppliedSearch('');
    setPage(1);
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await storeApi.getStockLedger({
        search: search.trim(),
        transactionType: txType,
        locationType,
        locationId,
        materialType,
        startDate,
        endDate,
        exportData: true
      });

      const rows = res?.transactions || res?.data || [];
      if (!res?.success || rows.length === 0) {
        showToast('ไม่มีข้อมูลสำหรับส่งออก Excel ในช่วงเวลาที่เลือก', 'warning');
        return;
      }

      const wsData = [
        ['วันที่-เวลา', 'SAP No.', 'Item No', 'Description', 'จาก Location', 'ถึง Location', 'ประเภท', 'IN (+)', 'OUT (-)', 'Ref / Lot No', 'ผู้บันทึก', 'หมายเหตุ']
      ];

      rows.forEach((row) => {
        const qty = parseFloat(row.quantity || row.qty || 0);
        const inQty = qty > 0 ? qty : 0;
        const outQty = qty < 0 ? Math.abs(qty) : 0;
        wsData.push([
          row.transaction_timestamp || row.created_at || '-',
          row.sap_no || '-',
          row.item_no || row.part_no || row.sap_no || '-',
          row.part_description || '-',
          row.from_loc || '-',
          row.to_loc || '-',
          row.transaction_type || row.tx_type || '-',
          inQty,
          outQty,
          row.reference_id || row.reference_no || '-',
          row.actor_name || row.username || 'System',
          row.notes || '-'
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stock_Ledger');
      XLSX.writeFile(wb, `Stock_Ledger_${startDate}_to_${endDate}.xlsx`);
      showToast(`ส่งออกข้อมูล ${rows.length.toLocaleString()} รายการเป็นไฟล์ Excel สำเร็จ`, 'success');
    } catch (err) {
      console.error('Export Stock Ledger Excel Error:', err);
      showToast('เกิดข้อผิดพลาดในการส่งออกไฟล์ Excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const startRecord = pagination.total_records === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const endRecord = Math.min(page * rowsPerPage, pagination.total_records);

  return (
    <div className="flex flex-col h-full space-y-2.5 animate-fadeIn relative">
      <SecurityWatermark classification="STOCK LEDGER • AUDIT TRAIL" />

      {/* 3 KPI Summary Cards (Parity with legacy stockTransaction.php) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-shrink-0">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase text-slate-500 dark:text-slate-400">รายการเคลื่อนไหว</div>
            <div className="text-base sm:text-xl font-black font-mono text-slate-800 dark:text-slate-100">
              {kpi.total_trans.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-400">Transactions</div>
          </div>
          <div className="hidden sm:flex h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 items-center justify-center">
            <ListFilter className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 px-3 py-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">ยอดรับเข้า (TOTAL IN)</div>
            <div className="text-base sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {kpi.total_in.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400">PCS</div>
          </div>
          <div className="hidden sm:flex h-9 w-9 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 items-center justify-center">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 px-3 py-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[10px] sm:text-xs font-bold uppercase text-rose-600 dark:text-rose-400">ยอดเบิกออก (TOTAL OUT)</div>
            <div className="text-base sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400">
              {kpi.total_out.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400">PCS</div>
          </div>
          <div className="hidden sm:flex h-9 w-9 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา Part No, SAP No, Ref No หรือ Notes..."
              className="w-full text-xs pl-8 pr-2.5 py-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </form>

          <button
            type="button"
            onClick={handleSearchSubmit}
            title="ค้นหา / รีเฟรชข้อมูล"
            className="h-8 px-2.5 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap flex-nowrap py-0.5 lg:py-0 flex-shrink-0">
          {/* Location Type Filter (STORE, MAINTENANCE, RM, etc.) */}
          <select
            value={locationType}
            onChange={(e) => {
              setLocationType(e.target.value);
              setLocationId('ALL');
              setPage(1);
            }}
            className="text-xs h-8 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40 font-semibold text-blue-700 dark:text-blue-300 flex-shrink-0"
            title="ประเภทคลัง (Location Type)"
          >
            <option value="ALL">ทุกประเภทคลัง (All Types)</option>
            <option value="STORE">STORE (คลังทั่วไป)</option>
            <option value="MAINTENANCE">MAINTENANCE (คลังอะไหล่ MT)</option>
            <option value="RM">RM (Raw Material)</option>
            <option value="SEMI">SEMI (Semi-Finished)</option>
            <option value="FG">FG (Finished Goods)</option>
            <option value="TOOL">TOOL (ห้องเครื่องมือ)</option>
          </select>

          {/* Specific Location Filter */}
          <select
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              setPage(1);
            }}
            className="text-xs h-8 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 flex-shrink-0 max-w-[160px]"
            title="คลังย่อย (Location)"
          >
            <option value="ALL">ทุก Location</option>
            {filteredLocations.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.location_name}
              </option>
            ))}
          </select>

          {/* Transaction Type Filter */}
          <select
            value={txType}
            onChange={(e) => {
              setTxType(e.target.value);
              setPage(1);
            }}
            className="text-xs h-8 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 flex-shrink-0"
          >
            <option value="ALL">ทุกประเภทเคลื่อนไหว</option>
            <option value="RECEIPT">RECEIPT (รับเข้า)</option>
            <option value="INTERNAL_TRANSFER">TRANSFER (โอนย้าย)</option>
            <option value="CONSUMPTION">CONSUMPTION (เบิกจ่าย)</option>
            <option value="ADJUSTMENT">ADJUSTMENT (ปรับยอด)</option>
          </select>

          {/* Material Type Filter */}
          <select
            value={materialType}
            onChange={(e) => {
              setMaterialType(e.target.value);
              setPage(1);
            }}
            className="text-xs h-8 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 flex-shrink-0"
          >
            <option value="ALL">ทุกหมวดวัสดุ</option>
            <option value="FG">FG (Finished Good)</option>
            <option value="SEMI">SEMI (Semi-Finished)</option>
            <option value="WIP">WIP (Work in Process)</option>
            <option value="RM">RM (Raw Material)</option>
            <option value="PKG">PKG (Packaging)</option>
            <option value="CON">CON (Consumable)</option>
            <option value="SP">SP (Spare Part)</option>
            <option value="TOOL">TOOL (Tools)</option>
            <option value="OTHER">OTHER (อื่นๆ)</option>
          </select>

          {/* Date range inputs */}
          <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="text-xs h-8 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            />
            <span>-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="text-xs h-8 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            />
          </div>

          <button
            type="button"
            onClick={handleResetFilters}
            title="รีเซ็ตตัวกรอง"
            className="h-8 px-2.5 flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex-shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Export Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExporting || loading}
            title="ส่งออกประวัติความเคลื่อนไหวเป็นไฟล์ Excel (.xlsx)"
            className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 disabled:opacity-50 transition-colors cursor-pointer flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'กำลังส่งออก...' : 'Export'}</span>
          </button>
        </div>
      </div>

      {/* Ledger Display - Dual Mode: Table for Desktop, Cards for Mobile */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              กำลังโหลดสมุดบัญชีสต็อก...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">ไม่พบประวัติการเคลื่อนไหวสต็อกในช่วงเวลานี้</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 text-center">#</th>
                      <th className="py-2.5 px-3">วันที่ / เวลา</th>
                      <th className="py-2.5 px-3">SAP No.</th>
                      <th className="py-2.5 px-3">Part No. / Description</th>
                      <th className="py-2.5 px-3">Location</th>
                      <th className="py-2.5 px-3 text-center">Type</th>
                      <th className="py-2.5 px-3 text-right">ยอดเข้า (IN)</th>
                      <th className="py-2.5 px-3 text-right">ยอดออก (OUT)</th>
                      <th className="py-2.5 px-3">Ref / Lot No.</th>
                      <th className="py-2.5 px-3">ผู้บันทึก</th>
                      <th className="py-2.5 px-3">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((tx, idx) => {
                      const runningNumber = (page - 1) * rowsPerPage + idx + 1;
                      let displayQty = parseFloat(tx.quantity || tx.qty || 0);
                      const type = tx.transaction_type || tx.tx_type || 'TX';
                      if (type === 'INTERNAL_TRANSFER' && locationId !== 'ALL') {
                        if (String(tx.from_location_id) === String(locationId)) {
                          displayQty = -Math.abs(displayQty);
                        } else if (String(tx.to_location_id) === String(locationId)) {
                          displayQty = Math.abs(displayQty);
                        }
                      }
                      const isPositive = displayQty > 0;
                      const isNegative = displayQty < 0;
                      const dateStr = tx.transaction_timestamp || tx.created_at || '';
                      const refDoc = tx.reference_id || tx.reference_no || tx.doc_no || '-';
                      const actor = tx.actor_name || tx.created_by_name || tx.username || 'System';

                      let locDisplay = '-';
                      if (tx.from_loc && tx.to_loc) {
                        locDisplay = `${tx.from_loc} → ${tx.to_loc}`;
                      } else if (tx.to_loc) {
                        locDisplay = `↓ ${tx.to_loc}`;
                      } else if (tx.from_loc) {
                        locDisplay = `↑ ${tx.from_loc}`;
                      }

                      let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                      if (type.includes('RECEIPT') || type.includes('RECEIVE') || type.includes('IN')) {
                        badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
                      } else if (type.includes('CONSUMPTION') || type.includes('SCRAP') || type.includes('OUT')) {
                        badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300';
                      } else if (type.includes('TRANSFER')) {
                        badgeColor = 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300';
                      } else if (type.includes('ADJUST')) {
                        badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
                      }

                      return (
                        <tr
                          key={tx.transaction_id || idx}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                            {runningNumber}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 text-[11px] whitespace-nowrap">
                            {dateStr ? String(dateStr).slice(0, 16) : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {tx.sap_no || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                              {tx.item_no || tx.part_no || tx.sap_no}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]" title={tx.part_description || ''}>
                              {tx.part_description || '-'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {locDisplay}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>
                              {type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20">
                            {isPositive ? `+${displayQty.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/40 dark:bg-rose-950/20">
                            {isNegative ? displayQty.toLocaleString() : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-600 dark:text-slate-300 text-[11px]">
                            {refDoc}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                            {actor}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] truncate max-w-[200px]" title={tx.notes || ''}>
                            {tx.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW */}
              <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((tx, idx) => {
                  const qty = parseFloat(tx.quantity || tx.qty || 0);
                  const isPositive = qty > 0;
                  const isNegative = qty < 0;
                  const type = tx.transaction_type || tx.tx_type || 'TX';
                  const dateStr = tx.transaction_timestamp || tx.created_at;
                  const locName = tx.to_loc || tx.from_loc || tx.location_name || 'STORE';
                  const refDoc = tx.reference_id || tx.reference_no || tx.doc_no || '-';
                  const actor = tx.actor_name || tx.created_by_name || tx.username || 'System';

                  let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                  if (type.includes('RECEIPT') || type.includes('RECEIVE') || type.includes('IN')) {
                    badgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
                  } else if (type.includes('CONSUMPTION') || type.includes('SCRAP') || type.includes('OUT')) {
                    badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300';
                  } else if (type.includes('ADJUST')) {
                    badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
                  }

                  return (
                    <div key={tx.transaction_id || idx} className="p-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400 truncate">
                            {tx.item_no || tx.part_no || tx.sap_no}
                          </span>
                          {tx.sap_no && (
                            <span className="font-mono text-[11px] text-slate-400">
                              ({tx.sap_no})
                            </span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor} flex-shrink-0`}>
                          {type}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                        {tx.part_description || '-'}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 mt-0.5 text-xs">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[11px] text-slate-400">จำนวน:</span>
                          <span
                            className={`font-mono font-black text-sm ${
                              isPositive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : isNegative
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {isPositive ? `+${qty.toLocaleString()}` : qty.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {locName}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{dateStr ? String(dateStr).slice(0, 16) : '-'}</span>
                        <span>โดย {actor} {refDoc !== '-' ? `(Ref: ${refDoc})` : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/40 dark:bg-slate-800/20 flex-shrink-0">
          <span className="truncate font-semibold">
            แสดง {startRecord.toLocaleString()} ถึง {endRecord.toLocaleString()} จาก {pagination.total_records.toLocaleString()} รายการ
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">
              {page} / {pagination.total_pages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(pagination.total_pages, page + 1))}
              disabled={page >= pagination.total_pages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
