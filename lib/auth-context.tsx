import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import * as storage from './storage'
import { setOnUnauthorized } from './api'
import * as authApi from './auth-api'
import type { AuthUser, OrgMembership, Persona } from './types'

type Status = 'loading' | 'signedOut' | 'signedIn'

interface AuthContextValue {
  status: Status
  user: AuthUser | null
  orgMemberships: OrgMembership[]
  /** null once signed in but before a persona has been chosen — render the switcher. */
  persona: Persona | null
  needsPersonaChoice: boolean
  requestOtp: typeof authApi.requestOtp
  verifyOtp: (target: Parameters<typeof authApi.verifyOtp>[0]) => Promise<authApi.VerifyOtpResult>
  choosePersona: (persona: Persona) => Promise<void>
  clearPersonaChoice: () => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function personaKey(persona: Persona): string {
  return persona.kind === 'platform-admin' ? 'platform-admin' : `stall:${persona.orgId}`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [orgMemberships, setOrgMemberships] = useState<OrgMembership[]>([])
  const [persona, setPersona] = useState<Persona | null>(null)

  const loadProfile = useCallback(async () => {
    const me = await authApi.fetchMe()
    if (!me.user) {
      setUser(null)
      setOrgMemberships([])
      setStatus('signedOut')
      return
    }
    setUser(me.user)

    let memberships: OrgMembership[] = []
    if (me.user.roles.includes('PUBLISHER')) {
      const orgs = await authApi.fetchMyOrganizations()
      memberships = orgs.data.organizations.map((o) => ({
        organization: {
          id: o.id,
          nameBn: o.nameBn,
          type: o.type,
          isVerified: undefined,
          isActive: true,
        },
        role: o.role,
      }))
    }
    setOrgMemberships(memberships)

    // Restore whichever persona this device last used, provided it's still
    // valid for this account (roles/seats can change server-side).
    const storedKey = await storage.getStoredPersonaKey()
    const isAdmin = me.user.roles.includes('ADMIN')
    const validPersonas: Persona[] = [
      ...(isAdmin ? [{ kind: 'platform-admin' } as const] : []),
      ...memberships.map((m) => ({ kind: 'stall' as const, orgId: m.organization.id })),
    ]

    const restored = validPersonas.find((p) => personaKey(p) === storedKey)
    if (restored) {
      setPersona(restored)
      await storage.setActiveOrgId(restored.kind === 'stall' ? restored.orgId : null)
    } else if (validPersonas.length === 1) {
      const only = validPersonas[0]
      setPersona(only)
      await storage.setStoredPersonaKey(personaKey(only))
      await storage.setActiveOrgId(only.kind === 'stall' ? only.orgId : null)
    } else {
      setPersona(null)
    }

    setStatus('signedIn')
  }, [])

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null)
      setOrgMemberships([])
      setPersona(null)
      setStatus('signedOut')
    })
    return () => setOnUnauthorized(null)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { accessToken, refreshToken } = await storage.getTokens()
      if (!accessToken && !refreshToken) {
        setStatus('signedOut')
        return
      }
      try {
        await loadProfile()
      } catch {
        setStatus('signedOut')
      }
    })()
  }, [loadProfile])

  const verifyOtp = useCallback<AuthContextValue['verifyOtp']>(async (target) => {
    const result = await authApi.verifyOtp(target)
    if (result.accessToken && result.refreshToken) {
      await storage.setTokens(result.accessToken, result.refreshToken)
    }
    await loadProfile()
    return result
  }, [loadProfile])

  const choosePersona = useCallback(async (next: Persona) => {
    setPersona(next)
    await storage.setStoredPersonaKey(personaKey(next))
    await storage.setActiveOrgId(next.kind === 'stall' ? next.orgId : null)
  }, [])

  const clearPersonaChoice = useCallback(() => {
    setPersona(null)
    storage.setStoredPersonaKey(null)
    storage.setActiveOrgId(null)
  }, [])

  const signOut = useCallback(async () => {
    await authApi.logout()
    await storage.clearTokens()
    setUser(null)
    setOrgMemberships([])
    setPersona(null)
    setStatus('signedOut')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      orgMemberships,
      persona,
      needsPersonaChoice: status === 'signedIn' && persona === null,
      requestOtp: authApi.requestOtp,
      verifyOtp,
      choosePersona,
      clearPersonaChoice,
      signOut,
      refreshProfile: loadProfile,
    }),
    [status, user, orgMemberships, persona, verifyOtp, choosePersona, clearPersonaChoice, signOut, loadProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
