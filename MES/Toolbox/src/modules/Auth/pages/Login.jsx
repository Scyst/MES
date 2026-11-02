import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { LogIn, AlertCircle, UserPlus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import RegisterModal from '../components/RegisterModal';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const { user, login, checkAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state?.from?.pathname
      ? location.state.from.pathname +
      (location.state.from.search || '') +
      (location.state.from.hash || '')
      : null) || '/';

  // Redirect automatically when `user` becomes authenticated (including via Cross-Tab Login Sync)
  useEffect(() => {
    if (user) {
      navigate(from === '/login' ? '/' : from, { replace: true });
    }
  }, [user, navigate, from]);

  // Also re-verify session if user switches back to this login tab after logging in elsewhere
  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible' && checkAuth) {
        checkAuth({ silent: true });
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);
    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [checkAuth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);
    if (result.success) {
      navigate(from === '/login' ? '/' : from, { replace: true });
    } else {
      setError(result.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200/80 dark:border-slate-800">
        {/* Header Section */}
        <div className="bg-slate-900 p-8 text-center text-white">
          <img
            src={`${import.meta.env.BASE_URL}assets/logo.webp`}
            alt="SNC Logo"
            className="h-12 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold tracking-tight">TOOLBOX OS</h1>
          <p className="text-slate-400 text-sm mt-1">
            บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน)
          </p>
        </div>

        {/* Form Section */}
        <div className="p-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 p-4 rounded-lg mb-6 flex items-start gap-3 text-sm">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="กรอกชื่อผู้ใช้งาน"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                รหัสผ่าน (Password)
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="กรอกรหัสผ่าน"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>

          {/* Registration Section */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-center space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ยังไม่มีบัญชีผู้ใช้งาน หรือเป็นผู้เข้าอบรมคลาสเรียน?
            </p>
            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:border-blue-400"
            >
              <UserPlus size={16} className="text-blue-600 dark:text-blue-400" />
              <span>ลงทะเบียนบัญชีใหม่ / สมาชิกเข้าอบรม</span>
            </button>
          </div>
        </div>
      </div>

      {/* Register Modal */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onRegisterSuccess={(newUsername) => {
          if (newUsername) setUsername(newUsername);
        }}
      />
    </div>
  );
}
