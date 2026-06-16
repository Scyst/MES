import React, { useState, useEffect } from 'react';
import { Archive, Search, Plus, Filter, AlertCircle, ArrowRightLeft, PackageCheck, Boxes } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

export default function StoreManagement() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = new URL(`${API_BASE_URL}/inventory.php`, window.location.href);
      url.searchParams.append('action', 'get_catalog');
      if (searchTerm) url.searchParams.append('search', searchTerm);
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      const json = await response.json();
      
      if (json.success) {
        setItems(json.data || []);
      } else {
        throw new Error(json.message || 'Failed to fetch inventory');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="h-full flex flex-col space-y-4 lg:space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Archive className="text-indigo-500" />
            Store Management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Main warehouse inventory, receipts, and issues</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Items, Parts..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72 border border-slate-200 dark:border-slate-600 rounded-xl pl-9 pr-3 py-2 sm:py-2.5 text-sm bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            />
          </div>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors">
            <ArrowRightLeft size={16} />
            <span className="hidden sm:inline">Transaction</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
        {loading && items.length === 0 ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="m-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-3">
            <AlertCircle size={20} /> Error: {error}
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-slate-500 dark:text-slate-400 p-8 text-center">
            <Archive size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-medium">No Items Found</p>
            <p className="text-sm max-w-md mt-1">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">Part No / Item Code</th>
                  <th className="px-6 py-4 font-semibold">Description</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold text-right">On Hand</th>
                  <th className="px-6 py-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {items.map((item, idx) => (
                  <tr key={item.item_id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600 dark:text-indigo-400">
                      {item.part_no || item.item_code}
                    </td>
                    <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
                      {item.part_description || item.item_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {item.item_category || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {Number(item.on_hand || 0).toLocaleString()} <span className="text-xs text-slate-500 font-normal">{item.uom || 'PCS'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button className="text-indigo-600 hover:text-indigo-800 p-1 rounded-lg hover:bg-indigo-50 transition-colors">
                        <ArrowRightLeft size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
