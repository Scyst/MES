import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Download, RefreshCcw } from 'lucide-react';

export default function Receipt() {
  const { id } = useParams(); // Transfer ID from scan if any
  const navigate = useNavigate();
  
  const [transferId, setTransferId] = useState(id || '');
  const [loading, setLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [qtyIn, setQtyIn] = useState(0);
  const [locations, setLocations] = useState([]);
  const [fromLoc, setFromLoc] = useState('');
  const [toLoc, setToLoc] = useState('');
  const [lotNo, setLotNo] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/locations.php`);
        const json = await res.json();
        if (json.success) setLocations(json.data);
      } catch (e) { console.error(e); }
    };
    fetchLocations();
  }, [API_BASE_URL]);

  const handleReceipt = async (e) => {
    e.preventDefault();
    if (qtyIn <= 0) { alert('Quantity must be greater than 0'); return; }
    if (!itemSearch || !toLoc) { alert('Item and To Location are required'); return; }
    
    setLoading(true);
    
    const formData = new FormData();
    formData.append('sap_no', itemSearch);
    formData.append('qty', qtyIn);
    formData.append('to_location_id', toLoc);
    if (fromLoc) formData.append('from_location_id', fromLoc);
    if (transferId) formData.append('lot_no', transferId);

    try {
      const res = await fetch(`${API_BASE_URL}/receipt.php`, {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      
      if (json.success) {
        alert('Receipt processed successfully!');
        setQtyIn(0);
        setTransferId('');
        setItemSearch('');
        setLotNo('');
      } else {
        alert('Error: ' + json.message);
      }
    } catch (err) {
      alert('Network Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 pt-2 max-w-lg mx-auto">
      {/* Premium Header */}
      <div className="flex items-center space-x-4 w-full bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-900 dark:to-indigo-900 p-5 rounded-3xl shadow-lg relative overflow-hidden transition-colors mb-6 mx-2 max-w-[calc(100%-16px)]">
        <div className="p-3 bg-white/20 text-white rounded-2xl shadow-inner backdrop-blur-md">
          <Download size={24} />
        </div>
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-white">รับเข้าสินค้า</h2>
          <p className="text-[11px] text-blue-100 mt-0.5">บันทึกรับเข้าสินค้า (Goods Receipt)</p>
        </div>
        {/* subtle background decoration */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
      </div>

      <form onSubmit={handleReceipt} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl shadow-lg space-y-4">
        
        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transfer ID / Lot</label>
          <div className="flex space-x-2">
            <input 
              type="text" 
              value={transferId}
              onChange={(e) => setTransferId(e.target.value)}
              className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="T-XXXXXX"
            />
            <button type="button" onClick={() => navigate('/scan')} className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 p-3 rounded-xl font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
              Scan
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item (SAP No.) *</label>
          <input 
            type="text" 
            required
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Search part..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">From Location</label>
            <select 
              value={fromLoc}
              onChange={(e) => setFromLoc(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
            >
              <option value="">-- Select --</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-green-500 dark:text-green-400 uppercase tracking-wider">To Location *</label>
            <select 
              required
              value={toLoc}
              onChange={(e) => setToLoc(e.target.value)}
              className="w-full bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl px-3 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 transition-colors text-sm"
            >
              <option value="">-- Select --</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1 pt-2">
          <label className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider text-center block">Quantity Received *</label>
          <input 
            type="number" 
            required
            min="1"
            value={qtyIn || ''}
            onChange={(e) => setQtyIn(parseInt(e.target.value) || 0)}
            className="w-full bg-gray-50 dark:bg-gray-950 border-2 border-green-400 dark:border-green-600 text-green-700 dark:text-green-400 text-center text-4xl font-black py-4 rounded-2xl focus:outline-none focus:border-green-500 transition-colors"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 p-4 rounded-2xl font-bold text-lg text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] flex justify-center items-center transition-all disabled:opacity-50"
        >
          {loading ? <RefreshCcw className="animate-spin mr-2" /> : <Download className="mr-2" />}
          {loading ? 'Processing...' : 'Confirm Receipt'}
        </button>
      </form>
    </div>
  );
}
