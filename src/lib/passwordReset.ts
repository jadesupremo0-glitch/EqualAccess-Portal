import { callFunction, type FunctionResult } from './auth'

export type ResetResponse = FunctionResult

export function requestResetCode(kind: 'pwd' | 'admin', identifier: string): Promise<ResetResponse> {
  return callFunction('send-reset-code', { kind, identifier })
}

export function completePasswordReset(
  kind: 'pwd' | 'admin',
  identifier: string,
  code: string,
  newPassword: string,
): Promise<ResetResponse> {
  return callFunction('reset-password', { kind, identifier, code, newPassword })
}
