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

export default function AppLayout() {
  const { user } = useUser()
  const location = useLocation()
  const currentEmail = normalizeEmail(user?.primaryEmailAddress?.emailAddress ?? "")
  const isAdmin = currentEmail.length > 0 && isAdminEmail(currentEmail)
  const isAdminPage = isAdmin && location.pathname.startsWith("/admin")
  const { theme, toggleTheme } = useTheme()
  const visibleNavigationItems = navigationItems.filter((item) => !item.adminOnly || isAdmin)

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-white/70 bg-white/90 shadow-soft backdrop-blur-sm dark:border-sky-300/20 dark:bg-slate-900/72 dark:shadow-[0_28px_72px_-38px_rgba(2,6,23,0.95)]">
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Site</p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Codify</h1>
            </div>
            {isAdminPage ? (
              <Badge className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.14em]">
                <Shield className="mr-1 size-3.5" />
                Admin
              </Badge>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
            <UserButton />
            <SignOutButton>
              <Button variant="outline">Sign Out</Button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <nav className={cn("grid gap-3", isAdmin ? "md:grid-cols-5" : "md:grid-cols-3")}>
        {visibleNavigationItems.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  buttonVariants({
                    variant: isActive ? "default" : "outline",
                    size: "lg",
                  }),
                  "h-14 justify-start rounded-2xl px-4 shadow-soft"
                )
              }
            >
              <Icon className="mr-2 size-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <section className="rounded-[28px] border border-white/70 bg-white/40 p-8 shadow-soft dark:border-sky-300/16 dark:bg-slate-900/58 dark:backdrop-blur-md">
        <Outlet />
      </section>
    </div>
  )
}

