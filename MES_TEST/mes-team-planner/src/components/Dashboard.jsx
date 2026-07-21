import React, { useMemo, useState, useEffect } from 'react';
import { FiActivity, FiUserCheck, FiAlertCircle, FiCheckCircle, FiClock, FiBarChart2, FiTrendingUp, FiPieChart, FiFolderPlus, FiFilePlus, FiUserPlus, FiCalendar, FiBriefcase } from 'react-icons/fi';
import { format, subDays } from 'date-fns';
import axios from 'axios';

export default function Dashboard({ tasks = [], events = [], activities = [], loading, onNav, openTaskModal, openProjectModal, openSpaceModal }) {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    axios.get('/api/projects.php')
      .then(res => setProjects(res.data.filter(p => p.Status === 'active')))
      .catch(console.error);
  }, []);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysLeaves = events.filter(e => e.Type === 'leave' && e.date === todayStr);
  const peopleOnLeaveCount = todaysLeaves.reduce((acc, leave) => {
    return acc + (leave.Assignee ? leave.Assignee.split(',').filter(x => x.trim()).length : 0);
  }, 0);
  const todaysTasks = tasks.filter(t => t.dueDate === todayStr && t.Status !== 'done');

  // ═══ Analytics ═══
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.Status === 'done').length;
  const inProgressTasks = tasks.filter(t => t.Status === 'in-progress').length;
  const todoTasks = tasks.filter(t => t.Status === 'todo').length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Priority breakdown
  const urgentTasks = tasks.filter(t => (t.priority || 'normal') === 'urgent' && t.Status !== 'done').length;
  const highTasks = tasks.filter(t => (t.priority || 'normal') === 'high' && t.Status !== 'done').length;

  // Overdue tasks (dueDate < today and not done)
  const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.Status !== 'done').length;

  // Workload per person
  const workloadData = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      const names = (t.Assignee || 'Unassigned').split(',').map(n => n.trim()).filter(Boolean);
      names.forEach(name => {
        if (!map[name]) map[name] = { total: 0, done: 0, inProgress: 0, todo: 0 };
        map[name].total++;
        if (t.Status === 'done') map[name].done++;
        else if (t.Status === 'in-progress') map[name].inProgress++;
        else map[name].todo++;
      });
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [tasks]);

  // Weekly trend (last 7 days tasks created)
  const weeklyTrend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const label = format(subDays(new Date(), i), 'dd');
      const created = tasks.filter(t => {
        if (!t.CreatedAt) return false;
        try {
          return format(new Date(t.CreatedAt), 'yyyy-MM-dd') === d;
        } catch {
          return false;
        }
      }).length;
      const completed = tasks.filter(t => t.dueDate === d && t.Status === 'done').length;
      days.push({ date: d, label, created, completed });
    }
    return days;
  }, [tasks]);
  const maxWeekly = Math.max(...weeklyTrend.map(d => Math.max(d.created, d.completed)), 1);

  if (loading) return <div className="flex-1 flex items-center justify-center text-slate-600 dark:text-slate-400">Loading dashboard...</div>;

  return (
    <div className="space-y-4">
      {/* ═══ Quick Actions ═══ */}
      <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar shrink-0">
        <button onClick={() => openProjectModal && openProjectModal()} className="flex-1 min-w-[120px] flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-soft transition-all active:scale-95 group">
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <FiFolderPlus className="text-xl" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Create Project</span>
        </button>
        <button onClick={() => openTaskModal && openTaskModal()} className="flex-1 min-w-[120px] flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-soft transition-all active:scale-95 group">
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <FiFilePlus className="text-xl" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Create Task</span>
        </button>
        <button onClick={() => alert('กรุณาเลือกพื้นที่ทำงาน (Space) จากเมนูด้านซ้ายก่อน เพื่อทำการเชิญคนเข้าทีม')} className="flex-1 min-w-[120px] flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-soft transition-all active:scale-95 group">
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FiUserPlus className="text-xl" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Invite to Team</span>
        </button>
        <button onClick={() => onNav && onNav('calendar')} className="flex-1 min-w-[120px] flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-soft transition-all active:scale-95 group">
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <FiCalendar className="text-xl" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Schedule</span>
        </button>
        <button onClick={() => openSpaceModal && openSpaceModal()} className="flex-1 min-w-[120px] flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-soft transition-all active:scale-95 group">
          <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-2 group-hover:bg-violet-600 group-hover:text-white transition-colors">
            <FiBriefcase className="text-xl" />
          </div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Create Space</span>
        </button>
      </div>

      {/* ═══ Stats Cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        {/* Total */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FiBarChart2 className="text-indigo-400" />
            <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium">งานทั้งหมด</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalTasks}</div>
        </div>
        {/* Completion */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FiCheckCircle className="text-emerald-400" />
            <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium">เสร็จแล้ว</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{doneTasks}</div>
          <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }}></div>
          </div>
          <div className="text-[10px] md:text-xs text-slate-500 mt-1">{completionRate}%</div>
        </div>
        {/* Overdue */}
        <div className={`border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 ${overdueTasks > 0 ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-white dark:bg-slate-800'}`}>
          <div className="flex items-center gap-2 mb-2">
            <FiAlertCircle className={overdueTasks > 0 ? 'text-rose-500' : 'text-slate-500'} />
            <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium">เกินกำหนด</span>
          </div>
          <div className={`text-2xl font-bold ${overdueTasks > 0 ? 'text-rose-500' : 'text-slate-500'}`}>{overdueTasks}</div>
        </div>
        {/* Urgent */}
        <div className={`border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 ${urgentTasks > 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-white dark:bg-slate-800'}`}>
          <div className="flex items-center gap-2 mb-2">
            <FiClock className={urgentTasks > 0 ? 'text-red-400' : 'text-slate-500'} />
            <span className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium">ด่วน/ด่วนมาก</span>
          </div>
          <div className={`text-2xl font-bold ${urgentTasks > 0 ? 'text-red-400' : 'text-slate-500'}`}>{urgentTasks + highTasks}</div>
        </div>
      </div>
      {/* ═══ Trior Layout Row 1: Tasks & Projects ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 shrink-0">
        {/* Due Today */}
        <div className="xl:col-span-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <FiAlertCircle className="text-rose-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">งานที่ครบกำหนดวันนี้</h3>
          </div>
          {todaysTasks.length > 0 ? (
            <ul className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
              {todaysTasks.map(task => (
                <li key={task.Id} className="group flex items-center justify-between text-slate-700 dark:text-slate-300 text-sm bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-700/50 px-4 py-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></div>
                    <span className="truncate font-medium">{task.Title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-md">
                      DUE TODAY
                    </span>
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-[10px] font-bold" title={task.Assignee}>
                      {(task.Assignee || 'U').charAt(0).toUpperCase()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-slate-500 text-sm flex-1 flex items-center justify-center">ไม่มีงานที่ครบกำหนดวันนี้ ✅</div>
          )}
        </div>

        {/* Active Projects Summary */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <FiCheckCircle className="text-emerald-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">โปรเจ็คที่กำลังดำเนินการ</h3>
          </div>
          {projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
              {projects.slice(0, 4).map(proj => {
                let checklist = [];
                try {
                  checklist = proj.Checklist ? (typeof proj.Checklist === 'string' ? JSON.parse(proj.Checklist) : proj.Checklist) : [];
                } catch (e) {}
                const totalItems = checklist.length;
                const doneItems = checklist.filter(c => c.isDone).length;
                const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
                
                return (
                  <div key={proj.Id} className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 flex flex-col gap-2 transition-all cursor-pointer">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{proj.Title}</span>
                      <span className="text-xs font-mono font-bold text-emerald-500 shrink-0">{progress}%</span>
                    </div>
                    <div className="flex-1 mt-1">
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                       <span>ความคืบหน้า</span>
                       <span>{doneItems}/{totalItems} tasks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-500 text-sm flex-1 flex items-center justify-center">ยังไม่มีโปรเจ็คที่กำลังทำ</div>
          )}
        </div>
      </div>

      {/* ═══ Trior Layout Row 2: Activity & People ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 shrink-0">
        {/* Activity Feed */}
        <div className="xl:col-span-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <FiActivity className="text-indigo-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Recent Activity</h3>
          </div>
          
          {activities.length > 0 ? (
            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
              {activities.slice(0, 15).map(act => (
                <div key={act.Id} className="flex gap-4 group">
                  <div className="mt-0.5 shrink-0 relative">
                    <div className="absolute top-6 bottom-[-20px] left-1/2 -translate-x-1/2 w-px bg-slate-200 dark:bg-slate-700 group-last:hidden"></div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center relative z-10">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div>
                    </div>
                  </div>
                  <div className="pb-4">
                    <p className="text-slate-700 dark:text-slate-300 text-sm">{act.Message}</p>
                    <p className="text-slate-400 text-xs mt-1">{new Date(act.CreatedAt).toLocaleString('th-TH')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 text-sm flex-1 flex items-center justify-center">ยังไม่มีความเคลื่อนไหว</div>
          )}
        </div>

        {/* Collaborators / Workload */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <FiUserCheck className="text-violet-500" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">People</h3>
          </div>
          {workloadData.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar pr-2 flex-1">
              {workloadData.map(([name, data]) => {
                const total = data.total;
                return (
                  <div key={name} className="flex items-center justify-between bg-white dark:bg-slate-900/50 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm text-white font-bold shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-800">
                        {name.substring(0, 1).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm text-slate-800 dark:text-slate-200 font-bold truncate">{name}</span>
                        <span className="text-[11px] text-slate-500 truncate">{data.done} done · {data.inProgress} in progress</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span className="text-sm font-black text-slate-700 dark:text-slate-300 font-mono leading-none">{total}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Tasks</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-500 text-sm flex-1 flex items-center justify-center">ยังไม่มีข้อมูล</div>
          )}
        </div>
      </div>
    </div>
  );
}
