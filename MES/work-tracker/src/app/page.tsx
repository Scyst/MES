"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Home() {
  const { data: session } = useSession();
  
  // UI States
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("daily");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Data States
  const [tasks, setTasks] = useState<any[]>([]);
  const [githubStats, setGithubStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  
  // Weekly Data States
  const [weeklyTasks, setWeeklyTasks] = useState<any>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchTasks = async (dateStr: string) => {
    setIsLoadingTasks(true);
    try {
      const res = await fetch(`/api/tasks?date=${dateStr}`);
      const data = await res.json();
      if (data.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const fetchGithubStats = async (dateStr: string) => {
    setIsLoadingStats(true);
    try {
      const res = await fetch(`/api/github/stats?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setGithubStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch github stats", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchWeeklyData = async (dateStr: string) => {
    setIsLoadingWeekly(true);
    try {
      const [tasksRes, githubRes] = await Promise.all([
        fetch(`/api/tasks/weekly?date=${dateStr}`),
        fetch(`/api/github/weekly?date=${dateStr}`)
      ]);
      if (tasksRes.ok) setWeeklyTasks(await tasksRes.json());
      if (githubRes.ok) setWeeklyStats(await githubRes.json());
    } catch (err) {
      console.error("Failed to fetch weekly data", err);
    } finally {
      setIsLoadingWeekly(false);
    }
  };

  // Data Fetching logic
  useEffect(() => {
    if (viewMode === "daily") {
      fetchTasks(selectedDate);
      if (session) fetchGithubStats(selectedDate);
    } else {
      fetchWeeklyData(selectedDate);
    }
  }, [selectedDate, session, viewMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;
    
    const startIso = new Date(`${selectedDate}T${startTime}`).toISOString();
    const endIso = new Date(`${selectedDate}T${endTime}`).toISOString();

    try {
      const method = editingId ? "PUT" : "POST";
      const res = await fetch("/api/tasks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, title, description: "", startTime: startIso, endTime: endIso })
      });
      if (res.ok) {
        cancelEdit();
        fetchTasks(selectedDate);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchTasks(selectedDate);
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  const startEdit = (task: any) => {
    setEditingId(task.Id);
    setTitle(task.Title);
    const startLocal = new Date(task.StartTime);
    const endLocal = new Date(task.EndTime);
    setStartTime(startLocal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    setEndTime(endLocal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle("");
    setStartTime("");
    setEndTime("");
  };

  const handleCopyReport = () => {
    if (!weeklyTasks || !weeklyStats) return;
    const report = `📊 *Weekly Report (${weeklyTasks.weekStart} to ${weeklyTasks.weekEnd})*
    
⏱️ *Time Logged*: ${weeklyTasks.totalHours} hours across ${weeklyTasks.tasks.length} tasks
💻 *GitHub Activity*: ${weeklyStats.commits} commits
📈 *Lines of Code*: +${weeklyStats.additions} / -${weeklyStats.deletions}

📂 *Repositories Touched*:
${weeklyStats.repositories.map((r: string) => `- ${r}`).join('\n')}

📝 *Key Tasks Completed*:
${weeklyTasks.tasks.slice(0, 10).map((t: any) => `- ${t.Title}`).join('\n')}
${weeklyTasks.tasks.length > 10 ? `...and ${weeklyTasks.tasks.length - 10} more tasks.` : ''}`;
    
    navigator.clipboard.writeText(report);
    alert("Report copied to clipboard!");
  };

  // Timeline logic
  const timelineStartHour = 0;
  const timelineEndHour = 24;
  const totalHours = timelineEndHour - timelineStartHour;

  const getTaskStyle = (task: any, index: number) => {
    const start = new Date(task.StartTime);
    const end = new Date(task.EndTime);
    const startOffsetHours = start.getHours() + (start.getMinutes() / 60) - timelineStartHour;
    let durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours < 0) durationHours = 1; 

    const leftPercent = Math.max(0, (startOffsetHours / totalHours) * 100);
    const widthPercent = Math.min(100 - leftPercent, (durationHours / totalHours) * 100);
    
    // กำหนดตำแหน่งความสูงให้อยู่นิ่งๆ โดยใช้ index ช่วยกระจายไม่ให้ทับกัน (แทนการสุ่ม)
    const topOffset = 20 + (index % 5) * 45;

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
      top: `${topOffset}px` 
    };
  };

  // Group tasks by day for Weekly Timetable
  const groupedWeeklyTasks: Record<string, any[]> = {};
  if (weeklyTasks?.tasks) {
    weeklyTasks.tasks.forEach((task: any) => {
      const d = new Date(task.StartTime);
      const dayKey = d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
      if (!groupedWeeklyTasks[dayKey]) groupedWeeklyTasks[dayKey] = [];
      groupedWeeklyTasks[dayKey].push(task);
    });
  }

  return (
    <main className="container">
      <header className="header-nav">
        <div>
          <h1 style={{ margin: 0 }}>Work Tracker</h1>
          <p style={{ color: '#a3a8b7', fontSize: '0.875rem' }}>Planning, Tracking & Evaluation Dashboard</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--surface)', padding: '4px', borderRadius: 'var(--radius)', display: 'flex', gap: '4px' }}>
            <button 
              className={`btn ${viewMode === 'daily' ? 'btn-primary' : ''}`}
              onClick={() => setViewMode('daily')}
              style={{ padding: '0.25rem 0.75rem', border: 'none', background: viewMode === 'daily' ? 'var(--primary)' : 'transparent', color: viewMode === 'daily' ? 'white' : '#a3a8b7' }}
            >
              Daily
            </button>
            <button 
              className={`btn ${viewMode === 'weekly' ? 'btn-primary' : ''}`}
              onClick={() => setViewMode('weekly')}
              style={{ padding: '0.25rem 0.75rem', border: 'none', background: viewMode === 'weekly' ? 'var(--primary)' : 'transparent', color: viewMode === 'weekly' ? 'white' : '#a3a8b7' }}
            >
              Weekly
            </button>
          </div>

          <input 
            type="date" 
            className="form-input" 
            style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          
          <div className="user-profile">
            {session ? (
              <>
                {session.user?.image && (
                  <img src={session.user.image} alt="Profile" className="avatar" />
                )}
                <div>
                  <div style={{ fontWeight: 500 }}>{session.user?.name}</div>
                  <button onClick={() => signOut()} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Sign Out</button>
                </div>
              </>
            ) : (
              <button onClick={() => signIn("github")} className="btn btn-primary">Sign In with GitHub</button>
            )}
          </div>
        </div>
      </header>

      {viewMode === "weekly" ? (
        // WEEKLY VIEW
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <h2 style={{ margin: 0 }}>Weekly Executive Report</h2>
                  {isLoadingWeekly && <div className="spinner" title="Updating data..." />}
                </div>
                {weeklyTasks && <p style={{ color: '#a3a8b7' }}>{weeklyTasks.weekStart} to {weeklyTasks.weekEnd}</p>}
              </div>
              <button onClick={handleCopyReport} className="btn btn-primary" disabled={!weeklyTasks}>
                📋 Copy Report to Clipboard
              </button>
            </div>
            
            {weeklyTasks || weeklyStats ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
                  <h3 style={{ color: 'var(--warning)', marginBottom: '1rem' }}>Time Investment</h3>
                  <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{weeklyTasks?.totalHours || 0} <span style={{ fontSize: '1rem', color: '#a3a8b7' }}>Hours</span></div>
                  <div style={{ color: '#a3a8b7' }}>Across {weeklyTasks?.tasks?.length || 0} logged tasks</div>
                </div>
                
                <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
                  <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Code Contributions</h3>
                  <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{weeklyStats?.commits || 0} <span style={{ fontSize: '1rem', color: '#a3a8b7' }}>Commits</span></div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <div style={{ color: 'var(--success)', fontWeight: 500 }}>+{weeklyStats?.additions || 0} additions</div>
                    <div style={{ color: 'var(--danger)', fontWeight: 500 }}>-{weeklyStats?.deletions || 0} deletions</div>
                  </div>
                </div>

                {weeklyStats?.repositories?.length > 0 && (
                  <div style={{ gridColumn: '1 / -1', background: 'var(--background)', padding: '1.5rem', borderRadius: 'var(--radius)' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Repositories Focus</h3>
                    <ul style={{ paddingLeft: '1.5rem', columns: 2 }}>
                      {weeklyStats.repositories.map((repo: string, i: number) => (
                        <li key={i} style={{ marginBottom: '0.5rem' }}>{repo}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#a3a8b7', padding: '2rem' }}>Waiting for data...</p>
            )}
          </div>

          {/* Weekly Timetable */}
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>Weekly Schedule</h3>
            {weeklyTasks?.tasks?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {Object.keys(groupedWeeklyTasks).map(day => (
                  <div key={day} style={{ background: 'var(--background)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ background: 'var(--surface-hover)', padding: '0.75rem 1rem', fontWeight: 'bold', borderBottom: '1px solid var(--border)' }}>
                      📅 {day}
                    </div>
                    <div style={{ padding: '0.5rem' }}>
                      {groupedWeeklyTasks[day].map(task => (
                        <div key={task.Id} style={{ display: 'flex', gap: '1rem', padding: '0.5rem', borderBottom: '1px dashed var(--border)' }}>
                          <div style={{ minWidth: '100px', color: '#a3a8b7', fontSize: '0.875rem' }}>
                            {new Date(task.StartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})} - {new Date(task.EndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                          </div>
                          <div>{task.Title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#a3a8b7' }}>No tasks scheduled for this week.</p>
            )}
          </div>
        </div>
      ) : (
        // DAILY VIEW
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card">
              <h3>{editingId ? "Edit Task" : "Log New Task"}</h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Task Title</label>
                  <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input type="time" className="form-input" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input type="time" className="form-input" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingId ? "Update" : "Log Task"}</button>
                  {editingId && <button type="button" onClick={cancelEdit} className="btn btn-outline">Cancel</button>}
                </div>
              </form>
            </div>

            {session && (
              <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>Daily Code Evaluation</h3>
                  {isLoadingStats && <div className="spinner" title="Loading..." />}
                </div>
                
                {githubStats?.dailyStats ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>+{githubStats.dailyStats.additions}</div>
                        <div style={{ fontSize: '0.75rem', color: '#a3a8b7' }}>Lines Added</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>-{githubStats.dailyStats.deletions}</div>
                        <div style={{ fontSize: '0.75rem', color: '#a3a8b7' }}>Lines Deleted</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '1rem', fontSize: '1rem', fontWeight: 600 }}>
                      {githubStats.dailyStats.commits} Commits
                      {githubStats.dailyStats.isPartialLoc && <span style={{fontSize: '0.75rem', color: 'var(--warning)', marginLeft: '0.5rem'}}>(Sampled top 10)</span>}
                    </div>
                    {githubStats.dailyStats.repositories?.length > 0 && (
                      <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#a3a8b7', marginBottom: '0.25rem' }}>Repositories Touched:</div>
                        <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
                          {githubStats.dailyStats.repositories.map((repo: string, i: number) => <li key={i}>{repo}</li>)}
                        </ul>
                      </div>
                    )}
                    {githubStats.dailyStats.commitLog?.length > 0 && (
                      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#a3a8b7', marginBottom: '0.5rem' }}>Recent Commits:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {githubStats.dailyStats.commitLog.map((c: any, i: number) => (
                            <div key={i} style={{ fontSize: '0.875rem', background: 'var(--background)', padding: '0.5rem', borderRadius: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                <span style={{ fontWeight: 600 }}>{c.repo.split('/')[1]}</span>
                                <span style={{ color: '#a3a8b7', fontSize: '0.75rem' }}>
                                  {new Date(c.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                                </span>
                              </div>
                              <div style={{ color: 'var(--foreground)' }}>
                                {c.message.split('\n')[0]}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ color: '#a3a8b7', marginTop: '1rem' }}>No data available.</p>
                )}
              </div>
            )}

            {session && githubStats && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '0', marginLeft: '-0.5rem', marginRight: '-1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                  {/* Day Labels */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '9px', color: '#a3a8b7', textAlign: 'right', paddingBottom: '2px', userSelect: 'none' }}>
                    <div style={{ height: '11px' }}></div>
                    <div style={{ height: '11px', lineHeight: '11px' }}>Mon</div>
                    <div style={{ height: '11px' }}></div>
                    <div style={{ height: '11px', lineHeight: '11px' }}>Wed</div>
                    <div style={{ height: '11px' }}></div>
                    <div style={{ height: '11px', lineHeight: '11px' }}>Fri</div>
                    <div style={{ height: '11px' }}></div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Month Labels */}
                    <div style={{ display: 'flex', fontSize: '9px', color: '#a3a8b7', marginBottom: '6px', position: 'relative', height: '12px', userSelect: 'none' }}>
                      {githubStats.weeks?.map((week: any, i: number) => {
                        const firstDay = week.contributionDays[0]?.date;
                        if (!firstDay) return null;
                        const d = new Date(firstDay);
                        // Show month if it's the first week of the month
                        if (d.getDate() <= 7) {
                          return <span key={i} style={{ position: 'absolute', left: `${i * 14}px` }}>{d.toLocaleString('default', { month: 'short' })}</span>
                        }
                        return null;
                      })}
                    </div>
                    
                    {/* Graph */}
                    <div className="github-graph-container" style={{ justifyContent: 'flex-start' }}>
                      {githubStats.weeks?.map((week: any, i: number) => (
                        <div key={i} className="github-week">
                          {week.contributionDays.map((day: any, j: number) => {
                            const level = day.contributionCount === 0 ? 0 
                                        : day.contributionCount < 3 ? 1 
                                        : day.contributionCount < 6 ? 2 
                                        : day.contributionCount < 10 ? 3 : 4;
                            return (
                              <div 
                                key={j} 
                                className="github-day" 
                                data-level={level}
                                title={`${day.contributionCount} contributions on ${day.date}`}
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Timeline</h3>
                {isLoadingTasks && <div className="spinner" title="Loading..." />}
              </div>
              <div className="timeline-container">
                <div className="timeline-header" style={{ overflowX: 'auto' }}>
                  {Array.from({ length: totalHours }).map((_, i) => (
                    <div key={i} className="timeline-hour" style={{ minWidth: '40px' }}>{timelineStartHour + i}</div>
                  ))}
                </div>
                <div className="timeline-body" style={{ minWidth: `${totalHours * 40}px` }}>
                  <div className="timeline-grid">
                     {Array.from({ length: totalHours }).map((_, i) => <div key={i} className="timeline-grid-line" />)}
                  </div>
                  {tasks.map((task, idx) => (
                    <div 
                      key={task.Id || idx} className="timeline-task" style={getTaskStyle(task, idx)} onClick={() => startEdit(task)}
                      title={`${task.Title} (${new Date(task.StartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})} - ${new Date(task.EndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})})`}
                    >
                      {task.Title}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Task List ({tasks.length})</h3>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tasks.length === 0 ? <p style={{ color: '#a3a8b7' }}>No tasks for this date.</p> : tasks.map((task) => (
                  <div key={task.Id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--background)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{task.Title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#a3a8b7' }}>
                        {new Date(task.StartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})} - {new Date(task.EndTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => startEdit(task)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Edit</button>
                      <button onClick={() => handleDelete(task.Id)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
