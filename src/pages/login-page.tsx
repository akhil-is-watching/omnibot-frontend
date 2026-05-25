import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ErrorMessage } from "@/components/shared"

export function LoginPage() {
  const { isAuthenticated, login, register } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? "/bots"

  const [mode, setMode] = useState<"login" | "register">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "login") {
        await login({ email: email.trim(), password })
        return
      }
      await register({
        email: email.trim(),
        password,
        name: name.trim() || undefined,
      })
    },
  })

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>OmniBot</CardTitle>
          <CardDescription>
            Sign in to manage bots, datasets, and integrations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as "login" | "register")
              mutation.reset()
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1">
                Register
              </TabsTrigger>
            </TabsList>
            <form
              className="mt-4 grid gap-4"
              onSubmit={(e) => {
                e.preventDefault()
                mutation.mutate()
              }}
            >
              {mode === "register" && (
                <div className="grid gap-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    placeholder="Your name"
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                />
              </div>
              {mutation.error && (
                <ErrorMessage message={(mutation.error as Error).message} />
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  !email.trim() || !password || mutation.isPending
                }
              >
                {mutation.isPending
                  ? mode === "login"
                    ? "Signing in…"
                    : "Creating account…"
                  : mode === "login"
                    ? "Sign in"
                    : "Create account"}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
