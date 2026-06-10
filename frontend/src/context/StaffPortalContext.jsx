import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const StaffPortalContext = createContext();

export function useStaffPortal() {
  return useContext(StaffPortalContext);
}

export function StaffPortalProvider({ children }) {
  const [staffUser, setStaffUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('staffToken');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/portal/me');
        setStaffUser({
          ...res.data.staff,
          mustChangePassword: res.data.staff.mustChangePassword || false,
          profileCompleted: res.data.staff.profileCompleted || false,
        });
      } catch (err) {
        console.error('Staff auth init failed:', err);
        localStorage.removeItem('staffToken');
        setStaffUser(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/portal/login', { email, password });
    localStorage.setItem('staffToken', res.data.token);
    setStaffUser({
      ...res.data.staff,
      mustChangePassword: res.data.mustChangePassword,
      profileCompleted: res.data.staff.profileCompleted || false,
    });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('staffToken');
    setStaffUser(null);
  };

  const value = { staffUser, loading, login, logout, setStaffUser };

  // Always render children — individual routes handle loading states themselves
  // This prevents the entire app from being blocked during staff auth init
  return (
    <StaffPortalContext.Provider value={value}>
      {children}
    </StaffPortalContext.Provider>
  );
}
