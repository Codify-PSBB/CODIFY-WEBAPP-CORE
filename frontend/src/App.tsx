import { SignedIn, SignedOut, SignInButton, useAuth, useUser } from "@clerk/clerk-react"
import type { ReactElement } from "react"
import { useEffect } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { clearAuthTokenProvider, setAuthTokenProvider } from "./lib/auth"
import SchoolEmailGuard from "./components/SchoolEmailGuard"
import { isAdminEmail, normalizeEmail } from "./lib/schoolRules"
import AppLayout from "./components/AppLayout"
import AdminDashboardPage from "./pages/AdminDashboardPage"
import CompetitionPage from "./pages/CompetitionPage"
import InterpreterPage from "./pages/InterpreterPage"
import LeaderboardPage from "./pages/LeaderboardPage"
import SubmissionQueuePage from "./pages/SubmissionQueuePage"
import "./App.css"

function AdminRouteGuard({ children }: { children: ReactElement }) {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return null
  }

  const email = normalizeEmail(user?.primaryEmailAddress?.emailAddress ?? "")
  if (!isAdminEmail(email)) {
    return <Navigate to="/competition" replace />
  }

  return children
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
      <main className="mx-auto flex min-h-screen w-full max-w-[1100px] items-center p-8">
        <Card className="w-full rounded-[28px] border-white/70 bg-white/85 shadow-soft dark:border-slate-700 dark:bg-[#1e2937]">
          <CardContent className="space-y-3 p-8">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Authentication</p>
            <h1 className="text-3xl font-semibold tracking-tight">Loading access...</h1>
            <p className="text-muted-foreground">Preparing your dashboard and Clerk session.</p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1100px] p-8">
      <SignedOut>
        <Card className="mx-auto mt-16 max-w-xl rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-700 dark:bg-[#1e2937]">
          <CardContent className="space-y-5 p-8 text-center">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Members Only</p>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight">Codify</h1>
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
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<CompetitionPage />} />
              <Route path="competition" element={<CompetitionPage />} />
              <Route path="interpreter" element={<InterpreterPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="admin" element={<AdminRouteGuard><AdminDashboardPage /></AdminRouteGuard>} />
              <Route path="admin/queue" element={<AdminRouteGuard><SubmissionQueuePage /></AdminRouteGuard>} />
            </Route>
          </Routes>
        </SchoolEmailGuard>
      </SignedIn>
    </main>
  )
}

