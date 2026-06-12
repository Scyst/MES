import { useState, useEffect } from 'react';
import { History, Trash2, Edit2, Check, X, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GlobalHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTxn, setEditTxn] = useState(null);
  const [editQty, setEditQty] = useState(0);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/production_logs.php?action=global_history`);
      const json = await res.json();
      if (json.success) {
        setHistory(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [API_BASE_URL]);

  const handleVoid = async (txn) => {
    if (!window.confirm(`Are you sure you want to void ${txn.quantity} parts from ${txn.machine_name || txn.location_name}?`)) return;
    
    try {
      const fd = new FormData();
      fd.append('action', 'void');
      fd.append('transaction_id', txn.transaction_id);

      const res = await fetch(`${API_BASE_URL}/production_logs.php`, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) {
        fetchHistory();
      } else {
        alert("Failed to void: " + json.message);
      }
    } catch (e) {
      alert("Error voiding record.");
    }
  };

  const handleEditSubmit = async () => {
    if (editQty <= 0) return alert('Quantity must be greater than 0');
    
    try {
      const fd = new FormData();
      fd.append('action', 'edit');
      fd.append('transaction_id', editTxn.transaction_id);
      fd.append('qty', editQty);

      const res = await fetch(`${API_BASE_URL}/production_logs.php`, { method: 'POST', body: fd });
      const json = await res.json();
      if (json.success) {
        setShowEditModal(false);
        fetchHistory();
      } else {
        alert("Failed to edit: " + json.message);
      }
    } catch (e) {
      alert("Error editing record.");
    }
  };

  const getDisplayName = (log) => {
    if (log.notes) {
      const match = log.notes.match(/\[TEAM_OVERRIDE:\s*([^\]]+)\]/);
      if (match) return match[1];
    }
    return log.user_name || '';
  };

  // Filter history based on search term
  const filteredHistory = history.filter(h => {
    const term = searchTerm.toLowerCase();
    const type = (h.transaction_type || '').toLowerCase();
    const job = (h.job_no || '').toLowerCase();
    const user = getDisplayName(h).toLowerCase();
    const notes = (h.notes || '').toLowerCase();
    const qty = String(h.quantity);
    const machine = (h.machine_name || `Machine ${h.machine_id}` || '').toLowerCase();

    return type.includes(term) || 
           job.includes(term) || 
           user.includes(term) || 
           qty.includes(term) ||
           machine.includes(term) ||
           notes.includes(term);
  });

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto px-4 mt-6">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 p-6 rounded-3xl shadow-xl">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center">
          <History className="mr-2 text-blue-400" />
          Recent Transactions
        </h2>
        <p className="text-gray-400 text-sm">Latest 50 logs across all machines</p>
        
        <div className="mt-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-700 rounded-xl leading-5 bg-gray-950 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm transition-colors"
            placeholder="Search by Machine, Job, or Employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Activity Log */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading history...</p>
        ) : filteredHistory.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No matching transactions found.</p>
        ) : (
          filteredHistory.map((log) => (
            <div key={log.transaction_id} className="flex flex-col p-4 bg-gray-900 rounded-2xl border border-gray-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className={`font-bold text-lg ${
                    log.transaction_type === 'PRODUCTION_FG' ? 'text-green-400' 
                    : log.transaction_type === 'PRODUCTION_HOLD' ? 'text-yellow-400'
                    : 'text-red-400'
                  }`}>
                    {log.transaction_type === 'PRODUCTION_FG' ? 'GOOD' : log.transaction_type === 'PRODUCTION_HOLD' ? 'HOLD' : 'SCRAP'}: +{Number(log.quantity)}
                  </p>
                  <p className="text-sm font-medium text-gray-200 mt-1">
                    {log.machine_name || log.location_name || 'Manual Log'}
                  </p>
                  {log.job_no && <p className="text-xs text-blue-300 mt-1">Job: {log.job_no}</p>}
                  {getDisplayName(log) && <p className="text-xs text-gray-400 mt-1">By: {getDisplayName(log)}</p>}
                  {log.notes && (
                    <div className="text-xs text-gray-400 mt-1 italic whitespace-pre-wrap">
                      {log.notes.replace(/\[TEAM_OVERRIDE:\s*[^\]]+\]\s*/g, '')}
                    </div>
                  )}
                  <p className="text-xs text-gray-600 mt-1">{new Date(log.transaction_timestamp).toLocaleString()}</p>
                </div>
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={() => {
                      setEditTxn(log);
                      setEditQty(Number(log.quantity));
                      setShowEditModal(true);
                    }}
                    className="p-2 bg-gray-800 hover:bg-gray-700 text-blue-400 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleVoid(log)}
                    className="p-2 bg-gray-800 hover:bg-gray-700 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editTxn && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
          <div className="bg-gray-900 rounded-3xl p-6 w-full max-w-sm border border-gray-800 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 flex items-center text-white">
              <Edit2 className="mr-2 text-blue-400" /> Edit Quantity
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Editing log for <span className="text-gray-200 font-bold">{editTxn.machine_name || editTxn.location_name}</span> 
              {editTxn.job_no && ` (Job: ${editTxn.job_no})`}
            </p>
            
            <div className="flex items-center justify-between bg-gray-950 p-4 rounded-2xl border border-gray-800 mb-6">
              <button 
                onClick={() => setEditQty(prev => Math.max(1, prev - 1))}
                className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-2xl text-blue-400 hover:bg-gray-700 transition-colors"
              >-</button>
              <span className="text-4xl font-bold text-white">{editQty}</span>
              <button 
                onClick={() => setEditQty(prev => prev + 1)}
                className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-2xl text-white hover:bg-blue-500 transition-colors"
              >+</button>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-bold flex justify-center items-center"
              >
                <X className="mr-2" size={20} /> Cancel
              </button>
              <button 
                onClick={handleEditSubmit}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex justify-center items-center transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]"
              >
                <Check className="mr-2" size={20} /> Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
