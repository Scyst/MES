import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3, Boxes, Edit2, Eye, Layers, RefreshCw, Search, Users, X
} from 'lucide-react';
import Pagination from '../../../../shared/components/Pagination';
import { productionApi } from '../../../../shared/services/productionApi';
import { useToast } from '../../../../shared/contexts/FeedbackContext';

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Reports Workspace: WIP On-Hand, WIP by Lot, Plan vs Actual Variance,
 * All Stock Inventory (w/ Location Breakdown & Adjustment), and Employee Daily Summary.
 */
export default function WipAndStockTab({ metadata, isOffline }) {
  const toast = useToast();
  const [subTab, setSubTab] = useState('wip_onhand'); // wip_onhand | wip_lot | variance | stock | employee
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [locationId, setLocationId] = useState('ALL');
  const [materialType, setMaterialType] = useState('ALL');
  const [hideZero, setHideZero] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  // Drilldown Modals
  const [varianceDetailItem, setVarianceDetailItem] = useState(null);
  const [varianceDetails, setVarianceDetails] = useState([]);
  const [stockDetailItem, setStockDetailItem] = useState(null);
  const [stockDetails, setStockDetails] = useState([]);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ new_quantity: '', reason: '' });
  const [savingAdjust, setSavingAdjust] = useState(false);

  const locations = metadata?.locations || [];
  const canManage = Boolean(metadata?.current_user?.can_manage);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const common = {
        start_date: startDate,
        end_date: endDate,
        location_id: locationId,
        search: search.trim(),
      };
      if (subTab === 'wip_onhand') {
        const res = await productionApi.getWipOnhandReport(common);
        setRows(res?.data || []);
        setTotalItems((res?.data || []).length);
      } else if (subTab === 'wip_lot') {
        const res = await productionApi.getWipReportByLot(common);
        setRows(res?.data || []);
        setTotalItems((res?.data || []).length);
      } else if (subTab === 'variance') {
        const res = await productionApi.getVarianceReport(common);
        setRows(res?.data || []);
        setTotalItems((res?.data || []).length);
      } else if (subTab === 'stock') {
        const res = await productionApi.getStockInventoryReport({
          ...common,
          material_type: materialType,
          hide_zero: hideZero ? 'true' : 'false',
          page,
          limit: pageSize,
        });
        setRows(res?.data?.rows || []);
        setTotalItems(res?.data?.pagination?.total || 0);
      } else if (subTab === 'employee') {
        const res = await productionApi.getEmployeeDailySummary(common);
        setRows(res?.data || []);
        setTotalItems((res?.data || []).length);
      }
    } catch {
      // Handled globally
    } finally {
      setLoading(false);
    }
  }, [subTab, startDate, endDate, locationId, materialType, hideZero, search, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(() => loadReport(), 200);
    return () => clearTimeout(t);
  }, [loadReport]);

  const handleOpenVarianceDetail = async (row) => {
    setVarianceDetailItem(row);
    try {
      const res = await productionApi.getVarianceDetails({
        item_id: row.item_id,
        start_date: startDate,
        end_date: endDate,
      });
      setVarianceDetails(res?.data || []);
    } catch {
      setVarianceDetails([]);
    }
  };

  const handleOpenStockDetails = async (row) => {
    setStockDetailItem(row);
    try {
      const res = await productionApi.getStockDetailsByItem(row.item_id);
      setStockDetails(res?.data || []);
    } catch {
      setStockDetails([]);
    }
  };

  const handleSubmitAdjust = async (e) => {
    e.preventDefault();
    if (!adjustModal || isOffline) return;
    setSavingAdjust(true);
    try {
      const res = await productionApi.adjustSingleStock({
        item_id: adjustModal.item_id,
        location_id: adjustModal.location_id,
        new_quantity: Number(adjustForm.new_quantity),
        reason: adjustForm.reason.trim() || 'Manual stock adjustment',
      });
      toast.success(res?.message || 'ปรับยอดสต็อกเรียบร้อยแล้ว');
      setAdjustModal(null);
      if (stockDetailItem) {
        const refreshed = await productionApi.getStockDetailsByItem(stockDetailItem.item_id);
        setStockDetails(refreshed?.data || []);
      }
      loadReport();
    } catch {
      // Handled globally
    } finally {
      setSavingAdjust(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        {/* Sub-Report Switcher */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'wip_onhand', label: 'WIP On-Hand', icon: Layers },
            { id: 'wip_lot', label: 'WIP ตาม Lot No.', icon: Boxes },
            { id: 'variance', label: 'แผน vs ผลผลิตจริง (Variance)', icon: BarChart3 },
            { id: 'stock', label: 'สต็อกคงเหลือรวม (Stock Balance)', icon: Boxes },
            { id: 'employee', label: 'สรุปยอดพนักงานรายวัน', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSubTab(tab.id);
                  setPage(1);
                }}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-colors ${
                  subTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {(subTab === 'wip_lot' || subTab === 'variance' || subTab === 'employee') && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="วันที่เริ่มต้น"
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="วันที่สิ้นสุด"
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </>
          )}

          {subTab !== 'variance' && (
            <select
              value={locationId}
              onChange={(e) => {
                setLocationId(e.target.value);
                setPage(1);
              }}
              aria-label="สถานที่"
              className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="ALL">ทุกสถานที่</option>
              {locations.map((l) => (
                <option key={l.location_id} value={l.location_id}>
                  {l.location_name}
                </option>
              ))}
            </select>
          )}

          {subTab === 'stock' && (
            <>
              <select
                value={materialType}
                onChange={(e) => {
                  setMaterialType(e.target.value);
                  setPage(1);
                }}
                aria-label="ประเภทสินค้า"
                className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="ALL">ทุกประเภทสินค้า</option>
                <option value="FG">FG</option>
                <option value="WIP">WIP</option>
                <option value="RM">RM</option>
                <option value="PKG">PKG</option>
              </select>
              <label className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={hideZero}
                  onChange={(e) => {
                    setHideZero(e.target.checked);
                    setPage(1);
                  }}
                />
                ซ่อนยอดเป็น 0
              </label>
            </>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหา SAP, Part No, ชื่อสินค้า..."
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <button
            type="button"
            onClick={loadReport}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            รีเฟรชรายงาน
          </button>
        </div>

        {/* Table Content */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          {subTab === 'wip_onhand' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-3">สถานที่</th>
                  <th className="px-3 py-3">SAP No</th>
                  <th className="px-3 py-3">Part No</th>
                  <th className="px-3 py-3">รายละเอียด</th>
                  <th className="px-3 py-3 text-right">ยอดคงเหลือ</th>
                  <th className="px-3 py-3 text-right">มูลค่ารวม (฿)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      {loading ? 'กำลังโหลด...' : 'ไม่พบข้อมูล WIP On-Hand'}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={`${r.onhand_id}-${r.location_id}-${r.item_id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-semibold">{r.location_name}</td>
                      <td className="px-3 py-2.5 font-mono">{r.sap_no}</td>
                      <td className="px-3 py-2.5 font-bold">{r.part_no}</td>
                      <td className="px-3 py-2.5 text-slate-500">{r.part_description}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-extrabold text-blue-700 dark:text-blue-300">
                        {Number(r.onhand_qty || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {Number(r.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {subTab === 'wip_lot' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-3">Lot / Ref</th>
                  <th className="px-3 py-3">SAP No</th>
                  <th className="px-3 py-3">Part No</th>
                  <th className="px-3 py-3">ไลน์</th>
                  <th className="px-3 py-3 text-right text-emerald-700">FG</th>
                  <th className="px-3 py-3 text-right text-amber-700">Hold</th>
                  <th className="px-3 py-3 text-right text-rose-700">Scrap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">ไม่พบข้อมูล WIP ตาม Lot</td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={`${r.lot_no}-${r.item_id}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-bold">{r.lot_no}</td>
                      <td className="px-3 py-2.5 font-mono">{r.sap_no}</td>
                      <td className="px-3 py-2.5">{r.part_no}</td>
                      <td className="px-3 py-2.5">{r.location_name || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">{Number(r.fg_qty || 0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-amber-600">{Number(r.hold_qty || 0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-rose-600">{Number(r.scrap_qty || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {subTab === 'variance' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-3">SAP / Part No</th>
                  <th className="px-3 py-3">ไลน์</th>
                  <th className="px-3 py-3 text-right">แผนผลิต (Plan)</th>
                  <th className="px-3 py-3 text-right">ผลิตจริง (FG)</th>
                  <th className="px-3 py-3 text-right">Hold / Scrap</th>
                  <th className="px-3 py-3 text-right">ส่วนต่าง (Variance)</th>
                  <th className="px-3 py-3 text-center">ดูรายละเอียด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">ไม่พบข้อมูลแผน/ผลผลิตในช่วงที่เลือก</td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const variance = Number(r.variance_qty || 0);
                    return (
                      <tr key={r.item_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2.5">
                          <div className="font-bold">{r.part_no}</div>
                          <div className="text-[11px] text-slate-500">{r.sap_no} • {r.part_description}</div>
                        </td>
                        <td className="px-3 py-2.5">{r.line_name || '-'}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{Number(r.planned_qty || 0).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600">{Number(r.fg_qty || 0).toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                          {Number(r.hold_qty || 0)} / <span className="text-rose-600">{Number(r.scrap_qty || 0)}</span>
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-mono font-extrabold ${
                            variance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {variance > 0 ? `+${variance.toLocaleString()}` : variance.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenVarianceDetail(r)}
                            className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-[11px] font-semibold hover:bg-slate-100 dark:border-slate-700"
                          >
                            <Eye className="h-3.5 w-3.5" /> รายละเอียด
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {subTab === 'stock' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-3">SAP No</th>
                  <th className="px-3 py-3">Part No / รายละเอียด</th>
                  <th className="px-3 py-3">ประเภท</th>
                  <th className="px-3 py-3 text-right">คงเหลือรวม</th>
                  <th className="px-3 py-3 text-right">มูลค่ารวม (฿)</th>
                  <th className="px-3 py-3 text-center">แยกตามคลัง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">ไม่พบข้อมูลสินค้าคงคลัง</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.item_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-mono">{r.sap_no}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold">{r.part_no}</div>
                        <div className="text-[11px] text-slate-500">{r.part_description}</div>
                      </td>
                      <td className="px-3 py-2.5">{r.material_type || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-extrabold text-blue-700 dark:text-blue-300">
                        {Number(r.total_onhand || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {Number(r.total_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenStockDetails(r)}
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-[11px] font-semibold hover:bg-slate-100 dark:border-slate-700"
                        >
                          <Eye className="h-3.5 w-3.5" /> ดูรายคลัง
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {subTab === 'employee' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-3">รหัสพนักงาน</th>
                  <th className="px-3 py-3">ชื่อ-สกุล</th>
                  <th className="px-3 py-3">ทีม</th>
                  <th className="px-3 py-3 text-right">FG (ถ่วงน้ำหนักทีม)</th>
                  <th className="px-3 py-3 text-right">Hold</th>
                  <th className="px-3 py-3 text-right">Scrap</th>
                  <th className="px-3 py-3 text-right">จำนวน Txn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">ไม่พบข้อมูลผลงานพนักงาน</td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-mono">{r.emp_id}</td>
                      <td className="px-3 py-2.5 font-bold">{r.employee_name}</td>
                      <td className="px-3 py-2.5">{r.team_group}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-extrabold text-emerald-600">
                        {Number(r.weighted_fg || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-amber-600">
                        {Number(r.weighted_hold || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-rose-600">
                        {Number(r.weighted_scrap || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">{Number(r.txn_count || 0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {subTab === 'stock' && (
          <div className="mt-3">
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
        )}
      </div>

      {/* Variance Drilldown Modal */}
      {varianceDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold">{varianceDetailItem.part_no}</h3>
                <p className="text-xs text-slate-500">{varianceDetailItem.sap_no} • ประวัติการลงยอดผลิตจริง</p>
              </div>
              <button
                type="button"
                onClick={() => setVarianceDetailItem(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2">เวลา</th>
                    <th className="px-3 py-2">ประเภท</th>
                    <th className="px-3 py-2 text-right">จำนวน</th>
                    <th className="px-3 py-2">ไลน์</th>
                    <th className="px-3 py-2">ผู้บันทึก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {varianceDetails.map((d) => (
                    <tr key={d.transaction_id}>
                      <td className="px-3 py-2 font-mono">{String(d.transaction_timestamp || '').replace('T', ' ').slice(0, 16)}</td>
                      <td className="px-3 py-2">{d.transaction_type}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{Number(d.quantity).toLocaleString()}</td>
                      <td className="px-3 py-2">{d.location_name || '-'}</td>
                      <td className="px-3 py-2">{d.username || '-'}</td>
                    </tr>
                  ))}
                  {varianceDetails.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">ไม่มีรายการบันทึกผลผลิตในช่วงวันที่เลือก</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock Item Location Details Modal */}
      {stockDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold">{stockDetailItem.part_no}</h3>
                <p className="text-xs text-slate-500">{stockDetailItem.sap_no} • ยอดคงคลังแยกตามสถานที่</p>
              </div>
              <button
                type="button"
                onClick={() => setStockDetailItem(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">สถานที่</th>
                  <th className="px-3 py-2">ประเภท</th>
                  <th className="px-3 py-2 text-right">คงเหลือ</th>
                  {canManage && <th className="px-3 py-2 text-center">ปรับยอด</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stockDetails.map((loc) => (
                  <tr key={loc.location_id}>
                    <td className="px-3 py-2 font-semibold">{loc.location_name}</td>
                    <td className="px-3 py-2">{loc.location_type || '-'}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{Number(loc.quantity || 0).toLocaleString()}</td>
                    {canManage && (
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          disabled={isOffline}
                          onClick={() => {
                            setAdjustForm({ new_quantity: String(Number(loc.quantity || 0)), reason: '' });
                            setAdjustModal({
                              item_id: stockDetailItem.item_id,
                              location_id: loc.location_id,
                              location_name: loc.location_name,
                            });
                          }}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-300 px-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:border-slate-700"
                        >
                          <Edit2 className="h-3 w-3" /> ปรับยอด
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Stock Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="mb-3 text-base font-bold">ปรับยอดสต็อก ({adjustModal.location_name})</h3>
            <form onSubmit={handleSubmitAdjust} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">ยอดคงเหลือใหม่ *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={adjustForm.new_quantity}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, new_quantity: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">เหตุผลในการปรับยอด *</label>
                <input
                  type="text"
                  required
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="ระบุเหตุผลการแก้ไขยอด..."
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModal(null)}
                  className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingAdjust}
                  className="min-h-[44px] rounded-xl bg-blue-600 px-5 text-xs font-bold text-white"
                >
                  {savingAdjust ? 'กำลังบันทึก...' : 'ยืนยันปรับยอด'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
