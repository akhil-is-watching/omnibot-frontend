import type { AuthUser } from "@/lib/types"

export type { AuthUser }

const TOKEN_KEY = "accessToken"
const USER_KEY = "authUser"

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

export function emailFromToken(token: string): string | undefined {
  try {
    const payload = token.split(".")[1]
    if (!payload) return undefined
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { email?: string; sub?: string }
    return decoded.email ?? decoded.sub
  } catch {
    return undefined
  }
}
