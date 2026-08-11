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

// Decode JWT payload without verification (server verifies on every request).
function decodeJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function StaffPortalProvider({ children }) {
  const [staffUser, setStaffUser] = useState(null);
  const [loading, setLoading] = useState(() => {
    return typeof window !== 'undefined' ? !!localStorage.getItem('staffToken') : false;
  });

  const initAuth = useCallback(async () => {
    const token = localStorage.getItem('staffToken');
    if (!token) {
      setLoading(false);
      return;
    }

    // Decode the JWT payload locally (no network needed).
    // This lets us check expiry instantly and restore a minimal session
    // so PortalProtectedRoute never redirects to /login while the
    // real /portal/me request is still in flight.
    const payload = decodeJwtPayload(token);

    // If the token is already expired locally, clear it and stop.
    if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
      localStorage.removeItem('staffToken');
      setLoading(false);
      return;
    }

    // Use a generous timeout — Atlas cold-start can take 3–8 s.
    // The old 5 s limit was causing spurious logouts on page refresh.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await api.get('/portal/me', { signal: controller.signal, __skipCache: true });
      setStaffUser(normalizeStaff(res.data.staff));
    } catch (err) {
      const status = err?.response?.status;

      if (status === 401 || status === 403) {
        // Server explicitly rejected the token (expired, revoked, wrong audience).
        // This is the ONLY case where we should log the user out on refresh.
        console.warn('[StaffPortal] Token rejected by server — logging out.');
        localStorage.removeItem('staffToken');
        api.invalidateCache?.('/portal/me');
        setStaffUser(null);
      } else {
        // Network error, timeout, or server temporarily down.
        // Keep the token. Restore a minimal session from the JWT payload so
        // the user stays on their current page instead of being kicked to login.
        // The full profile will load automatically on the next successful API call.
        console.warn('[StaffPortal] Server unreachable on refresh — restoring session from token.', err?.message);
        setStaffUser(normalizeStaff({
          id: payload.id,
          mustChangePassword: false,
          profileCompleted: true,
        }));
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = useCallback(async (email, password) => {
    let res;
    try {
      res = await api.post('/portal/login', { email, password });
    } catch (err) {
      // Extract the server-side error message from the axios error response.
      // Without this, callers get the raw axios message like
      // "Request failed with status code 401" instead of the human-readable
      // backend reason (e.g. "Invalid credentials or portal disabled").
      const serverMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Login failed. Please check your credentials.';
      throw new Error(serverMsg);
    }

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
