import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import {
  FileCheck2, Printer, FileSpreadsheet, Search, Calendar,
  RefreshCw, X, Award, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';

export default function CycleCountAuditModal({ isOpen, onClose, locations = [] }) {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [locationId, setLocationId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [healthOverall, setHealthOverall] = useState(null);
  const [healthZones, setHealthZones] = useState([]);

  const fetchAuditData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const [histRes, healthRes] = await Promise.all([
        storeApi.getCycleCountHistory({
          startDate,
          endDate,
          locationId,
          status: statusFilter,
          search: search.trim(),
          limit: 500
        }),
        storeApi.getZoneHealthMetrics({
          startDate,
          endDate
        })
      ]);

      if (histRes?.success) {
        setRecords(histRes.data || []);
        setSummary(histRes.summary || {});
      }
      if (healthRes?.success) {
        setHealthOverall(healthRes.overall || null);
        setHealthZones(healthRes.zones || []);
      }
    } catch (err) {
      console.error('Failed to load cycle count audit history:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, startDate, endDate, locationId, statusFilter, search]);

  useEffect(() => {
    if (isOpen) {
      fetchAuditData();
    }
  }, [isOpen, fetchAuditData]);

  if (!isOpen) return null;

  const handleExportExcel = () => {
    if (records.length === 0) {
      alert('ไม่มีข้อมูลประวัติการตรวจนับสำหรับส่งออก Excel');
      return;
    }

    const rows = records.map((r, i) => ({
      'No.': i + 1,
      'Count ID': `#${r.count_id}`,
      'Count Date': r.count_date,
      'Zone': r.zone_name || '-',
      'Location': r.location_name || '-',
      'SAP No.': r.sap_no || '-',
      'Part No.': r.item_no || '-',
      'Part Description': r.part_description || '-',
      'Tag Serial No.': r.serial_no || '-',
      'System Qty': Number(r.system_qty || 0),
      'Actual Qty': Number(r.actual_qty || 0),
      'Diff Qty': Number(r.diff_qty || 0),
      'Unit Price (THB)': Number(r.unit_price || 0),
      'Net Diff Value (THB)': Number(r.net_diff_value || 0),
      'Counter': r.counter_name || '-',
      'Approver': r.approver_name || '-',
      'Status': r.status || '-',
      'Remark': r.remark || '-'
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'CycleCount_Audit_Log');
    if (healthZones.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(healthZones), 'Zone_IRA_Summary');
    }
    XLSX.writeFile(wb, `ISO_IATF_CycleCount_Audit_${startDate}_to_${endDate}.xlsx`);
  };

  // Print Official ISO 9001 / IATF 16949 Certificate in a dedicated print window
  const handlePrintOfficialCertificate = () => {
    const ov = healthOverall || {};
    const itemIra = Number(ov.item_ira ?? 100).toFixed(2);
    const valIra = Number(ov.value_ira ?? 100).toFixed(2);
    const grade = ov.grade || 'A';
    const totalAudited = Number(ov.total_audited_items || summary.total_records || 0).toLocaleString();
    const exactMatch = Number(ov.exact_match_items || 0).toLocaleString();
    const netDiffVal = Number(ov.net_variance_value ?? summary.net_diff_value ?? 0);

    const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>Cycle Count & IRA Audit Report (${startDate} to ${endDate})</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Sarabun', 'Segoe UI', Tahoma, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
          .title { font-size: 16px; font-weight: 800; }
          .sub { font-size: 11px; color: #475569; margin-top: 2px; }
          .meta { text-align: right; font-size: 10px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 12px; }
          .kpi-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; background: #f8fafc; }
          .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
          .kpi-val { font-size: 15px; font-weight: 800; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
          th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; font-size: 9px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 22px; page-break-inside: avoid; }
          .sig-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; text-align: center; }
          .sig-line { border-bottom: 1px dotted #64748b; height: 28px; margin: 12px 20px 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">รายงานผลการตรวจนับสต็อกและรับรองความแม่นยำคลังสินค้า (Cycle Count & IRA Audit Certificate)</div>
            <div class="sub">SNC Former Public Company Limited — B9 Warehouse & Store Management System (ISO 9001 / IATF 16949 Standard)</div>
          </div>
          <div class="meta">
            <div><strong>DOC NO:</strong> FM-WH-CC-01 (REV.02)</div>
            <div><strong>งวดการตรวจนับ:</strong> ${startDate} ถึง ${endDate}</div>
            <div><strong>วันที่พิมพ์:</strong> ${new Date().toLocaleString('th-TH')}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-box">
            <div class="kpi-label">1. รายการที่ตรวจนับ (Audited Items)</div>
            <div class="kpi-val">${totalAudited} รายการ (ตรง ${exactMatch})</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">2. ความแม่นยำรายชิ้น (Item IRA %)</div>
            <div class="kpi-val">${itemIra}%</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">3. ความแม่นยำตามมูลค่า (Value IRA %)</div>
            <div class="kpi-val">${valIra}%</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">4. เกรดมาตรฐานคลัง (Audit Grade)</div>
            <div class="kpi-val">GRADE ${grade}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-label">5. มูลค่าผลต่างสุทธิ (Net Variance)</div>
            <div class="kpi-val">${netDiffVal >= 0 ? '+' : ''}${netDiffVal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>วันที่</th>
              <th>คลัง / โซน</th>
              <th>รหัสสินค้า (SAP / Part No.)</th>
              <th>รายละเอียดสินค้า</th>
              <th>หมายเลขแท็ก</th>
              <th class="text-right">ยอดระบบ</th>
              <th class="text-right">นับจริง</th>
              <th class="text-right">ผลต่าง</th>
              <th class="text-right">มูลค่าสุทธิ (฿)</th>
              <th>ผู้ตรวจนับ</th>
              <th>ผู้อนุมัติ</th>
              <th class="text-center">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            ${records.length === 0 ? '<tr><td colspan="13" class="text-center">ไม่พบรายการผลต่างในช่วงเวลานี้ (100% Exact Match)</td></tr>' : records.map((r, i) => `
              <tr>
                <td class="text-center">${i + 1}</td>
                <td class="text-center">${r.count_date || '-'}</td>
                <td>${r.location_name || '-'} (${r.zone_name || '-'})</td>
                <td><strong>${r.item_no || '-'}</strong> (${r.sap_no || '-'})</td>
                <td>${r.part_description || '-'}</td>
                <td>${r.serial_no || '-'}</td>
                <td class="text-right">${Number(r.system_qty || 0).toLocaleString()}</td>
                <td class="text-right">${Number(r.actual_qty || 0).toLocaleString()}</td>
                <td class="text-right"><strong>${Number(r.diff_qty || 0) > 0 ? '+' : ''}${Number(r.diff_qty || 0).toLocaleString()}</strong></td>
                <td class="text-right">${Number(r.net_diff_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>${r.counter_name || '-'}</td>
                <td>${r.approver_name || '-'}</td>
                <td class="text-center">${r.status || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="sig-grid">
          <div class="sig-box">
            <div><strong>ผู้ตรวจนับ / บันทึกข้อมูล (Counted By)</strong></div>
            <div class="sig-line"></div>
            <div>(.......................................................)</div>
            <div>เจ้าหน้าที่คลังสินค้า (Store Officer) • วันที่ ....../....../......</div>
          </div>
          <div class="sig-box">
            <div><strong>ผู้ตรวจสอบ (Verified By)</strong></div>
            <div class="sig-line"></div>
            <div>(.......................................................)</div>
            <div>หัวหน้าแผนกสโตร์ (Store Supervisor) • วันที่ ....../....../......</div>
          </div>
          <div class="sig-box">
            <div><strong>ผู้อนุมัติปรับปรุงยอด (Approved By)</strong></div>
            <div class="sig-line"></div>
            <div>(.......................................................)</div>
            <div>ผู้จัดการโรงงาน / ฝ่ายบัญชี (Plant Manager) • วันที่ ....../....../......</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const win = window.open('', '_blank', 'width=1200,height=800');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn text-xs">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                ทะเบียนประวัติการตรวจนับและใบรับรองผลการตรวจนับสต็อก (ISO 9001 / IATF 16949 Audit Certificate)
              </h3>
              <p className="text-[11px] text-slate-500">
                DOC NO: FM-WH-CC-01 (REV.02) • ตรวจสอบย้อนหลังและพิมพ์เอกสารรับรองความแม่นยำคลังสินค้า (IRA)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handlePrintOfficialCertificate}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์ใบรับรอง Audit (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา SAP, Part No., Serial Tag, คลัง..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            <option value="ALL">ทุกคลังสินค้า (All Locations)</option>
            {locations.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.location_name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
          >
            <option value="ALL">ทุกสถานะ (All Status)</option>
            <option value="APPROVED">อนุมัติแล้ว (APPROVED)</option>
            <option value="PENDING">รออนุมัติ (PENDING)</option>
            <option value="REJECTED">ปฏิเสธ (REJECTED)</option>
          </select>

          <button
            type="button"
            onClick={fetchAuditData}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Summary KPI Strip */}
        <div className="px-5 py-3 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-400 uppercase">รายการผลต่างในตาราง</div>
            <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5">
              {Number(summary.total_records || 0).toLocaleString()} รายการ
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
            <div className="text-[10px] font-bold text-emerald-600 uppercase">ความแม่นยำรายชิ้น (Item IRA)</div>
            <div className="text-sm font-black font-mono text-emerald-600 mt-0.5">
              {Number(healthOverall?.item_ira ?? 100).toFixed(2)}%
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
            <div className="text-[10px] font-bold text-indigo-600 uppercase">ความแม่นยำมูลค่า (Value IRA)</div>
            <div className="text-sm font-black font-mono text-indigo-600 mt-0.5">
              {Number(healthOverall?.value_ira ?? 100).toFixed(2)}% (Grade {healthOverall?.grade || 'A'})
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
            <div className="text-[10px] font-bold text-amber-600 uppercase">มูลค่าผลต่างสัมบูรณ์ (Gross)</div>
            <div className="text-sm font-black font-mono text-amber-600 mt-0.5">
              ฿{Number(summary.total_diff_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
            <div className="text-[10px] font-bold text-rose-600 uppercase">มูลค่าผลต่างสุทธิ (Net Diff)</div>
            <div className="text-sm font-black font-mono text-rose-600 mt-0.5">
              ฿{Number(summary.net_diff_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2 px-2.5">วันที่ / ID</th>
                <th className="py-2 px-2.5">คลัง / โซน</th>
                <th className="py-2 px-2.5">รหัสสินค้า (Part / SAP)</th>
                <th className="py-2 px-2.5">หมายเลขแท็ก</th>
                <th className="py-2 px-2.5 text-right">ยอดระบบ</th>
                <th className="py-2 px-2.5 text-right">นับจริง</th>
                <th className="py-2 px-2.5 text-right">ผลต่าง</th>
                <th className="py-2 px-2.5 text-right">มูลค่าสุทธิ (฿)</th>
                <th className="py-2 px-2.5">ผู้ตรวจนับ / ผู้อนุมัติ</th>
                <th className="py-2 px-2.5 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">กำลังโหลดข้อมูลประวัติการตรวจนับ...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    ไม่พบรายการปรับปรุงยอดหรือผลต่างในช่วงเวลาที่เลือก (ความแม่นยำ 100%)
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const diff = parseFloat(r.diff_qty || 0);
                  return (
                    <tr key={r.count_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-indigo-600">#{r.count_id}</div>
                        <div className="text-[10px] text-slate-400">{r.count_date}</div>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{r.location_name}</div>
                        <div className="text-[10px] text-slate-400">{r.zone_name}</div>
                      </td>
                      <td className="py-2.5 px-2.5">
                        <div className="font-mono font-bold">{r.item_no} <span className="text-[10px] font-normal text-slate-400">({r.sap_no})</span></div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{r.part_description}</div>
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-[11px]">{r.serial_no || '-'}</td>
                      <td className="py-2.5 px-2.5 text-right font-mono">{Number(r.system_qty || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold">{Number(r.actual_qty || 0).toLocaleString()}</td>
                      <td className={`py-2.5 px-2.5 text-right font-mono font-bold ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono font-bold">
                        ฿{Number(r.net_diff_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2.5 text-[11px]">
                        <div>นับ: {r.counter_name || '-'}</div>
                        <div className="text-slate-400">อนุมัติ: {r.approver_name || '-'}</div>
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : r.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  );
}
