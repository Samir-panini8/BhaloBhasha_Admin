// Mirrors the shapes returned by the bhalo-bhasha Next.js API
// (src/lib/auth.ts, src/lib/org-roles.ts, prisma/schema.prisma).

export type Role = 'ADMIN' | 'READER' | 'PUBLISHER'
export type Country = 'IN' | 'BD'
export type OrgType = 'PUBLISHER' | 'SELLER' | 'PUBLISHER_AND_SELLER' | 'ARTIST' | 'ARTISAN'
export type OrgRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER'

export interface AuthUser {
  id: string
  nameBn: string
  nameEn?: string | null
  email?: string | null
  phone?: string | null
  avatarUrl?: string | null
  country?: Country
  roles: Role[]
}

export interface OrgMembership {
  organization: {
    id: string
    nameBn: string
    nameEn?: string | null
    type: OrgType
    isVerified?: boolean
    isActive?: boolean
  }
  role: OrgRole
}

// The two personas this app switches between. A "stall" persona is always
// scoped to one Organization id, matching the x-active-org header contract.
export type Persona = { kind: 'platform-admin' } | { kind: 'stall'; orgId: string }

export function canAdministerOrg(role: OrgRole): boolean {
  return role === 'OWNER' || role === 'ADMIN'
}

export function canWriteCatalog(role: OrgRole): boolean {
  return role !== 'VIEWER'
}
