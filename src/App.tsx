import { Navigate, Route, Routes } from "react-router-dom"
import { AdminLayout } from "@/components/layout/admin-layout"
import { BotDetailPage } from "@/pages/bot-detail-page"
import { BotsPage } from "@/pages/bots-page"
import { DatasetsPage } from "@/pages/datasets-page"
import { SettingsPage } from "@/pages/settings-page"

export function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="/bots" replace />} />
        <Route path="bots" element={<BotsPage />} />
        <Route path="bots/:botId" element={<BotDetailPage />} />
        <Route path="datasets" element={<DatasetsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}

export default App
