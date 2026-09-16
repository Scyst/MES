// SheetHeader.jsx — Top section: date picker, shift selector, Painting Condition fields
import { Sun, Moon } from 'lucide-react';

const inputCls = 'w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-xs text-gray-500 mb-0.5';

export default function SheetHeader({ date, shift, paintingCond, onDateChange, onShiftChange, onCondChange, sheetStatus, disabled }) {
  const statusColors = {
    DRAFT:     'bg-gray-100 text-gray-600',
    SUBMITTED: 'bg-yellow-100 text-yellow-700',
    APPROVED:  'bg-green-100 text-green-700',
  };
  const statusLabels = {
    DRAFT:     'ร่าง',
    SUBMITTED: 'รอตรวจสอบ',
    APPROVED:  'อนุมัติแล้ว',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
      {/* Title Row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-base font-bold text-gray-800">บันทึกเคมีสี — PAINT Line</h1>
          <p className="text-xs text-gray-500">Parameter & Chemicals Control Check Sheet</p>
        </div>
        {sheetStatus && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[sheetStatus] ?? ''}`}>
            {statusLabels[sheetStatus] ?? sheetStatus}
          </span>
        )}
      </div>

      {/* Date + Shift */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <label className={labelCls}>วันที่ตรวจ</label>
          <input type="date" className={inputCls} value={date} onChange={(e) => onDateChange(e.target.value)} disabled={disabled} />
        </div>
        <div className="flex-1">
          <label className={labelCls}>กะ</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onShiftChange('DAY')}
              disabled={disabled}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border text-sm font-medium transition-all ${
                shift === 'DAY'
                  ? 'bg-amber-100 border-amber-400 text-amber-800'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-amber-300'
              }`}
            >
              <Sun size={14} /> กลางวัน
            </button>
            <button
              type="button"
              onClick={() => onShiftChange('NIGHT')}
              disabled={disabled}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border text-sm font-medium transition-all ${
                shift === 'NIGHT'
                  ? 'bg-indigo-100 border-indigo-400 text-indigo-800'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-300'
              }`}
            >
              <Moon size={14} /> กลางคืน
            </button>
          </div>
        </div>
      </div>

      {/* Painting Condition */}
      <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Painting Condition</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Speed Conveyor (m/min) <span className="text-gray-400">2.5–5.0</span></label>
          <input
            type="number" step="0.1" min="2.5" max="5.0" className={inputCls}
            value={paintingCond.conveyorSpeed ?? ''}
            onChange={(e) => onCondChange('conveyorSpeed', e.target.value)}
            placeholder="—" disabled={disabled}
          />
        </div>
        <div>
          <label className={labelCls}>Bake Oven (°C) <span className="text-gray-400">175–220</span></label>
          <input
            type="number" step="1" min="175" max="220" className={inputCls}
            value={paintingCond.bakeOvenTemp ?? ''}
            onChange={(e) => onCondChange('bakeOvenTemp', e.target.value)}
            placeholder="—" disabled={disabled}
          />
        </div>
        <div>
          <label className={labelCls}>Dry Oven (°C) <span className="text-gray-400">140–160</span></label>
          <input
            type="number" step="1" min="140" max="160" className={inputCls}
            value={paintingCond.dryOvenTemp ?? ''}
            onChange={(e) => onCondChange('dryOvenTemp', e.target.value)}
            placeholder="—" disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
