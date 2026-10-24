import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiLock, FiShield, FiLogIn, FiLayers, FiCheckCircle, FiEye } from 'react-icons/fi';
import { getCurrentUser, fetchRealUserSession, getMesLoginUrl, saveCurrentUser } from '../../data/communityStore';
import { useTheme } from '../../context/ThemeContext';

export default function AuthRequiredGate({ children, featureName = 'ข้อมูลภายในและประวัติสมรรถนะบุคลากร' }) {
  const { isDark } = useTheme();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [checking, setChecking] = useState(() => !getCurrentUser().isLoggedInReal);
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return typeof window !== 'undefined' && (
      window.location.search.includes('preview=1') ||
      sessionStorage.getItem('mes_preview_mode') === '1'
    );
  });

  useEffect(() => {
    let mounted = true;
    fetchRealUserSession()
      .then((user) => {
        if (mounted && user) {
          setCurrentUser(user);
        }
      })
      .finally(() => {
        if (mounted) {
          setChecking(false);
        }
      });

    const handleUserUpdated = (e) => {
      if (mounted && e.detail) {
        setCurrentUser(e.detail);
        setChecking(false);
      }
    };

    window.addEventListener('mes-user-updated', handleUserUpdated);
    return () => {
      mounted = false;
      window.removeEventListener('mes-user-updated', handleUserUpdated);
    };
  }, []);

  const handleEnableDemoMode = () => {
    sessionStorage.setItem('mes_preview_mode', '1');
    const demoUser = {
      id: '1096902163',
      emp_id: '1096902163',
      name: 'ณภัทร นุ่มทอง',
      department: 'ฝ่ายผลิตและวิศวกรรม (Production & PE)',
      role: 'Lead Enterprise Architect & Full Stack Developer',
      isLoggedInReal: true,
      can_view_grading: true,
      exp: 450
    };
    saveCurrentUser(demoUser);
    setCurrentUser(demoUser);
    setIsDemoMode(true);
  };

  if (isDemoMode || (currentUser && currentUser.isLoggedInReal)) {
    return children;
  }

  if (checking) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-2 border-fuchsia-500 border-t-transparent animate-spin mx-auto" />
          <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            กำลังตรวจสอบสิทธิ์การเข้าใช้งานจากระบบหลัก MES...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[78vh] flex items-center justify-center px-4 py-12">
      <div
        className={`w-full max-w-lg mx-auto rounded-2xl border p-6 sm:p-8 shadow-xl transition-all ${
          isDark
            ? 'bg-slate-800/90 border-slate-700 text-slate-100 shadow-slate-950/50'
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-200/80'
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/40 flex items-center justify-center">
            <FiLock className={`w-6 h-6 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              isDark
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            <FiShield className="w-3.5 h-3.5" />
            <span>ต้องยืนยันตัวตนผ่านระบบ MES</span>
          </span>
        </div>

        <h2 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          สงวนสิทธิ์เฉพาะบุคลากรที่เข้าสู่ระบบ
        </h2>
        <p className={`text-sm font-semibold mb-4 ${isDark ? 'text-fuchsia-400' : 'text-fuchsia-700'}`}>
          ส่วนงาน: {featureName}
        </p>

        <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          เพื่อคุ้มครองข้อมูลส่วนบุคคลของพนักงาน (PDPA) ผลการประเมินสมรรถนะ 4 มิติ (4D Grading)
          และองค์ความรู้เทคนิคเฉพาะภายในโรงงาน ระบบจึงกำหนดให้ต้องเข้าสู่ระบบหลัก MES ก่อนเข้าใช้งานในส่วนนี้
        </p>

        <div
          className={`rounded-xl p-4 mb-6 border text-xs space-y-2 ${
            isDark
              ? 'bg-slate-900/70 border-slate-700/80 text-slate-300'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="font-bold flex items-center gap-1.5">
            <FiCheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>สิทธิ์การใช้งานในโหมดผู้เยี่ยมชม (Safe Guest Mode):</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 opacity-90">
            <li>สามารถเข้าอ่านและศึกษาหลักสูตรมาตรฐานทั่วไป (Standard Courses) ได้ทุกบทเรียน</li>
            <li>สามารถทดลองทำแบบทดสอบท้ายบทเรียนเพื่อทบทวนความรู้ได้</li>
            <li>เข้าสู่ระบบ MES เมื่อต้องการบันทึกผลคะแนนสะสม ใบรับรอง และเกรดสมรรถนะจริง</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={getMesLoginUrl()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 shadow-lg shadow-fuchsia-600/20 transition-all"
          >
            <FiLogIn className="w-4 h-4" />
            <span>เข้าสู่ระบบ MES</span>
          </a>

          <button
            type="button"
            onClick={handleEnableDemoMode}
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-all ${
              isDark
                ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-sm'
            }`}
            title="เปิดพรีวิวสำหรับใช้ในการประชุมหรือนำเสนอโดยไม่ต้องเชื่อมต่อระบบล็อกอินหลัก"
          >
            <FiEye className="w-4 h-4 text-amber-400" />
            <span>โหมดนำเสนอ (Demo Mode)</span>
          </button>

          <Link
            to="/"
            className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-all ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
          >
            <FiLayers className="w-4 h-4" />
            <span>อ่านหลักสูตร</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
