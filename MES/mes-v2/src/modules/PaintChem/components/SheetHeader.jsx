// SheetHeader.jsx — Top section: date picker, shift selector, time slot, painting conditions
import { Sun, Moon, History, CalendarDays, Clock3, Thermometer, Wind } from 'lucide-react';
import TimeSlotSelector from './TimeSlotSelector';

export default function SheetHeader({ date, shift, paintingCond, onDateChange, onShiftChange, onCondChange, sheetStatus, disabled, onHistoryClick, selectedSlot, onSlotChange, timeSlots }) {
  const statusColors = {
    DRAFT:     'bg-gray-100 text-gray-500 border-gray-200',
    SUBMITTED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    APPROVED:  'bg-green-50 text-green-700 border-green-200',
  };
  const statusLabels = {
    DRAFT:     'ร่าง',
    SUBMITTED: 'รอตรวจสอบ',
    APPROVED:  'อนุมัติแล้ว',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
      {/* Top Bar: Title + Actions */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-blue-500" />
          <div>
            <h1 className="text-sm font-bold text-gray-800 leading-tight">บันทึกเคมีสี — PAINT Line</h1>
            <p className="text-[11px] text-gray-400">Parameter &amp; Chemicals Control Check Sheet</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sheetStatus && (
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusColors[sheetStatus] ?? ''}`}>
              {statusLabels[sheetStatus] ?? sheetStatus}
            </span>
          )}
          <button
            type="button"
            onClick={onHistoryClick}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <History size={14} />
            <span className="hidden sm:inline">ประวัติย้อนหลัง</span>
          </button>
        </div>
      </div>

      {/* Main Controls */}
      <div className="px-5 py-4 flex flex-col lg:flex-row gap-4 lg:gap-0 lg:divide-x lg:divide-gray-100">

        {/* Section 1: Date + Shift + Time Slot */}
        <div className="flex flex-col sm:flex-row gap-4 lg:pr-6 flex-shrink-0">
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <CalendarDays size={11} /> วันที่ตรวจ
            </label>
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-44"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <Clock3 size={11} /> กะ & ช่วงเวลา
            </label>
            {/* Shift + Time Slot on one row */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onShiftChange('DAY')}
                disabled={disabled}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap ${
                  shift === 'DAY'
                    ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600'
                }`}
              >
                <Sun size={14} /> กลางวัน
              </button>
              <button
                type="button"
                onClick={() => onShiftChange('NIGHT')}
                disabled={disabled}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap ${
                  shift === 'NIGHT'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                <Moon size={14} /> กลางคืน
              </button>
              {/* Time Slot dropdown — compact, same row */}
              {timeSlots && (
                <select
                  value={selectedSlot ?? ''}
                  onChange={(e) => onSlotChange(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 font-medium cursor-pointer"
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Painting Conditions */}
        <div className="flex flex-col gap-1 lg:px-6 flex-shrink-0">
          <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            <Thermometer size={11} /> Painting Condition
          </label>
          <div className="flex items-center gap-2">
            {/* Speed Conveyor */}
            <div className="relative group">
              <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-400 w-40">
                <Wind size={13} className="text-gray-300 flex-shrink-0" />
                <input
                  type="number" step="0.1" min="2.5" max="5.0"
                  className="flex-1 text-sm bg-transparent focus:outline-none min-w-0"
                  value={paintingCond.conveyorSpeed ?? ''}
                  onChange={(e) => onCondChange('conveyorSpeed', e.target.value)}
                  placeholder="Speed (m/min)" disabled={disabled}
                />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                ความเร็วสายพาน: <span className="font-semibold text-blue-300">2.5–5.0 m/min</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-800"></div>
              </div>
            </div>
            {/* Bake Oven */}
            <div className="relative group">
              <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-400 w-36">
                <Thermometer size={13} className="text-orange-300 flex-shrink-0" />
                <input
                  type="number" step="1" min="175" max="220"
                  className="flex-1 text-sm bg-transparent focus:outline-none min-w-0"
                  value={paintingCond.bakeOvenTemp ?? ''}
                  onChange={(e) => onCondChange('bakeOvenTemp', e.target.value)}
                  placeholder="Bake °C" disabled={disabled}
                />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                ตู้อบ (Bake Oven): <span className="font-semibold text-orange-300">175–220 °C</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-800"></div>
              </div>
            </div>
            {/* Dry Oven */}
            <div className="relative group">
              <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus-within:ring-2 focus-within:ring-blue-400 w-32">
                <Thermometer size={13} className="text-blue-300 flex-shrink-0" />
                <input
                  type="number" step="1" min="140" max="160"
                  className="flex-1 text-sm bg-transparent focus:outline-none min-w-0"
                  value={paintingCond.dryOvenTemp ?? ''}
                  onChange={(e) => onCondChange('dryOvenTemp', e.target.value)}
                  placeholder="Dry °C" disabled={disabled}
                />
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                ตู้อบ (Dry Oven): <span className="font-semibold text-blue-300">140–160 °C</span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
