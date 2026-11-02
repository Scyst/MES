import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, AlertCircle, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';

export default function ItemImportModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, invalid: 0 });
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) parseExcel(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) parseExcel(dropped);
  };

  const parseExcel = (f) => {
    setFile(f);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });

        let validCount = 0;
        let invalidCount = 0;

        const normalized = data.map((row) => {
          // Normalize column names
          const sapNo = String(row['SAP No.'] || row['SAP No'] || row['sap_no'] || row['SAP_NO'] || '').trim();
          const partNo = String(row['Part No.'] || row['Part No'] || row['part_no'] || '').trim();
          const desc = String(row['Description'] || row['part_description'] || row['Part Description'] || '').trim();
          const type = String(row['Type'] || row['material_type'] || 'RM').trim().toUpperCase();
          const subType = String(row['Sub-Type'] || row['material_sub_type'] || '').trim();
          const uph = Number(row['UPH'] || row['planned_output'] || 0);
          const stdPrice = Number(row['Standard Price'] || row['StandardPrice'] || 0);
          const priceUsd = Number(row['Price USD'] || row['Price_USD'] || 0);

          const isValid = !!sapNo;
          if (isValid) validCount++;
          else invalidCount++;

          return {
            sap_no: sapNo,
            part_no: partNo,
            part_description: desc,
            material_type: type,
            material_sub_type: subType,
            planned_output: uph,
            StandardPrice: stdPrice,
            Price_USD: priceUsd,
            _isValid: isValid,
          };
        });

        setPreviewRows(normalized);
        setStats({
          total: normalized.length,
          valid: validCount,
          invalid: invalidCount,
        });
      } catch (err) {
        showToast('ไม่สามารถอ่านไฟล์ Excel ได้: ' + err.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(f);
  };

  const handleConfirmImport = async () => {
    const validItems = previewRows.filter((r) => r._isValid);
    if (validItems.length === 0) {
      showToast('ไม่มีรายการข้อมูลที่ถูกต้องสำหรับการนำเข้า', 'warning');
      return;
    }

    setImporting(true);
    try {
      const res = await systemSettingsApi.bulkImportItems(validItems);
      if (res && res.success) {
        showToast(res.message || `นำเข้าสำเร็จ ${validItems.length} รายการ`, 'success');
        onSuccess?.();
        onClose();
      } else {
        showToast(res?.message || 'การนำเข้าล้มเหลว', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการนำเข้า: ' + err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-900 text-white">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold">Import Item Master & Costing (Excel)</h3>
              <p className="text-xs text-emerald-200">
                นำเข้าข้อมูลและต้นทุนมาตรฐานด้วยไฟล์ Excel (.xlsx, .xls)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Zone / Dropzone */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!file ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-850"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Upload className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                ลากไฟล์ Excel มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
              </p>
              <p className="text-xs text-slate-400 mt-1">รองรับไฟล์ .xlsx หรือ .xls (คอลัมน์: SAP No., Part No., Description, Type, UPH, Standard Price)</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File bar & Stats */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <span className="px-3 py-1 bg-white dark:bg-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                    ทั้งหมด: {stats.total} รายการ
                  </span>
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg font-semibold border border-emerald-200 dark:border-emerald-800">
                    พร้อมนำเข้า: {stats.valid}
                  </span>
                  {stats.invalid > 0 && (
                    <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg font-semibold border border-rose-200 dark:border-rose-800">
                      ไม่สมบูรณ์: {stats.invalid}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewRows([]);
                    }}
                    className="text-xs text-slate-500 hover:text-rose-600 underline"
                  >
                    เปลี่ยนไฟล์
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">SAP No.</th>
                      <th className="py-2.5 px-3 font-semibold">Part No.</th>
                      <th className="py-2.5 px-3 font-semibold">Description</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Type</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Std Price (THB)</th>
                      <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {previewRows.slice(0, 100).map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row._isValid
                            ? 'hover:bg-slate-50 dark:hover:bg-slate-850'
                            : 'bg-rose-50/50 dark:bg-rose-950/20'
                        }
                      >
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {row.sap_no || <span className="text-rose-500">Missing SAP No.</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{row.part_no || '-'}</td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                          {row.part_description || '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {row.material_type || 'RM'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {Number(row.StandardPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row._isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-500 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewRows.length > 100 && (
                <p className="text-xs text-center text-slate-400">
                  แสดงตัวอย่าง 100 รายการแรก จากทั้งหมด {previewRows.length} รายการ
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Smart Update: ระบบจะอัปเดตข้อมูลเดิมและสร้างรายการใหม่โดยไม่ลบค่าว่าง
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importing || !file || stats.valid === 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {importing ? 'กำลังนำเข้าข้อมูล...' : `ยืนยันนำเข้า (${stats.valid} รายการ)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

