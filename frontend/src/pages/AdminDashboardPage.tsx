import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiRequest } from "@/lib/api"
import type { AdminUser, AppStatus, PendingSubmission } from "@/types/models"
import { ArrowRight, Gauge, Power, RefreshCcw, Users2 } from "lucide-react"

interface PendingSubmissionsResponse {
  submissions?: PendingSubmission[]
}

interface AdminUsersResponse {
  users?: AdminUser[]
}

interface ToggleResponse {
  app_status?: AppStatus
}

export default function AdminDashboardPage() {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [appStatus, setAppStatus] = useState<AppStatus | "UNKNOWN">("UNKNOWN")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function loadPendingSubmissions() {
    const response = await apiRequest<PendingSubmissionsResponse>("/api/admin/submissions")
    setSubmissions(Array.isArray(response.data?.submissions) ? response.data.submissions : [])
  }

  async function loadUsers() {
    const response = await apiRequest<AdminUsersResponse>("/api/admin/users")
    setUsers(Array.isArray(response.data?.users) ? response.data.users : [])
  }

  async function loadAppStatus() {
    const response = await apiRequest<ToggleResponse>("/api/admin/toggle")
    const status = response.data?.app_status
    setAppStatus(status === "ON" || status === "OFF" ? status : "UNKNOWN")
  }

  async function refreshDashboard() {
    setLoading(true)
    setMessage("")

    try {
      await Promise.all([loadPendingSubmissions(), loadUsers(), loadAppStatus()])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load admin dashboard.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshDashboard()
  }, [])

  async function toggleCompetition(status: AppStatus) {
    setMessage("")

    try {
      const response = await apiRequest<ToggleResponse>("/api/admin/toggle", {
        method: "POST",
        body: { status },
      })

      setAppStatus(response.data?.app_status ?? status)
      setMessage(`Competition turned ${status}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to toggle competition.")
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-soft backdrop-blur-sm">
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Admin Control Room
            </p>
            <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
              Review activity, manage access, and monitor the competition.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground">
              The dashboard keeps toggles, user rankings, and submission backlog in one modern control surface.
            </CardDescription>
          </div>
          <Button variant="outline" size="lg" onClick={() => void refreshDashboard()} disabled={loading}>
            <RefreshCcw className="mr-2 size-4" />
            Refresh Dashboard
          </Button>
        </CardHeader>
      </Card>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
          <CardContent className="space-y-3 p-6">
            <Badge variant={appStatus === "ON" ? "default" : "secondary"} className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Competition {appStatus}
            </Badge>
            <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <Power className="size-5 text-primary" />
              {appStatus}
            </div>
            <p className="text-sm text-muted-foreground">Members are blocked from competition routes when the app is OFF.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
          <CardContent className="space-y-3 p-6">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Pending Queue
            </Badge>
            <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <Gauge className="size-5 text-primary" />
              {submissions.length}
            </div>
            <p className="text-sm text-muted-foreground">Submissions currently waiting for review.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
          <CardContent className="space-y-3 p-6">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Users
            </Badge>
            <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <Users2 className="size-5 text-primary" />
              {users.length}
            </div>
            <p className="text-sm text-muted-foreground">Tracked members and admins in the leaderboard database.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">Competition Toggle</CardTitle>
            <CardDescription>Turn student access on or off while admins keep full access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
              Current status: <span className="font-medium text-foreground">{appStatus}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => void toggleCompetition("ON")}>Turn ON</Button>
              <Button variant="outline" size="lg" onClick={() => void toggleCompetition("OFF")}>Turn OFF</Button>
            </div>
            <Button asChild variant="secondary" size="lg" className="w-full justify-between rounded-2xl">
              <Link to="/admin/queue">
                Open Submission Queue
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">Queue Snapshot</CardTitle>
            <CardDescription>A quick preview of submissions waiting in the dedicated queue page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Problem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-8 text-muted-foreground" colSpan={3}>
                      No pending submissions right now.
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.slice(0, 5).map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">#{submission.id}</TableCell>
                      <TableCell>{submission.user_name}</TableCell>
                      <TableCell>{submission.problem_title}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl">User List</CardTitle>
          <CardDescription>Users are sorted by XP to match the competition’s leaderboard view.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">XP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-muted-foreground" colSpan={4}>
                    No users available yet.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.email}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{user.xp}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
