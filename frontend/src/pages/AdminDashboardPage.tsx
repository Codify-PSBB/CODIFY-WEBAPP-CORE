import { useEffect, useMemo, useState } from "react"
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
import { ArrowRight, Gauge, RefreshCcw, Trophy, Users2 } from "lucide-react"

interface PendingSubmissionsResponse {
  submissions?: PendingSubmission[]
}

interface AdminUsersResponse {
  users?: AdminUser[]
}

interface ToggleResponse {
  app_status?: AppStatus
}

function formatTimestamp(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export default function AdminDashboardPage() {
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [appStatus, setAppStatus] = useState<AppStatus | "UNKNOWN">("UNKNOWN")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const totalStudents = useMemo(
    () => users.filter((user) => user.role === "member").length,
    [users]
  )
  const totalXp = useMemo(
    () => users.reduce((sum, user) => sum + user.xp, 0),
    [users]
  )

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
      <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-soft backdrop-blur-sm dark:border-slate-700/80 dark:bg-slate-950/94 dark:shadow-[0_24px_70px_-34px_rgba(2,6,23,0.95)]">
        <CardHeader className="gap-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Admin Control Room
            </p>
            <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
              Review submissions, monitor totals, and manage competition access.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground">
              This dashboard highlights key metrics first, then gives full table visibility for queue and users.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={appStatus === "ON" ? "default" : "secondary"} className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Competition {appStatus}
            </Badge>
            <Button variant="outline" size="lg" onClick={() => void refreshDashboard()} disabled={loading}>
              <RefreshCcw className="mr-2 size-4" />
              Refresh Dashboard
            </Button>
            <Button size="lg" onClick={() => void toggleCompetition("ON")}>Turn ON</Button>
            <Button variant="outline" size="lg" onClick={() => void toggleCompetition("OFF")}>Turn OFF</Button>
            <Button asChild variant="secondary" size="lg" className="justify-between rounded-2xl">
              <Link to="/admin/queue">
                Open Submission Queue
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-700/80 dark:bg-slate-950/92 dark:shadow-[0_22px_60px_-32px_rgba(2,6,23,0.96)]">
          <CardContent className="space-y-3 p-6">
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Total Students
            </Badge>
            <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <Users2 className="size-5 text-primary" />
              {totalStudents}
            </div>
            <p className="text-sm text-muted-foreground">Students with member role in the current dataset.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-700/80 dark:bg-slate-950/92 dark:shadow-[0_22px_60px_-32px_rgba(2,6,23,0.96)]">
          <CardContent className="space-y-3 p-6">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Total XP
            </Badge>
            <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <Trophy className="size-5 text-primary" />
              {totalXp}
            </div>
            <p className="text-sm text-muted-foreground">Combined XP across all users shown in leaderboard records.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-700/80 dark:bg-slate-950/92 dark:shadow-[0_22px_60px_-32px_rgba(2,6,23,0.96)]">
          <CardContent className="space-y-3 p-6">
            <Badge variant="default" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Pending Submissions
            </Badge>
            <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
              <Gauge className="size-5 text-primary-foreground" />
              {submissions.length}
            </div>
            <p className="text-sm text-muted-foreground">Submissions currently awaiting manual review.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-700/80 dark:bg-slate-950/92 dark:shadow-[0_24px_65px_-34px_rgba(2,6,23,0.96)]">
        <CardHeader>
          <CardTitle className="text-2xl">Submissions Table</CardTitle>
          <CardDescription>Pending queue data for fast review triage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-muted-foreground" colSpan={5}>
                    No pending submissions right now.
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((submission, index) => (
                  <TableRow
                    key={submission.id}
                    className={
                      index % 2 === 0
                        ? "bg-white/40 hover:bg-white/55 dark:bg-slate-900/90 dark:hover:bg-slate-800/95"
                        : "bg-slate-50/65 hover:bg-slate-100/80 dark:bg-slate-950/88 dark:hover:bg-slate-900/95"
                    }
                  >
                    <TableCell className="font-medium">#{submission.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{submission.user_name}</p>
                        <p className="text-sm text-muted-foreground">{submission.user_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{submission.problem_title}</TableCell>
                    <TableCell>{formatTimestamp(submission.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">pending</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-700/80 dark:bg-slate-950/92 dark:shadow-[0_24px_65px_-34px_rgba(2,6,23,0.96)]">
        <CardHeader>
          <CardTitle className="text-2xl">User Table</CardTitle>
          <CardDescription>Users sorted by backend data feed with role and XP visibility.</CardDescription>
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
                users.map((user, index) => (
                  <TableRow
                    key={user.email}
                    className={
                      index % 2 === 0
                        ? "bg-white/40 hover:bg-white/55 dark:bg-slate-900/90 dark:hover:bg-slate-800/95"
                        : "bg-slate-50/65 hover:bg-slate-100/80 dark:bg-slate-950/88 dark:hover:bg-slate-900/95"
                    }
                  >
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

