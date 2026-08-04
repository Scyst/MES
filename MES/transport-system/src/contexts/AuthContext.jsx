import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Global MES User (if logged in via main system)
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [passengerProfile, setPassengerProfile] = useState(() => {
    const saved = localStorage.getItem('passengerProfile');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [driverVehicleId, setDriverVehicleId] = useState(() => {
    return localStorage.getItem('driver_vehicle_id') || null;
  });

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
          localStorage.setItem('passengerProfile', JSON.stringify(profile));
        }
      } catch (err) {
        setMe(null);
      } finally {
        setLoadingMe(false);
      }
    };
    checkBackendSession();
  }, []);

  const updatePassengerProfile = (profile) => {
    setPassengerProfile(profile);
    if (profile) {
      localStorage.setItem('passengerProfile', JSON.stringify(profile));
    } else {
      localStorage.removeItem('passengerProfile');
    }
  };

  const loginPassenger = (profileData) => {
    updatePassengerProfile(profileData);
  };

  const logoutPassenger = () => {
    updatePassengerProfile(null);
  };

  const loginDriver = (vehicleId) => {
    setDriverVehicleId(vehicleId);
    localStorage.setItem('driver_vehicle_id', vehicleId);
  };

  const logoutDriver = () => {
    setDriverVehicleId(null);
    localStorage.removeItem('driver_vehicle_id');
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
