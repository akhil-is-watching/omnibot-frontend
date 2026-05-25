import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useNavigate } from "react-router-dom"
import {
  applyAuthSession,
  clearAccessToken,
  login as loginApi,
  register as registerApi,
  setUnauthorizedHandler,
} from "@/lib/api"
import {
  emailFromToken,
  getAccessToken,
  getStoredUser,
  setStoredUser,
  type AuthUser,
} from "@/lib/auth-storage"
import type { LoginRequest, RegisterRequest } from "@/lib/types"

interface AuthContextValue {
  isAuthenticated: boolean
  user: AuthUser | null
  login: (input: LoginRequest) => Promise<void>
  register: (input: RegisterRequest) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(() => getAccessToken())
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = getStoredUser()
    if (stored) return stored
    const t = getAccessToken()
    if (!t) return null
    const email = emailFromToken(t)
    return email ? { email } : null
  })

  const logout = useCallback(() => {
    clearAccessToken()
    setToken(null)
    setUser(null)
    navigate("/login", { replace: true })
  }, [navigate])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null)
      setUser(null)
      navigate("/login", { replace: true })
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate])

  const login = useCallback(async (input: LoginRequest) => {
    const response = await loginApi(input)
    applyAuthSession(response)
    setToken(response.accessToken)
    const nextUser =
      response.user ??
      (() => {
        const email = emailFromToken(response.accessToken)
        return email ? { email } : null
      })()
    if (nextUser) {
      setStoredUser(nextUser)
      setUser(nextUser)
    } else {
      setUser(null)
    }
  }, [])

  const register = useCallback(async (input: RegisterRequest) => {
    const response = await registerApi(input)
    applyAuthSession(response)
    setToken(response.accessToken)
    const nextUser =
      response.user ??
      (() => {
        const email = input.email || emailFromToken(response.accessToken)
        return email ? { email, name: input.name } : null
      })()
    if (nextUser) {
      setStoredUser(nextUser)
      setUser(nextUser)
    } else {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated: !!token,
      user,
      login,
      register,
      logout,
    }),
    [token, user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
