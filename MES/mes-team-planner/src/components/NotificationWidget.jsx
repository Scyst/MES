import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { FiMessageSquare, FiX, FiClock, FiChevronRight } from 'react-icons/fi';
import AddTaskModal from './AddTaskModal';

export default function NotificationWidget({ currentUser, tasks, onSaveTask, onDeleteTask }) {
  const [recentComments, setRecentComments] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Custom AKA for filtering
  const [aka, setAka] = useState(() => localStorage.getItem('mes_planner_aka') || '');
  
  // Last checked time from localStorage or current time
  const [lastChecked, setLastChecked] = useState(() => {
    const saved = localStorage.getItem('mes_planner_last_checked');
    if (saved) return new Date(saved);
    const now = new Date();
    now.setDate(now.getDate() - 1); // Default to 1 day ago
    return now;
  });

  const checkNotifications = async () => {
    if (!currentUser) return;
    try {
      const res = await axios.get('/api/comments.php?action=recent');
      if (res.data && Array.isArray(res.data)) {
        setRecentComments(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    checkNotifications();
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const username = currentUser ? (currentUser.fullname || currentUser.username) : '';

  // 1. Get tasks where current user is involved
  const myTasks = useMemo(() => {
    if (!tasks || (!username && !aka)) return [];
    const searchTerms = [username];
    if (aka.trim()) searchTerms.push(aka.trim());

    return tasks.filter(t => {
      const assignees = (t.Assignee || '').split(',').map(n => n.trim().toLowerCase());
      return searchTerms.some(term => assignees.includes(term.toLowerCase()));
    });
  }, [tasks, username, aka]);

  // 2. Map tasks with their latest comment and unread status
  const chatRooms = useMemo(() => {
    return myTasks.map(task => {
      // Find all comments for this task in recentComments
      const taskComments = recentComments.filter(c => String(c.TaskId) === String(task.Id));
      
      // The first one is the latest (API sorts by CreatedAt DESC)
      const latestComment = taskComments.length > 0 ? taskComments[0] : null;
      
      // Determine if it has unread comments
      const hasUnread = taskComments.some(c => {
        const commentDate = new Date(c.CreatedAt);
        return commentDate > lastChecked && c.Author !== username;
      });

      return {
        ...task,
        latestComment,
        hasUnread
      };
    }).sort((a, b) => {
      // Sort by latest comment date first
      const timeA = a.latestComment ? new Date(a.latestComment.CreatedAt).getTime() : 0;
      const timeB = b.latestComment ? new Date(b.latestComment.CreatedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [myTasks, recentComments, lastChecked, username]);

  // 3. Count total unread badges
  const unreadCount = useMemo(() => {
    let count = 0;
    const searchTerms = [username];
    if (aka.trim()) searchTerms.push(aka.trim());

    recentComments.forEach(c => {
      const commentDate = new Date(c.CreatedAt);
      if (commentDate > lastChecked && c.Author !== username) {
        // Check if task belongs to user
        const assignees = (c.TaskAssignee || '').split(',').map(n => n.trim().toLowerCase());
        if (searchTerms.some(term => assignees.includes(term.toLowerCase()))) {
          count++;
        }
      }
    });
    return count;
  }, [recentComments, lastChecked, username, aka]);

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Mark as read when opening panel
      const now = new Date();
      setLastChecked(now);
      localStorage.setItem('mes_planner_last_checked', now.toISOString());
    }
  };

  const handleRoomClick = (task) => {
    setSelectedTask(task);
    setIsOpen(false);
    const now = new Date();
    setLastChecked(now);
    localStorage.setItem('mes_planner_last_checked', now.toISOString());
  };

  if (!currentUser) return null;

  return (
    <>
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] flex flex-col items-end">
        {/* Chat Rooms Panel */}
        {isOpen ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-80 md:w-96 overflow-hidden animate-slide-up flex flex-col h-[500px] max-h-[70vh]">
            <div className="bg-indigo-600 dark:bg-indigo-700 text-white p-3.5 flex justify-between items-center shrink-0 shadow-sm z-10">
              <h3 className="font-bold flex items-center gap-2">
                <FiMessageSquare className="text-lg" /> ห้องแชทของฉัน
              </h3>
              <button onClick={handleOpen} className="hover:bg-white/20 p-1.5 rounded-lg transition-colors">
                <FiX />
              </button>
            </div>

            {/* AKA Settings Bar */}
            <div className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 shrink-0 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">AKA ของคุณ:</span>
              <input 
                type="text" 
                value={aka} 
                onChange={(e) => {
                  setAka(e.target.value);
                  localStorage.setItem('mes_planner_aka', e.target.value);
                }}
                placeholder="เช่น NPT หรือชื่อเล่น"
                className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-md px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-400"
              />
            </div>
            
            <div className="overflow-y-auto custom-scrollbar flex-1 p-2 bg-slate-50/50 dark:bg-slate-900/50">
              {chatRooms.length > 0 ? (
                <div className="space-y-1.5">
                  {chatRooms.map(room => (
                    <div 
                      key={room.Id} 
                      onClick={() => handleRoomClick(room)}
                      className="group flex flex-col p-3 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl cursor-pointer transition-all border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 dark:hover:border-indigo-700/50 hover:shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-1 flex-1 flex items-center gap-2">
                          {room.hasUnread && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
                          )}
                          {room.Title}
                        </p>
                        {room.latestComment && (
                          <span className="text-[10px] text-slate-400 shrink-0 mt-0.5 whitespace-nowrap">
                            {new Date(room.latestComment.CreatedAt).toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        {room.latestComment ? (
                          <p className={`text-[12px] line-clamp-1 flex-1 ${room.hasUnread ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{room.latestComment.Author}: </span> 
                            {room.latestComment.Message}
                          </p>
                        ) : (
                          <p className="text-[12px] text-slate-400 italic flex-1">
                            ไม่มีข้อความ...
                          </p>
                        )}
                        <FiChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm p-6 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <FiMessageSquare className="text-2xl text-slate-400" />
                  </div>
                  คุณยังไม่มีงานที่รับผิดชอบ
                </div>
              )}
            </div>
          </div>
        ) : (
          <button 
            onClick={handleOpen}
            className="relative w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <FiMessageSquare className="text-2xl" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>
        )}
      </div>

      {/* Task Modal when clicked */}
      {selectedTask && (
        <AddTaskModal 
          isOpen={true}
          onClose={() => setSelectedTask(null)}
          onSave={onSaveTask}
          onDelete={onDeleteTask}
          initialData={selectedTask}
          currentUser={currentUser}
          tasks={tasks}
        />
      )}
    </>
  );
}
