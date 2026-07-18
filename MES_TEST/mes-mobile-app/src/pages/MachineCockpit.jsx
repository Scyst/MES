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

  // Missing features from old system
  const [timeSlot, setTimeSlot] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [notes, setNotes] = useState('');
  const [sapNo, setSapNo] = useState('');


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
    if (qty <= 0) { alert("กรุณาระบุจำนวนมากกว่า 0 (Please enter a quantity greater than 0)"); return; }
    if (!selectedJob && activeJobs.length > 0) { alert("กรุณาเลือกใบสั่งผลิต (Please select a Job Order)"); return; }

    const formData = new FormData();
    formData.append('action', 'log');
    if (type === 'machine') formData.append('machine_id', id);
    if (type === 'location' || (machineData && machineData.location_id)) {
      formData.append('location_id', type === 'location' ? id : machineData.location_id);
    }
    formData.append('type', logType);
    formData.append('qty', qty);
    if (selectedJob) formData.append('job_id', selectedJob);
    if (sapNo) formData.append('sap_no', sapNo);
    if (timeSlot) formData.append('time_slot', timeSlot);
    if (lotNo) formData.append('lot_no', lotNo);
    
    let combinedNotes = notes;
    if (activeTeam.length > 0) {
      const teamNames = activeTeam.map(t => t.name || t.fullname || t.username).join(', ');
      combinedNotes = combinedNotes ? `${combinedNotes} [TEAM: ${teamNames}]` : `[TEAM: ${teamNames}]`;
    }
    if (combinedNotes) formData.append('notes', combinedNotes);

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
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการยกเลิกรายการนี้? (Are you sure you want to void this record?)")) return;
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
          <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{headerTitle}</h2>
            {type === 'machine' && (
              <p className={`text-sm flex items-center ${isHold ? 'text-red-400' : 'text-green-400'} truncate`}>
                <span className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 animate-pulse ${isHold ? 'bg-red-500' : 'bg-green-500'}`}></span>
                <span className="truncate">{isHold ? 'เครื่องหยุดพัก (Hold)' : 'กำลังทำงาน (Running)'}</span>
              </p>
            )}
            {type === 'location' && <p className="text-sm text-blue-400 truncate">โหมดลงยอดทั่วไป (Manual)</p>}
          </div>
        </div>
        
        {/* Team Avatars */}
        <div className="flex items-center flex-shrink-0">
          <div className="flex -space-x-3 mr-3 overflow-x-auto scrollbar-hide max-w-[100px] sm:max-w-[200px] py-1 px-2">
            {activeTeam.map(t => {
              const displayName = t.name || t.fullname || t.username || 'U';
              return (
              <div key={t.id} className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-600 border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-white flex-shrink-0" title={displayName}>
                {displayName.substring(0, 2).toUpperCase()}
              </div>
            )})}
          </div>
          <button onClick={() => setShowTeamModal(true)} className="flex-shrink-0 flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 rounded-full text-sm font-medium transition-colors">
            <UserPlus size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Input */}
        <div className="space-y-6">
          
          {/* Job Selector */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-lg transition-colors">
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">ใบสั่งผลิต (Job Order)</label>
            <select 
              value={selectedJob} 
              onChange={(e) => setSelectedJob(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-lg"
            >
              <option value="">-- คีย์มือ (ไม่ระบุ Job) --</option>
              {activeJobs.map(job => (
                <option key={job.job_id} value={job.job_id}>
                  {job.job_no} | {job.part_no} | ยอดเป้าหมาย: {Number(job.target_qty)}
                </option>
              ))}
            </select>
            
            {!selectedJob && (
              <div className="mt-3">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">รหัสสินค้า (SAP No.) *</label>
                <input 
                  type="text" 
                  value={sapNo}
                  onChange={(e) => setSapNo(e.target.value)}
                  placeholder="ต้องระบุเมื่อไม่ได้เลือก Job..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors text-base"
                />
              </div>
            )}
          </div>

          {/* Quick Stepper Input */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-3xl text-center shadow-lg transition-colors">
            <p className="text-gray-500 dark:text-gray-400 font-bold mb-4 uppercase tracking-wider text-sm">จำนวนที่ต้องการลงยอด</p>
            
            <div className="flex items-center justify-center space-x-6 mb-6">
              <button onClick={() => adjustQty(-1)} className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white active:bg-gray-200 dark:active:bg-gray-700 transition-colors text-2xl font-bold">-1</button>
              
              <div className="relative">
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                  className="w-40 bg-gray-50 dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-center text-6xl font-black py-4 rounded-3xl focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              
              <button onClick={() => adjustQty(1)} className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white active:bg-gray-200 dark:active:bg-gray-700 transition-colors text-2xl font-bold">+1</button>
            </div>

            <div className="flex justify-center space-x-2">
              <button onClick={() => adjustQty(10)} className="px-5 py-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white text-base font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">+10</button>
              <button onClick={() => adjustQty(50)} className="px-5 py-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white text-base font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">+50</button>
              <button onClick={() => adjustQty(100)} className="px-5 py-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white text-base font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">+100</button>
              <button onClick={() => setQty(0)} className="px-5 py-3 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-base font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">รีเซ็ต</button>
            </div>
          </div>

          {/* Additional Info Fields */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-lg transition-colors space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">ช่วงเวลาผลิต (Time Slot)</label>
              <select 
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-sm"
              >
                <option value="">-- ปัจจุบัน / ไม่ระบุ --</option>
                <option value="08:00:00|08:59:59">08:00 - 09:00</option>
                <option value="09:00:00|09:59:59">09:00 - 10:00</option>
                <option value="10:00:00|10:59:59">10:00 - 11:00</option>
                <option value="11:00:00|11:59:59">11:00 - 12:00</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">หมายเลข Lot</label>
                <input 
                  type="text" 
                  value={lotNo}
                  onChange={(e) => setLotNo(e.target.value)}
                  placeholder="ระบุหรือไม่ระบุก็ได้"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">หมายเหตุ</label>
                <input 
                  type="text" 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="เช่น สาเหตุการหยุด..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => submitLog('FG')} className="col-span-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 p-4 rounded-2xl font-bold text-lg text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] flex justify-center items-center">
              <CheckCircle2 className="mr-2" /> บันทึกยอดของดี (FG)
            </button>
            <button onClick={() => submitLog('HOLD')} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-yellow-200 dark:border-yellow-500/30 p-4 rounded-2xl font-bold text-yellow-600 dark:text-yellow-400 flex flex-col items-center justify-center shadow-sm transition-colors">
              <Clock className="mb-2 w-8 h-8" />
              <span className="text-sm">บันทึกรอดำเนินการ (Hold)</span>
            </button>
            <button onClick={() => submitLog('SCRAP')} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-red-200 dark:border-red-500/30 p-4 rounded-2xl font-bold text-red-600 dark:text-red-400 flex flex-col items-center justify-center shadow-sm transition-colors">
              <AlertOctagon className="mb-2 w-8 h-8" />
              <span className="text-sm">บันทึกของเสีย (Scrap)</span>
            </button>
          </div>
        </div>

        {/* Right Column: History */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 flex flex-col h-full max-h-[600px] shadow-lg transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-300">ประวัติการลงยอดวันนี้</h3>
            <button onClick={fetchHistory} className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
              <RefreshCcw size={18} className={loadingHistory ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-hide">
            {history.length === 0 && !loadingHistory ? (
              <div className="text-center text-gray-500 mt-10">ยังไม่มีประวัติการลงยอดในวันนี้</div>
            ) : (
              history.map((log) => (
                <div key={log.transaction_id} className="flex flex-col p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700/50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className={`font-bold text-lg ${
                        log.transaction_type === 'PRODUCTION_FG' ? 'text-green-600 dark:text-green-400' 
                        : log.transaction_type === 'PRODUCTION_HOLD' ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                      }`}>
                        {log.transaction_type === 'PRODUCTION_FG' ? 'ยอดดี (FG)' : log.transaction_type === 'PRODUCTION_HOLD' ? 'ยอดรอ (Hold)' : 'ยอดเสีย (Scrap)'}: +{Number(log.quantity)}
                      </p>
                      {log.job_no && <p className="text-xs font-bold text-blue-600 dark:text-blue-300">Job: {log.job_no}</p>}
                      <p className="text-xs text-gray-500">{new Date(log.transaction_timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => { setEditTxn(log); setEditQty(Number(log.quantity)); setShowEditModal(true); }}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                        title="แก้ไขรายการนี้"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => voidLog(log.transaction_id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="ยกเลิกรายการนี้"
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
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">เลือกพนักงาน (Operators)</h3>
              <button onClick={() => setShowTeamModal(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={24} /></button>
            </div>
            
            {/* Search Input */}
            <div className="mb-4">
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
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
                      isActive ? 'bg-blue-100 dark:bg-blue-600/20 border-blue-500 text-blue-800 dark:text-blue-100' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-white'}`}>
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
              ยืนยันทีมงาน
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-xs p-6 shadow-2xl text-center transition-colors">
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">แก้ไขจำนวน</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">ระบุจำนวนที่ถูกต้อง ยอดเดิม: {editTxn ? Number(editTxn.quantity) : 0}</p>
            
            <input 
              type="number" 
              inputMode="numeric"
              value={editQty}
              onChange={(e) => setEditQty(parseInt(e.target.value) || 0)}
              className="w-full bg-gray-50 dark:bg-gray-950 border-2 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white text-center text-4xl font-black py-4 rounded-2xl focus:outline-none focus:border-blue-500 mb-6 transition-colors"
            />
            
            <div className="flex space-x-3">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">ยกเลิก</button>
              <button onClick={submitEdit} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 transition-colors">บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
