import { createContext, useContext } from 'react'

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
