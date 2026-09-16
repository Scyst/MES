// ParameterInputRow.jsx — Single row: parameter label + before/after/kg inputs
import { isOutOfRange, rangeLabel } from '../paintChemConfig';

const inputBase = 'w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const oorBorder = 'border-red-500 bg-red-50';
const normalBorder = 'border-gray-300';

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
      <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
        <span className="w-32 text-xs text-gray-600 flex-shrink-0">{label}</span>
        <span className="text-xs text-gray-400 italic">{'> Over flow'}</span>
        <label className="flex items-center gap-1.5 ml-auto">
          <input
            type="checkbox"
            className="w-5 h-5 accent-blue-600"
            checked={!!value?.isOverflow}
            onChange={(e) => onChange('isOverflow', e.target.checked)}
            disabled={disabled}
          />
          <span className="text-xs">{value?.isOverflow ? 'ผ่าน ✓' : 'ไม่ผ่าน ✗'}</span>
        </label>
      </div>
    );
  }

  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        {oor && (
          <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
            ⚠ OOR
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400">{rangeLabel(paramKey)}</span>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-0.5">ก่อนปรับ</label>
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
          <label className="text-xs text-gray-500 block mb-0.5">หลังปรับ</label>
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
            <label className="text-xs text-gray-500 block mb-0.5">กก.</label>
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
