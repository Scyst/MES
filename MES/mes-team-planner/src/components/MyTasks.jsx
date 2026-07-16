import React, { useMemo } from 'react';
import { FiCheckSquare, FiClock, FiAlertCircle } from 'react-icons/fi';

export default function MyTasks({ tasks = [], currentUser, refreshData }) {
  const myTasks = useMemo(() => {
    if (!currentUser) return [];
    return tasks.filter(t => t.Assignee === currentUser.fullname || t.Assignee === currentUser.username);
  }, [tasks, currentUser]);

  const todoTasks = myTasks.filter(t => t.Status === 'To Do');
  const inProgressTasks = myTasks.filter(t => t.Status === 'In Progress');
  const doneTasks = myTasks.filter(t => t.Status === 'Done');

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="text-indigo-500">
            <FiCheckSquare />
          </span> 
          Assigned to me
        </h2>
      </div>

      {myTasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 py-16">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-emerald-500">
            <FiCheckSquare className="text-3xl" />
          </div>
          <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">ไม่มีงานที่มอบหมายให้คุณ</h2>
          <p className="text-sm mt-2 text-slate-500">คุณเคลียร์งานทั้งหมดเรียบร้อยแล้ว!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* To Do */}
          <div className="bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/50 flex flex-col h-full">
            <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center justify-between">
              <span>To Do</span>
              <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{todoTasks.length}</span>
            </h3>
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {todoTasks.map(task => (
                <TaskCard key={task.Id} task={task} />
              ))}
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-800/50 flex flex-col h-full">
            <h3 className="font-bold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center justify-between">
              <span>In Progress</span>
              <span className="text-xs bg-indigo-100 dark:bg-indigo-800 px-2 py-0.5 rounded-full">{inProgressTasks.length}</span>
            </h3>
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {inProgressTasks.map(task => (
                <TaskCard key={task.Id} task={task} />
              ))}
            </div>
          </div>

          {/* Done */}
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-800/50 flex flex-col h-full">
            <h3 className="font-bold text-emerald-700 dark:text-emerald-300 mb-4 flex items-center justify-between">
              <span>Done</span>
              <span className="text-xs bg-emerald-100 dark:bg-emerald-800 px-2 py-0.5 rounded-full">{doneTasks.length}</span>
            </h3>
            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
              {doneTasks.map(task => (
                <TaskCard key={task.Id} task={task} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }) {
  const isUrgent = task.Priority === 'Urgent';
  
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden">
      {isUrgent && <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>}
      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 leading-snug">{task.Title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{task.Description || 'ไม่มีรายละเอียด'}</p>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <FiClock className={task.DueDate && new Date(task.DueDate) < new Date() && task.Status !== 'Done' ? 'text-rose-500' : ''} />
          <span className={task.DueDate && new Date(task.DueDate) < new Date() && task.Status !== 'Done' ? 'text-rose-500 font-bold' : ''}>
            {task.DueDate ? task.DueDate.substring(0, 10) : 'No due date'}
          </span>
        </div>
        
        {isUrgent && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-500/10 px-1.5 py-0.5 rounded uppercase">
            <FiAlertCircle /> Urgent
          </div>
        )}
      </div>
    </div>
  );
}
