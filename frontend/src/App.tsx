import { SignedIn, SignedOut, SignInButton, useAuth, useUser } from "@clerk/clerk-react"
import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { apiRequest } from "@/lib/api"
import type { AppStatus } from "@/types/models"
import { clearAuthTokenProvider, setAuthTokenProvider } from "./lib/auth"
import SchoolEmailGuard from "./components/SchoolEmailGuard"
import { isAdminEmail, normalizeEmail } from "./lib/schoolRules"
import AppLayout from "./components/AppLayout"
import AdminDashboardPage from "./pages/AdminDashboardPage"
import CompetitionPage from "./pages/CompetitionPage"
import CompetitionEntryPage from "./pages/CompetitionEntryPage"
import CompetitionArenaPage from "./pages/CompetitionArenaPage"
import InterpreterPage from "./pages/InterpreterPage"
import LeaderboardPage from "./pages/LeaderboardPage"
import SubmissionQueuePage from "./pages/SubmissionQueuePage"
import "./App.css"

interface PublicStatusResponse {
  app_status?: AppStatus
}

function MemberAppOnGuard({ children, leaderboardOnly }: { children: ReactElement; leaderboardOnly: boolean }) {
  if (leaderboardOnly) {
    return <Navigate to="/leaderboard" replace />
  }

  return children
}

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
  const { user, isLoaded: isUserLoaded } = useUser()
  const [memberAppStatus, setMemberAppStatus] = useState<AppStatus>("ON")
  const [statusLoading, setStatusLoading] = useState(false)

  const email = normalizeEmail(user?.primaryEmailAddress?.emailAddress ?? "")
  const isAdmin = email.length > 0 && isAdminEmail(email)
  const memberLeaderboardOnly = !isAdmin && memberAppStatus === "OFF"

  useEffect(() => {
    setAuthTokenProvider(() => getToken())

    return () => {
      clearAuthTokenProvider()
    }
  }, [getToken])

  useEffect(() => {
    if (!isLoaded || !isUserLoaded || !user || isAdmin) {
      setStatusLoading(false)
      setMemberAppStatus("ON")
      return
    }

    let active = true
    let intervalId: number | null = null

    const fetchStatus = async () => {
      try {
        const response = await apiRequest<PublicStatusResponse>("/api/status")
        if (!active) {
          return
        }

        const status = response.data?.app_status === "OFF" ? "OFF" : "ON"
        setMemberAppStatus(status)
      } catch {
        if (!active) {
          return
        }

        setMemberAppStatus("OFF")
      }
    }

    setStatusLoading(true)
    void fetchStatus().finally(() => {
      if (active) {
        setStatusLoading(false)
      }
    })

    intervalId = window.setInterval(() => {
      void fetchStatus()
    }, 30000)

    return () => {
      active = false

      if (intervalId !== null) {
        window.clearInterval(intervalId)
      }
    }
  }, [isAdmin, isLoaded, isUserLoaded, user?.id])

  if (!isLoaded || !isUserLoaded || statusLoading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[1100px] items-center p-8">
        <Card className="card-modern w-full max-w-md mx-auto">
          <CardContent className="space-y-3 p-8">
            <img
              src="/codify-logo.png"
              alt="Codify logo"
              className="h-12 w-12 rounded-xl border border-border object-cover"
              loading="eager"
            />
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Authentication</p>
            <h1 className="text-3xl font-semibold tracking-tight">Loading access...</h1>
            <p className="text-muted-foreground">
              {statusLoading ? "Checking app status for your account." : "Preparing your dashboard and Clerk session."}
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1100px] p-8">
      <SignedOut>
        <Card className="card-modern mx-auto mt-16 max-w-xl">
          <CardContent className="space-y-5 p-8 text-center">
            <img
              src="/codify-logo.png"
              alt="Codify logo"
              className="mx-auto h-16 w-16 rounded-2xl border border-border object-cover"
              loading="eager"
            />
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Members Only</p>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight">Codify</h1>
              <p className="text-base text-muted-foreground">
                Sign in with your school account to access competitions, the interpreter, and rankings.
              </p>
            </div>
            <SignInButton mode="modal">
              <Button size="lg" className="btn-primary w-full">
                Sign In With Clerk
              </Button>
            </SignInButton>
          </CardContent>
        </Card>
      </SignedOut>

      <SignedIn>
        <SchoolEmailGuard>
          <Routes>
            <Route path="/" element={<AppLayout memberLeaderboardOnly={memberLeaderboardOnly} />}>
              <Route index element={memberLeaderboardOnly ? <Navigate to="/leaderboard" replace /> : <CompetitionPage />} />
              <Route
                path="competition"
                element={
                  <MemberAppOnGuard leaderboardOnly={memberLeaderboardOnly}>
                    <CompetitionEntryPage />
                  </MemberAppOnGuard>
                }
              />
              <Route
                path="competition/arena"
                element={
                  <MemberAppOnGuard leaderboardOnly={memberLeaderboardOnly}>
                    <CompetitionArenaPage />
                  </MemberAppOnGuard>
                }
              />
              <Route
                path="interpreter"
                element={
                  <MemberAppOnGuard leaderboardOnly={memberLeaderboardOnly}>
                    <InterpreterPage />
                  </MemberAppOnGuard>
                }
              />
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

