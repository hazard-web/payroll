/** Pulse org role helpers (mirrors backend pulseAuth). */
export function isPulseAdmin(user) {
  if (!user) return false
  if (user.role == null || user.role === '') return true
  return user.role === 'admin'
}

export function pulseRoleLabel(role) {
  return role === 'admin' ? 'Admin' : 'Member'
}
