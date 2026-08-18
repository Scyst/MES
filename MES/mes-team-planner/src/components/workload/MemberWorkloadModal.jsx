import React, { useState, useEffect } from 'react';
import { FiX, FiGithub, FiActivity, FiClock, FiFileText, FiGitCommit } from 'react-icons/fi';
import axios from 'axios';

export default function MemberWorkloadModal({ isOpen, onClose, user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && user) {
      setLoading(true);
      setError(null);
      setStats(null);
      
      axios.get(`/api/github.php?user=${encodeURIComponent(user.username)}`)
        .then(res => {
          setStats(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError(err.response?.data?.error || 'ไม่สามารถดึงข้อมูล GitHub ได้');
          setLoading(false);
        });
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}></div>
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl animate-scale-up flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 shrink-0">
                <img 
                    src={`api/uploads/avatars/${encodeURIComponent(user.username)}.jpg?t=${Date.now()}`} 
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                    }} 
                    alt="Avatar" 
                    className="w-10 h-10 rounded-full object-cover shadow-sm" 
                />
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white hidden items-center justify-center text-lg font-bold shadow-sm">
                    {(user.aka || user.fullname || user.username || 'U').charAt(0).toUpperCase()}
                </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {user.aka ? `${user.aka} (${user.fullname})` : user.fullname}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <FiActivity /> ข้อมูลการทำงานและ GitHub Stats
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2 rounded-xl transition-colors">
            <FiX className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500">กำลังดึงข้อมูล...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
               <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center text-2xl">
                 <FiGithub />
               </div>
               <p className="text-slate-600 dark:text-slate-400 font-medium">ไม่พบข้อมูล GitHub</p>
               <p className="text-sm text-slate-500 text-center max-w-sm">
                 ผู้ใช้นี้ยังไม่ได้ตั้งค่า GitHub Username หรือ Token<br/>ในหน้าตั้งค่าโปรไฟล์
               </p>
            </div>
          ) : stats && (
            <div className="space-y-6">
              
              {/* Stats Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                 <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><FiGitCommit /> Commits (Today)</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.stats?.commitsToday || 0}</div>
                 </div>
                 <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">Commits (Week)</div>
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.stats?.commitsWeek || 0}</div>
                 </div>
                 <div className="bg-rose-50 dark:bg-rose-500/10 p-4 rounded-xl border border-rose-100 dark:border-rose-500/20">
                    <div className="text-xs text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">Commits (Month)</div>
                    <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">{stats.stats?.commitsMonth || 0}</div>
                 </div>
                 <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><FiFileText /> Repositories</div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{stats.stats?.repositories?.length || 0}</div>
                 </div>
              </div>

              {/* Contribution Calendar */}
              {stats.weeks && stats.weeks.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-hidden">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <FiGithub /> Contribution Calendar (Last Year)
                    <span className="text-xs font-normal text-slate-500 ml-auto">{stats.totalContributions} contributions</span>
                  </h4>
                  
                  <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                    <div className="flex flex-col gap-[3px] text-[9px] text-slate-400 justify-between py-[2px] pr-2 select-none shrink-0">
                      <div className="h-[11px]"></div>
                      <div className="h-[11px] leading-[11px]">Mon</div>
                      <div className="h-[11px]"></div>
                      <div className="h-[11px] leading-[11px]">Wed</div>
                      <div className="h-[11px]"></div>
                      <div className="h-[11px] leading-[11px]">Fri</div>
                      <div className="h-[11px]"></div>
                    </div>

                    <div className="flex flex-col flex-1 shrink-0">
                      <div className="flex text-[9px] text-slate-400 mb-1.5 relative h-[12px] select-none">
                        {stats.weeks.map((week, i) => {
                          const firstDay = week.contributionDays[0]?.date;
                          if (!firstDay) return null;
                          const d = new Date(firstDay);
                          if (d.getDate() <= 7) {
                            return <span key={i} className="absolute" style={{ left: `${i * 14}px` }}>{d.toLocaleString('en-US', { month: 'short' })}</span>
                          }
                          return null;
                        })}
                      </div>
                      
                      <div className="flex gap-[3px]">
                        {stats.weeks.map((week, i) => (
                          <div key={i} className="flex flex-col gap-[3px]">
                            {week.contributionDays.map((day, j) => {
                              const count = day.contributionCount;
                              const level = count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;
                              const bgClass = level === 0 ? 'bg-slate-200 dark:bg-slate-700' :
                                              level === 1 ? 'bg-emerald-200 dark:bg-emerald-900/50' :
                                              level === 2 ? 'bg-emerald-400 dark:bg-emerald-700/60' :
                                              level === 3 ? 'bg-emerald-500 dark:bg-emerald-500' :
                                                            'bg-emerald-600 dark:bg-emerald-400';
                              return (
                                <div 
                                  key={j} 
                                  className={`w-[11px] h-[11px] rounded-[2px] ${bgClass}`}
                                  title={`${count} contributions on ${day.date}`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Commit Log */}
              {stats.stats?.commitLog && stats.stats.commitLog.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">Recent Commits</h4>
                  <div className="space-y-2">
                    {stats.stats.commitLog.map((c, i) => (
                      <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-start gap-4">
                        <div className="min-w-0">
                           <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-md truncate">
                                {c.repo.split('/')[1] || c.repo}
                              </span>
                           </div>
                           <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                             {c.message.split('\n')[0]}
                           </p>
                        </div>
                        <div className="text-xs text-slate-400 shrink-0 flex items-center gap-1">
                          <FiClock /> {new Date(c.time).toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
