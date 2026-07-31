import { useState, useEffect } from 'react';
import { Database, Plus, Trash2, Bus, Route as RouteIcon, Clock, Save, X, BusFront, Pencil, Building2, UserCircle, MapPin, Car, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MasterData = () => {
  const [activeTab, setActiveTab] = useState('fleet');
  
  const [fleet, setFleet] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [departments, setDepartments] = useState([]);

  // States for Add/Edit Forms
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [fleetForm, setFleetForm] = useState({ licensePlate: '', type: 'VAN', capacity: 12, driverEmpId: '', driverName: '', driverPhone: '' });
  const [routeForm, setRouteForm] = useState({ name: '', stops: [] });
  const [timeSlotForm, setTimeSlotForm] = useState({ name: '', time: '' });
  const [departmentForm, setDepartmentForm] = useState({ code: '', name: '' });

  // Load Data
  useEffect(() => {
    setFleet(JSON.parse(localStorage.getItem('fleet')) || []);
    setRoutes(JSON.parse(localStorage.getItem('routes')) || []);
    setTimeSlots(JSON.parse(localStorage.getItem('timeSlots')) || []);
    setDepartments(JSON.parse(localStorage.getItem('departments')) || []);
  }, []);

  // Save Handlers
  const handleAddFleet = (e) => {
    e.preventDefault();
    let updatedFleet;
    if (editingId) {
      updatedFleet = fleet.map(f => f.id === editingId ? { ...fleetForm, id: editingId } : f);
    } else {
      updatedFleet = [...fleet, { ...fleetForm, id: Date.now().toString() }];
    }
    setFleet(updatedFleet);
    localStorage.setItem('fleet', JSON.stringify(updatedFleet));
    setFleetForm({ licensePlate: '', type: 'VAN', capacity: 12, driverEmpId: '', driverName: '', driverPhone: '' });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleAddRoute = (e) => {
    e.preventDefault();
    let updatedRoutes;
    if (editingId) {
      updatedRoutes = routes.map(r => r.id === editingId ? { ...routeForm, id: editingId } : r);
    } else {
      updatedRoutes = [...routes, { ...routeForm, id: Date.now().toString() }];
    }
    setRoutes(updatedRoutes);
    localStorage.setItem('routes', JSON.stringify(updatedRoutes));
    setRouteForm({ name: '', stops: [] });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleAddTimeSlot = (e) => {
    e.preventDefault();
    let updatedSlots;
    if (editingId) {
      updatedSlots = timeSlots.map(t => t.id === editingId ? { ...timeSlotForm, id: editingId } : t);
    } else {
      updatedSlots = [...timeSlots, { ...timeSlotForm, id: Date.now().toString() }];
    }
    setTimeSlots(updatedSlots);
    localStorage.setItem('timeSlots', JSON.stringify(updatedSlots));
    setTimeSlotForm({ name: '', time: '' });
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleAddDepartment = (e) => {
    e.preventDefault();
    let updatedDepts;
    if (editingId) {
      updatedDepts = departments.map(d => d.id === editingId ? { ...departmentForm, id: editingId } : d);
    } else {
      updatedDepts = [...departments, { ...departmentForm, id: Date.now().toString() }];
    }
    setDepartments(updatedDepts);
    localStorage.setItem('departments', JSON.stringify(updatedDepts));
    setDepartmentForm({ code: '', name: '' });
    setShowAddForm(false);
    setEditingId(null);
  };

  // Delete Handlers
  const handleDeleteFleet = (id) => {
    const updated = fleet.filter(f => f.id !== id);
    setFleet(updated);
    localStorage.setItem('fleet', JSON.stringify(updated));
  };
  const handleDeleteRoute = (id) => {
    const updated = routes.filter(r => r.id !== id);
    setRoutes(updated);
    localStorage.setItem('routes', JSON.stringify(updated));
  };
  const handleDeleteTimeSlot = (id) => {
    const updated = timeSlots.filter(t => t.id !== id);
    setTimeSlots(updated);
    localStorage.setItem('timeSlots', JSON.stringify(updated));
  };
  const handleDeleteDepartment = (id) => {
    const updated = departments.filter(d => d.id !== id);
    setDepartments(updated);
    localStorage.setItem('departments', JSON.stringify(updated));
  };

  // Route Stops Handlers (inside the form)
  const addStopToForm = () => {
    setRouteForm({
      ...routeForm,
      stops: [...routeForm.stops, { id: Date.now().toString(), name: '', description: '' }]
    });
  };

  const removeStopFromForm = (stopId) => {
    setRouteForm({
      ...routeForm,
      stops: routeForm.stops.filter(s => s.id !== stopId)
    });
  };

  const updateStopInForm = (stopId, field, value) => {
    setRouteForm({
      ...routeForm,
      stops: routeForm.stops.map(s => s.id === stopId ? { ...s, [field]: value } : s)
    });
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">ตั้งค่าข้อมูลหลัก (Master Data)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">จัดการรายชื่อสายรถ ยานพาหนะ และช่วงเวลามาตรฐาน สำหรับระบบจองรถรับส่งพนักงาน</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full md:w-fit">
        <button
          onClick={() => { setActiveTab('fleet'); setShowAddForm(false); setEditingId(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'fleet' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <BusFront size={16} /> รถและคนขับ ({fleet.length})
        </button>
        <button
          onClick={() => { setActiveTab('routes'); setShowAddForm(false); setEditingId(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'routes' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <RouteIcon size={16} /> เส้นทางและจุดจอด ({routes.length})
        </button>
        <button
          onClick={() => { setActiveTab('timeSlots'); setShowAddForm(false); setEditingId(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'timeSlots' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Clock size={16} /> ช่วงเวลา ({timeSlots.length})
        </button>
        <button
          onClick={() => { setActiveTab('departments'); setShowAddForm(false); setEditingId(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
            activeTab === 'departments' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Building2 size={16} /> แผนก/ฝ่าย ({departments.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        
        {/* Top Action Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {activeTab === 'fleet' && 'รถและคนขับ'}
            {activeTab === 'routes' && 'เส้นทางและจุดจอด'}
            {activeTab === 'timeSlots' && 'ช่วงเวลา (Time Slots)'}
            {activeTab === 'departments' && 'แผนก/ฝ่าย (Business Units)'}
          </h3>
          <button
            onClick={() => {
              setEditingId(null);
              setFleetForm({ licensePlate: '', type: 'VAN', capacity: 12, driverEmpId: '', driverName: '', driverPhone: '' });
              setRouteForm({ name: '', stops: [] });
              setTimeSlotForm({ name: '', time: '' });
              setDepartmentForm({ code: '', name: '' });
              setShowAddForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={16}/> เพิ่มข้อมูล
          </button>
        </div>

        {/* List Areas */}
        <div className="p-4">
          
          {/* List: Fleet */}
          {activeTab === 'fleet' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {fleet.map(f => (
                <div key={f.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center font-bold ${f.type === 'BUS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' : f.type === 'CAR' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400' : f.type === 'SONGTHAEW' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'}`}>
                      {f.type === 'BUS' ? <Bus size={24}/> : f.type === 'CAR' ? <Car size={24}/> : f.type === 'SONGTHAEW' ? <Truck size={24}/> : <BusFront size={24}/>}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">ยานพาหนะ</p>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{f.licensePlate}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{f.type === 'BUS' ? 'รถบัส' : f.type === 'CAR' ? 'รถส่วนบุคคล' : f.type === 'SONGTHAEW' ? 'รถสองแถว' : 'รถตู้'} • {f.capacity} ที่นั่ง</p>
                      </div>
                      {(f.driverEmpId || f.driverName) && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase">คนขับประจำรถ</p>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{f.driverName || '-'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{f.driverEmpId ? `${f.driverEmpId}` : ''} {f.driverPhone ? `โทร ${f.driverPhone}` : ''}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(f.id); setFleetForm(f); setShowAddForm(true); }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Pencil size={18}/></button>
                    <button onClick={() => handleDeleteFleet(f.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
              {fleet.length === 0 && <div className="col-span-full py-12 text-center text-gray-500">ยังไม่มีข้อมูลยานพาหนะในระบบ</div>}
            </div>
          )}

          {/* List: Routes */}
          {activeTab === 'routes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {routes.map(r => (
                <div key={r.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                      <RouteIcon size={20}/>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">สายรถ</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{r.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.stops?.length || 0} จุดจอด</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(r.id); setRouteForm(r); setShowAddForm(true); }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Pencil size={18}/></button>
                    <button onClick={() => handleDeleteRoute(r.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
              {routes.length === 0 && <div className="col-span-full py-12 text-center text-gray-500">ยังไม่มีข้อมูลเส้นทางในระบบ</div>}
            </div>
          )}

          {/* List: Time Slots */}
          {activeTab === 'timeSlots' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {timeSlots.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
                      <Clock size={20}/>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">ช่วงเวลา</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">เวลาเดินรถ {t.time} น.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(t.id); setTimeSlotForm(t); setShowAddForm(true); }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Pencil size={18}/></button>
                    <button onClick={() => handleDeleteTimeSlot(t.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
              {timeSlots.length === 0 && <div className="col-span-full py-12 text-center text-gray-500">ยังไม่มีข้อมูลช่วงเวลาในระบบ</div>}
            </div>
          )}

          {/* List: Departments */}
          {activeTab === 'departments' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {departments.map(d => (
                <div key={d.id} className="flex items-center justify-between p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">
                      <Building2 size={20}/>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">รหัส: {d.code}</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{d.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(d.id); setDepartmentForm(d); setShowAddForm(true); }} className="p-2 text-gray-400 hover:text-blue-600 transition-colors"><Pencil size={18}/></button>
                    <button onClick={() => handleDeleteDepartment(d.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
              ))}
              {departments.length === 0 && <div className="col-span-full py-12 text-center text-gray-500">ยังไม่มีข้อมูลแผนกในระบบ</div>}
            </div>
          )}

        </div>
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowAddForm(false);
              setEditingId(null);
            }}
          ></motion.div>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto relative z-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setFleetForm({ licensePlate: '', type: 'VAN', capacity: 12, driverEmpId: '', driverName: '', driverPhone: '' });
                  setRouteForm({ name: '', stops: [] });
                  setTimeSlotForm({ name: '', time: '' });
                  setDepartmentForm({ code: '', name: '' });
                }}
                className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form: Fleet */}
            {activeTab === 'fleet' && (
              <form onSubmit={handleAddFleet} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ทะเบียนรถ</label>
                    <input type="text" required placeholder="เช่น 10-1234 ระยอง" value={fleetForm.licensePlate} onChange={e => setFleetForm({...fleetForm, licensePlate: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ประเภท</label>
                    <select value={fleetForm.type} onChange={e => {
                        const newType = e.target.value;
                        let newCap = 12;
                        if(newType === 'BUS') newCap = 40;
                        if(newType === 'CAR') newCap = 4;
                        if(newType === 'SONGTHAEW') newCap = 14;
                        setFleetForm({...fleetForm, type: newType, capacity: newCap});
                      }} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500">
                      <option value="VAN">รถตู้</option>
                      <option value="BUS">รถบัส</option>
                      <option value="SONGTHAEW">รถสองแถว</option>
                      <option value="CAR">รถส่วนบุคคล</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ความจุ</label>
                    <input type="number" required min="1" value={fleetForm.capacity} onChange={e => setFleetForm({...fleetForm, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                </div>
                
                <h4 className="font-bold text-gray-900 dark:text-white mt-4 border-b border-gray-200 dark:border-gray-700 pb-2">ข้อมูลคนขับประจำรถ</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">รหัสคนขับ</label>
                    <input type="text" placeholder="เช่น DRV001" value={fleetForm.driverEmpId} onChange={e => setFleetForm({...fleetForm, driverEmpId: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ชื่อคนขับ</label>
                    <input type="text" placeholder="เช่น สมชาย ขับดี" value={fleetForm.driverName} onChange={e => setFleetForm({...fleetForm, driverName: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">เบอร์โทร</label>
                    <input type="tel" placeholder="เช่น 081-234-5678" value={fleetForm.driverPhone} onChange={e => setFleetForm({...fleetForm, driverPhone: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                </div>
                
                <div className="flex justify-end mt-4">
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"><Save size={18}/> บันทึกข้อมูล</button>
                </div>
              </form>
            )}

            {/* Form: Route */}
            {activeTab === 'routes' && (
              <form onSubmit={handleAddRoute} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ชื่อสายรถ</label>
                  <input type="text" required placeholder="เช่น สาย CK" value={routeForm.name} onChange={e => setRouteForm({...routeForm, name: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-3 mt-4">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-2">
                    <label className="block text-base font-bold text-gray-700 dark:text-gray-300">จุดจอดในสายรถ</label>
                    <button type="button" onClick={addStopToForm} className="text-sm px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold flex items-center gap-1 transition-colors"><Plus size={14}/> เพิ่มจุดจอด</button>
                  </div>
                  {routeForm.stops.map((stop, index) => (
                    <div key={stop.id} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1">{index + 1}</div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">ชื่อจุดจอด</label>
                          <input type="text" required value={stop.name} onChange={e => updateStopInForm(stop.id, 'name', e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" placeholder="เช่น หน้าเซเว่น" />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">รายละเอียด / จุดสังเกต</label>
                          <input type="text" value={stop.description} onChange={e => updateStopInForm(stop.id, 'description', e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" placeholder="ศาลาพัก" />
                        </div>
                      </div>
                      <button type="button" onClick={() => removeStopFromForm(stop.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-5"><Trash2 size={20}/></button>
                    </div>
                  ))}
                  {routeForm.stops.length === 0 && <p className="text-sm text-gray-500 italic text-center py-4">ยังไม่มีจุดจอด (สามารถกดปุ่ม "เพิ่มจุดจอด" ได้)</p>}
                </div>
                <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"><Save size={18}/> บันทึกข้อมูล</button>
                </div>
              </form>
            )}

            {/* Form: Time Slots */}
            {activeTab === 'timeSlots' && (
              <form onSubmit={handleAddTimeSlot} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ชื่อเรียกกะ (Shift)</label>
                    <input type="text" required placeholder="เช่น กะเช้า, กะดึก" value={timeSlotForm.name} onChange={e => setTimeSlotForm({...timeSlotForm, name: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">เวลาเดินรถ (HH:mm)</label>
                    <input type="time" required value={timeSlotForm.time} onChange={e => setTimeSlotForm({...timeSlotForm, time: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"><Save size={18}/> บันทึกข้อมูล</button>
                </div>
              </form>
            )}

            {/* Form: Departments */}
            {activeTab === 'departments' && (
              <form onSubmit={handleAddDepartment} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">รหัสแผนก/ฝ่าย</label>
                    <input type="text" required placeholder="เช่น PROD1" value={departmentForm.code} onChange={e => setDepartmentForm({...departmentForm, code: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">ชื่อแผนก/ฝ่าย</label>
                    <input type="text" required placeholder="เช่น Production 1" value={departmentForm.name} onChange={e => setDepartmentForm({...departmentForm, name: e.target.value})} className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-blue-500" />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2"><Save size={18}/> บันทึกข้อมูล</button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default MasterData;
