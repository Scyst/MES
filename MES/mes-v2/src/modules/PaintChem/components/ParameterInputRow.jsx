// ParameterInputRow.jsx — Single row: parameter label + before/after/kg inputs
import { isOutOfRange, rangeLabel } from '../paintChemConfig';

const inputBase = 'w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100';
const oorBorder = 'border-red-500 bg-red-50 dark:bg-red-900/30';
const normalBorder = 'border-gray-300 dark:border-gray-600';

export default function ParameterInputRow({
  stationNo,
  paramKey,
  label,
  hasKg = false,
  isOverflowType = false,
  value,          // { before, after, kg, isOverflow }
  onChange,       // (field, val) => void
  disabled = false,
}) {
  const oor = isOutOfRange(paramKey, value?.before);

  if (isOverflowType) {
    return (
      <div className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{label}</span>
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 italic">{'> Over flow'}</span>
        </div>
        <div className="flex items-center justify-around px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`overflow-${stationNo}-${paramKey}`}
              className="w-4 h-4 accent-green-600 cursor-pointer"
              checked={value?.isOverflow === true}
              onChange={() => onChange('isOverflow', true)}
              disabled={disabled}
            />
            <span className="text-sm text-green-700 dark:text-green-400 font-medium">ผ่าน ✓</span>
          </label>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`overflow-${stationNo}-${paramKey}`}
              className="w-4 h-4 accent-red-600 cursor-pointer"
              checked={value?.isOverflow === false}
              onChange={() => onChange('isOverflow', false)}
              disabled={disabled}
            />
            <span className="text-sm text-red-700 dark:text-red-400 font-medium">ไม่ผ่าน ✗</span>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{label}</span>
        {oor && (
          <span className="ml-1 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-xs rounded-full font-semibold">
            ⚠ OOR
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{rangeLabel(paramKey)}</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">ก่อนปรับ</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className={`${inputBase} ${oor ? oorBorder : normalBorder}`}
            value={value?.before ?? ''}
            onChange={(e) => onChange('before', e.target.value)}
            disabled={disabled}
            placeholder="—"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">หลังปรับ</label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            className={`${inputBase} ${normalBorder}`}
            value={value?.after ?? ''}
            onChange={(e) => onChange('after', e.target.value)}
            disabled={disabled}
            placeholder="—"
          />
        </div>
        {hasKg && (
          <div className="w-20">
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">กก.</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              className={`${inputBase} ${normalBorder}`}
              value={value?.kg ?? ''}
              onChange={(e) => onChange('kg', e.target.value)}
              disabled={disabled}
              placeholder="0.00"
            />
          </div>
        )}
      </div>
    </div>
  );
}
