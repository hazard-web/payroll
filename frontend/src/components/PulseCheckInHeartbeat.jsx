import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { startCheckInHeartbeat } from '../utils/pulseCheckIn'

/** Keeps check-in heartbeats alive app-wide so sleep/shutdown gaps are excluded. */
export default function PulseCheckInHeartbeat() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.email) return undefined
    return startCheckInHeartbeat(() => user.email)
  }, [user?.email])

  return null
}
