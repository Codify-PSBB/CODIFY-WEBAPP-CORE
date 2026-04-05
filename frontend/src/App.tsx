import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/clerk-react"
import {
  BarChart3,
  ClipboardList,
  Code2,
  LayoutDashboard,
  Trophy,
} from "lucide-react"
import { useEffect } from "react"
import { NavLink, Route, Routes } from "react-router-dom"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { clearAuthTokenProvider, setAuthTokenProvider } from "./lib/auth"
import SchoolEmailGuard from "./components/SchoolEmailGuard"
import AdminDashboardPage from "./pages/AdminDashboardPage"
import CompetitionPage from "./pages/CompetitionPage"
import InterpreterPage from "./pages/InterpreterPage"
import LeaderboardPage from "./pages/LeaderboardPage"
import SubmissionQueuePage from "./pages/SubmissionQueuePage"
import "./App.css"

const navigationItems = [
  { to: "/competition", label: "Competition", icon: Code2 },
  { to: "/interpreter", label: "Interpreter", icon: ClipboardList },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
  { to: "/admin/queue", label: "Submission Queue", icon: BarChart3 },
]

function AppNavigation() {
  return (
    <div className="grid gap-3 md:grid-cols-5">
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
    </div>
  )
}

function SignedInShell() {
  const { user } = useUser()

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-soft backdrop-blur-sm">
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              School Competition Workspace
            </p>
            <div className="space-y-1">
              <h1 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                Coding Club Platform
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
                Competition, interpreter, rankings, and admin workflows in one clean dashboard.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border bg-background/80 px-4 py-3 shadow-sm">
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Signed In
              </p>
              <p className="max-w-[260px] truncate text-sm font-medium text-foreground">
                {user?.primaryEmailAddress?.emailAddress ?? "Unknown"}
              </p>
            </div>
            <UserButton />
          </div>
        </CardContent>
      </Card>

      <AppNavigation />

      <Routes>
        <Route path="/" element={<CompetitionPage />} />
        <Route path="/competition" element={<CompetitionPage />} />
        <Route path="/interpreter" element={<InterpreterPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/queue" element={<SubmissionQueuePage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  const { getToken, isLoaded } = useAuth()

  useEffect(() => {
    setAuthTokenProvider(() => getToken())

    return () => {
      clearAuthTokenProvider()
    }
  }, [getToken])

  if (!isLoaded) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1100px] items-center px-4 py-10 md:px-8">
        <Card className="w-full rounded-[28px] border-white/70 bg-white/85 shadow-soft backdrop-blur-sm">
          <CardContent className="space-y-3 p-8">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Authentication
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Loading access...</h1>
            <p className="text-muted-foreground">Preparing your dashboard and Clerk session.</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1100px] px-4 py-8 md:px-8 md:py-10">
      <SignedOut>
        <Card className="mx-auto mt-16 max-w-xl rounded-[28px] border-white/70 bg-white/90 shadow-soft backdrop-blur-sm">
          <CardContent className="space-y-5 p-8 text-center">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Members Only
            </p>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight">Coding Club Platform</h1>
              <p className="text-base text-muted-foreground">
                Sign in with your school account to access competitions, the interpreter, and rankings.
              </p>
            </div>
            <SignInButton mode="modal">
              <Button size="lg" className="w-full rounded-2xl">
                Sign In With Clerk
              </Button>
            </SignInButton>
          </CardContent>
        </Card>
      </SignedOut>

      <SignedIn>
        <SchoolEmailGuard>
          <SignedInShell />
        </SchoolEmailGuard>
      </SignedIn>
    </main>
  )
}
