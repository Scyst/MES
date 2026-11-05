import React, { useState } from 'react';
import { X, QrCode, Search, Barcode, ArrowRight } from 'lucide-react';

export default function QuickScannerModal({ isOpen, onClose, onSearch }) {
  const [barcodeInput, setBarcodeInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    onSearch(barcodeInput.trim());
    setBarcodeInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-600 text-white">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            <h3 className="text-sm font-black tracking-wide">สแกนเนอร์บาร์โค้ด (Scanner)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Barcode className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
            ยิงสแกนเนอร์หรือพิมพ์ Part No
          </h4>
          <p className="text-xs text-slate-400 mb-4">
            รองรับเครื่องยิงบาร์โค้ด USB, Bluetooth และกล้องสแกน
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                autoFocus
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="ยิงโค้ด หรือพิมพ์ Part No..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-blue-500/50 focus:border-blue-600 text-sm font-mono text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-none shadow-sm"
              />
            </div>

            <button
              type="submit"
              disabled={!barcodeInput.trim()}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>ค้นหาในสต็อกทันที</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
