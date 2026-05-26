import { NavLink } from "react-router-dom"
import { Bot, ExternalLink, Settings } from "lucide-react"
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
import { getBotmanagerUrl, getSwaggerUrl } from "@/lib/api"

const navItems = [
  { to: "/bots", label: "Bots", icon: Bot },
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
      <SidebarFooter className="space-y-2 border-t border-sidebar-border p-4">
        <p className="truncate text-xs text-muted-foreground">
          API: {getBotmanagerUrl()}
        </p>
        <a
          href={getSwaggerUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          API docs
          <ExternalLink className="size-3" />
        </a>
      </SidebarFooter>
    </Sidebar>
  )
}
