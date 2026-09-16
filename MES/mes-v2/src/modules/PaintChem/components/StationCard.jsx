// StationCard.jsx — Collapsible card for one Station
import { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import ParameterInputRow from './ParameterInputRow';
import { isOutOfRange } from '../paintChemConfig';

export default function StationCard({ station, slotValues, onChange, disabled }) {
  const [open, setOpen] = useState(true);

  // Count OOR params for this station (using before_value)
  const oorCount = station.params.reduce((acc, p) => {
    if (p.isOverflowType) return acc;
    const val = slotValues?.[p.key]?.before;
    return acc + (isOutOfRange(p.key, val) ? 1 : 0);
  }, 0);

  return (
    <div className={`rounded-xl border ${oorCount > 0 ? 'border-red-300' : 'border-gray-200'} bg-white shadow-sm mb-3`}>
      {/* Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
            {station.no}
          </span>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{station.name}</p>
            <p className="text-xs text-gray-500">{station.chemical}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {oorCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
              <AlertTriangle size={12} />
              {oorCount} OOR
            </span>
          )}
          {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100">
          {station.params.map((param) => (
            <ParameterInputRow
              key={param.key}
              stationNo={station.no}
              paramKey={param.key}
              label={param.label}
              hasKg={param.hasKg}
              isOverflowType={!!param.isOverflow}
              value={slotValues?.[param.key]}
              onChange={(field, val) => onChange(station.no, param.key, field, val)}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
