import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';

const StaffPortalContext = createContext();

export function useStaffPortal() {
  return useContext(StaffPortalContext);
}

// Helper: normalize the staff object returned by the backend so the rest
// of the app can rely on `mustChangePassword` and `profileCompleted` always
// being defined booleans (not undefined / not null).
const normalizeStaff = (staff, overrides = {}) => ({
  ...staff,
  mustChangePassword: overrides.mustChangePassword ?? staff.mustChangePassword ?? false,
  // Use ?? (not ||) so a real `false` is preserved, not coerced.
  profileCompleted: overrides.profileCompleted ?? staff.profileCompleted ?? false,
});

export function StaffPortalProvider({ children }) {
  const [staffUser, setStaffUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const initAuth = useCallback(async () => {
    const token = localStorage.getItem('staffToken');
    if (!token) {
      setLoading(false);
      return;
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await api.get('/portal/me', { signal: controller.signal, __skipCache: true });
      setStaffUser(normalizeStaff(res.data.staff));
    } catch (err) {
      console.error('Staff auth init failed:', err);
      localStorage.removeItem('staffToken');
      api.invalidateCache?.('/portal/me');
      setStaffUser(null);
    } finally {
      clearTimeout(timer)
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/portal/login', { email, password });
    localStorage.setItem('staffToken', res.data.token);
    api.invalidateCache?.('/portal/');
    // Set basic data immediately so the UI isn't blocked
    setStaffUser(normalizeStaff(res.data.staff, {
      mustChangePassword: res.data.mustChangePassword,
    }));
    // Then fetch the full profile (all saved fields) in the background
    try {
      const fullRes = await api.get('/portal/me', { __skipCache: true });
      setStaffUser(normalizeStaff(fullRes.data.staff, {
        mustChangePassword: res.data.mustChangePassword,
      }));
    } catch (_) {
      // If refresh fails, the basic login data is still usable
    }
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('staffToken');
    api.invalidateCache?.('/portal/');
    setStaffUser(null);
  }, []);

  /**
   * Re-fetch the staff profile from the database and update context.
   * Bypasses the request cache so the server-authoritative copy is always
   * returned, not a stale cached one.
   */
  const refresh = useCallback(async () => {
    const res = await api.get('/portal/me', { __skipCache: true });
    const next = normalizeStaff(res.data.staff);
    setStaffUser(next);
    return next;
  }, []);

  // Memoize the context value so consumers that only read parts of
  // the value don't re-render on unrelated state changes.
  const value = useMemo(
    () => ({ staffUser, loading, login, logout, refresh, setStaffUser }),
    [staffUser, loading, login, logout, refresh]
  );

  // Always render children — individual routes handle loading states themselves
  // This prevents the entire app from being blocked during staff auth init
  return (
    <StaffPortalContext.Provider value={value}>
      {children}
    </StaffPortalContext.Provider>
  );
}
