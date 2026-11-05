import React, { useState, useEffect } from 'react';
import {
  Boxes, DollarSign, AlertCircle, RefreshCw, Search, Filter,
  TrendingDown, ShieldCheck, ChevronLeft, ChevronRight, Eye, EyeOff
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';
import SecurityWatermark from '../../../shared/components/SecurityWatermark';

export default function InventoryDashboardTab() {
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

      if (res.success) {
        setItems(res.onhand || res.items || []);
        setSummary(res.summary || {});
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
      if (res.success) {
        setCategories(res.categories || []);
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

  return (
    <div className="flex flex-col h-full space-y-4 animate-fadeIn relative">
      <SecurityWatermark classification="WAREHOUSE INVENTORY • CONFIDENTIAL" />

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              จำนวนรายการสินค้า (SKUs)
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight truncate">
              {summary.total_items !== undefined ? Number(summary.total_items).toLocaleString() : items.length.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              มูลค่าคงคลังรวม (Valuation)
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight truncate">
              ฿{Number(summary.total_val || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              สินค้าใกล้หมด (Low Stock)
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight truncate">
              {summary.low_stock !== undefined ? Number(summary.low_stock).toLocaleString() : '0'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              จำนวนชิ้นคงเหลือรวม
            </span>
            <div className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight truncate">
              {summary.total_qty !== undefined ? Number(summary.total_qty).toLocaleString() : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา Part No, SAP No, รายละเอียดชิ้นงาน..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Material Category Selector */}
          <select
            value={materialType}
            onChange={(e) => {
              setMaterialType(e.target.value);
              setPage(1);
            }}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">ทุกหมวดวัตถุดิบ (ALL)</option>
            {categories.map((c, idx) => (
              <option key={idx} value={c.material_type || c}>
                {c.category_name || c.material_type || c}
              </option>
            ))}
          </select>

          {/* Hide Zero Qty Toggle */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <input
              type="checkbox"
              checked={hideZero}
              onChange={(e) => {
                setHideZero(e.target.checked);
                setPage(1);
              }}
              className="rounded text-blue-600 focus:ring-0"
            />
            <span>ซ่อนยอดเป็นศูนย์</span>
          </label>

          <button
            onClick={() => {
              setPage(1);
              fetchData();
            }}
            className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Onhand Inventory Table */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-24 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              กำลังโหลดข้อมูลสต็อกคงคลัง...
            </div>
          ) : items.length === 0 ? (
            <div className="py-24 text-center text-slate-400">
              <Boxes className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-semibold">ไม่พบข้อมูลสินค้าตามเงื่อนไข</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Part No / SAP No</th>
                  <th className="py-2.5 px-3">รายละเอียดชิ้นงาน (Description)</th>
                  <th className="py-2.5 px-3">ประเภท</th>
                  <th className="py-2.5 px-3">คลังและโซน</th>
                  <th className="py-2.5 px-3 text-right">ยอดคงเหลือ (Onhand)</th>
                  <th className="py-2.5 px-3 text-right">Safety Stock</th>
                  <th className="py-2.5 px-3 text-right">ราคา/หน่วย</th>
                  <th className="py-2.5 px-4 text-right">มูลค่ารวม (฿)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, idx) => {
                  const onhand = parseFloat(item.onhand_qty || item.quantity || 0);
                  const safety = parseFloat(item.safety_stock || 0);
                  const isLow = safety > 0 && onhand <= safety;
                  const price = parseFloat(item.unit_price || item.sap_price || 0);
                  const totalVal = onhand * price;

                  return (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {item.part_no || item.sap_no}
                        </div>
                        {item.sap_no && item.sap_no !== item.part_no && (
                          <div className="text-[11px] text-slate-400">SAP: {item.sap_no}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                        <div className="font-medium truncate max-w-sm">
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
                        {totalVal > 0 ? `฿${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/40 dark:bg-slate-800/20">
          <span>
            แสดงหน้า {page} • แสดงผล {items.length} รายการ
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
              {page}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={items.length < limit}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
