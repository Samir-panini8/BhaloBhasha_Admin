import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

// expo-secure-store backs onto Keychain (iOS) / Keystore (Android) — the
// right place for tokens, unlike AsyncStorage which is plain-text on disk.
// It has no web implementation at all, so web (used only for previewing this
// app in a desktop browser during development, never a shipped target) falls
// back to localStorage — fine for that purpose, not a substitute for
// SecureStore's guarantees on a real device.
const isWeb = Platform.OS === 'web'

async function getItem(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null
  return SecureStore.getItemAsync(key)
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value)
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}

const ACCESS_TOKEN_KEY = 'bhasha_access_token'
const REFRESH_TOKEN_KEY = 'bhasha_refresh_token'
const ACTIVE_ORG_KEY = 'bhasha_active_org'
const PERSONA_KEY = 'bhasha_persona'

export async function getTokens() {
  const [accessToken, refreshToken] = await Promise.all([getItem(ACCESS_TOKEN_KEY), getItem(REFRESH_TOKEN_KEY)])
  return { accessToken, refreshToken }
}

export async function setTokens(accessToken: string, refreshToken: string) {
  await Promise.all([setItem(ACCESS_TOKEN_KEY, accessToken), setItem(REFRESH_TOKEN_KEY, refreshToken)])
}

export async function setAccessToken(accessToken: string) {
  await setItem(ACCESS_TOKEN_KEY, accessToken)
}

export async function clearTokens() {
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
    deleteItem(ACTIVE_ORG_KEY),
    deleteItem(PERSONA_KEY),
  ])
}

export async function getActiveOrgId() {
  return getItem(ACTIVE_ORG_KEY)
}

export async function setActiveOrgId(orgId: string | null) {
  if (orgId) {
    await setItem(ACTIVE_ORG_KEY, orgId)
  } else {
    await deleteItem(ACTIVE_ORG_KEY)
  }
}

// Remembers which persona the switcher last landed on, so a user with both
// platform-admin access and a stall seat isn't asked to pick every launch.
export async function getStoredPersonaKey(): Promise<string | null> {
  return getItem(PERSONA_KEY)
}

export async function setStoredPersonaKey(key: string | null) {
  if (key) {
    await setItem(PERSONA_KEY, key)
  } else {
    await deleteItem(PERSONA_KEY)
  }
}
