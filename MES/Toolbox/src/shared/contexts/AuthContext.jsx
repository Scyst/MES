import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import InactivityTimeoutModal from '../components/InactivityTimeoutModal';

const AuthContext = createContext(null);

const AUTH_CHANNEL_NAME = 'mes_auth_channel';
const HEARTBEAT_INTERVAL_MS = 45000; // 45 วินาที (เหมือน appCore.js ของระบบหลัก)

const CLIENT_STORAGE_KEYS_TO_CLEAR = [
  'pdTableFilters',
  'inventoryUIFilters',
  'sidebarState',
  'mes_learning_current_user',
  'mes_learning_user_grading',
  'mes_learning_active_emp_id',
];

function clearClientAuthStorage() {
  try {
    CLIENT_STORAGE_KEYS_TO_CLEAR.forEach((key) => localStorage.removeItem(key));
  } catch (e) {
    // Ignore storage errors
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const userRef = useRef(null);
  const locationRef = useRef(location);
  const isLoggingOutRef = useRef(false);
  const authChannelRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  const applyCsrfToken = useCallback((token) => {
    if (token) {
      axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
      window.csrf_token = token;
    }
  }, []);

  const broadcastAuthEvent = useCallback((type) => {
    const ts = Date.now();
    try {
      const storageKey = type === 'LOGOUT' ? 'mes_auth_logout_ts' : 'mes_auth_login_ts';
      localStorage.setItem(storageKey, String(ts));
    } catch (e) {
      // Ignore storage quota/privacy errors
    }
    try {
      if (authChannelRef.current) {
        authChannelRef.current.postMessage({ type, ts });
      } else if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel(AUTH_CHANNEL_NAME);
        ch.postMessage({ type, ts });
        ch.close();
      }
    } catch (e) {
      // Ignore BroadcastChannel errors
    }
  }, []);

  // Force local tab into logged-out state and redirect to /login
  const performLocalLogoutRedirect = useCallback((shouldBroadcast = false) => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    clearClientAuthStorage();
    if (shouldBroadcast) {
      broadcastAuthEvent('LOGOUT');
    }

    delete axios.defaults.headers.common['X-CSRF-TOKEN'];
    window.csrf_token = null;
    userRef.current = null;
    setUser(null);

    const currentLoc = locationRef.current;
    if (currentLoc?.pathname !== '/login' && window.location.hash !== '#/login') {
      navigate('/login', { state: { from: currentLoc }, replace: true });
    }

    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 500);
  }, [broadcastAuthEvent, navigate]);

  // Check session with backend (`check.php`)
  const checkAuth = useCallback(async ({ silent = false } = {}) => {
    try {
      const url = `${import.meta.env.BASE_URL}check.php?${silent ? 'silent=1&' : ''}_t=${Date.now()}`;
      const response = await axios.get(url, {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });

      if (response.data && response.data.success && response.data.user) {
        userRef.current = response.data.user;
        setUser(response.data.user);
        applyCsrfToken(response.data.csrf_token);
        return true;
      } else {
        if (userRef.current) {
          // Session expired on server while tab was open -> kick all tabs out
          performLocalLogoutRedirect(true);
        } else {
          setUser(null);
        }
        return false;
      }
    } catch (error) {
      if (error.response?.status === 401) {
        if (userRef.current) {
          performLocalLogoutRedirect(true);
        } else {
          setUser(null);
        }
      } else if (!silent) {
        setUser(null);
      }
      return false;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [applyCsrfToken, performLocalLogoutRedirect]);

  // 1. Initial Auth Check on mount
  useEffect(() => {
    axios.defaults.withCredentials = true;
    checkAuth({ silent: false });
  }, [checkAuth]);

  // 2. Axios & Global Fetch Interceptors for 401 Unauthorized and 403 Forbidden
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => {
        // Detect if PHP redirected an AJAX call to login_form.php
        const responseUrl = response?.request?.responseURL || '';
        if (responseUrl.includes('login_form.php')) {
          performLocalLogoutRedirect(true);
          return Promise.reject(new Error('Session expired'));
        }
        return response;
      },
      (error) => {
        if (error.response) {
          const reqUrl = error.config?.url || '';
          const isCheckEndpoint = reqUrl.includes('check.php') || reqUrl.includes('login.php');
          if (error.response.status === 401 && !isCheckEndpoint) {
            performLocalLogoutRedirect(true);
          } else if (error.response.status === 403) {
            alert(
              error.response.data?.message ||
                'Permission Denied: คุณไม่มีสิทธิ์เข้าถึงข้อมูลหรือฟังก์ชันนี้'
            );
            if (window.location.hash.includes('/admin/')) {
              navigate('/');
            }
          }
        }
        return Promise.reject(error);
      }
    );

    // Also wrap window.fetch to catch 401 or redirects to login_form.php (matching appCore.js)
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      const reqUrl = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      const isAuthCheck = reqUrl.includes('check.php') || reqUrl.includes('login.php');
      if (!isAuthCheck) {
        if (
          response.status === 401 ||
          (response.redirected && response.url && response.url.includes('login_form.php'))
        ) {
          performLocalLogoutRedirect(true);
        }
      }
      return response;
    };

    return () => {
      axios.interceptors.response.eject(interceptor);
      window.fetch = originalFetch;
    };
  }, [navigate, performLocalLogoutRedirect]);

  // 3. Cross-Tab Sync via BroadcastChannel('mes_auth_channel') & localStorage 'storage' event
  useEffect(() => {
    let channel = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
        authChannelRef.current = channel;
        channel.onmessage = (event) => {
          if (!event.data) return;
          if (event.data.type === 'LOGOUT') {
            performLocalLogoutRedirect(false);
          } else if (event.data.type === 'LOGIN') {
            // Another tab logged in -> re-fetch user session immediately
            checkAuth({ silent: true });
          }
        };
      } catch (e) {
        // Ignore BroadcastChannel init error
      }
    }

    const handleStorageEvent = (event) => {
      if (event.key === 'mes_auth_logout_ts' && event.newValue) {
        performLocalLogoutRedirect(false);
      } else if (event.key === 'mes_auth_login_ts' && event.newValue) {
        checkAuth({ silent: true });
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    // Also expose global helper for testing or legacy bridge
    window.__mesAuthSync = {
      triggerLogoutSync: () => performLocalLogoutRedirect(true),
      triggerLoginSync: () => checkAuth({ silent: true }),
    };

    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      if (channel) {
        try {
          channel.close();
        } catch (e) {
          // Ignore
        }
      }
      authChannelRef.current = null;
    };
  }, [checkAuth, performLocalLogoutRedirect]);

  // 4. Live Session Heartbeat (every 45s while visible) + Focus / Visibility / BFCache Guards
  useEffect(() => {
    const verifyIfLoggedIn = () => {
      if (userRef.current && !isLoggingOutRef.current) {
        checkAuth({ silent: true });
      }
    };

    const handlePageShow = (event) => {
      if (event.persisted) {
        verifyIfLoggedIn();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifyIfLoggedIn();
      }
    };

    const handleWindowFocus = () => {
      verifyIfLoggedIn();
    };

    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && userRef.current && !isLoggingOutRef.current) {
        checkAuth({ silent: true });
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(intervalId);
    };
  }, [checkAuth]);

  // 5. Login Action (with Cross-Tab LOGIN Broadcast)
  const login = useCallback(
    async (username, password) => {
      try {
        const response = await axios.post(`${import.meta.env.BASE_URL}login.php`, {
          username,
          password,
        });
        if (response.data && response.data.success) {
          userRef.current = response.data.user;
          setUser(response.data.user);
          applyCsrfToken(response.data.csrf_token);
          broadcastAuthEvent('LOGIN');
          return { success: true };
        }
        return { success: false, message: response.data?.message || 'เข้าสู่ระบบไม่สำเร็จ' };
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ',
        };
      }
    },
    [applyCsrfToken, broadcastAuthEvent]
  );

  // 6. Logout Action (with Cross-Tab LOGOUT Broadcast & SYSTEM_LOGS audit)
  const logout = useCallback(async () => {
    clearClientAuthStorage();
    broadcastAuthEvent('LOGOUT');
    try {
      await axios.get(`${import.meta.env.BASE_URL}logout.php?_t=${Date.now()}`);
    } catch (e) {
      console.error('Logout error:', e);
    }
    performLocalLogoutRedirect(false);
  }, [broadcastAuthEvent, performLocalLogoutRedirect]);

  // 7. RBAC Helper Functions (matching MES/auth/check_auth.php)
  const hasRole = useCallback(
    (allowedRoles) => {
      if (!user || !user.role) return false;
      if (user.role === 'creator') return true;
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      return roles.includes(user.role);
    },
    [user]
  );

  const hasPermission = useCallback(
    (permissionKey) => {
      if (!user) return false;
      if (user.role === 'creator') return true;
      const perms = Array.isArray(user.permissions) ? user.permissions : [];
      return perms.includes(permissionKey);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        checkAuth,
        hasRole,
        hasPermission,
      }}
    >
      {!loading && children}
      {!loading && user && (
        <InactivityTimeoutModal
          onTimeoutLogout={logout}
          onStayLoggedIn={() => checkAuth({ silent: true })}
        />
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
