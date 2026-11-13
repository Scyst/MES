import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, Printer } from 'lucide-react';
import { forkliftApi } from '../../../shared/services/forkliftApi';

export default function ForkliftQrModal({ isOpen, onClose, forklift }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !forklift) {
    return null;
  }

  const scanUrl = forkliftApi.buildQrScanUrl(forklift.code);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(scanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Copy URL failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">
                QR Code ประจำรถ: <span className="text-blue-700">{forklift.code}</span>
              </h3>
              <p className="text-[11px] text-slate-500">{forklift.name || 'รถโฟล์คลิฟท์โรงงาน'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label="ปิดหน้าต่าง QR Code"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
            <QRCodeSVG value={scanUrl} size={210} level="H" includeMargin />
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Scan URL (Mobile & Scanner)
            </p>
            <p className="text-[11px] font-mono text-slate-700 break-all select-all">
              {scanUrl}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'คัดลอก URL เรียบร้อย' : 'คัดลอก URL'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์สติกเกอร์</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
