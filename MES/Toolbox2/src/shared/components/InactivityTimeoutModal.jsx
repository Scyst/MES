import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, MousePointerClick } from 'lucide-react';

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 ชั่วโมง (3,600,000 ms)
const COUNTDOWN_SECONDS = 30; // นับถอยหลัง 30 วินาที

export default function InactivityTimeoutModal({ onTimeoutLogout, onStayLoggedIn }) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  const inactivityTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const countdownTimeoutRef = useRef(null);
  const showWarningRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
  }, []);

  const triggerTimeoutLogout = useCallback(() => {
    clearAllTimers();
    showWarningRef.current = false;
    setShowWarning(false);
    if (onTimeoutLogout) {
      onTimeoutLogout();
    }
  }, [clearAllTimers, onTimeoutLogout]);

  const startFinalCountdown = useCallback(() => {
    clearAllTimers();
    showWarningRef.current = true;
    setSecondsLeft(COUNTDOWN_SECONDS);
    setShowWarning(true);

    countdownIntervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    countdownTimeoutRef.current = setTimeout(() => {
      triggerTimeoutLogout();
    }, COUNTDOWN_SECONDS * 1000);
  }, [clearAllTimers, triggerTimeoutLogout]);

  const resetInactivityTimer = useCallback((fromButton = false) => {
    // If warning modal is already visible, require explicit click or user interaction to dismiss
    clearAllTimers();
    if (showWarningRef.current) {
      showWarningRef.current = false;
      setShowWarning(false);
      if (fromButton && onStayLoggedIn) {
        onStayLoggedIn();
      }
    }
    inactivityTimerRef.current = setTimeout(startFinalCountdown, INACTIVITY_TIMEOUT);
  }, [clearAllTimers, startFinalCountdown, onStayLoggedIn]);

  useEffect(() => {
    const handleUserActivity = () => {
      // Matches MES/auth/auto_logout.php behavior: any interaction resets the inactivity timer
      resetInactivityTimer(false);
    };

    const events = ['click', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((evt) => {
      document.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Also allow testing via custom event `mes:test-inactivity-warning`
    const handleTestTrigger = () => startFinalCountdown();
    window.addEventListener('mes:test-inactivity-warning', handleTestTrigger);

    resetInactivityTimer(false);

    return () => {
      clearAllTimers();
      events.forEach((evt) => {
        document.removeEventListener(evt, handleUserActivity);
      });
      window.removeEventListener('mes:test-inactivity-warning', handleTestTrigger);
    };
  }, [resetInactivityTimer, startFinalCountdown, clearAllTimers]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-amber-400 dark:border-amber-500/80 shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-amber-50 dark:bg-amber-950/40 px-6 py-4 border-b border-amber-200 dark:border-amber-800/50 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
          <h5 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Session Timeout Warning
          </h5>
        </div>

        <div className="p-6 text-center">
          <p className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
            คุณไม่ได้ใช้งานระบบเป็นระยะเวลาหนึ่ง
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
            ระบบจะทำการออกจากระบบอัตโนมัติในอีก
          </p>
          <div
            id="logout-countdown"
            className="text-6xl font-extrabold text-red-600 dark:text-red-400 mb-2 tabular-nums"
          >
            {secondsLeft}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">วินาที</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/60 px-6 py-4 border-t border-slate-100 dark:border-slate-700/60 flex justify-center">
          <button
            type="button"
            id="stay-logged-in-btn"
            onClick={() => resetInactivityTimer(true)}
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <MousePointerClick className="w-5 h-5" />
            <span>ใช้งานต่อ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
