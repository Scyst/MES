import React from 'react';
import { STATIONS, isOutOfRange } from '../paintChemConfig';

export default function PaintChemTableView({
  timeSlots,
  selectedSlot,
  onSlotChange,
  allLogs,
  slotValues,
  onChange,
  disabled
}) {
  const getLogValue = (slot, stationNo, paramKey, field) => {
    if (slot === selectedSlot) {
      return slotValues?.[stationNo]?.[paramKey]?.[field];
    }
    const row = allLogs.find(l => l.time_slot === slot && l.station_no === stationNo && l.parameter_key === paramKey);
    if (!row) return '';
    if (field === 'before') return row.before_value ?? '';
    if (field === 'after') return row.after_value ?? '';
    if (field === 'kg') return row.chemical_added_kg ?? '';
    if (field === 'isOverflow') return row.is_overflow !== null && row.is_overflow !== undefined ? !!row.is_overflow : '';
    return '';
  };

  return (
    <div className="overflow-x-auto custom-scrollbar bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mt-4">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="px-3 py-3 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[40px] text-gray-700 dark:text-gray-200">No.</th>
            <th className="px-3 py-3 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[150px] text-gray-700 dark:text-gray-200">กระบวนการ</th>
            <th className="px-3 py-3 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap min-w-[140px] text-gray-700 dark:text-gray-200">รายการควบคุม</th>
            {timeSlots?.map(slot => (
              <th 
                key={slot} 
                className={`px-3 py-3 text-center border-r border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${slot === selectedSlot ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}`} 
                onClick={() => onSlotChange(slot)}
              >
                 <div className="flex flex-col items-center justify-center gap-1">
                    <span>{slot}</span>
                    {slot === selectedSlot && <span className="text-[10px] font-semibold bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">กำลังแก้ไข</span>}
                 </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
           {STATIONS.map((station) => (
              station.params.map((param, pIdx) => {
                const isLastParam = pIdx === station.params.length - 1;
                const rowBorderClass = isLastParam ? 'border-b-2 border-gray-300 dark:border-gray-600' : 'border-b border-gray-100 dark:border-gray-700/50';

                return (
                  <tr key={`${station.no}-${param.key}`} className={`hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors ${rowBorderClass}`}>
                    {pIdx === 0 && (
                       <>
                         <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-center font-bold text-gray-800 dark:text-gray-100 bg-gray-50/50 dark:bg-gray-800/50" rowSpan={station.params.length}>{station.no}</td>
                         <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50" rowSpan={station.params.length}>
                            <div className="font-semibold text-gray-800 dark:text-gray-100">{station.name}</div>
                            <div className="text-[10px] text-gray-500 mt-1 leading-tight">{station.chemical}</div>
                         </td>
                       </>
                    )}
                    <td className="px-3 py-2 border-r border-gray-200 dark:border-gray-700 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      <div className="flex items-center justify-between">
                         <span>{param.label}</span>
                         {param.hasKg && <span className="text-[10px] text-gray-400 border border-gray-200 dark:border-gray-600 px-1 rounded ml-2 bg-gray-50 dark:bg-gray-800">Kg</span>}
                      </div>
                    </td>
                    {timeSlots?.map(slot => {
                       const isEditing = slot === selectedSlot;
                       const cellBg = isEditing ? 'bg-blue-50/30 dark:bg-blue-900/20' : '';
                       const valBefore = getLogValue(slot, station.no, param.key, 'before');
                       const oor = isOutOfRange(param.key, valBefore);
                       
                       if (param.isOverflowType) {
                          const valOverflow = getLogValue(slot, station.no, param.key, 'isOverflow');
                          return (
                             <td key={slot} className={`p-2 border-r border-gray-200 dark:border-gray-700 ${cellBg} min-w-[120px] text-center align-middle`}>
                                {isEditing ? (
                                   <div className="flex flex-col gap-1.5 items-center justify-center">
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                         <input type="radio" className="accent-green-600 w-3.5 h-3.5" checked={valOverflow === true} onChange={() => onChange(station.no, param.key, 'isOverflow', true)} disabled={disabled} />
                                         <span className="text-xs text-green-700 dark:text-green-400">ผ่าน</span>
                                      </label>
                                      <label className="flex items-center gap-1.5 cursor-pointer">
                                         <input type="radio" className="accent-red-600 w-3.5 h-3.5" checked={valOverflow === false} onChange={() => onChange(station.no, param.key, 'isOverflow', false)} disabled={disabled} />
                                         <span className="text-xs text-red-700 dark:text-red-400">ไม่ผ่าน</span>
                                      </label>
                                   </div>
                                ) : (
                                   <div className="text-xs font-medium">
                                     {valOverflow === true ? <span className="text-green-600 dark:text-green-400">ผ่าน ✓</span> : valOverflow === false ? <span className="text-red-600 dark:text-red-400">ไม่ผ่าน ✗</span> : <span className="text-gray-300">-</span>}
                                   </div>
                                )}
                             </td>
                          )
                       }

                       return (
                         <td key={slot} className={`p-2 border-r border-gray-200 dark:border-gray-700 ${cellBg} min-w-[160px] align-top`}>
                            <div className="flex gap-2">
                               <div className="flex-1 flex flex-col gap-1.5">
                                 {isEditing ? (
                                    <>
                                    <div className="flex items-center relative">
                                      <span className="text-[10px] text-gray-400 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">ก่อน</span>
                                      <input type="number" step="0.01" className={`w-full text-xs pl-8 pr-1 py-1.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${oor ? 'border-red-400 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600'}`} value={valBefore} onChange={e => onChange(station.no, param.key, 'before', e.target.value)} disabled={disabled} />
                                    </div>
                                    <div className="flex items-center relative">
                                      <span className="text-[10px] text-gray-400 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">หลัง</span>
                                      <input type="number" step="0.01" className="w-full text-xs pl-8 pr-1 py-1.5 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600" value={getLogValue(slot, station.no, param.key, 'after')} onChange={e => onChange(station.no, param.key, 'after', e.target.value)} disabled={disabled} />
                                    </div>
                                    </>
                                 ) : (
                                    <>
                                    <div className={`text-xs flex justify-between border-b border-dashed border-gray-200 dark:border-gray-700 pb-1 ${oor ? 'text-red-600 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                                      <span className="text-[10px] text-gray-400">ก่อน:</span> 
                                      <span>{valBefore || '-'}</span>
                                    </div>
                                    <div className="text-xs flex justify-between text-gray-600 dark:text-gray-400 pt-0.5">
                                      <span className="text-[10px] text-gray-400">หลัง:</span>
                                      <span>{getLogValue(slot, station.no, param.key, 'after') || '-'}</span>
                                    </div>
                                    </>
                                 )}
                               </div>
                               {param.hasKg && (
                                 <div className="flex-1 flex flex-col justify-end">
                                   {isEditing ? (
                                      <div className="flex items-center relative">
                                        <span className="text-[10px] text-blue-500/70 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none">Kg</span>
                                        <input type="number" step="0.01" className="w-full text-xs pl-6 pr-1 py-1.5 border border-blue-200 dark:border-blue-800 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/30 dark:bg-blue-900/20 text-blue-800 dark:text-blue-100" value={getLogValue(slot, station.no, param.key, 'kg')} onChange={e => onChange(station.no, param.key, 'kg', e.target.value)} disabled={disabled} />
                                      </div>
                                   ) : (
                                      <div className="text-xs flex flex-col items-end text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 p-1 rounded">
                                        <span className="text-[9px] uppercase tracking-wider opacity-60">Kg</span>
                                        <span className="font-medium">{getLogValue(slot, station.no, param.key, 'kg') || '-'}</span>
                                      </div>
                                   )}
                                 </div>
                               )}
                            </div>
                         </td>
                       );
                    })}
                  </tr>
                );
              })
           ))}
        </tbody>
      </table>
    </div>
  );
}
