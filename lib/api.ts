import { getTokens, setTokens, clearTokens, getActiveOrgId } from './storage'

// Must match CLIENT_HEADER in the backend's src/lib/mobile-auth.ts — this is
// how the server tells a native request (token-in-body) apart from a browser
// one (httpOnly-cookie-only). Keep these in sync if that ever changes again.
const MOBILE_CLIENT_HEADER = 'x-bhasha-client'

// From EXPO_PUBLIC_API_BASE_URL (see .env.example) — falls back to the local
// dev server so `expo start` works out of the box against `npm run dev` in
// the bhalo-bhasha repo.
const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  body: unknown
  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

// Fired when a refresh attempt fails outright — the caller (AuthProvider)
// uses this to drop back to the login screen instead of each screen having
// to notice its own 401s.
let onUnauthorized: (() => void) | null = null
export function setOnUnauthorized(callback: (() => void) | null) {
  onUnauthorized = callback
}

// Concurrent 401s from several screens must not each fire their own refresh
// (the backend rotates nothing here, but there's no reason to hit the
// network 4 times for one expired token) — they share this in-flight promise.
let refreshPromise: Promise<string | null> | null = null

async function performRefresh(): Promise<string | null> {
  const { refreshToken } = await getTokens()
  if (!refreshToken) return null

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        [MOBILE_CLIENT_HEADER]: 'mobile',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string }
    if (!data.accessToken) return null
    // The backend rotates the refresh token on every use — the old one is
    // still honored until it expires, but persisting only the access token
    // here would silently drop the rotation and eventually strand the app on
    // a refresh token the server no longer expects to see again.
    await setTokens(data.accessToken, data.refreshToken ?? refreshToken)
    return data.accessToken
  } catch {
    return null
  }
}

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  /** Omit the x-active-org header even if a stall persona is active. */
  skipOrgHeader?: boolean
  /** Internal: prevents infinite refresh loops. */
  _retried?: boolean
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { accessToken } = await getTokens()
  const activeOrgId = options.skipOrgHeader ? null : await getActiveOrgId()

  const headers: Record<string, string> = {
    [MOBILE_CLIENT_HEADER]: 'mobile',
    'content-type': 'application/json',
  }
  if (accessToken) headers.authorization = `Bearer ${accessToken}`
  if (activeOrgId) headers['x-active-org'] = activeOrgId

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 401 && !options._retried) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      return apiRequest<T>(path, { ...options, _retried: true })
    }
    await clearTokens()
    onUnauthorized?.()
    throw new ApiError(401, 'সেশন শেষ হয়ে গেছে, আবার লগইন করুন')
  }

  const text = await res.text()
  const data = text ? safeParse(text) : null

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `Request failed (${res.status})`
    throw new ApiError(res.status, message, data)
  }

  return data as T
}

export const api = {
  get: <T = unknown>(path: string) => apiRequest<T>(path),
  post: <T = unknown>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T = unknown>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  put: <T = unknown>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body }),
  // Some admin routes take their target in a DELETE body (organization
  // members, for instance) rather than in the path.
  delete: <T = unknown>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'DELETE', body }),
}

/**
 * Uploads one local file (a picker result) to the site's public asset bucket
 * and returns the CDN url. Multipart, so it deliberately bypasses
 * `apiRequest` — that helper always JSON-encodes the body and sets a
 * content-type, and fetch must be left to write its own multipart boundary.
 *
 * The server only accepts urls from its own bucket back in `images[]` /
 * `logoUrl` (see isUploadedAssetUrl on the backend), so a form must upload
 * first and submit the returned url — never a local file:// path.
 */
export async function uploadAsset(
  file: { uri: string; name: string; type: string },
  folder = 'book-covers',
  options: { retried?: boolean } = {}
): Promise<string> {
  const { accessToken } = await getTokens()

  const form = new FormData()
  // RN's FormData takes this {uri,name,type} shape rather than a File.
  form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob)
  form.append('folder', folder)

  const headers: Record<string, string> = { [MOBILE_CLIENT_HEADER]: 'mobile' }
  if (accessToken) headers.authorization = `Bearer ${accessToken}`

  const res = await fetch(`${BASE_URL}/api/upload`, { method: 'POST', headers, body: form })

  if (res.status === 401 && !options.retried) {
    const newToken = await refreshAccessToken()
    if (newToken) return uploadAsset(file, folder, { retried: true })
    await clearTokens()
    onUnauthorized?.()
    throw new ApiError(401, 'সেশন শেষ হয়ে গেছে, আবার লগইন করুন')
  }

  const text = await res.text()
  const data = text ? safeParse(text) : null
  if (!res.ok) {
    throw new ApiError(res.status, (data && (data.error || data.message)) || 'আপলোড ব্যর্থ', data)
  }
  const fileUrl = data?.fileUrl
  if (typeof fileUrl !== 'string') throw new ApiError(500, 'আপলোড ব্যর্থ — সার্ভার ঠিকানা পাঠায়নি', data)
  return fileUrl
}

// A proxy or captive portal can answer 200 with HTML; JSON.parse on that
// throws a bare SyntaxError that screens would report as a network problem.
function safeParse(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}
