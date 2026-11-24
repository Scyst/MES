import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, RefreshCw, Upload, Download, CheckSquare, AlertTriangle, Search, Scale
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiGet, apiPost } from '../../../shared/services/apiClient';

const parseMb52Sheet = (rows) => {
  const mapped = [];
  for (const r of rows) {
    const norm = {};
    Object.keys(r).forEach((k) => {
      norm[String(k).toLowerCase().replace(/[^a-z0-9]/g, '')] = r[k];
    });
    const matNo = String(
      norm.material ?? norm.matno ?? norm.sapno ?? norm.materialnumber ?? ''
    ).trim();
    if (!matNo) continue;
    const rawQty = norm.unrestricted ?? norm.quantity ?? norm.qty ?? norm.unrestricteduse ?? 0;
    const qty = parseFloat(String(rawQty).replace(/,/g, '')) || 0;
    mapped.push({
      plant: String(norm.plant ?? norm.plnt ?? '1820').trim(),
      mat_no: matNo,
      mat_desc: String(norm.materialdescription ?? norm.matdesc ?? norm.description ?? '').trim(),
      sloc: String(norm.storagelocation ?? norm.sloc ?? norm.storloc ?? '').trim(),
      batch: String(norm.batch ?? '').trim(),
      quantity: qty,
      unit: String(norm.baseunitofmeasure ?? norm.bun ?? norm.unit ?? 'PCS').trim(),
    });
  }
  return mapped;
};

export default function SapReconcileModal({ isOpen, onClose, onReconciled }) {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [onlyDiff, setOnlyDiff] = useState(true);
  const [search, setSearch] = useState('');
  const [sapMeta, setSapMeta] = useState({ row_cnt: 0, last_sync: null });
  const [summary, setSummary] = useState({});
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [banner, setBanner] = useState('');

  const fetchDiff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet('./api/store/sapReconcileApi.php', {
        action: 'get_diff',
        type: typeFilter,
        only_diff: onlyDiff ? '1' : '0',
        search,
      });
      if (res?.success) {
        setSapMeta(res.data?.sap_meta || { row_cnt: 0, last_sync: null });
        setSummary(res.data?.summary || {});
        setRows(res.data?.rows || []);
        setSelected(new Set());
      }
    } catch (err) {
      setBanner('ไม่สามารถโหลดข้อมูลเทียบยอด SAP ได้: ' + (err?.message || 'Error'));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, onlyDiff, search]);

  useEffect(() => {
    if (isOpen) fetchDiff();
  }, [isOpen, fetchDiff]);

  if (!isOpen) return null;

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    setBanner('');
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const parsed = parseMb52Sheet(jsonRows);
      if (parsed.length === 0) {
        setBanner('ไม่พบคอลัมน์ Material / Mat_No ในไฟล์ที่อัปโหลด กรุณาตรวจสอบหัวตาราง MB52');
        return;
      }
      const res = await apiPost('./api/store/sapReconcileApi.php?action=import_sap_rows', {
        action: 'import_sap_rows',
        rows: parsed,
      });
      if (res?.success) {
        setBanner(`นำเข้าไฟล์ SAP MB52 สำเร็จ ${res.data?.imported_rows ?? parsed.length} รายการ`);
        fetchDiff();
      } else {
        setBanner(res?.message || 'นำเข้าไฟล์ SAP ไม่สำเร็จ');
      }
    } catch (err) {
      setBanner('อ่านไฟล์ไม่สำเร็จ: ' + (err?.message || 'Error'));
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (sapNo) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sapNo)) next.delete(sapNo);
      else next.add(sapNo);
      return next;
    });
  };

  const handleApplyCutoff = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`ยืนยันปรับยอด MES ของรายการที่เลือกจำนวน ${selected.size} รายการ ให้ตรงกับยอด SAP (บันทึก ADJUSTMENT ในประวัติทั้งหมด)?`)) {
      return;
    }
    setApplying(true);
    setBanner('');
    try {
      const res = await apiPost('./api/store/sapReconcileApi.php?action=apply_cutoff', {
        action: 'apply_cutoff',
        sap_nos: Array.from(selected),
      });
      if (res?.success) {
        setBanner(res.message || 'ปรับยอด Cut-off เรียบร้อย');
        fetchDiff();
        if (onReconciled) onReconciled();
      } else {
        setBanner(res?.message || 'ปรับยอด Cut-off ไม่สำเร็จ');
      }
    } catch (err) {
      setBanner('เกิดข้อผิดพลาด: ' + (err?.message || 'Error'));
    } finally {
      setApplying(false);
    }
  };

  const handleExportExcel = () => {
    if (rows.length === 0) return;
    const out = rows.map((r, i) => ({
      'ลำดับ': i + 1,
      'SAP No': r.sap_no,
      'Part No': r.part_no,
      'รายละเอียด': r.part_description,
      'ประเภท': r.material_type,
      'ยอด MES': Number(r.mes_qty || 0),
      'ยอด SAP': Number(r.sap_qty || 0),
      'ผลต่าง (MES-SAP)': Number(r.diff_qty || 0),
      'ราคา/หน่วย (฿)': Number(r.unit_cost || 0),
      'มูลค่าผลต่าง (฿)': Number(r.diff_val || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(out);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MES_vs_SAP_Diff');
    XLSX.writeFile(wb, `MES_vs_SAP_Diff_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                เทียบยอดสต็อก MES ↔ SAP (Diff Report &amp; Cut-off)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ตาราง SAP_STG_ALL_STOCK: <strong>{Number(sapMeta.row_cnt || 0).toLocaleString()}</strong> แถว
                {sapMeta.last_sync ? ` • อัปเดตล่าสุด ${sapMeta.last_sync}` : ' • ยังไม่มีข้อมูล SAP (สามารถนำเข้าไฟล์ MB52 ได้ทันที)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI Bar */}
        <div className="px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] text-slate-500">รายการทั้งหมด (SKUs)</div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">{Number(summary.total_skus || 0).toLocaleString()}</div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300">ยอดตรงกัน 100%</div>
            <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">{Number(summary.matched_skus || 0).toLocaleString()}</div>
          </div>
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <div className="text-[10px] text-amber-700 dark:text-amber-300">รายการมีผลต่าง (Diff)</div>
            <div className="text-sm font-black text-amber-700 dark:text-amber-300">{Number(summary.diff_skus || 0).toLocaleString()}</div>
          </div>
          <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
            <div className="text-[10px] text-rose-700 dark:text-rose-300">มูลค่าผลต่างสะสม (฿)</div>
            <div className="text-sm font-black text-rose-700 dark:text-rose-300">฿{Number(summary.abs_diff_val || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        {banner && (
          <div className="px-4 py-2 text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{banner}</span>
          </div>
        )}

        {/* Controls */}
        <div className="px-4 py-2.5 flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา SAP No / Part No..."
              className="w-full pl-8 pr-3 h-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
          >
            <option value="ALL">ทุกประเภท</option>
            <option value="FG">FG</option>
            <option value="SEMI">SEMI</option>
            <option value="RM">RM</option>
            <option value="PKG">PKG</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
            <span>เฉพาะรายการที่มีผลต่าง</span>
          </label>

          <label className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>{importing ? 'กำลังนำเข้า...' : 'นำเข้า SAP MB52 (.xlsx/.csv)'}</span>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} disabled={importing} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel Diff</span>
          </button>

          <button
            type="button"
            onClick={handleApplyCutoff}
            disabled={selected.size === 0 || applying || Number(sapMeta.row_cnt || 0) === 0}
            className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer disabled:opacity-40"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{applying ? 'กำลังปรับยอด...' : `ปรับยอด Cut-off (${selected.size})`}</span>
          </button>

          <button
            type="button"
            onClick={fetchDiff}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2 px-3 w-8 text-center">เลือก</th>
                <th className="py-2 px-3">SAP No / Part No</th>
                <th className="py-2 px-3">รายละเอียด</th>
                <th className="py-2 px-2">ประเภท</th>
                <th className="py-2 px-3 text-right">ยอด MES</th>
                <th className="py-2 px-3 text-right">ยอด SAP</th>
                <th className="py-2 px-3 text-right">ผลต่าง</th>
                <th className="py-2 px-3 text-right">มูลค่าผลต่าง (฿)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">กำลังโหลดข้อมูล...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">ไม่พบรายการตามเงื่อนไข</td></tr>
              ) : rows.map((r) => {
                const diff = Number(r.diff_qty || 0);
                return (
                  <tr key={r.sap_no} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selected.has(r.sap_no)}
                        onChange={() => toggleSelect(r.sap_no)}
                        disabled={!r.item_id || Number(sapMeta.row_cnt || 0) === 0}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{r.sap_no}</div>
                      <div className="text-[10px] text-slate-500">{r.part_no}</div>
                    </td>
                    <td className="py-2 px-3 max-w-[240px] truncate">{r.part_description}</td>
                    <td className="py-2 px-2 font-semibold">{r.material_type}</td>
                    <td className="py-2 px-3 text-right font-mono">{Number(r.mes_qty || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono">{Number(r.sap_qty || 0).toLocaleString()}</td>
                    <td className={`py-2 px-3 text-right font-mono font-bold ${diff > 0 ? 'text-rose-600' : diff < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {Number(r.diff_val || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
}
