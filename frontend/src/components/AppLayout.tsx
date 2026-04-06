import { SignOutButton, UserButton } from "@clerk/clerk-react"
import { BarChart3, ClipboardList, Code2, LayoutDashboard, Moon, Shield, Sun, Trophy } from "lucide-react"
import { NavLink, Outlet, useLocation } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { useTheme } from "@/components/ThemeProvider"
import { cn } from "@/lib/utils"

const navigationItems = [
  { to: "/competition", label: "Competition", icon: Code2 },
  { to: "/interpreter", label: "Interpreter", icon: ClipboardList },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
  { to: "/admin/queue", label: "Submission Queue", icon: BarChart3 },
]

export default function AppLayout() {
  const location = useLocation()
  const isAdminPage = location.pathname.startsWith("/admin")
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] border border-white/70 bg-white/90 shadow-soft backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-950/92">
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

      <nav className="grid gap-3 md:grid-cols-5">
        {navigationItems.map((item) => {
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

      <section className="rounded-[28px] border border-white/70 bg-white/40 p-8 shadow-soft dark:border-slate-800/80 dark:bg-slate-950/82">
        <Outlet />
      </section>
    </div>
  )
}

