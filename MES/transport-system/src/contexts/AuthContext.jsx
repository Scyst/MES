import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Global MES User (if logged in via main system)
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [passengerProfile, setPassengerProfile] = useState(null);
  
  const [driverVehicleId, setDriverVehicleId] = useState(null);

  // Fetch me.php in background just for session keep-alive, but don't overwrite if local exists
  useEffect(() => {
    const checkBackendSession = async () => {
      try {
        const me = await authAPI.getMe();
        setMe(me);
        // If we have a backend session but no local profile, we can auto-fill some things
        if (me && me.username && !passengerProfile) {
          const profile = { empId: me.username, name: me.username, department: '' };
          setPassengerProfile(profile);
        }
      } catch (err) {
        setMe(null);
      } finally {
        setLoadingMe(false);
      }
    };
    checkBackendSession();
  }, []);

  const loginPassenger = async (profileData) => {
    try {
      const res = await authAPI.loginPassenger(profileData);
      setPassengerProfile(res);
      return { success: true };
    } catch (err) {
      console.error("Login failed", err);
      // Fallback for demo/offline logic if backend fails
      setPassengerProfile(profileData);
      return { success: false, message: err.message };
    }
  };

  const logoutPassenger = async () => {
    try {
      await authAPI.logoutPassenger();
    } catch (e) {
      console.error(e);
    } finally {
      setPassengerProfile(null);
    }
  };

  const loginDriver = (vehicleId) => {
    setDriverVehicleId(vehicleId);
  };

  const logoutDriver = () => {
    setDriverVehicleId(null);
  };

  return (
    <AuthContext.Provider value={{
      me, 
      loadingMe,
      
      passengerProfile,
      loginPassenger,
      logoutPassenger,
      
      driverVehicleId,
      loginDriver,
      logoutDriver
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
