import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Filter, AlertCircle, TrendingDown, DollarSign, Boxes } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

export default function SparePartsList() {
  const [parts, setParts] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchParts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/spareparts.php?action=get_onhand`);
      if (!response.ok) throw new Error('Network response was not ok');
      const json = await response.json();
      
      if (json.success) {
        setParts(json.data || []);
        setKpi(json.kpi);
      } else {
        throw new Error(json.message || 'Failed to fetch spare parts');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, []);

  return (
    <div className="h-full flex flex-col space-y-4 lg:space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="text-indigo-500" />
            Spare Parts
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage maintenance inventory and on-hand stock</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Parts..." 
              className="w-full sm:w-64 border border-slate-200 dark:border-slate-600 rounded-xl pl-9 pr-3 py-2 sm:py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            />
          </div>
          <button className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Filter size={16} />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={16} />
            <span className="hidden sm:inline">Receive</span>
          </button>
        </div>
      </div>

      {/* Summary KPI */}
      {kpi && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
             <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400"><Boxes size={24} /></div>
             <div><p className="text-sm text-slate-500">Total SKUs</p><p className="text-xl font-bold">{kpi.total_sku?.toLocaleString() || 0}</p></div>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
             <div className="p-3 bg-rose-50 dark:bg-rose-500/10 rounded-lg text-rose-600 dark:text-rose-400"><TrendingDown size={24} /></div>
             <div><p className="text-sm text-slate-500">Low Stock</p><p className="text-xl font-bold text-rose-600">{kpi.low_stock?.toLocaleString() || 0}</p></div>
           </div>
           <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4">
             <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400"><DollarSign size={24} /></div>
             <div><p className="text-sm text-slate-500">Inventory Value</p><p className="text-xl font-bold">{Number(kpi.total_value || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p></div>
           </div>
        </div>
      )}

      {/* Table Content */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="m-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
            <AlertCircle size={20} /> Error: {error}
          </div>
        ) : parts.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-slate-500 dark:text-slate-400 p-8 text-center">
            <Package size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium">No spare parts found</p>
            <p className="text-sm max-w-md mt-1">There are currently no items in inventory or they don't match your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">Item Code</th>
                  <th className="px-6 py-4 font-semibold">Name / Description</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold text-right">On Hand</th>
                  <th className="px-6 py-4 font-semibold text-right">Unit Price</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {parts.map(part => {
                  const isLow = part.min_stock > 0 && part.onhand_qty <= part.min_stock;
                  return (
                    <tr key={`${part.item_id}-${part.location_id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {part.item_code}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900 dark:text-white font-medium">{part.item_name}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">{part.description}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {part.location_name || 'Unassigned'}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${isLow ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}>
                        {part.onhand_qty} <span className="text-xs font-normal text-slate-500">{part.uom}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">
                        {Number(part.unit_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isLow ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600 border border-rose-200">
                            Low Stock
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                            In Stock
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
