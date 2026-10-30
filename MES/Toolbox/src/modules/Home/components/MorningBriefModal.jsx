import React, { useState, useEffect } from 'react';
import { dailyLogApi } from '../../../shared/services/dailyLogApi';
import { Users, Coins, SmilePlus, Factory, Sun } from 'lucide-react';

const getMoodEmoji = (score) => {
  if (score >= 4.5) return '😄';
  if (score >= 3.5) return '🙂';
  if (score >= 2.5) return '😐';
  if (score >= 1.5) return '☹️';
  if (score > 0) return '😫';
  return '😐';
};

export default function MorningBriefModal({ isOpen, onClose, initialData }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(initialData?.raw_date || '');
  const [dontShowToday, setDontShowToday] = useState(false);

  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setData(initialData);
    if (initialData?.raw_date) {
      setSelectedDate(initialData.raw_date);
    }
  }, [initialData]);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchBrief = async (team, date) => {
    setLoading(true);
    try {
      const res = await dailyLogApi.getMorningBrief(team, date);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamChange = (e) => {
    const team = e.target.value;
    setSelectedTeam(team);
    fetchBrief(team, selectedDate);
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    fetchBrief(selectedTeam, date);
  };

  const handleClose = () => {
    if (dontShowToday) {
      const getProductionDate = () => {
        const now = new Date();
        if (now.getHours() < 8) now.setDate(now.getDate() - 1);
        
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      localStorage.setItem('morningBriefSeen', getProductionDate());
    }
    onClose();
  };

  if (!isRendered) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto bg-black/60 pt-[68px] transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none pointer-events-none'}`}>
      <div className="min-h-full flex items-center justify-center p-4 py-8">
        <div className={`bg-white rounded-[20px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}>
          
          {/* Header */}
          <div className="bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] p-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center relative">
            <div className="flex items-center gap-4 w-full">
              <div className="bg-yellow-400 rounded-full w-12 h-12 flex items-center justify-center shadow-lg shrink-0">
                <Sun className="text-gray-900" size={24} />
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-bold mb-0">Morning Brief</h4>
                <div className="text-white/70 text-sm">สรุปผลงานวันที่ {data?.date_text || selectedDate}</div>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="bg-white/20 border-0 rounded px-3 py-1.5 text-sm font-bold text-white focus:ring-2 focus:ring-white/50 outline-none cursor-pointer"
                  title="เลือกวันที่"
                />
                <select 
                  value={selectedTeam}
                  onChange={handleTeamChange}
                  className="bg-white/20 border-0 rounded px-3 py-1.5 text-sm font-bold text-white focus:ring-2 focus:ring-white/50 outline-none cursor-pointer"
                >
                  <option value="ALL" className="text-gray-900">All Teams</option>
                  <option value="TEAM 1" className="text-gray-900">TEAM 1</option>
                  <option value="TEAM 2" className="text-gray-900">TEAM 2</option>
                </select>
                <button onClick={handleClose} className="text-white/70 hover:text-white transition-colors p-1 text-2xl leading-none">
                  &times;
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 bg-gray-50 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
              <p className="mt-4 font-semibold animate-pulse">กำลังโหลดข้อมูล...</p>
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <p className="mt-4 font-semibold">ไม่มีข้อมูลสำหรับวันนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              
              {/* Manpower */}
              <div className="col-span-1 md:col-span-12">
                <div className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-l-blue-600">
                  <div className="text-gray-500 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                    <Users size={16} /> Manpower Statistics
                  </div>
                  <div className="flex justify-around text-center mt-2">
                    <div>
                      <h4 className="text-2xl font-bold mb-0 text-gray-900">{data.mp_total}</h4>
                      <small className="text-gray-500 font-medium">ทั้งหมด</small>
                    </div>
                    <div className="text-green-600">
                      <h4 className="text-2xl font-bold mb-0">{data.mp_present}</h4>
                      <small className="font-medium">เข้างาน</small>
                    </div>
                    <div className="text-red-500">
                      <h4 className="text-2xl font-bold mb-0">{data.mp_leave}</h4>
                      <small className="font-medium">ขาด/ลา</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Labor & Utility */}
              <div className="col-span-1 md:col-span-7">
                <div className="bg-white p-4 rounded-2xl shadow-sm h-full flex flex-col">
                  <div className="text-gray-500 text-xs font-bold uppercase mb-3 flex items-center gap-2">
                    <Coins size={16} /> Labor & Utility Costs (THB)
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 text-sm font-medium">DLOT (รวมทั้งหมด)</span>
                      <span className="font-bold text-gray-900">{data.dlot_total}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 text-sm font-medium">DL (เฉพาะรายวัน)</span>
                      <span className="font-bold text-gray-900">{data.dl_daily}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500 text-sm font-medium">OT (รวมทั้งหมด)</span>
                      <span className="font-bold text-blue-600">{data.ot_total}</span>
                    </div>
                    <div className="flex justify-between py-2 mt-2">
                      <span className="text-gray-500 text-sm font-medium">ค่าไฟ / ค่าแก๊ส</span>
                      <span className="font-bold text-red-500">
                        {data.elec_cost} / {data.gas_cost}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Mood */}
              <div className="col-span-1 md:col-span-5">
                <div className="bg-white p-4 rounded-2xl shadow-sm h-full flex flex-col text-center">
                  <div className="text-gray-500 text-xs font-bold uppercase mb-3 w-full text-left flex items-center gap-2">
                    <SmilePlus size={16} /> Team Mood
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-6xl mb-2 select-none">
                      {getMoodEmoji(parseFloat(data.mood_avg))}
                    </div>
                    <div className="font-bold text-xl text-gray-900">
                      {parseFloat(data.mood_avg).toFixed(1)} <span className="text-sm text-gray-400 font-normal">/ 5.0</span>
                    </div>
                    <small className="text-gray-500 mt-1 font-medium">ความสุขเฉลี่ยพนักงาน</small>
                  </div>
                </div>
              </div>

              {/* Production */}
              <div className="col-span-1 md:col-span-12">
                <div className="bg-slate-800 text-white p-4 sm:p-5 rounded-2xl shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-3 border-b border-slate-600/50 gap-3">
                    <span className="text-xs font-bold uppercase text-white/75 flex items-center gap-2">
                      <Factory size={16} /> Production & Revenue
                    </span>
                    <span className="bg-green-500 text-white py-1.5 px-4 rounded-lg font-bold text-lg shadow-sm">
                      ฿ {data.revenue}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {data.models && data.models.length > 0 ? data.models.map((m, idx) => {
                      const fg = parseInt(m.fg) || 0;
                      const hold = parseInt(m.hold) || 0;
                      const scrap = parseInt(m.scrap) || 0;
                      const total = fg + hold + scrap;

                      return (
                        <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center py-2 border-b border-slate-700/50 last:border-0 gap-1 text-sm">
                          <span className="font-semibold text-white">{m.model_name}</span>
                          <div className="flex items-center gap-2">
                            <b className="text-green-400 text-base">{fg.toLocaleString()}</b> <span className="text-slate-400">ตัว</span>
                            <span className="text-slate-500 text-xs ml-2 hidden sm:inline">(Hold {hold}, Scrap {scrap}, Total {total.toLocaleString()})</span>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-slate-400 text-sm text-center py-4">ไม่มีข้อมูลการผลิต</div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}
          
          {/* Dont Show Again */}
          <div className="flex justify-center items-center mt-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 user-select-none">
              <input 
                type="checkbox" 
                checked={dontShowToday}
                onChange={(e) => setDontShowToday(e.target.checked)}
                className="w-4 h-4 text-slate-800 rounded focus:ring-slate-800 border-gray-300"
              />
              ไม่ต้องแสดงอีกในวันนี้
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 pt-0 flex justify-center pb-6">
          <button onClick={handleClose} className="px-10 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-full transition-colors shadow-md">
            ปิดหน้าต่างสรุป
          </button>
        </div>

      </div>
    </div>
    </div>
  );
}
