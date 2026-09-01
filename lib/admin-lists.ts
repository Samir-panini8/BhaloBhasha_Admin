import { api } from './api'
import type { OrgType } from './types'

export interface PublisherApp {
  id: string
  nameBn: string
  nameEn: string
  type: OrgType
  country: string
  phone: string
  email: string | null
  website: string | null
  registrationNumber: string | null
  representativeBooks: string | null
  description: string
  reviewNote: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  organization: { slug: string; nameBn: string } | null
}

/**
 * One page of stall applications. `status` defaults to pending server-side —
 * anything other than the three literals plus 'all' is treated as pending, so
 * pass it explicitly.
 */
export async function fetchPublisherAppsPage(
  page: number,
  status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending',
  perPage = 25
) {
  const params = new URLSearchParams({ page: String(page), perPage: String(perPage), status })
  const res = await api.get<{
    data: { apps: PublisherApp[]; pendingCount: number; pagination: { page: number; totalPages: number; totalItems: number } }
  }>(`/api/admin/publisher-apps?${params.toString()}`)
  return {
    items: res.data?.apps ?? [],
    pendingCount: res.data?.pendingCount ?? 0,
    total: res.data?.pagination?.totalItems,
    hasMore: page < (res.data?.pagination?.totalPages ?? 1),
  }
}
