// SheetHeader.jsx — Top section: date picker, shift selector, time slot, painting condition (per slot), note (per slot)
import { Sun, Moon, History, Printer, CalendarDays, Clock3, Thermometer, Wind, FileText } from 'lucide-react';
import { isOutOfRange } from '../paintChemConfig';

const STATUS_COLORS = {
  DRAFT:     'bg-gray-100 text-gray-500 border-gray-200',
  SUBMITTED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  APPROVED:  'bg-green-50 text-green-700 border-green-200',
};
const STATUS_LABELS = {
  DRAFT:     'ร่าง',
  SUBMITTED: 'รอตรวจสอบ',
  APPROVED:  'อนุมัติแล้ว',
};

export default function SheetHeader({
  date, shift, slotExtras, previousNotes,
  onDateChange, onShiftChange, onExtraChange, onExtraBlur,
  sheetStatus, disabled, onHistoryClick, selectedSlot, onSlotChange, timeSlots,
}) {
  const speedOutOfRange = isOutOfRange('ConveyorSpeed', slotExtras.conveyorSpeed);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
      {/* Top Bar: Title + Actions */}
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-100 bg-gray-50/60 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-blue-500" />
          <div>
            <h1 className="text-sm font-bold text-gray-800 leading-tight">บันทึกเคมีสี — PAINT Line</h1>
            <p className="text-[11px] text-gray-400">Parameter &amp; Chemicals Control Check Sheet</p>
          </div>
        </div>
        <div className="flex items-center w-full md:w-auto justify-end gap-2">
          {sheetStatus && (
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[sheetStatus] ?? ''}`}>
              {STATUS_LABELS[sheetStatus] ?? sheetStatus}
            </span>
          )}
          <a href={`/iot-toolbox/sandbox-b9/MES/MES/page/paintChem/api/export_pdf.php?blank=1&shift=${shift}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-0 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-colors" title="พิมพ์ฟอร์มเปล่า"><Printer size={14} /><span className="hidden sm:inline">ฟอร์มเปล่า</span></a>
            <button type="button" onClick={onHistoryClick}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-0 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <History size={14} />
            <span className="hidden sm:inline">ประวัติย้อนหลัง</span>
          </button>
        </div>
      </div>

      {/* Main Controls */}
      <div className="px-5 py-4 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:justify-between">

          {/* Section 1: Date + Shift + Time Slot */}
          <div className="flex flex-col sm:flex-row gap-4 lg:pr-6 flex-shrink-0">
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <CalendarDays size={11} /> วันที่ตรวจ
              </label>
              <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full sm:w-44"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                disabled={disabled}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <Clock3 size={11} /> กะ &amp; ช่วงเวลา
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onShiftChange('DAY')}
                  disabled={disabled}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap ${
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
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap ${
                    shift === 'NIGHT'
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  <Moon size={14} /> กลางคืน
                </button>
                {timeSlots && (
                  <select
                    value={selectedSlot ?? ''}
                    onChange={(e) => onSlotChange(e.target.value)}
                    className="flex-1 sm:flex-none border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700 font-medium cursor-pointer"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}