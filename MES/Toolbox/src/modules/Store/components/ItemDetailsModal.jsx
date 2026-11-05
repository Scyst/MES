import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Boxes, DollarSign, Layers } from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';

export default function ItemDetailsModal({ isOpen, onClose, item }) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(null);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      const itemId = item.item_id || item.parameter_id || item.part_no;
      storeApi.getItemDetails(itemId)
        .then((res) => {
          if (res && res.success) {
            setDetails(res);
          } else {
            setDetails(null);
          }
        })
        .catch(() => setDetails(null))
        .finally(() => setLoading(false));
    } else {
      setDetails(null);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const partCode = item.part_no || item.item_no || item.sap_no || '-';
  const availableLocs = details?.available_details || details?.data?.available_details || [];
  const pendingLocs = details?.pending_details || details?.data?.pending_details || [];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh] my-auto">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black font-mono text-blue-600 dark:text-blue-400 truncate">
                  {partCode}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 uppercase">
                  {item.material_type || 'RM'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {item.part_description || item.description || '-'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
            <div>
              <div className="text-[10px] text-slate-400 font-sans">ยอดคงเหลือ</div>
              <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                {Number(item.available_qty ?? item.onhand_qty ?? item.quantity ?? 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-sans">ราคา/หน่วย</div>
              <div className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
                ฿{Number(item.unit_price ?? item.StandardPrice ?? 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-sans">มูลค่ารวม</div>
              <div className="text-sm font-bold font-mono text-slate-700 dark:text-slate-300">
                ฿{Number(item.total_value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Locations Breakdown */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 mb-2">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              <span>พิกัดคลังสินค้าที่จัดเก็บ (Locations)</span>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <div className="w-5 h-5 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-1.5" />
                กำลังโหลดพิกัดคลัง...
              </div>
            ) : availableLocs.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-700/50 text-xs text-slate-400">
                {item.location_name ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      📍 {item.location_name} {item.zone_name ? `(${item.zone_name})` : ''}
                    </span>
                    <span className="font-mono font-black text-emerald-600">
                      {Number(item.available_qty ?? 0).toLocaleString()}
                    </span>
                  </div>
                ) : (
                  'ไม่พบรายการแยกคลังสินค้าย่อย'
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-xs">
                {availableLocs.map((loc, idx) => {
                  const qty = parseFloat(loc.qty ?? loc.quantity ?? 0);
                  return (
                    <div
                      key={idx}
                      className="px-3.5 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {loc.location_name}
                        </span>
                      </div>
                      <span className={`font-mono font-black ${qty < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {qty.toLocaleString()} {item.unit || 'PCS'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer shadow-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
