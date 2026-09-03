import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Axios interceptor for 401 Unauthorized and 403 Forbidden
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          if (error.response.status === 401) {
            if (window.location.hash !== '#/login') {
              setUser(null);
              navigate('/login');
            }
          } else if (error.response.status === 403) {
            alert(error.response.data?.message || 'Permission Denied: คุณไม่มีสิทธิ์เข้าถึงข้อมูลหรือฟังก์ชันนี้');
            // If they are on a page they shouldn't be, redirect them to home
            if (window.location.hash.includes('/admin/')) {
              navigate('/');
            }
          }
        }
        return Promise.reject(error);
      }
    );
    
    // Ensure credentials are sent with every request
    axios.defaults.withCredentials = true;

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get(`${import.meta.env.BASE_URL}check.php`);
        if (response.data.success) {
          setUser(response.data.user);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${import.meta.env.BASE_URL}login.php`, { username, password });
      if (response.data.success) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await axios.get(`${import.meta.env.BASE_URL}logout.php`);
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
