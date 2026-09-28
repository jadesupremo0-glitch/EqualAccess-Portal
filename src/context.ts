import { createContext, useContext } from 'react'
import { useStore } from './store'
import type { AdminUser, PWDUser } from './data'

export interface LoggedInPWD {
  type: 'pwd'
  userId: string
}

export interface LoggedInAdmin {
  type: 'admin'
  adminId: string
  role: string
}

export type AppSession = LoggedInPWD | LoggedInAdmin | null

export const SessionContext = createContext<AppSession>(null)
export const useSession = () => useContext(SessionContext)
export const usePWDSession = () => {
  const s = useContext(SessionContext)
  return s?.type === 'pwd' ? s : null
}
export const useAdminSession = () => {
  const s = useContext(SessionContext)
  return s?.type === 'admin' ? s : null
}

/**
 * The signed-in PWD's own record. App only renders PWD pages while this record exists and is
 * active, so pages never fall back to someone else's data.
 */
export function useCurrentPWD(): PWDUser {
  const session = usePWDSession()
  const { pwdUsers } = useStore()
  const user = session ? pwdUsers.find((u) => u.id === session.userId) : undefined
  if (!user) throw new Error('useCurrentPWD() used outside a signed-in PWD session')
  return user
}

/** The signed-in admin's record (same guarantee as useCurrentPWD, for admin pages). */
export function useCurrentAdmin(): AdminUser {
  const session = useAdminSession()
  const { adminUsers } = useStore()
  const admin = session ? adminUsers.find((a) => a.id === session.adminId) : undefined
  if (!admin) throw new Error('useCurrentAdmin() used outside a signed-in admin session')
  return admin
}
