import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import api from '../api'

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // useCallback keeps these function identities stable across renders
  // so consumers that depend on them (useEffect deps, etc.) don't re-fire.
  const logout = useCallback(() => {
    localStorage.removeItem('token')
    api.invalidateCache?.('/auth/')
    setUser(null)
  }, [])

  const fetchProfile = useCallback(async () => {
    const controller = new AbortController()
    // 5-second timeout — avoids the 30 s axios global timeout causing a
    // long blank screen when the backend is slow or the token is expired.
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await api.get('/auth/profile', { signal: controller.signal, __skipCache: true })
      setUser(res.data.user)
    } catch (err) {
      console.error('Fetch profile error:', err)
      // Remove stale token so we don't loop on next load.
      localStorage.removeItem('token')
      logout()
    } finally {
      clearTimeout(timer)
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchProfile()
    } else {
      setLoading(false)
    }
  }, [fetchProfile])

  const login = useCallback((token, userData) => {
    localStorage.setItem('token', token)
    api.invalidateCache?.('/auth/')
    setUser(userData)
  }, [])

  const updateProfile = useCallback((updatedUser) => {
    setUser(updatedUser)
  }, [])

  // Memoize the context value so children that don't depend on the
  // changing parts of the value don't re-render on every parent update.
  const value = useMemo(
    () => ({ user, loading, login, logout, updateProfile }),
    [user, loading, login, logout, updateProfile]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
