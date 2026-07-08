import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { FiBell, FiX } from 'react-icons/fi';

export default function NotificationManager() {
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [urgentModals, setUrgentModals] = useState([]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Fetch tasks every 30 seconds to keep data fresh for notifications
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await axios.get('/api/tasks');
        setTasks(res.data);
      } catch (err) {
        console.error('Failed to fetch tasks for notifications', err);
      }
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  const playChime = (level) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (level === 'urgent') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      console.error('Audio playback failed', e);
    }
  };

  // Check times every 15 seconds
  useEffect(() => {
    const checkUpcomingTasks = () => {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const currentDateStr = format(now, 'yyyy-MM-dd');

      const todaysTasks = tasks.filter(t => {
        if (!t.startDate || !t.dueDate || t.Status === 'done') return false;
        return t.startDate <= currentDateStr && t.dueDate >= currentDateStr;
      });

      const notifiedStore = JSON.parse(localStorage.getItem('notifiedTasks') || '{}');
      let changed = false;

      todaysTasks.forEach(task => {
        if (!task.startTime) return;
        
        const [h, m] = task.startTime.split(':').map(Number);
        const startMins = h * 60 + (m || 0);

        const diff = startMins - currentMins;

        // If task starts in exactly 0 to 15 minutes
        if (diff >= 0 && diff <= 15) {
          const level = diff <= 5 ? 'urgent' : 'warning';
          const notifKey = `${task.Id}_${currentDateStr}_${level}`;
          
          if (!notifiedStore[notifKey]) {
            // Trigger Notification
            notifiedStore[notifKey] = true;
            changed = true;

            const title = level === 'urgent' ? 'ด่วน! งานกำลังจะเริ่ม' : 'เตรียมตัว! งานใกล้จะเริ่ม';
            const message = `งาน "${task.Title}" ของ ${task.Assignee} จะเริ่มในอีก ${diff} นาที! (${task.startTime})`;

            const newNotif = {
              id: Date.now() + Math.random(),
              title: title,
              message: message,
              level: level
            };

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(title, { body: message });
            }

            if (level === 'urgent') {
              setUrgentModals(prev => [...prev, newNotif]);
            } else {
              setNotifications(prev => [...prev, newNotif]);
              setTimeout(() => {
                setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
              }, 10000);
            }
            
            playChime(level);
          }
        }
      });

      if (changed) {
        localStorage.setItem('notifiedTasks', JSON.stringify(notifiedStore));
      }
    };

    const interval = setInterval(checkUpcomingTasks, 15 * 1000);
    // Run once immediately on load
    if (tasks.length > 0) {
      checkUpcomingTasks();
    }
    return () => clearInterval(interval);
  }, [tasks]);

  const dismiss = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <>
      {/* Toast Notifications for Warnings */}
      {notifications.length > 0 && (
        <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              className="bg-slate-800 border-l-4 border-amber-500 text-white p-4 rounded-lg shadow-2xl shadow-amber-900/20 max-w-sm flex items-start gap-4 animate-bounce-short"
            >
              <div className="p-2 rounded-full shrink-0 bg-amber-500/20 text-amber-400">
                <FiBell className="text-lg" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm mb-1 text-amber-400">{notif.title}</h4>
                <p className="text-slate-300 text-xs leading-relaxed">{notif.message}</p>
              </div>
              <button onClick={() => dismiss(notif.id)} className="text-slate-400 hover:text-white shrink-0 p-1">
                <FiX />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Full Screen Modal for Urgent Alerts */}
      {urgentModals.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex flex-col gap-4 max-w-md w-full">
            {urgentModals.map(notif => (
              <div key={notif.id} className="bg-slate-900 border border-rose-500/50 rounded-2xl shadow-2xl overflow-hidden animate-bounce-short">
                <div className="bg-rose-500/10 p-6 flex flex-col items-center text-center relative">
                  <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500 mb-4 animate-pulse">
                    <FiBell className="text-3xl" />
                  </div>
                  <h2 className="text-2xl font-bold text-rose-400 mb-3">{notif.title}</h2>
                  <p className="text-slate-200 text-lg">{notif.message}</p>
                  
                  <button 
                    onClick={() => setUrgentModals(prev => prev.filter(n => n.id !== notif.id))}
                    className="mt-8 w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-rose-900/50"
                  >
                    รับทราบ (Acknowledge)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
