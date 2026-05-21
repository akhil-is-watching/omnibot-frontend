import { NavLink } from "react-router-dom"
import { Bot, Database, Settings } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { getBotmanagerUrl } from "@/lib/api"

const navItems = [
  { to: "/bots", label: "Bots", icon: Bot },
  { to: "/datasets", label: "Datasets", icon: Database },
  { to: "/settings", label: "Settings", icon: Settings },
]

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">OmniBot</span>
          <span className="text-xs text-muted-foreground">Bot Manager</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ to, label, icon: Icon }) => (
                <SidebarMenuItem key={to}>
                  <NavLink to={to}>
                    {({ isActive }) => (
                      <SidebarMenuButton isActive={isActive}>
                        <Icon />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <p className="truncate text-xs text-muted-foreground">
          API: {getBotmanagerUrl()}
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
