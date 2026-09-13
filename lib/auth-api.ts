import { apiRequest } from './api'
import type { AuthUser, OrgMembership } from './types'

// 'phone' is SMS — the name predates WhatsApp, and 'whatsapp' is the same
// phone identity delivered over the other transport (the backend keys both
// on the same E.164 number). Never an identity choice, only a delivery one.
export type OtpTarget =
  | { method: 'phone'; phone: string; countryCode: '91' | '880' }
  | { method: 'whatsapp'; phone: string; countryCode: '91' | '880' }
  | { method: 'email'; email: string }

export function requestOtp(target: OtpTarget) {
  return apiRequest<{ success: boolean; via?: string }>('/api/auth/send-otp', {
    method: 'POST',
    body: target,
  })
}

export interface OtpTransports {
  smsAvailable: boolean
  whatsappAvailable: boolean
}

export function fetchOtpTransports() {
  return apiRequest<{ data: OtpTransports }>('/api/auth/otp-transports', { skipOrgHeader: true })
}

export interface VerifyOtpResult {
  success: boolean
  isNewUser: boolean
  user: { id: string; nameBn: string; roles: AuthUser['roles'] }
  accessToken?: string
  refreshToken?: string
}

export function verifyOtp(target: OtpTarget & { otp: string }) {
  return apiRequest<VerifyOtpResult>('/api/auth/verify-otp', {
    method: 'POST',
    body: target,
  })
}

// Password login is the peer of the OTP flow — phone/email stay PEER
// identifiers, the caller just proves control with a password instead of a
// fresh code. Mirrors the website's PasswordLoginForm / /api/auth/login.
export type PasswordLoginTarget =
  | { method: 'phone'; phone: string; countryCode: '91' | '880'; password: string }
  | { method: 'email'; email: string; password: string }

export interface PasswordLoginResult {
  success: boolean
  user: { id: string; nameBn: string; roles: AuthUser['roles'] }
  accessToken?: string
  refreshToken?: string
}

export function loginWithPassword(target: PasswordLoginTarget) {
  return apiRequest<PasswordLoginResult>('/api/auth/login', {
    method: 'POST',
    body: target,
  })
}

export type ForgotPasswordTarget =
  | { method: 'phone'; phone: string; countryCode: '91' | '880'; via?: 'sms' | 'whatsapp' }
  | { method: 'email'; email: string }

// Response is uniform whether or not the identifier has an account — never
// branch UI copy on it (see the backend route's comment for why).
export function forgotPassword(target: ForgotPasswordTarget) {
  return apiRequest<{ success: boolean; message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: target,
  })
}

export type ResetPasswordTarget =
  | { method: 'phone'; phone: string; countryCode: '91' | '880'; otp: string; newPassword: string }
  | { method: 'email'; email: string; otp: string; newPassword: string }

// A verified reset code is proof of control, same as verify-otp — success
// here both sets the password and logs the reader in.
export function resetPassword(target: ResetPasswordTarget) {
  return apiRequest<PasswordLoginResult>('/api/auth/reset-password', {
    method: 'POST',
    body: target,
  })
}

export interface MeResult {
  user: (AuthUser & { stallContext: { orgType: string | null } }) | null
  needsRefresh?: boolean
}

export function fetchMe() {
  return apiRequest<MeResult>('/api/auth/me')
}

export interface OrganizationsResult {
  data: {
    activeId: string | null
    organizations: Array<{
      id: string
      nameBn: string
      slug: string
      type: OrgMembership['organization']['type']
      typeLabel: string
      logoUrl: string | null
      role: OrgMembership['role']
      stallHref: string
    }>
  }
}

export function fetchMyOrganizations() {
  return apiRequest<OrganizationsResult>('/api/publisher/organizations', { skipOrgHeader: true })
}

export function logout() {
  return apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' }).catch(() => {
    // Best-effort — the client discards its tokens either way.
  })
}
