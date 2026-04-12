import { SignOutButton, UserButton, useUser } from "@clerk/clerk-react"
import { BarChart3, ClipboardList, Code2, LayoutDashboard, Moon, Shield, Sun, Trophy } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { isAdminEmail, normalizeEmail } from "@/lib/schoolRules"
import { useTheme } from "@/components/ThemeProvider"
import { cn } from "@/lib/utils"

const navigationItems = [
  { to: "/competition", label: "Competition", icon: Code2, adminOnly: false },
  { to: "/interpreter", label: "Interpreter", icon: ClipboardList, adminOnly: false },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, adminOnly: false },
  { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard, adminOnly: true },
  { to: "/admin/queue", label: "Submission Queue", icon: BarChart3, adminOnly: true },
]

interface AppLayoutProps {
  memberLeaderboardOnly?: boolean
}

export default function AppLayout({ memberLeaderboardOnly = false }: AppLayoutProps) {
  const { user } = useUser()
  const location = useLocation()
  const currentEmail = normalizeEmail(user?.primaryEmailAddress?.emailAddress ?? "")
  const isAdmin = currentEmail.length > 0 && isAdminEmail(currentEmail)
  const isAdminPage = isAdmin && location.pathname.startsWith("/admin")
  const { theme, toggleTheme } = useTheme()
  const visibleNavigationItems = navigationItems.filter((item) => {
    if (isAdmin) {
      return true
    }

    if (memberLeaderboardOnly) {
      return item.to === "/leaderboard"
    }

    return !item.adminOnly
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Top Navigation - Minimal height, high contrast */}
      <header className="border-b border-[#262626] bg-[#000000]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src="/codify-logo.png"
              alt="Codify logo"
              className="h-8 w-8 rounded-md border border-[#262626]"
              loading="eager"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#a3a3a3] uppercase tracking-wider">Site</span>
              <h1 className="text-xl font-semibold text-white">Codify</h1>
            </div>
            {isAdminPage ? (
              <span className="cf-badge-primary ml-2">
                <Shield className="mr-1 inline h-3 w-3" />
                Admin
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              className="cf-btn-secondary text-sm"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="mr-2 inline h-4 w-4" /> : <Moon className="mr-2 inline h-4 w-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <UserButton appearance={{ elements: { userButtonAvatarBox: "ring-2 ring-[#ff6b00]" } }} />
            <SignOutButton>
              <button className="cf-btn-primary text-sm">Sign Out</button>
            </SignOutButton>
          </div>
        </div>
      </header>

      {/* Secondary Navigation - Tabs style */}
      <nav className="border-b border-[#262626] bg-[#0a0a0a]">
        <div className={cn(
          "flex px-6",
          isAdmin ? "gap-8" : memberLeaderboardOnly ? "justify-center" : "gap-8"
        )}>
          {visibleNavigationItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to)

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive: active }) =>
                  cn(
                    "flex items-center gap-2 py-4 text-sm font-medium transition-colors",
                    active 
                      ? "cf-nav-item-active border-b-2 border-[#ff6b00] text-white" 
                      : "cf-nav-item"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="px-6 pb-6">
        <Outlet />
      </main>
    </div>
  )
}

