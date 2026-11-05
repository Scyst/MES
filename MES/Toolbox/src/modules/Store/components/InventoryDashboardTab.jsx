import React, { useState, useEffect } from 'react';
import {
  Boxes, DollarSign, AlertCircle, RefreshCw, Search, Filter,
  TrendingDown, ShieldCheck, ChevronLeft, ChevronRight, Eye,
  QrCode, FileText, ArrowLeftRight
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';
import SecurityWatermark from '../../../shared/components/SecurityWatermark';
import ItemDetailsModal from './ItemDetailsModal';
import QuickScannerModal from './QuickScannerModal';

export default function InventoryDashboardTab({ onNavigateTab }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [materialType, setMaterialType] = useState('ALL');
  const [hideZero, setHideZero] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(100);

  // Modals
  const [selectedModalItem, setSelectedModalItem] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await storeApi.getInventoryDashboard({
        page,
        limit,
        search,
        materialType,
        hideZero
      });

      if (res && res.success) {
        const rawItems = res.data || res.onhand || res.items || [];
        setItems(rawItems);
        const rawKpi = res.kpi || res.summary || {};
        setSummary(rawKpi);
      }
    } catch (err) {
      console.error('Failed to load inventory dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await storeApi.getMaterialCategories();
      if (res && res.success) {
        const cats = res.data?.categories || res.categories || [];
        setCategories(cats);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, materialType, hideZero]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const totalSkus = summary.total_skus ?? summary.total_items ?? items.length;
  const totalVal = summary.total_value ?? summary.total_val ?? 0;
  const lowStock = summary.out_of_stock ?? summary.low_stock ?? 0;
  const totalQty = summary.toolbar_total_pcs ?? summary.total_qty ?? 0;

  return (
    <div className="flex flex-col h-full space-y-2.5 animate-fadeIn relative">
      <SecurityWatermark classification="WAREHOUSE INVENTORY • CONFIDENTIAL" />

      {/* Summary Metrics Cards - Horizontal Swipeable on Mobile, Grid on Desktop */}
      <div className="flex md:grid md:grid-cols-4 gap-2 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap snap-x snap-mandatory pb-0.5 flex-nowrap flex-shrink-0 touch-pan-x">
        {/* Card 1: SKUs */}
        <div className="min-w-[145px] sm:min-w-0 flex-1 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 sm:gap-3 snap-start flex-shrink-0 sm:flex-shrink border-l-4 border-l-blue-600">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate block">
              รายการ (TOTAL SKUS)
            </span>
            <div className="text-sm sm:text-xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight truncate">
              {Number(totalSkus).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 2: Valuation */}
        <div className="min-w-[155px] sm:min-w-0 flex-1 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 sm:gap-3 snap-start flex-shrink-0 sm:flex-shrink border-l-4 border-l-emerald-500">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate block">
              มูลค่าคงคลัง
            </span>
            <div className="text-sm sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight truncate">
              ฿{Number(totalVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Card 3: Low/Out of Stock */}
        <div className="min-w-[145px] sm:min-w-0 flex-1 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 sm:gap-3 snap-start flex-shrink-0 sm:flex-shrink border-l-4 border-l-rose-500">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate block">
              สินค้าหมด (OUT/LOW)
            </span>
            <div className="text-sm sm:text-xl font-black text-rose-600 dark:text-rose-400 font-mono tracking-tight truncate">
              {Number(lowStock).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 4: Total Qty */}
        <div className="min-w-[145px] sm:min-w-0 flex-1 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 sm:gap-3 snap-start flex-shrink-0 sm:flex-shrink border-l-4 border-l-purple-500">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 truncate block">
              ยอดรวมคงคลัง
            </span>
            <div className="text-sm sm:text-xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight truncate">
              {Number(totalQty).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar - Mobile Ultra-Compact */}
      <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-1.5 sm:gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา Part No, SAP No, รายละเอียดชิ้นงาน..."
              className="w-full text-xs pl-8 pr-2.5 py-1.5 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </form>

          {/* Refresh Button on mobile next to search bar */}
          <button
            type="button"
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            title="รีเฟรชข้อมูล"
            className="h-8 w-8 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer flex-shrink-0 md:hidden"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap flex-nowrap py-0.5 md:py-0 flex-shrink-0">
          {/* Material Category Selector */}
          <select
            value={materialType}
            onChange={(e) => {
              setMaterialType(e.target.value);
              setPage(1);
            }}
            className="text-xs h-8 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 flex-shrink-0"
          >
            <option value="ALL">ทุกหมวดวัตถุดิบ (ALL)</option>
            {categories.map((c, idx) => {
              const val = typeof c === 'string' ? c : (c?.type || c?.material_type || String(idx));
              const label = typeof c === 'string' ? c : (c?.name || c?.type || c?.material_type || `หมวด ${idx + 1}`);
              return (
                <option key={idx} value={String(val)}>
                  {String(label)}
                </option>
              );
            })}
          </select>

          {/* Hide Zero Qty Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer px-2.5 py-1 h-8 rounded-lg bg-slate-50/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap flex-shrink-0">
            <input
              type="checkbox"
              checked={hideZero}
              onChange={(e) => {
                setHideZero(e.target.checked);
                setPage(1);
              }}
              className="rounded text-blue-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span>ซ่อนยอดศูนย์</span>
          </label>

          {/* Refresh Button on desktop */}
          <button
            type="button"
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            title="รีเฟรชข้อมูล"
            className="hidden md:flex p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Onhand Inventory Display - Dual Mode: Table for Desktop, Cards for Mobile */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              กำลังโหลดข้อมูลสต็อกคงคลัง...
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Boxes className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">ไม่พบข้อมูลสินค้าตามเงื่อนไข</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (hidden on mobile, visible on md:) */}
              <div className="hidden md:block">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-4">Part No / SAP No</th>
                      <th className="py-2.5 px-3">รายละเอียดชิ้นงาน (Description)</th>
                      <th className="py-2.5 px-3">ประเภท</th>
                      <th className="py-2.5 px-3">คลังหลัก / โซน</th>
                      <th className="py-2.5 px-3 text-right">ยอดคงเหลือ (Onhand)</th>
                      <th className="py-2.5 px-3 text-right">Safety Stock</th>
                      <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                      <th className="py-2.5 px-4 text-right">มูลค่ารวม (฿)</th>
                      <th className="py-2.5 px-3 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item, idx) => {
                      const onhand = parseFloat(item.available_qty ?? item.onhand_qty ?? item.quantity ?? 0);
                      const safety = parseFloat(item.safety_stock ?? item.min_stock ?? 0);
                      const isLow = safety > 0 && onhand <= safety;
                      const price = parseFloat(item.unit_price ?? item.StandardPrice ?? 0);
                      const totalItemVal = parseFloat(item.total_value ?? (onhand * price));
                      const partCode = item.part_no || item.item_no || item.sap_no;

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-4 font-mono">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {partCode}
                            </div>
                            {item.sap_no && item.sap_no !== partCode && (
                              <div className="text-[11px] text-slate-400">SAP: {item.sap_no}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                            <div className="font-medium truncate max-w-sm" title={item.part_description || item.description}>
                              {item.part_description || item.description || '-'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                              {item.material_type || 'RM'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                            <div>{item.location_name || 'STORE'}</div>
                            {item.zone_name && (
                              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-sans">
                                {item.zone_name}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                            <span className={isLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}>
                              {onhand.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              {item.unit || 'PCS'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {safety > 0 ? safety.toLocaleString() : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {price > 0 ? `฿${price.toFixed(2)}` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {totalItemVal > 0 ? `฿${totalItemVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedModalItem(item)}
                              title="ดูพิกัดคลังสินค้า"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <Search className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD VIEW (Adopted 1:1 from Old System Winning UX!) */}
              <div className="block md:hidden p-2 space-y-2.5">
                {items.map((item, idx) => {
                  const onhand = parseFloat(item.available_qty ?? item.onhand_qty ?? item.quantity ?? 0);
                  const pendingQty = parseFloat(item.pending_qty ?? 0);
                  const totalItemQty = onhand + pendingQty;
                  const safety = parseFloat(item.safety_stock ?? item.min_stock ?? 0);
                  const isOutOfStock = onhand <= 0;
                  const isLow = !isOutOfStock && safety > 0 && onhand <= safety;
                  const partCode = item.part_no || item.item_no || item.sap_no;

                  // Left border color accent
                  let borderLeft = 'border-l-4 border-l-emerald-500';
                  if (isOutOfStock) borderLeft = 'border-l-4 border-l-rose-500';
                  else if (isLow) borderLeft = 'border-l-4 border-l-amber-500';

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-3 transition-all ${borderLeft}`}
                    >
                      {/* Top Row: Type Badge + Out of Stock + Action Buttons */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase shadow-xs">
                            {item.material_type || 'RM'}
                          </span>
                          {isOutOfStock && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500 text-white uppercase">
                              OUT OF STOCK
                            </span>
                          )}
                        </div>

                        {/* Action Buttons Group */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedModalItem(item)}
                            title="ดูพิกัดคลังสินค้า"
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>
                          {onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('ledger')}
                              title="ดูประวัติการเคลื่อนไหว (Ledger)"
                              className="w-7 h-7 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Part No / Item Code (Prominent Blue Font) */}
                      <h4 className="font-mono font-black text-base text-blue-600 dark:text-blue-400 tracking-tight leading-snug">
                        {partCode}
                      </h4>

                      {/* Description */}
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 mb-2">
                        {item.part_description || item.description || '-'}
                      </p>

                      {/* Structured 3-Column Split (Pending | Available | Total) */}
                      <div className="grid grid-cols-3 text-center border-t border-slate-100 dark:border-slate-800 pt-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg py-1.5 mt-1">
                        <div className="border-r border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-400 font-sans">Pending</div>
                          <div className="font-mono font-bold text-xs text-amber-500">
                            {pendingQty.toLocaleString()}
                          </div>
                        </div>

                        <div
                          className="border-r border-slate-200 dark:border-slate-700 cursor-pointer"
                          onClick={() => setSelectedModalItem(item)}
                          title="คลิกเพื่อดูพิกัด"
                        >
                          <div className="text-[10px] text-slate-400 font-sans">Available</div>
                          <div
                            className={`font-mono font-black text-sm underline ${
                              isOutOfStock
                                ? 'text-rose-500'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {onhand.toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400 font-sans">Total</div>
                          <div className="font-mono font-black text-xs text-slate-800 dark:text-slate-100">
                            {totalItemQty.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Location & SAP No */}
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1.5 pt-1">
                        <span>
                          📍 {item.location_name || 'STORE'} {item.zone_name ? `(${item.zone_name})` : ''}
                        </span>
                        {item.sap_no && <span>SAP: {item.sap_no}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="px-3 sm:px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/40 dark:bg-slate-800/20 flex-shrink-0">
          <span className="truncate text-[11px] sm:text-xs">
            หน้า {page} • แสดง {items.length} รายการ
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-xs"
            >
              ก่อนหน้า
            </button>
            <span className="px-2 font-mono font-bold text-slate-700 dark:text-slate-300">
              {page}
            </span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={items.length < limit}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer text-xs"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) - Barcode Scanner (Old System Winning UX) */}
      <button
        type="button"
        onClick={() => setIsScannerOpen(true)}
        className="fixed bottom-20 sm:bottom-6 right-5 z-40 w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/40 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 touch-manipulation border-2 border-white/30"
        title="สแกนเนอร์บาร์โค้ด (Barcode Scanner)"
      >
        <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Item Details Modal */}
      <ItemDetailsModal
        isOpen={!!selectedModalItem}
        onClose={() => setSelectedModalItem(null)}
        item={selectedModalItem}
      />

      {/* Quick Scanner Modal */}
      <QuickScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSearch={(code) => {
          setSearch(code);
          setPage(1);
        }}
      />
    </div>
  );
}
