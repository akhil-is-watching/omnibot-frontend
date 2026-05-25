import { Navigate, Route, Routes } from "react-router-dom"
import { RequireAuth } from "@/components/auth/require-auth"
import { AdminLayout } from "@/components/layout/admin-layout"
import { BotDetailPage } from "@/pages/bot-detail-page"
import { BotsPage } from "@/pages/bots-page"
import { LoginPage } from "@/pages/login-page"
import { SettingsPage } from "@/pages/settings-page"

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/bots" replace />} />
        <Route path="bots" element={<BotsPage />} />
        <Route path="bots/:botId" element={<BotDetailPage />} />
        <Route path="datasets" element={<Navigate to="/bots" replace />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
