import React, { useMemo, useState, useEffect } from 'react';
import { FiCheckSquare, FiClock, FiAlertCircle, FiCheck, FiPlay, FiMoreHorizontal, FiTarget, FiActivity, FiSearch } from 'react-icons/fi';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export default function MyTasks({ tasks = [], currentUser, refreshData, onSaveTask }) {
  const [filterProject, setFilterProject] = useState('all');
  const [akas, setAkas] = useState([]);
  const [isEditingAka, setIsEditingAka] = useState(false);
  const [akaInput, setAkaInput] = useState('');

  useEffect(() => {
    import('axios').then(axios => {
      axios.default.get('/api/profile.php').then(res => {
        if (res.data && res.data.aka !== undefined) {
          const akaStr = res.data.aka;
          const parsed = akaStr.split(',').map(s => s.trim()).filter(s => s);
          setAkas(parsed);
          setAkaInput(akaStr);
          localStorage.setItem('user_akas', JSON.stringify(parsed)); // Keep legacy format for now if needed by other components
        }
      }).catch(() => {});
    });
  }, []);

  const handleSaveAka = () => {
    const newAkas = akaInput.split(',').map(s => s.trim()).filter(s => s);
    setAkas(newAkas);
    setIsEditingAka(false);
    
    import('axios').then(axios => {
      axios.default.post('/api/profile.php', { aka: newAkas.join(', ') })
        .then(() => {
          localStorage.setItem('user_akas', JSON.stringify(newAkas));
          if(refreshData) refreshData();
        })
        .catch(err => console.error(err));
    });
  };
  const myTasks = useMemo(() => {
    if (!currentUser) return [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    return safeTasks.filter(t => {
      if (!t.Assignee) return false;
      const assignees = t.Assignee.split(',').map(s => s.trim().toLowerCase());
      const meMatches = [
        (currentUser.fullname || '').toLowerCase(),
        (currentUser.username || '').toLowerCase(),
        ...akas.map(a => a.toLowerCase())
      ].filter(s => s);
      
      return meMatches.some(m => assignees.includes(m));
    });
  }, [tasks, currentUser, akas]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Apply project filter
  const filteredTasks = myTasks.filter(t => filterProject === 'all' || t.ProjectName === filterProject);

  const activeTasks = filteredTasks.filter(t => t.Status !== 'Done' && t.Status !== 'done');
  const completedTasksCount = filteredTasks.length - activeTasks.length;
  
  const overdueTasks = [];
  const dueTodayTasks = [];
  const upcomingTasks = [];
  const noDateTasks = [];

  activeTasks.forEach(t => {
    if (!t.DueDate) {
      noDateTasks.push(t);
      return;
    }
    const dueDate = new Date(t.DueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < now) overdueTasks.push(t);
    else if (dueDate.getTime() === now.getTime()) dueTodayTasks.push(t);
    else upcomingTasks.push(t);
  });

  // Sort by priority (Urgent first)
  const sortTasks = (a, b) => {
    if (a.Priority === 'Urgent' && b.Priority !== 'Urgent') return -1;
    if (a.Priority !== 'Urgent' && b.Priority === 'Urgent') return 1;
    return 0;
  };

  overdueTasks.sort(sortTasks);
  dueTodayTasks.sort(sortTasks);
  upcomingTasks.sort(sortTasks);
  noDateTasks.sort(sortTasks);

  const handleStatusChange = (task, newStatus) => {
    if (onSaveTask) {
      onSaveTask({ ...task, status: newStatus, Status: newStatus });
    }
  };

  // Find the single most important task for Focus Mode
  const focusTask = overdueTasks[0] || dueTodayTasks[0] || upcomingTasks[0] || noDateTasks[0];
  
  // Calculate Progress
  const totalTasks = filteredTasks.length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  // Get unique projects for filter
  const uniqueProjects = [...new Set(myTasks.filter(t => t.ProjectName).map(t => t.ProjectName))];

  const handleSaveAka = () => {
    const newAkas = akaInput.split(',').map(s => s.trim()).filter(s => s);
    setAkas(newAkas);
    localStorage.setItem('user_akas', JSON.stringify(newAkas));
    setIsEditingAka(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header & Metrics */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
              <FiActivity className="text-xl" />
            </div>
            My Workspace
          </h2>
          <div className="flex items-center gap-3 mt-2">
            <p className="text-slate-500 text-sm">Manage your heavy workload efficiently</p>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-600"></div>
            {isEditingAka ? (
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={akaInput} 
                  onChange={e => setAkaInput(e.target.value)} 
                  placeholder="e.g. Oat, โอ๊ต (comma separated)"
                  className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none w-48"
                />
                <button onClick={handleSaveAka} className="text-xs bg-indigo-500 text-white px-2 py-1 rounded font-medium hover:bg-indigo-600">Save</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">AKAs:</span>
                <span className="text-indigo-500 dark:text-indigo-400 font-bold">{akas.length > 0 ? akas.join(', ') : 'None'}</span>
                <button onClick={() => setIsEditingAka(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline">Edit</button>
              </div>
            )}
          </div>
        </div>
        
        {/* Productivity Metrics */}
        <div className="flex items-center gap-8">
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Active</p>
            <p className="text-2xl font-black text-slate-700 dark:text-slate-200">{activeTasks.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Completed</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedTasksCount}</p>
          </div>
          <div className="w-16 h-16">
            <CircularProgressbar 
              value={progressPercentage} 
              text={`${progressPercentage}%`} 
              styles={buildStyles({
                pathColor: `rgba(99, 102, 241, ${progressPercentage / 100})`,
                textColor: '#6366f1',
                trailColor: '#f1f5f9',
                textSize: '24px',
              })}
            />
          </div>
        </div>
      </div>

      {/* Focus Mode Panel */}
      {focusTask && (
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 p-1 rounded-3xl shadow-lg">
          <div className="bg-white dark:bg-slate-900 rounded-[22px] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
                  <FiTarget /> Focus Mode
                </span>
                {focusTask.Priority === 'Urgent' && (
                  <span className="bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Urgent
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{focusTask.Title}</h3>
              <p className="text-slate-500 text-sm line-clamp-2 mb-4">{focusTask.Description || 'No description provided.'}</p>
              
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => handleStatusChange(focusTask, 'in-progress')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-500/30 transition-all flex items-center gap-2"
                >
                  <FiPlay /> Start Working
                </button>
                <button 
                  onClick={() => handleStatusChange(focusTask, 'done')}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                >
                  <FiCheck /> Mark as Done
                </button>
              </div>
            </div>
            {/* Optional Focus Timer visual could go here */}
            <div className="hidden md:flex w-32 h-32 rounded-full border-8 border-indigo-50 dark:border-indigo-900/30 items-center justify-center flex-shrink-0 relative">
               <div className="absolute inset-0 rounded-full border-8 border-indigo-500 border-t-transparent animate-spin" style={{animationDuration: '10s'}}></div>
               <FiTarget className="text-4xl text-indigo-500" />
            </div>
          </div>
        </div>
      )}

      {/* Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 custom-scrollbar">
          <button 
            onClick={() => setFilterProject('all')}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filterProject === 'all' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
          >
            All Projects
          </button>
          {uniqueProjects.map(proj => (
            <button 
              key={proj}
              onClick={() => setFilterProject(proj)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${filterProject === proj ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}
            >
              {proj}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <TaskSection 
            title="Overdue" 
            tasks={overdueTasks} 
            colorClass="border-t-4 border-rose-500 bg-rose-50/30 dark:bg-rose-900/10" 
            headerColor="text-rose-600 dark:text-rose-400"
            icon={FiAlertCircle}
            onStatusChange={handleStatusChange}
            onSaveTask={onSaveTask}
          />
          <TaskSection 
            title="Due Today" 
            tasks={dueTodayTasks} 
            colorClass="border-t-4 border-amber-500 bg-amber-50/30 dark:bg-amber-900/10" 
            headerColor="text-amber-600 dark:text-amber-400"
            icon={FiClock}
            onStatusChange={handleStatusChange}
            onSaveTask={onSaveTask}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <TaskSection 
            title="Upcoming" 
            tasks={upcomingTasks} 
            colorClass="border-t-4 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10" 
            headerColor="text-indigo-600 dark:text-indigo-400"
            icon={FiClock}
            onStatusChange={handleStatusChange}
            onSaveTask={onSaveTask}
          />
          <TaskSection 
            title="No Due Date" 
            tasks={noDateTasks} 
            colorClass="border-t-4 border-slate-400 bg-slate-50 dark:bg-slate-800/50" 
            headerColor="text-slate-600 dark:text-slate-400"
            icon={FiCheckSquare}
            onStatusChange={handleStatusChange}
            onSaveTask={onSaveTask}
          />
        </div>
      </div>
    </div>
  );
}

function TaskSection({ title, tasks, colorClass, headerColor, icon: Icon, onStatusChange, onSaveTask }) {
  if (tasks.length === 0) return null;

  return (
    <div className={`rounded-3xl p-5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm ${colorClass}`}>
      <h3 className={`text-sm font-bold flex items-center justify-between mb-4 ${headerColor}`}>
        <span className="flex items-center gap-2 uppercase tracking-wider"><Icon /> {title}</span>
        <span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 rounded-full text-xs text-slate-600 dark:text-slate-300">{tasks.length}</span>
      </h3>
      <div className="space-y-4">
        {tasks.map(task => (
          <HeavyTaskCard key={task.Id} task={task} onStatusChange={onStatusChange} onSaveTask={onSaveTask} />
        ))}
      </div>
    </div>
  );
}

function HeavyTaskCard({ task, onStatusChange, onSaveTask }) {
  const isUrgent = task.Priority === 'Urgent';
  const isInProgress = task.Status === 'In Progress' || task.Status === 'in-progress';
  
  // Parse Checklist
  let checklist = [];
  try {
    if (task.Checklist && typeof task.Checklist === 'string') {
      checklist = JSON.parse(task.Checklist);
    } else if (Array.isArray(task.Checklist)) {
      checklist = task.Checklist;
    }
  } catch (e) {
    console.error("Failed to parse checklist", e);
  }

  const toggleChecklistItem = (itemId) => {
    const updatedChecklist = checklist.map(item => 
      item.id === itemId ? { ...item, isDone: !item.isDone } : item
    );
    if (onSaveTask) {
      onSaveTask({ ...task, Checklist: JSON.stringify(updatedChecklist) });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800/80 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all relative group overflow-hidden">
      {isUrgent && <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>}
      
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {isUrgent && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-100 dark:bg-rose-500/20 dark:text-rose-400 px-2 py-0.5 rounded-full uppercase shrink-0">
                Urgent
              </span>
            )}
            {isInProgress && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full uppercase shrink-0">
                In Progress
              </span>
            )}
            {task.ProjectName && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-500/20 dark:text-indigo-400 px-2 py-0.5 rounded-full truncate max-w-[120px] shrink-0">
                {task.ProjectName}
              </span>
            )}
          </div>
          <h4 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">{task.Title}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">{task.Description || 'No description'}</p>
        </div>
        
        {/* Quick Actions (Hover) */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {!isInProgress && (
            <button 
              onClick={(e) => { e.stopPropagation(); onStatusChange(task, 'in-progress'); }}
              title="Start Task"
              className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center justify-center transition-colors shadow-sm"
            >
              <FiPlay className="text-sm" />
            </button>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onStatusChange(task, 'done'); }}
            title="Complete Task"
            className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center justify-center transition-colors shadow-sm"
          >
            <FiCheck className="text-sm" />
          </button>
        </div>
      </div>
      
      {/* Inline Checklist */}
      {checklist.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/50 space-y-2">
          {checklist.map(item => (
            <label key={item.id} className="flex items-start gap-3 cursor-pointer group/item">
              <div className="relative flex items-center justify-center mt-0.5">
                <input 
                  type="checkbox" 
                  checked={item.isDone} 
                  onChange={() => toggleChecklistItem(item.id)}
                  className="peer appearance-none w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 checked:bg-emerald-500 checked:border-emerald-500 transition-colors cursor-pointer"
                />
                <FiCheck className="absolute text-white text-[10px] opacity-0 peer-checked:opacity-100 pointer-events-none" />
              </div>
              <span className={`text-sm select-none transition-colors ${item.isDone ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-300 group-hover/item:text-slate-900 dark:group-hover/item:text-white'}`}>
                {item.text}
              </span>
            </label>
          ))}
        </div>
      )}
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
          <FiClock className={new Date(task.DueDate) < new Date() ? 'text-rose-500' : ''} /> 
          {task.DueDate ? task.DueDate.substring(0, 10) : 'No Date'}
        </span>
      </div>
    </div>
  );
}
