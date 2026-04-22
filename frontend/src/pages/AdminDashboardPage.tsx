import { FormEvent, useEffect, useMemo, useState } from "react"
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
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { apiRequest } from "@/lib/api"
import type { AdminUser, AppStatus, PendingSubmission, Problem, ToggleState } from "@/types/models"
import { ArrowRight, FilePlus2, Gauge, RefreshCcw, Trophy, Users2, AlertTriangle } from "lucide-react"

interface PendingSubmissionsResponse {
  submissions?: PendingSubmission[]
}

interface AdminUsersResponse {
  users?: AdminUser[]
}

interface AdminProblemsResponse {
  problems?: Problem[]
}

interface ToggleResponse extends Partial<ToggleState> {
  app_status?: AppStatus
}

interface ProblemCreateResponse {
  problem?: Problem
  message?: string
}

interface ProblemActionResponse {
  problem?: Problem
  deleted_problem_id?: number
  message?: string
}

interface ProblemFormState {
  title: string
  description: string
  publicTestcase1Input: string
  publicTestcase1Output: string
  publicTestcase2Input: string
  publicTestcase2Output: string
  publicTestcase3Input: string
  publicTestcase3Output: string
  testcases: string
  xpReward: string
  active: boolean
}

const defaultProblemForm: ProblemFormState = {
  title: "",
  description: "",
  publicTestcase1Input: "",
  publicTestcase1Output: "",
  publicTestcase2Input: "",
  publicTestcase2Output: "",
  publicTestcase3Input: "",
  publicTestcase3Output: "",
  testcases: "",
  xpReward: "50",
  active: true,
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
  const [problems, setProblems] = useState<Problem[]>([])
  const [appStatus, setAppStatus] = useState<AppStatus | "UNKNOWN">("UNKNOWN")
  const [offVoteCount, setOffVoteCount] = useState(0)
  const [offVotesRequired, setOffVotesRequired] = useState(2)
  const [hasVotedOff, setHasVotedOff] = useState(false)
  const [loading, setLoading] = useState(false)
  const [postingProblem, setPostingProblem] = useState(false)
  const [problemActionLoading, setProblemActionLoading] = useState<{ problemId: number; action: "archive" | "delete" } | null>(null)
  const [message, setMessage] = useState("")
  const [problemForm, setProblemForm] = useState<ProblemFormState>(defaultProblemForm)

  const remainingOffVotes = Math.max(offVotesRequired - offVoteCount, 0)

  const totalStudents = useMemo(
    () => users.filter((user) => user.role === "member").length,
    [users]
  )
  const totalXp = useMemo(
    () => users.reduce((sum, user) => sum + user.xp, 0),
    [users]
  )

  function applyToggleState(payload?: ToggleResponse) {
    if (!payload) {
      return
    }

    const status = payload.app_status
    if (status === "ON" || status === "OFF") {
      setAppStatus(status)
    }

    if (typeof payload.off_vote_count === "number") {
      setOffVoteCount(payload.off_vote_count)
    }

    if (typeof payload.off_votes_required === "number") {
      setOffVotesRequired(payload.off_votes_required)
    }

    if (typeof payload.has_voted_off === "boolean") {
      setHasVotedOff(payload.has_voted_off)
    }
  }

  async function loadPendingSubmissions() {
    const response = await apiRequest<PendingSubmissionsResponse>("/api/admin/submissions")
    setSubmissions(Array.isArray(response.data?.submissions) ? response.data.submissions : [])
  }

  async function loadUsers() {
    const response = await apiRequest<AdminUsersResponse>("/api/admin/users")
    setUsers(Array.isArray(response.data?.users) ? response.data.users : [])
  }

  async function loadProblems() {
    const response = await apiRequest<AdminProblemsResponse>("/api/admin/problems")
    setProblems(Array.isArray(response.data?.problems) ? response.data.problems : [])
  }

  async function loadAppStatus() {
    const response = await apiRequest<ToggleResponse>("/api/admin/toggle")
    applyToggleState(response.data)
  }

  async function refreshDashboard() {
    setLoading(true)
    setMessage("")

    try {
      await Promise.all([loadPendingSubmissions(), loadUsers(), loadProblems(), loadAppStatus()])
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

      applyToggleState(response.data)

      const nextStatus = response.data?.app_status ?? status
      setAppStatus(nextStatus)
      setMessage(response.data?.message ?? `Competition status: ${nextStatus}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to toggle competition.")
    }
  }

  async function createProblem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")

    const xpReward = Number(problemForm.xpReward)
    if (!Number.isInteger(xpReward) || xpReward < 0) {
      setMessage("XP reward must be a non-negative integer.")
      return
    }

    if (!problemForm.title.trim() || !problemForm.description.trim()) {
      setMessage("Problem title and statement are required.")
      return
    }

    setPostingProblem(true)

    try {
      const response = await apiRequest<ProblemCreateResponse>("/api/admin/problems", {
        method: "POST",
        body: {
          title: problemForm.title,
          description: problemForm.description,
          public_testcase_1_input: problemForm.publicTestcase1Input,
          public_testcase_1_output: problemForm.publicTestcase1Output,
          public_testcase_2_input: problemForm.publicTestcase2Input,
          public_testcase_2_output: problemForm.publicTestcase2Output,
          public_testcase_3_input: problemForm.publicTestcase3Input,
          public_testcase_3_output: problemForm.publicTestcase3Output,
          testcases: problemForm.testcases,
          xp_reward: xpReward,
          active: problemForm.active,
        },
      })

      const createdId = response.data?.problem?.id
      setMessage(
        response.data?.message ??
          (createdId
            ? `Problem #${createdId} created successfully.`
            : "Problem created successfully.")
      )
      setProblemForm(defaultProblemForm)
      await loadProblems()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create problem.")
    } finally {
      setPostingProblem(false)
    }
  }

  async function archiveProblem(problemId: number) {
    setProblemActionLoading({ problemId, action: "archive" })
    setMessage("")

    try {
      const response = await apiRequest<ProblemActionResponse>("/api/admin/problems/archive", {
        method: "POST",
        body: { problem_id: problemId },
      })

      setMessage(response.data?.message ?? `Problem #${problemId} archived.`)
      await loadProblems()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to archive problem.")
    } finally {
      setProblemActionLoading(null)
    }
  }

  async function deleteProblem(problemId: number) {
    const confirmed = window.confirm(
      `Delete problem #${problemId}? This is permanent and should only be used for problems with no submissions.`
    )

    if (!confirmed) {
      return
    }

    setProblemActionLoading({ problemId, action: "delete" })
    setMessage("")

    try {
      console.log(`Attempting to delete problem #${problemId}`)
      const response = await apiRequest<ProblemActionResponse>("/api/admin/problems/delete", {
        method: "POST",
        body: { problem_id: problemId },
      })

      console.log('Delete response:', response)
      
      if (response.data?.message) {
        setMessage(response.data.message)
      } else {
        setMessage(`Problem #${problemId} deleted.`)
      }
      
      await loadProblems()
    } catch (error) {
      console.error('Delete error:', error)
      
      if (error instanceof Error) {
        // Check for 409 conflict (submissions exist)
        if ((error as any).status === 409 || error.message.includes('submissions')) {
          setMessage(`Cannot delete: ${error.message}`)
        } else {
          setMessage(`Delete failed: ${error.message}`)
        }
      } else {
        setMessage("Failed to delete problem.")
      }
    } finally {
      setProblemActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-soft dark:border-slate-500/80 dark:bg-[#111827] ">
        <CardHeader className="gap-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Admin Control Room
            </p>
            <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
              Post competitions, review submissions, and control competition access.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground">
              Turning OFF now requires at least 2 admin votes. Turning ON is immediate and resets OFF votes.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={appStatus === "ON" ? "default" : "secondary"} className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">
              Competition {appStatus}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.14em]">
              OFF Votes {offVoteCount}/{offVotesRequired}
            </Badge>
            <Button variant="outline" size="lg" onClick={() => void refreshDashboard()} disabled={loading}>
              <RefreshCcw className="mr-2 size-4" />
              Refresh Dashboard
            </Button>
            <Button size="lg" onClick={() => void toggleCompetition("ON")}>Turn ON</Button>
            <Button variant="outline" size="lg" onClick={() => void toggleCompetition("OFF")}>
              {hasVotedOff && appStatus === "ON" ? "Voted OFF" : "Vote OFF"}
            </Button>
            <Button asChild variant="secondary" size="lg" className="justify-between rounded-2xl">
              <Link to="/admin/queue">
                Open Submission Queue
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          {appStatus === "ON" ? (
            <p className="text-sm text-muted-foreground">
              {remainingOffVotes === 0
                ? "OFF vote threshold reached."
                : `${remainingOffVotes} more OFF vote${remainingOffVotes === 1 ? "" : "s"} needed to switch OFF.`}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-500/80 dark:bg-[#111827] ">
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

        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-500/80 dark:bg-[#111827] ">
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

        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-500/80 dark:bg-[#111827] ">
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

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-500/80 dark:bg-[#111827] ">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FilePlus2 className="size-5" />
            Post New Competition Problem
          </CardTitle>
          <CardDescription>
            Keep exactly one live competition question at a time. Posting as active will automatically archive any currently active question.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void createProblem(event)}>
            <div className="grid gap-4 md:grid-cols-[1.2fr_0.4fr_0.4fr]">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="problem-title">Problem Title</label>
                <Input
                  id="problem-title"
                  value={problemForm.title}
                  onChange={(event) => setProblemForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="e.g. Reverse The Number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="problem-xp">XP Reward</label>
                <Input
                  id="problem-xp"
                  type="number"
                  min={0}
                  value={problemForm.xpReward}
                  onChange={(event) => setProblemForm((current) => ({ ...current, xpReward: event.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={problemForm.active}
                    onChange={(event) => setProblemForm((current) => ({ ...current, active: event.target.checked }))}
                  />
                  Set As Active Competition Question
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="problem-statement">Problem Statement</label>
              <Textarea
                id="problem-statement"
                className="min-h-36"
                value={problemForm.description}
                onChange={(event) => setProblemForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Write the full problem statement here..."
              />
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">Public Test Cases (Visible to Students)</h4>
                <p className="text-xs text-muted-foreground">Students will test their code against these cases before submission</p>
              </div>
              
              {/* Test Case 1 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="testcase-1-input">Test Case 1 Input</label>
                  <Textarea
                    id="testcase-1-input"
                    className="min-h-24"
                    value={problemForm.publicTestcase1Input}
                    onChange={(event) => setProblemForm((current) => ({ ...current, publicTestcase1Input: event.target.value }))}
                    placeholder="e.g. 3 5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="testcase-1-output">Test Case 1 Output</label>
                  <Textarea
                    id="testcase-1-output"
                    className="min-h-24"
                    value={problemForm.publicTestcase1Output}
                    onChange={(event) => setProblemForm((current) => ({ ...current, publicTestcase1Output: event.target.value }))}
                    placeholder="e.g. 8"
                  />
                </div>
              </div>

              {/* Test Case 2 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="testcase-2-input">Test Case 2 Input</label>
                  <Textarea
                    id="testcase-2-input"
                    className="min-h-24"
                    value={problemForm.publicTestcase2Input}
                    onChange={(event) => setProblemForm((current) => ({ ...current, publicTestcase2Input: event.target.value }))}
                    placeholder="e.g. 10 20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="testcase-2-output">Test Case 2 Output</label>
                  <Textarea
                    id="testcase-2-output"
                    className="min-h-24"
                    value={problemForm.publicTestcase2Output}
                    onChange={(event) => setProblemForm((current) => ({ ...current, publicTestcase2Output: event.target.value }))}
                    placeholder="e.g. 30"
                  />
                </div>
              </div>

              {/* Test Case 3 */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="testcase-3-input">Test Case 3 Input</label>
                  <Textarea
                    id="testcase-3-input"
                    className="min-h-24"
                    value={problemForm.publicTestcase3Input}
                    onChange={(event) => setProblemForm((current) => ({ ...current, publicTestcase3Input: event.target.value }))}
                    placeholder="e.g. 1 2 3"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="testcase-3-output">Test Case 3 Output</label>
                  <Textarea
                    id="testcase-3-output"
                    className="min-h-24"
                    value={problemForm.publicTestcase3Output}
                    onChange={(event) => setProblemForm((current) => ({ ...current, publicTestcase3Output: event.target.value }))}
                    placeholder="e.g. 6"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="testcases">Testcases Notes (Optional)</label>
              <Textarea
                id="testcases"
                className="min-h-28"
                value={problemForm.testcases}
                onChange={(event) => setProblemForm((current) => ({ ...current, testcases: event.target.value }))}
                placeholder="Add hidden testcase ideas or notes for reviewers."
              />
            </div>

            <div className="flex justify-end">
              <Button size="lg" disabled={postingProblem}>
                {postingProblem ? "Posting..." : "Post Competition"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-500/80 dark:bg-[#111827] ">
        <CardHeader>
          <CardTitle className="text-2xl">Competition Problems</CardTitle>
          <CardDescription>All posted competition questions with publish status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>XP</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {problems.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-muted-foreground" colSpan={7}>
                    No problems posted yet.
                  </TableCell>
                </TableRow>
              ) : (
                problems.map((problem, index) => (
                  <TableRow
                    key={problem.id}
                    className={
                      index % 2 === 0
                        ? "bg-white/40 hover:bg-white/55 dark:bg-[#111827] dark:hover:bg-slate-600/35"
                        : "bg-slate-50/65 hover:bg-slate-100/80 dark:bg-[#111827] dark:hover:bg-slate-600/35"
                    }
                  >
                    <TableCell className="font-medium">#{problem.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{problem.title}</p>
                        <p className="line-clamp-1 text-sm text-muted-foreground">{problem.description}</p>
                      </div>
                    </TableCell>
                    <TableCell>{problem.xp_reward}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{problem.submission_count ?? 0}</span>
                        {problem.submission_count && problem.submission_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {problem.submission_count}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={problem.active === 1 ? "default" : "secondary"}>
                        {problem.active === 1 ? "Active" : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell>{problem.created_at ? formatTimestamp(problem.created_at) : "-"}</TableCell>
                    <TableCell className="text-right">
                      {problem.active === 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void archiveProblem(problem.id)}
                          disabled={Boolean(problemActionLoading) || appStatus === "ON"}
                          title={appStatus === "ON" ? "Turn competition OFF before archiving." : undefined}
                        >
                          {problemActionLoading?.problemId === problem.id && problemActionLoading.action === "archive"
                            ? "Archiving..."
                            : "Archive"}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          {(problem.submission_count ?? 0) > 0 && (
                            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="size-3" />
                              <span>Has submissions</span>
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => void deleteProblem(problem.id)}
                            disabled={Boolean(problemActionLoading) || ((problem.submission_count ?? 0) > 0)}
                            title={(problem.submission_count ?? 0) > 0 ? "Cannot delete problems with submissions" : undefined}
                          >
                            {problemActionLoading?.problemId === problem.id && problemActionLoading.action === "delete"
                              ? "Deleting..."
                              : "Delete"}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-500/80 dark:bg-[#111827] ">
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
                        ? "bg-white/40 hover:bg-white/55 dark:bg-[#111827] dark:hover:bg-slate-600/35"
                        : "bg-slate-50/65 hover:bg-slate-100/80 dark:bg-[#111827] dark:hover:bg-slate-600/35"
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

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-slate-500/80 dark:bg-[#111827] ">
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
                        ? "bg-white/40 hover:bg-white/55 dark:bg-[#111827] dark:hover:bg-slate-600/35"
                        : "bg-slate-50/65 hover:bg-slate-100/80 dark:bg-[#111827] dark:hover:bg-slate-600/35"
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

