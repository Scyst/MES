// PaintChemTableView.jsx — Document-style grid: all time slots visible at once.
// Each slot has 3 sub-columns (before / after / kg), mirroring the printed check sheet.
// Only the selected slot is editable; click a slot header to switch the editing column.
import { STATIONS, isOutOfRange, rangeLabel } from '../paintChemConfig';

const CELL_BORDER = 'border-r border-gray-200 dark:border-gray-700';
const INPUT_BASE =
  'w-full h-8 px-1 text-center text-xs rounded border focus:outline-none focus:ring-1 focus:ring-blue-500 ' +
  'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 disabled:opacity-60';

function readLogValue(allLogs, slot, stationNo, paramKey, field) {
  const row = allLogs.find(
    (log) => log.time_slot === slot && log.station_no === stationNo && log.parameter_key === paramKey
  );
  if (!row) return '';
  if (field === 'before') return row.before_value ?? '';
  if (field === 'after') return row.after_value ?? '';
  if (field === 'kg') return row.chemical_added_kg ?? '';
  if (field === 'isOverflow') return row.is_overflow === null || row.is_overflow === undefined ? '' : !!row.is_overflow;
  return '';
}

function ReadOnlyValue({ value, isOutOfRangeValue = false }) {
  const isEmpty = value === '' || value === null || value === undefined;
  return (
    <span
      className={`block text-center text-xs tabular-nums ${
        isEmpty
          ? 'text-gray-300 dark:text-gray-600'
          : isOutOfRangeValue
            ? 'text-red-600 dark:text-red-400 font-semibold'
            : 'text-gray-700 dark:text-gray-200'
      }`}
    >
      {isEmpty ? '–' : value}
    </span>
  );
}

function NumberCell({ isEditing, value, onValueChange, disabled, outOfRange = false, placeholder = '' }) {
  if (!isEditing) return <ReadOnlyValue value={value} isOutOfRangeValue={outOfRange} />;
  return (
    <input
      type="number"
      step="0.01"
      inputMode="decimal"
      className={`${INPUT_BASE} ${
        outOfRange
          ? 'border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          : 'border-gray-300 dark:border-gray-600'
      }`}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onValueChange(event.target.value)}
      disabled={disabled}
    />
  );
}

function PassFailCell({ isEditing, value, onValueChange, disabled }) {
  if (!isEditing) {
    if (value === true) return <span className="block text-center text-xs font-medium text-green-600 dark:text-green-400">ผ่าน ✓</span>;
    if (value === false) return <span className="block text-center text-xs font-medium text-red-600 dark:text-red-400">ไม่ผ่าน ✗</span>;
    return <ReadOnlyValue value="" />;
  }
  const optionClass = (isActive, activeClass) =>
    `flex-1 h-8 text-xs font-medium rounded border transition-colors disabled:opacity-60 ${
      isActive
        ? activeClass
        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
    }`;
  return (
    <div className="flex gap-1">
      <button type="button" disabled={disabled} onClick={() => onValueChange(true)}
        className={optionClass(value === true, 'bg-green-600 border-green-600 text-white')}>ผ่าน ✓</button>
      <button type="button" disabled={disabled} onClick={() => onValueChange(false)}
        className={optionClass(value === false, 'bg-red-600 border-red-600 text-white')}>ไม่ผ่าน ✗</button>
    </div>
  );
}

export default function PaintChemTableView({
  timeSlots = [], selectedSlot, onSlotChange, allLogs = [], slotValues = {}, onChange, disabled,
}) {
  const getValue = (slot, stationNo, paramKey, field) =>
    slot === selectedSlot
      ? (field === 'isOverflow'
          ? slotValues?.[stationNo]?.[paramKey]?.isOverflow
          : slotValues?.[stationNo]?.[paramKey]?.[field] ?? '')
      : readLogValue(allLogs, slot, stationNo, paramKey, field);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-200">
              <th rowSpan={2} className={`sticky left-0 z-20 bg-gray-100 dark:bg-gray-900 ${CELL_BORDER} px-3 py-2 text-left text-xs font-semibold min-w-[150px]`}>
                กระบวนการ
              </th>
              <th rowSpan={2} className={`${CELL_BORDER} px-3 py-2 text-left text-xs font-semibold min-w-[140px]`}>
                รายการควบคุม
              </th>
              {timeSlots.map((slot) => {
                const isEditing = slot === selectedSlot;
                return (
                  <th
                    key={slot}
                    colSpan={3}
                    onClick={() => onSlotChange(slot)}
                    className={`${CELL_BORDER} border-b border-gray-200 dark:border-gray-700 px-2 py-2 text-center cursor-pointer select-none transition-colors ${
                      isEditing
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="text-xs font-semibold">{slot}</div>
                    <div className={`text-[10px] font-normal ${isEditing ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
                      {isEditing ? 'กำลังแก้ไข' : 'แตะเพื่อแก้ไข'}
                    </div>
                  </th>
                );
              })}
            </tr>
            <tr className="bg-gray-50 dark:bg-gray-900/60 text-[11px] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              {timeSlots.map((slot) => {
                const tint = slot === selectedSlot ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : '';
                return ['ก่อนปรับ', 'หลังปรับ', 'กก.'].map((label, index) => (
                  <th key={`${slot}-${label}`}
                    className={`${index === 2 ? CELL_BORDER : 'border-r border-gray-100 dark:border-gray-800'} px-1 py-1.5 font-medium ${tint} ${index === 2 ? 'min-w-[56px]' : 'min-w-[76px]'}`}>
                    {label}
                  </th>
                ));
              })}
            </tr>
          </thead>
          <tbody>
            {STATIONS.map((station) =>
              station.params.map((param, paramIndex) => {
                const isLastParam = paramIndex === station.params.length - 1;
                const rowBorder = isLastParam
                  ? 'border-b-2 border-gray-300 dark:border-gray-600'
                  : 'border-b border-gray-100 dark:border-gray-700/60';
                return (
                  <tr key={`${station.no}-${param.key}`} className={`${rowBorder} hover:bg-gray-50/70 dark:hover:bg-gray-700/20`}>
                    {paramIndex === 0 && (
                      <td rowSpan={station.params.length}
                        className={`sticky left-0 z-10 bg-white dark:bg-gray-800 ${CELL_BORDER} px-3 py-2 align-top`}>
                        <div className="flex items-start gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex-shrink-0">
                            {station.no}
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-100 leading-tight">{station.name}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{station.chemical}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className={`${CELL_BORDER} px-3 py-1.5 align-middle`}>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{param.label}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {param.isOverflowType ? '> Over flow' : rangeLabel(param.key)}
                      </p>
                    </td>
                    {timeSlots.map((slot) => {
                      const isEditing = slot === selectedSlot;
                      const tint = isEditing ? 'bg-blue-50/60 dark:bg-blue-900/20' : '';
                      const handleChange = (field) => (val) => onChange(station.no, param.key, field, val);

                      if (param.isOverflowType) {
                        return (
                          <td key={slot} colSpan={3} className={`${CELL_BORDER} px-1.5 py-1.5 align-middle ${tint}`}>
                            <PassFailCell
                              isEditing={isEditing}
                              value={getValue(slot, station.no, param.key, 'isOverflow')}
                              onValueChange={handleChange('isOverflow')}
                              disabled={disabled}
                            />
                          </td>
                        );
                      }

                      const beforeValue = getValue(slot, station.no, param.key, 'before');
                      const afterValue = getValue(slot, station.no, param.key, 'after');
                      const kgValue = getValue(slot, station.no, param.key, 'kg');
                      const beforeOutOfRange = isOutOfRange(param.key, beforeValue);
                      return [
                        <td key={`${slot}-b`} className={`border-r border-gray-100 dark:border-gray-800 px-1 py-1.5 ${tint}`}>
                          <NumberCell isEditing={isEditing} value={beforeValue} outOfRange={beforeOutOfRange}
                            onValueChange={handleChange('before')} disabled={disabled} />
                        </td>,
                        <td key={`${slot}-a`} className={`border-r border-gray-100 dark:border-gray-800 px-1 py-1.5 ${tint}`}>
                          <NumberCell isEditing={isEditing} value={afterValue}
                            onValueChange={handleChange('after')} disabled={disabled} />
                        </td>,
                        <td key={`${slot}-k`} className={`${CELL_BORDER} px-1 py-1.5 ${param.hasKg ? tint : 'bg-gray-50 dark:bg-gray-900/40'}`}>
                          {param.hasKg && (
                            <NumberCell isEditing={isEditing} value={kgValue}
                              onValueChange={handleChange('kg')} disabled={disabled} placeholder="0.00" />
                          )}
                        </td>,
                      ];
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
