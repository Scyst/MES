import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, UserPlus, CheckCircle2, AlertOctagon, Clock, Trash2, RefreshCcw, Edit2, Check, X } from 'lucide-react';

export default function MachineCockpit({ type = 'machine' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(0);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isHold, setIsHold] = useState(false);
  
  const [machineData, setMachineData] = useState(null);
  const [locationData, setLocationData] = useState(null);

  // Job & Team state
  const [activeJobs, setActiveJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');

  const [teamMembers, setTeamMembers] = useState([]); // List from DB
  const [activeTeam, setActiveTeam] = useState(() => {
    const saved = localStorage.getItem('mes_active_team');
    return saved ? JSON.parse(saved) : [];
  });
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTxn, setEditTxn] = useState(null);
  const [editQty, setEditQty] = useState(0);

  useEffect(() => {
    localStorage.setItem('mes_active_team', JSON.stringify(activeTeam));
  }, [activeTeam]);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || './api/v1';

  const adjustQty = (amount) => setQty(prev => Math.max(0, prev + amount));

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const q = type === 'machine' ? `machine_id=${id}` : `location_id=${id}`;
      const res = await fetch(`${API_BASE_URL}/production_logs.php?action=history&${q}`);
      const json = await res.json();
      if (json.success) setHistory(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchMachineOrLocation = async () => {
    try {
      if (type === 'machine') {
        const res = await fetch(`${API_BASE_URL}/machines.php`);
        const json = await res.json();
        if (json.success) {
          const found = json.data.find(m => m.id === id);
          if (found) {
            setMachineData(found);
            setIsHold(found.status === 'Hold');
            if (found.location_id) fetchJobs(found.location_id);
            else fetchJobs('');
          }
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/locations.php`);
        const json = await res.json();
        if (json.success) {
          const found = json.data.find(l => String(l.id) === id);
          if (found) {
            setLocationData(found);
            fetchJobs(found.id);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchJobs = async (locId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/active_jobs.php?location_id=${locId || ''}`);
      const json = await res.json();
      if (json.success) {
        setActiveJobs(json.data);
        if (json.data.length > 0) {
          setSelectedJob(json.data[0].job_id);
        }
      }
    } catch (e) { console.error(e); }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/team.php`);
      const json = await res.json();
      if (json.success) setTeamMembers(json.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchMachineOrLocation();
    fetchHistory();
    fetchTeam();
    // eslint-disable-next-line
  }, [id, type]);

  const submitLog = async (logType) => {
    if (qty <= 0) { alert("Please enter a quantity greater than 0"); return; }
    if (!selectedJob && activeJobs.length > 0) { alert("Please select a Job Order."); return; }

    const formData = new FormData();
    formData.append('action', 'log');
    if (type === 'machine') formData.append('machine_id', id);
    if (type === 'location' || (machineData && machineData.location_id)) {
      formData.append('location_id', type === 'location' ? id : machineData.location_id);
    }
    formData.append('type', logType);
    formData.append('qty', qty);
    if (selectedJob) formData.append('job_id', selectedJob);
    if (activeTeam.length > 0) {
      const teamNames = activeTeam.map(t => t.name || t.fullname || t.username).join(', ');
      formData.append('notes', `[TEAM_OVERRIDE: ${teamNames}]`);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/production_logs.php`, { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        setQty(0);
        fetchHistory();
        if (selectedJob) fetchJobs(type === 'location' ? id : machineData?.location_id); // Refresh active job qty
      } else { alert("Failed to log: " + json.message); }
    } catch (e) { alert("Error: " + e.message); }
  };

  const voidLog = async (transactionId) => {
    if (!window.confirm("Are you sure you want to void this record?")) return;
    const formData = new FormData();
    formData.append('action', 'void');
    if (type === 'machine') formData.append('machine_id', id);
    else formData.append('location_id', id);
    formData.append('transaction_id', transactionId);

    try {
      const res = await fetch(`${API_BASE_URL}/production_logs.php`, { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) fetchHistory();
      else alert("Failed to void: " + json.message);
    } catch (e) { alert("Error: " + e.message); }
  };

  const submitEdit = async () => {
    if (!editTxn || editQty <= 0) return;
    const formData = new FormData();
    formData.append('action', 'edit');
    if (type === 'machine') formData.append('machine_id', id);
    else formData.append('location_id', id);
    formData.append('transaction_id', editTxn.transaction_id);
    formData.append('qty', editQty);
    if (activeTeam.length > 0) {
      const teamNames = activeTeam.map(t => t.name || t.fullname || t.username).join(', ');
      formData.append('notes', `[TEAM_OVERRIDE: ${teamNames}]`);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/production_logs.php`, { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        setShowEditModal(false);
        fetchHistory();
      } else alert("Failed to edit: " + json.message);
    } catch (e) { alert("Error: " + e.message); }
  };

  const toggleTeamMember = (member) => {
    if (activeTeam.find(m => m.id === member.id)) {
      setActiveTeam(activeTeam.filter(m => m.id !== member.id));
    } else {
      setActiveTeam([...activeTeam, member]);
    }
  };

  const headerTitle = type === 'machine' ? (machineData?.name || `Machine ${id}`) : (locationData?.name || `Line ${id}`);

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-2">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <button onClick={() => navigate(-1)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 flex-shrink-0">
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="text-xl font-bold text-white truncate">{headerTitle}</h2>
            {type === 'machine' && (
              <p className={`text-sm flex items-center ${isHold ? 'text-red-400' : 'text-green-400'} truncate`}>
                <span className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 animate-pulse ${isHold ? 'bg-red-500' : 'bg-green-500'}`}></span>
                <span className="truncate">{isHold ? 'On Hold / Downtime' : 'Running Active'}</span>
              </p>
            )}
            {type === 'location' && <p className="text-sm text-blue-400 truncate">General Assembly Mode</p>}
          </div>
        </div>
        
        {/* Team Avatars */}
        <div className="flex items-center flex-shrink-0">
          <div className="flex -space-x-3 mr-3 overflow-x-auto scrollbar-hide max-w-[100px] sm:max-w-[200px] py-1 px-2">
            {activeTeam.map(t => {
              const displayName = t.name || t.fullname || t.username || 'U';
              return (
              <div key={t.id} className="w-10 h-10 rounded-full bg-blue-600 border-2 border-gray-900 flex items-center justify-center text-xs font-bold flex-shrink-0" title={displayName}>
                {displayName.substring(0, 2).toUpperCase()}
              </div>
            )})}
          </div>
          <button onClick={() => setShowTeamModal(true)} className="flex-shrink-0 flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-full text-sm font-medium transition-colors">
            <UserPlus size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Input */}
        <div className="space-y-6">
          
          {/* Job Selector */}
          <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-xl">
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Active Job Order</label>
            <select 
              value={selectedJob} 
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">-- Manual Entry (No Job Linked) --</option>
              {activeJobs.map(job => (
                <option key={job.job_id} value={job.job_id}>
                  {job.job_no} | {job.part_no} | Target: {Number(job.target_qty)}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Stepper Input */}
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl text-center shadow-xl">
            <p className="text-gray-400 font-medium mb-4 uppercase tracking-wider text-xs">Production Quantity</p>
            
            <div className="flex items-center justify-center space-x-4 mb-6">
              <button onClick={() => adjustQty(-1)} className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white active:bg-gray-700">-1</button>
              
              <div className="relative">
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                  className="w-32 bg-gray-950 border-2 border-gray-800 text-center text-5xl font-bold py-4 rounded-3xl focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              
              <button onClick={() => adjustQty(1)} className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white active:bg-gray-700">+1</button>
            </div>

            <div className="flex justify-center space-x-2">
              <button onClick={() => adjustQty(10)} className="px-4 py-2 rounded-full bg-gray-800 text-sm font-medium hover:bg-gray-700">+10</button>
              <button onClick={() => adjustQty(50)} className="px-4 py-2 rounded-full bg-gray-800 text-sm font-medium hover:bg-gray-700">+50</button>
              <button onClick={() => adjustQty(100)} className="px-4 py-2 rounded-full bg-gray-800 text-sm font-medium hover:bg-gray-700">+100</button>
              <button onClick={() => setQty(0)} className="px-4 py-2 rounded-full bg-red-900/20 text-red-400 text-sm font-medium hover:bg-red-900/40">Reset</button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => submitLog('FG')} className="col-span-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 p-4 rounded-2xl font-bold text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] flex justify-center items-center">
              <CheckCircle2 className="mr-2" /> Log Good Parts (FG)
            </button>
            <button onClick={() => submitLog('HOLD')} className="bg-gray-800 hover:bg-gray-700 border border-yellow-500/30 p-4 rounded-2xl font-medium text-yellow-400 flex flex-col items-center justify-center">
              <Clock className="mb-2" />
              <span className="text-sm">Log Hold Parts</span>
            </button>
            <button onClick={() => submitLog('SCRAP')} className="bg-gray-800 hover:bg-gray-700 border border-red-500/30 p-4 rounded-2xl font-medium text-red-400 flex flex-col items-center justify-center">
              <AlertOctagon className="mb-2" />
              <span className="text-sm">Log Scrap</span>
            </button>
          </div>
        </div>

        {/* Right Column: History */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex flex-col h-full max-h-[600px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-300">Today's Log History</h3>
            <button onClick={fetchHistory} className="text-gray-500 hover:text-white">
              <RefreshCcw size={18} className={loadingHistory ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
            {history.length === 0 && !loadingHistory ? (
              <div className="text-center text-gray-500 mt-10">No logs for today yet.</div>
            ) : (
              history.map((log) => (
                <div key={log.transaction_id} className="flex flex-col p-3 bg-gray-800 rounded-xl border border-gray-700/50">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className={`font-bold text-lg ${
                        log.transaction_type === 'PRODUCTION_FG' ? 'text-green-400' 
                        : log.transaction_type === 'PRODUCTION_HOLD' ? 'text-yellow-400'
                        : 'text-red-400'
                      }`}>
                        {log.transaction_type === 'PRODUCTION_FG' ? 'GOOD' : log.transaction_type === 'PRODUCTION_HOLD' ? 'HOLD' : 'SCRAP'}: +{Number(log.quantity)}
                      </p>
                      {log.job_no && <p className="text-xs text-blue-300">Job: {log.job_no}</p>}
                      <p className="text-xs text-gray-500">{new Date(log.transaction_timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => { setEditTxn(log); setEditQty(Number(log.quantity)); setShowEditModal(true); }}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="Edit this entry"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => voidLog(log.transaction_id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Void this entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Select Operators</h3>
              <button onClick={() => setShowTeamModal(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
            </div>
            
            {/* Search Input */}
            <div className="mb-4">
              <input 
                type="text" 
                placeholder="Search name or ID..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-2 scrollbar-hide">
              {teamMembers
                .filter(m => 
                  m.name.toLowerCase().includes(teamSearch.toLowerCase()) || 
                  m.employee_id.toLowerCase().includes(teamSearch.toLowerCase())
                )
                .map(member => {
                const isActive = activeTeam.find(m => m.id === member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleTeamMember(member)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      isActive ? 'bg-blue-600/20 border-blue-500 text-blue-100' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isActive ? 'bg-blue-500' : 'bg-gray-700'}`}>
                        {member.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{member.name}</p>
                        <p className="text-xs opacity-70">{member.employee_id} • {member.position}</p>
                      </div>
                    </div>
                    {isActive && <CheckCircle2 className="text-blue-500" />}
                  </button>
                )
              })}
            </div>
            <button onClick={() => setShowTeamModal(false)} className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl">
              Confirm Team
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-xs p-6 shadow-2xl text-center">
            <h3 className="text-xl font-bold mb-2">Edit Quantity</h3>
            <p className="text-gray-400 text-sm mb-6">Enter correct quantity. Original: {editTxn ? Number(editTxn.quantity) : 0}</p>
            
            <input 
              type="number" 
              inputMode="numeric"
              value={editQty}
              onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
              className="w-full bg-gray-950 border-2 border-gray-800 text-center text-4xl font-bold py-4 rounded-2xl focus:outline-none focus:border-blue-500 mb-6"
            />
            
            <div className="flex space-x-3">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold hover:bg-gray-700">Cancel</button>
              <button onClick={submitEdit} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
