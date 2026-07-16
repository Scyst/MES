import React, { useMemo, useState, useEffect } from 'react';
import { FiActivity, FiUserCheck, FiAlertCircle, FiCheckCircle, FiClock, FiBarChart2, FiTrendingUp, FiPieChart } from 'react-icons/fi';
import { format, subDays } from 'date-fns';
import axios from 'axios';

export default function Dashboard({ tasks = [], events = [], activities = [], loading }) {
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
      {/* Title */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="text-indigo-400">📊</span> ภาพรวม
        </h2>
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
      {/* ═══ Row: Today's Leaves + Due Today ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        {/* Today's Leaves */}
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FiUserCheck className="text-amber-500" />
            <h3 className="text-sm md:text-base font-bold text-amber-800 dark:text-amber-200">คนลาพักผ่อนวันนี้ ({peopleOnLeaveCount})</h3>
          </div>
          {todaysLeaves.length > 0 ? (
            <ul className="space-y-2">
              {todaysLeaves.map(leave => (
                <li key={leave.Id} className="text-amber-800 dark:text-amber-200 text-xs md:text-sm bg-amber-100 dark:bg-amber-900/30 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700/40">
                  {leave.Assignee} — {leave.Title}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-amber-600 dark:text-amber-400/50 text-xs md:text-sm">วันนี้ไม่มีใครลา 🎉</div>
          )}
        </div>

        {/* Due Today */}
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <FiAlertCircle className="text-rose-500" />
            <h3 className="text-sm md:text-base font-bold text-rose-800 dark:text-rose-200">งานที่ครบกำหนดวันนี้</h3>
          </div>
          {todaysTasks.length > 0 ? (
            <ul className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {todaysTasks.map(task => (
                <li key={task.Id} className="text-rose-800 dark:text-rose-200 text-xs md:text-sm bg-rose-100 dark:bg-rose-900/30 px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-700/40 flex justify-between">
                  <span className="truncate">{task.Title}</span>
                  <span className="text-rose-600 dark:text-rose-400 text-[10px] md:text-xs shrink-0 ml-2">({task.Assignee})</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-rose-600 dark:text-rose-400/50 text-xs md:text-sm">ไม่มีงานที่ครบกำหนดวันนี้ ✅</div>
          )}
        </div>
      </div>


      {/* ═══ Row: Status Breakdown + Weekly Trend ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        
        {/* Status Distribution */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4">
          <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <FiPieChart className="text-indigo-500" /> สถานะงาน
          </h3>
          {totalTasks > 0 ? (
            <>
              {/* Visual bar */}
              <div className="flex h-4 rounded-full overflow-hidden mb-4 gap-0.5">
                {doneTasks > 0 && <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(doneTasks/totalTasks)*100}%` }}></div>}
                {inProgressTasks > 0 && <div className="bg-amber-500 transition-all duration-500" style={{ width: `${(inProgressTasks/totalTasks)*100}%` }}></div>}
                {todoTasks > 0 && <div className="bg-slate-500 transition-all duration-500" style={{ width: `${(todoTasks/totalTasks)*100}%` }}></div>}
              </div>
              {/* Legend */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500"></div><span className="text-xs md:text-sm text-slate-700 dark:text-slate-300">Done</span></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{doneTasks} ({Math.round((doneTasks/totalTasks)*100)}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500"></div><span className="text-xs text-slate-700 dark:text-slate-300">In Progress</span></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{inProgressTasks} ({Math.round((inProgressTasks/totalTasks)*100)}%)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-500"></div><span className="text-xs text-slate-700 dark:text-slate-300">To Do</span></div>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{todoTasks} ({Math.round((todoTasks/totalTasks)*100)}%)</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-500 py-4 text-center">ยังไม่มีข้อมูล</div>
          )}
        </div>

        {/* Weekly Trend */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4">
          <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <FiTrendingUp className="text-cyan-500" /> แนวโน้ม 7 วัน
          </h3>
          <div className="flex items-end gap-1.5 h-32">
            {weeklyTrend.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <div className="flex-1 flex items-end gap-0.5 w-full">
                  <div className="flex-1 bg-indigo-500/30 dark:bg-indigo-500/60 rounded-t transition-all duration-300 min-h-[2px]" style={{ height: `${(day.created/maxWeekly)*100}%` }} title={`สร้าง: ${day.created}`}></div>
                  <div className="flex-1 bg-emerald-500/60 rounded-t transition-all duration-300 min-h-[2px]" style={{ height: `${(day.completed/maxWeekly)*100}%` }} title={`เสร็จ: ${day.completed}`}></div>
                </div>
                <span className="text-[10px] md:text-xs text-slate-500 font-mono">{day.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-indigo-500/30 dark:bg-indigo-500/60"></div><span className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400">สร้าง</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500/60"></div><span className="text-[10px] md:text-xs text-slate-600 dark:text-slate-400">เสร็จ</span></div>
          </div>
        </div>
      </div>

      {/* ═══ Active Projects Summary ═══ */}
      {projects.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 shrink-0">
          <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <FiCheckCircle className="text-emerald-500" /> โปรเจ็คที่กำลังดำเนินการ
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {projects.map(proj => {
              let checklist = [];
              try {
                checklist = proj.Checklist ? (typeof proj.Checklist === 'string' ? JSON.parse(proj.Checklist) : proj.Checklist) : [];
              } catch (e) {}
              const totalItems = checklist.length;
              const doneItems = checklist.filter(c => c.isDone).length;
              const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
              
              return (
                <div key={proj.Id} className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-transparent flex flex-col gap-2 transition-all hover:shadow-soft-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{proj.Title}</span>
                    <span className="text-xs font-mono font-bold text-emerald-500 shrink-0">{progress}%</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                     <span>ความคืบหน้า Checklist</span>
                     <span>{doneItems} / {totalItems}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Workload Per Person ═══ */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm rounded-2xl p-4 shrink-0">
        <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
          <FiUserCheck className="text-violet-500" /> Workload แต่ละคน
        </h3>
        {workloadData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {workloadData.map(([name, data]) => {
              const maxLoad = Math.max(...workloadData.map(d => d[1].total), 1);
              return (
                <div key={name} className="flex flex-col gap-2.5 bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-transparent hover:shadow-soft-lg transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs text-white font-bold shrink-0 shadow-sm">
                        {name.substring(0, 1).toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-800 dark:text-slate-200 font-bold truncate">{name}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono leading-none">{data.total}</span>
                      <span className="text-[9px] text-slate-500 mt-0.5">งานทั้งหมด</span>
                    </div>
                  </div>
                  
                  <div className="mt-1">
                    <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-200/60 dark:bg-slate-700/60 gap-[1px] w-full">
                      {data.done > 0 && <div className="bg-emerald-500 hover:brightness-110 transition-all" style={{ width: `${(data.done/data.total)*100}%` }} title={`เสร็จ: ${data.done}`}></div>}
                      {data.inProgress > 0 && <div className="bg-amber-500 hover:brightness-110 transition-all" style={{ width: `${(data.inProgress/data.total)*100}%` }} title={`กำลังทำ: ${data.inProgress}`}></div>}
                      {data.todo > 0 && <div className="bg-slate-400 dark:bg-slate-500 hover:brightness-110 transition-all" style={{ width: `${(data.todo/data.total)*100}%` }} title={`รอดำเนินการ: ${data.todo}`}></div>}
                    </div>
                    <div className="flex justify-between mt-2 px-0.5">
                       <span className="text-[10px] text-slate-500"><span className="text-emerald-500 font-bold">{data.done}</span> เสร็จ</span>
                       <span className="text-[10px] text-slate-500"><span className="text-amber-500 font-bold">{data.inProgress}</span> กำลังทำ</span>
                       <span className="text-[10px] text-slate-500"><span className="text-slate-500 font-bold">{data.todo}</span> รอทำ</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-slate-500 py-4 text-center">ยังไม่มีข้อมูล</div>
        )}
      </div>


      {/* ═══ Activity Feed ═══ */}
      <div className="bg-slate-100/40 dark:bg-slate-800/40 border border-slate-300/60 dark:border-slate-700/60 rounded-xl p-4 shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <FiActivity className="text-indigo-400" />
          <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-200">ความเคลื่อนไหวล่าสุด</h3>
        </div>
        
        {activities.length > 0 ? (
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
            {activities.slice(0, 20).map(act => (
              <div key={act.Id} className="flex gap-3">
                <div className="mt-1.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-500/20"></div>
                </div>
                <div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs md:text-sm leading-relaxed">{act.Message}</p>
                  <p className="text-slate-600 text-[10px] md:text-xs mt-0.5">{new Date(act.CreatedAt).toLocaleString('th-TH')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-500 text-xs">ยังไม่มีความเคลื่อนไหว</div>
        )}
      </div>
    </div>
  );
}
