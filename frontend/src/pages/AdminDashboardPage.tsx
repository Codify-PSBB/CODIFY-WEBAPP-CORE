import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { apiRequest } from "@/lib/api"
import type {
  AdminUser, CompetitionPhase, CompetitionProblem, PendingSubmission,
  Problem, SubmissionGroup,
} from "@/types/models"
import {
  AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp,
  Clock, Eye, FilePlus2, Gauge, Pencil, Play, PlusCircle, Radio, RefreshCcw,
  Trash2, Trophy, Users2, X, XCircle, Zap,
} from "lucide-react"

const TOTAL_SLOTS = 10

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function formatElapsed(seconds: number | null): string {
  if (seconds === null) return "—"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompetitionStateResponse {
  phase?: CompetitionPhase
  competition?: {
    id: number
    status: string
    created_by: string
    started_at: string | null
    ended_at: string | null
    created_at: string
  } | null
  competition_problems?: CompetitionProblem[]
  submission_group_count?: number
}

interface AdminProblemsResponse { problems?: Problem[] }
interface AdminUsersResponse { users?: AdminUser[] }
interface AdminSubmissionsResponse {
  submissions?: PendingSubmission[]
  groups?: SubmissionGroup[]
}

interface ProblemFormState {
  title: string; description: string
  publicTestcase1Input: string; publicTestcase1Output: string
  publicTestcase2Input: string; publicTestcase2Output: string
  publicTestcase3Input: string; publicTestcase3Output: string
  testcases: string; xpReward: string; active: boolean
}

const defaultProblemForm: ProblemFormState = {
  title: "", description: "",
  publicTestcase1Input: "", publicTestcase1Output: "",
  publicTestcase2Input: "", publicTestcase2Output: "",
  publicTestcase3Input: "", publicTestcase3Output: "",
  testcases: "", xpReward: "50", active: true,
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  // Competition state
  const [phase, setPhase] = useState<CompetitionPhase>("idle")
  const [competition, setCompetition] = useState<CompetitionStateResponse["competition"]>(null)
  const [competitionProblems, setCompetitionProblems] = useState<CompetitionProblem[]>([])
  const [submissionGroupCount, setSubmissionGroupCount] = useState(0)

  // Problem bank
  const [allProblems, setAllProblems] = useState<Problem[]>([])

  // Users + submissions
  const [users, setUsers] = useState<AdminUser[]>([])
  const [submissions, setSubmissions] = useState<PendingSubmission[]>([])
  const [groups, setGroups] = useState<SubmissionGroup[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [postingProblem, setPostingProblem] = useState(false)
  const [message, setMessage] = useState("")
  const [problemForm, setProblemForm] = useState<ProblemFormState>(defaultProblemForm)
  const [showNewProblemForm, setShowNewProblemForm] = useState(false)
  const [problemActionLoading, setProblemActionLoading] = useState<{ problemId: number; action: "archive" | "delete" | "add" } | null>(null)
  const [previewProblem, setPreviewProblem] = useState<Problem | null>(null)
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null)
  const [editForm, setEditForm] = useState<ProblemFormState>(defaultProblemForm)
  const [savingEdit, setSavingEdit] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [showNewUserForm, setShowNewUserForm] = useState(false)
  const [newUserForm, setNewUserForm] = useState({ name: "", usn: "" })
  const [creatingUser, setCreatingUser] = useState(false)

  // ── Loaders ─────────────────────────────────────────────────────────────────

  const loadCompetitionState = useCallback(async () => {
    const res = await apiRequest<CompetitionStateResponse>("/api/admin/competition")
    const data = res.data
    setPhase(data?.phase ?? "idle")
    setCompetition(data?.competition ?? null)
    setCompetitionProblems(Array.isArray(data?.competition_problems) ? data.competition_problems : [])
    setSubmissionGroupCount(data?.submission_group_count ?? 0)
  }, [])

  const loadAllProblems = useCallback(async () => {
    const res = await apiRequest<AdminProblemsResponse>("/api/admin/problems")
    setAllProblems(Array.isArray(res.data?.problems) ? res.data.problems : [])
  }, [])

  const loadUsers = useCallback(async () => {
    const res = await apiRequest<AdminUsersResponse>("/api/admin/users")
    setUsers(Array.isArray(res.data?.users) ? res.data.users : [])
  }, [])

  const loadSubmissions = useCallback(async () => {
    const res = await apiRequest<AdminSubmissionsResponse>("/api/admin/submissions")
    setSubmissions(Array.isArray(res.data?.submissions) ? res.data.submissions : [])
    setGroups(Array.isArray(res.data?.groups) ? res.data.groups : [])
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    setMessage("")
    try {
      await Promise.all([loadCompetitionState(), loadAllProblems(), loadUsers(), loadSubmissions()])
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to load dashboard.")
    } finally {
      setLoading(false)
    }
  }, [loadCompetitionState, loadAllProblems, loadUsers, loadSubmissions])

  useEffect(() => { void refreshAll() }, [refreshAll])

  // ── Competition actions ──────────────────────────────────────────────────────

  async function createCompetition() {
    setActionLoading(true); setMessage("")
    try {
      await apiRequest("/api/admin/competition/create", { method: "POST", body: {} })
      await loadCompetitionState()
      setMessage("Competition created! Now add problems and go live.")
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed to create.") }
    finally { setActionLoading(false) }
  }

  async function goLive() {
    setActionLoading(true); setMessage("")
    try {
      await apiRequest("/api/admin/competition/go-live", { method: "POST", body: {} })
      await loadCompetitionState()
      setMessage("🚀 Competition is now LIVE!")
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed to go live.") }
    finally { setActionLoading(false) }
  }

  async function endCompetition() {
    if (!window.confirm("End the competition? Students will no longer be able to submit.")) return
    setActionLoading(true); setMessage("")
    try {
      await apiRequest("/api/admin/competition/end", { method: "POST", body: {} })
      await loadCompetitionState()
      setMessage("Competition ended.")
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed to end.") }
    finally { setActionLoading(false) }
  }

  async function resetToIdle() {
    if (!window.confirm("Reset to idle? Historical data is preserved in the DB.")) return
    setActionLoading(true); setMessage("")
    try {
      await apiRequest("/api/admin/competition/reset", { method: "POST", body: {} })
      await loadCompetitionState()
      setMessage("Reset to idle.")
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed to reset.") }
    finally { setActionLoading(false) }
  }

  async function addProblemToCompetition(problemId: number) {
    setProblemActionLoading({ problemId, action: "add" }); setMessage("")
    try {
      await apiRequest("/api/admin/competition/problems/add", { method: "POST", body: { problem_id: problemId } })
      await loadCompetitionState()
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed to add problem.") }
    finally { setProblemActionLoading(null) }
  }

  async function removeProblemFromCompetition(problemId: number) {
    setProblemActionLoading({ problemId, action: "archive" }); setMessage("")
    try {
      await apiRequest("/api/admin/competition/problems/remove", { method: "POST", body: { problem_id: problemId } })
      await loadCompetitionState()
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed to remove problem.") }
    finally { setProblemActionLoading(null) }
  }

  // ── Problem bank actions ─────────────────────────────────────────────────────

  async function createProblem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("")
    const xpReward = Number(problemForm.xpReward)
    if (!Number.isInteger(xpReward) || xpReward < 0) { setMessage("XP reward must be a non-negative integer."); return }
    if (!problemForm.title.trim() || !problemForm.description.trim()) { setMessage("Title and statement are required."); return }
    setPostingProblem(true)
    try {
      await apiRequest("/api/admin/problems", {
        method: "POST",
        body: {
          title: problemForm.title, description: problemForm.description,
          public_testcase_1_input: problemForm.publicTestcase1Input,
          public_testcase_1_output: problemForm.publicTestcase1Output,
          public_testcase_2_input: problemForm.publicTestcase2Input,
          public_testcase_2_output: problemForm.publicTestcase2Output,
          public_testcase_3_input: problemForm.publicTestcase3Input,
          public_testcase_3_output: problemForm.publicTestcase3Output,
          testcases: problemForm.testcases,
          xp_reward: xpReward, active: false,
        },
      })
      setProblemForm(defaultProblemForm)
      setShowNewProblemForm(false)
      await loadAllProblems()
      setMessage("Problem created and added to the problem bank!")
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed to create problem.") }
    finally { setPostingProblem(false) }
  }

  async function deleteProblem(problemId: number) {
    if (!window.confirm(`Delete problem #${problemId}? This is permanent.`)) return
    setProblemActionLoading({ problemId, action: "delete" }); setMessage("")
    try {
      await apiRequest("/api/admin/problems/delete", { method: "POST", body: { problem_id: problemId } })
      await loadAllProblems()
      setMessage(`Problem #${problemId} deleted.`)
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed to delete.") }
    finally { setProblemActionLoading(null) }
  }

  function openEditModal(p: Problem) {
    setEditForm({
      title: p.title,
      description: p.description ?? "",
      publicTestcase1Input: p.public_testcase_1_input ?? "",
      publicTestcase1Output: p.public_testcase_1_output ?? "",
      publicTestcase2Input: p.public_testcase_2_input ?? "",
      publicTestcase2Output: p.public_testcase_2_output ?? "",
      publicTestcase3Input: p.public_testcase_3_input ?? "",
      publicTestcase3Output: p.public_testcase_3_output ?? "",
      testcases: p.testcases ?? "",
      xpReward: String(p.xp_reward),
      active: p.active === 1,
    })
    setEditingProblem(p)
  }

  async function saveEditedProblem(e: React.FormEvent) {
    e.preventDefault()
    if (!editingProblem) return
    const xpReward = Number(editForm.xpReward)
    if (!Number.isInteger(xpReward) || xpReward < 0) { setMessage("XP reward must be a non-negative integer."); return }
    if (!editForm.title.trim() || !editForm.description.trim()) { setMessage("Title and statement are required."); return }
    setSavingEdit(true); setMessage("")
    try {
      await apiRequest("/api/admin/problems/update", {
        method: "POST",
        body: {
          problem_id: editingProblem.id,
          title: editForm.title,
          description: editForm.description,
          public_testcase_1_input: editForm.publicTestcase1Input,
          public_testcase_1_output: editForm.publicTestcase1Output,
          public_testcase_2_input: editForm.publicTestcase2Input,
          public_testcase_2_output: editForm.publicTestcase2Output,
          public_testcase_3_input: editForm.publicTestcase3Input,
          public_testcase_3_output: editForm.publicTestcase3Output,
          testcases: editForm.testcases,
          xp_reward: xpReward,
        },
      })
      setEditingProblem(null)
      await loadAllProblems()
      setMessage(`Problem #${editingProblem.id} updated successfully!`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update problem.")
    } finally {
      setSavingEdit(false)
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setCreatingUser(true)
    setMessage("")
    try {
      await apiRequest("/api/admin/users/create", { method: "POST", body: newUserForm })
      setShowNewUserForm(false)
      setNewUserForm({ name: "", usn: "" })
      await loadUsers()
      setMessage("User created successfully!")
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create user.")
    } finally {
      setCreatingUser(false)
    }
  }

  // ── Submission review ────────────────────────────────────────────────────────

  async function reviewSubmission(submissionId: number, action: "approve" | "reject") {
    setMessage("")
    try {
      await apiRequest("/api/admin/review", { method: "POST", body: { submission_id: submissionId, action } })
      setSubmissions((prev) => prev.filter((s) => s.id !== submissionId))
      setMessage(`Submission #${submissionId} ${action}d.`)
    } catch (e) { setMessage(e instanceof Error ? e.message : `Failed to ${action}.`) }
  }

  function toggleGroup(groupId: number) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) { next.delete(groupId) } else { next.add(groupId) }
      return next
    })
  }

  // Group flat submissions by submission_group_id → one card per student
  const submissionsByGroup = useMemo(() => {
    const map = new Map<number, { groupId: number; userId: number; userName: string; userEmail: string; elapsedSeconds: number | null; submittedAt: string; items: PendingSubmission[] }>()
    for (const s of submissions) {
      const key = s.submission_group_id ?? s.user_id
      if (!map.has(key)) {
        map.set(key, {
          groupId: key,
          userId: s.user_id,
          userName: s.user_name,
          userEmail: s.user_email,
          elapsedSeconds: s.elapsed_seconds,
          submittedAt: s.created_at,
          items: [],
        })
      }
      map.get(key)!.items.push(s)
    }
    return Array.from(map.values())
  }, [submissions])

  // ── Derived stats ────────────────────────────────────────────────────────────

  const totalStudents = useMemo(() => users.filter((u) => u.role === "member").length, [users])
  const totalXp = useMemo(() => users.reduce((sum, u) => sum + u.xp, 0), [users])
  const competitionProblemIds = new Set(competitionProblems.map((p) => p.problem_id))

  const isError = (msg: string) =>
    msg.includes("Failed") || msg.includes("Cannot") || msg.includes("error")

  // ── Phase panels ──────────────────────────────────────────────────────────────

  const phaseLabel: Record<CompetitionPhase, string> = {
    idle: "Idle — No Active Competition",
    setup: "Setup — Building Competition",
    live: "LIVE — Competition Running",
    ended: "Ended — Competition Over",
  }

  const phaseColor: Record<CompetitionPhase, string> = {
    idle: "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40",
    setup: "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20",
    live: "border-green-400 bg-green-50 dark:border-green-600 dark:bg-green-900/20",
    ended: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20",
  }

  return (
    <div className="space-y-6">
      {/* ── Header card ──────────────────────────────────────────────────────── */}
      <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-soft dark:border-border dark:bg-background">
        <CardHeader className="gap-4">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Admin Control Room</p>
            <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
              Manage competitions, problems, and submissions.
            </CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em] border ${phaseColor[phase]}`}
              variant="outline"
            >
              {phase === "live" && <Radio className="size-3 mr-1.5 animate-pulse text-green-600" />}
              {phaseLabel[phase]}
            </Badge>
            <Button variant="outline" size="lg" onClick={() => void refreshAll()} disabled={loading}>
              <RefreshCcw className="mr-2 size-4" />
              Refresh
            </Button>
            <Button asChild variant="secondary" size="lg" className="gap-2 rounded-2xl">
              <Link to="/admin/queue">
                Open Submission Queue
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* ── Message banner ───────────────────────────────────────────────────── */}
      {message && (
        <div className={`rounded-2xl border p-4 text-sm ${
          isError(message)
            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
            : "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400"
        }`}>
          <div className="flex items-center gap-2">
            {isError(message) ? <AlertTriangle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
            <span>{message}</span>
          </div>
        </div>
      )}

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Students", value: totalStudents, icon: <Users2 className="size-5 text-primary" />, variant: "outline" as const },
          { label: "Total XP Awarded", value: totalXp, icon: <Trophy className="size-5 text-primary" />, variant: "secondary" as const },
          { label: phase === "live" ? "Students Submitted" : "Pending Submissions", value: phase === "live" ? submissionGroupCount : submissions.length, icon: <Gauge className="size-5 text-primary-foreground" />, variant: "default" as const },
        ].map((stat) => (
          <Card key={stat.label} className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
            <CardContent className="space-y-3 p-6">
              <Badge variant={stat.variant} className="rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]">{stat.label}</Badge>
              <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
                {stat.icon}
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PHASE: IDLE                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {phase === "idle" && (
        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
          <CardHeader>
            <CardTitle className="text-2xl">Start a New Competition</CardTitle>
            <CardDescription>
              Create a competition, add problems in the setup phase, then go live when ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <Button
              size="lg"
              className="gap-2 text-base px-8 py-5 rounded-2xl"
              onClick={() => void createCompetition()}
              disabled={actionLoading}
            >
              <Play className="size-5" />
              {actionLoading ? "Creating…" : "Create New Competition"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PHASE: SETUP                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {phase === "setup" && (
        <>
          {/* ── 10-Slot Question Grid ──────────────────────────────────────── */}
          <Card className="rounded-[28px] border-blue-200 bg-blue-50/50 shadow-soft dark:border-blue-800 dark:bg-blue-950/20">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-2xl">Competition Setup</CardTitle>
                  <CardDescription>
                    Fill up to {TOTAL_SLOTS} question slots. Pick from the bank below or create new ones.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {/* Progress badge */}
                  <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2">
                    <span className={`text-2xl font-bold tabular-nums ${
                      competitionProblems.length === TOTAL_SLOTS ? "text-green-600" : competitionProblems.length > 0 ? "text-blue-600" : "text-muted-foreground"
                    }`}>{competitionProblems.length}</span>
                    <span className="text-sm text-muted-foreground">/ {TOTAL_SLOTS}</span>
                  </div>
                  <Button
                    size="lg"
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white px-8 rounded-2xl"
                    onClick={() => void goLive()}
                    disabled={actionLoading || competitionProblems.length === 0}
                  >
                    <Radio className="size-4" />
                    {actionLoading ? "Going live…" : "Go Live"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Visual 10-slot grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
                  const filled = competitionProblems[i]
                  return (
                    <div
                      key={i}
                      className={`relative rounded-xl border-2 border-dashed p-3 min-h-[80px] flex flex-col justify-between transition-all ${
                        filled
                          ? "border-blue-400 bg-blue-50/80 dark:bg-blue-900/20 dark:border-blue-600"
                          : "border-border/50 bg-muted/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                          filled ? "bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200" : "bg-muted text-muted-foreground"
                        }`}>Q{i + 1}</span>
                        {filled && (
                          <button
                            type="button"
                            className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                            onClick={() => void removeProblemFromCompetition(filled.problem_id)}
                          >
                            <XCircle className="size-4" />
                          </button>
                        )}
                      </div>
                      {filled ? (
                        <div className="mt-1.5">
                          <p className="text-xs font-medium leading-tight line-clamp-2">{filled.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{filled.xp_reward} XP</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/50 mt-1">Empty</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Problem Bank for picking ───────────────────────────────────── */}
          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-2xl">Problem Bank</CardTitle>
                  <CardDescription>Click &ldquo;Add&rdquo; to fill a slot. Create new problems with the button on the right.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowNewProblemForm(!showNewProblemForm)} className="gap-2">
                  <FilePlus2 className="size-4" />
                  {showNewProblemForm ? "Cancel" : "Create New Problem"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Inline new problem form */}
              {showNewProblemForm && (
                <div className="rounded-2xl border border-border bg-muted/20 p-6 space-y-4">
                  <h4 className="font-semibold">Create New Problem</h4>
                  <form className="space-y-4" onSubmit={(e) => void createProblem(e)}>
                    <div className="grid gap-4 md:grid-cols-[1.2fr_0.4fr]">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input value={problemForm.title} onChange={(e) => setProblemForm((c) => ({ ...c, title: e.target.value }))} placeholder="e.g. Reverse The Number" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">XP Reward</label>
                        <Input type="number" min={0} value={problemForm.xpReward} onChange={(e) => setProblemForm((c) => ({ ...c, xpReward: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Problem Statement</label>
                      <Textarea className="min-h-28" value={problemForm.description} onChange={(e) => setProblemForm((c) => ({ ...c, description: e.target.value }))} placeholder="Full problem statement..." />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="contents">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Test Case {n} Input</label>
                            <Textarea className="min-h-20" value={problemForm[`publicTestcase${n}Input` as keyof ProblemFormState] as string} onChange={(e) => setProblemForm((c) => ({ ...c, [`publicTestcase${n}Input`]: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Test Case {n} Output</label>
                            <Textarea className="min-h-20" value={problemForm[`publicTestcase${n}Output` as keyof ProblemFormState] as string} onChange={(e) => setProblemForm((c) => ({ ...c, [`publicTestcase${n}Output`]: e.target.value }))} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={() => setShowNewProblemForm(false)}>Cancel</Button>
                      <Button type="submit" disabled={postingProblem}>{postingProblem ? "Creating…" : "Create Problem"}</Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Problem list */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>XP</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allProblems.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="py-6 text-muted-foreground">No problems in bank yet. Create one above.</TableCell></TableRow>
                  ) : (
                    allProblems.map((p) => {
                      const inCompetition = competitionProblemIds.has(p.id)
                      const isFull = competitionProblems.length >= TOTAL_SLOTS
                      return (
                        <TableRow key={p.id} className={inCompetition ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}>
                          <TableCell>
                            <button
                              type="button"
                              className="flex items-center gap-1.5 text-left group w-full"
                              onClick={() => setPreviewProblem(p)}
                            >
                              <span className="font-medium group-hover:underline underline-offset-2 truncate max-w-[260px]">{p.title}</span>
                              <Eye className="size-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          </TableCell>
                          <TableCell className="shrink-0">{p.xp_reward}</TableCell>
                          <TableCell className="text-right shrink-0">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => openEditModal(p)}
                              >
                                <Pencil className="size-3.5" />Edit
                              </Button>
                              {inCompetition ? (
                                <Badge variant="secondary" className="text-xs gap-1"><CheckCircle2 className="size-3" />Added</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => void addProblemToCompetition(p.id)}
                                  disabled={isFull || (problemActionLoading?.problemId === p.id && problemActionLoading.action === "add")}
                                >
                                  <PlusCircle className="size-3.5" />
                                  {isFull ? "Full" : `Add as Q${competitionProblems.length + 1}`}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PHASE: LIVE                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {phase === "live" && (
        <>
          {/* Live control */}
          <Card className="rounded-[28px] border-green-400 bg-green-50/50 shadow-soft dark:border-green-700 dark:bg-green-950/20">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500" />
                  </span>
                  <div>
                    <CardTitle className="text-2xl text-green-800 dark:text-green-300">Competition is LIVE</CardTitle>
                    <CardDescription>
                      {competition?.started_at && `Started: ${formatTimestamp(competition.started_at)}`}
                      {" · "}{submissionGroupCount} student{submissionGroupCount !== 1 ? "s" : ""} submitted
                    </CardDescription>
                  </div>
                </div>
                <Button
                  size="lg"
                  variant="destructive"
                  className="gap-2 rounded-2xl"
                  onClick={() => void endCompetition()}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Ending…" : "End Competition"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {competitionProblems.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm">
                    <span className="text-xs text-muted-foreground">{i + 1}.</span>
                    <span className="font-medium">{p.title}</span>
                    <Badge variant="secondary" className="text-xs gap-1"><Zap className="size-2.5" />{p.xp_reward} XP</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Live submission groups */}
          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Submission Feed</CardTitle>
                  <CardDescription>Students who have submitted — sorted by fastest time.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => void loadSubmissions()} className="gap-2">
                  <RefreshCcw className="size-4" />Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No submissions yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((g, i) => (
                      <TableRow key={g.group_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{i + 1}.</span>
                            <div>
                              <p className="font-medium">{g.user_name}</p>
                              <p className="text-xs text-muted-foreground">{g.user_email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-mono font-semibold">
                            <Clock className="size-3.5 text-muted-foreground" />
                            {formatElapsed(g.elapsed_seconds)}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatTimestamp(g.submitted_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* PHASE: ENDED                                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {phase === "ended" && (
        <Card className="rounded-[28px] border-amber-300 bg-amber-50/50 shadow-soft dark:border-amber-700 dark:bg-amber-950/20">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl">Competition Ended</CardTitle>
                <CardDescription>
                  {competition?.ended_at && `Ended: ${formatTimestamp(competition.ended_at)}`}
                  {" · "}{submissionGroupCount} student{submissionGroupCount !== 1 ? "s" : ""} submitted
                </CardDescription>
              </div>
              <Button size="lg" variant="outline" className="gap-2 rounded-2xl" onClick={() => void resetToIdle()} disabled={actionLoading}>
                {actionLoading ? "Resetting…" : "Reset to Idle"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {groups.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g, i) => (
                    <TableRow key={g.group_id}>
                      <TableCell className="font-semibold">#{i + 1}</TableCell>
                      <TableCell>
                        <p className="font-medium">{g.user_name}</p>
                        <p className="text-xs text-muted-foreground">{g.user_email}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono font-semibold">
                          <Clock className="size-3.5 text-muted-foreground" />
                          {formatElapsed(g.elapsed_seconds)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ALWAYS VISIBLE: Pending Submissions for Review                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Submission Review</CardTitle>
              <CardDescription>
                {submissionsByGroup.length > 0
                  ? `${submissionsByGroup.length} student${submissionsByGroup.length !== 1 ? "s" : ""} · ${submissions.length} pending answer${submissions.length !== 1 ? "s" : ""}`
                  : "Approve or reject pending submissions."}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadSubmissions()} className="gap-2">
              <RefreshCcw className="size-4" />Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {submissionsByGroup.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No pending submissions.</p>
          ) : (
            submissionsByGroup.map((group, idx) => {
              const isOpen = expandedGroups.has(group.groupId)
              const pendingCount = group.items.length
              return (
                <div key={group.groupId} className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
                  {/* ── Group header (always visible) ── */}
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
                    onClick={() => toggleGroup(group.groupId)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="shrink-0 flex items-center justify-center size-7 rounded-full bg-primary/10 text-primary text-xs font-bold">{idx + 1}</span>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{group.userName}</p>
                        <p className="text-xs text-muted-foreground truncate">{group.userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden sm:flex items-center gap-1.5 font-mono text-sm font-semibold">
                        <Clock className="size-3.5 text-muted-foreground" />
                        {formatElapsed(group.elapsedSeconds)}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {pendingCount} answer{pendingCount !== 1 ? "s" : ""}
                      </Badge>
                      {isOpen
                        ? <ChevronUp className="size-4 text-muted-foreground" />
                        : <ChevronDown className="size-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* ── Expanded: individual answers ── */}
                  {isOpen && (
                    <div className="border-t border-border divide-y divide-border">
                      {group.items.map((s) => (
                        <div key={s.id} className="px-5 py-4 space-y-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                              <p className="font-medium text-sm">{s.problem_title}</p>
                              <p className="text-xs text-muted-foreground">{formatTimestamp(s.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="gap-1 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => void reviewSubmission(s.id, "approve")}
                              >
                                <CheckCircle2 className="size-3.5" />Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => void reviewSubmission(s.id, "reject")}
                              >
                                <XCircle className="size-3.5" />Reject
                              </Button>
                            </div>
                          </div>
                          {/* Code preview */}
                          <pre className="text-xs bg-muted/40 border border-border rounded-xl px-4 py-3 overflow-x-auto max-h-48 font-mono leading-relaxed whitespace-pre-wrap">{s.code}</pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* ── Problem bank (always visible for management) ─────────────────────── */}
      {phase !== "setup" && (
        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-2xl">Problem Bank</CardTitle>
                <CardDescription>All problems — available for future competitions.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowNewProblemForm(!showNewProblemForm)} className="gap-2">
                <FilePlus2 className="size-4" />{showNewProblemForm ? "Cancel" : "New Problem"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showNewProblemForm && (
              <div className="rounded-2xl border border-border bg-muted/20 p-6 space-y-4">
                <h4 className="font-semibold">Create New Problem</h4>
                <form className="space-y-4" onSubmit={(e) => void createProblem(e)}>
                  <div className="grid gap-4 md:grid-cols-[1.2fr_0.4fr]">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Title</label>
                      <Input value={problemForm.title} onChange={(e) => setProblemForm((c) => ({ ...c, title: e.target.value }))} placeholder="e.g. Reverse The Number" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">XP Reward</label>
                      <Input type="number" min={0} value={problemForm.xpReward} onChange={(e) => setProblemForm((c) => ({ ...c, xpReward: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Problem Statement</label>
                    <Textarea className="min-h-28" value={problemForm.description} onChange={(e) => setProblemForm((c) => ({ ...c, description: e.target.value }))} placeholder="Full problem statement..." />
                  </div>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Test Case {n} Input</label>
                        <Textarea className="min-h-20" value={problemForm[`publicTestcase${n}Input` as keyof ProblemFormState] as string} onChange={(e) => setProblemForm((c) => ({ ...c, [`publicTestcase${n}Input`]: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Test Case {n} Output</label>
                        <Textarea className="min-h-20" value={problemForm[`publicTestcase${n}Output` as keyof ProblemFormState] as string} onChange={(e) => setProblemForm((c) => ({ ...c, [`publicTestcase${n}Output`]: e.target.value }))} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={() => setShowNewProblemForm(false)}>Cancel</Button>
                    <Button type="submit" disabled={postingProblem}>{postingProblem ? "Creating…" : "Create Problem"}</Button>
                  </div>
                </form>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>XP</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProblems.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="py-6 text-muted-foreground">No problems yet.</TableCell></TableRow>
                ) : (
                  allProblems.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-0">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-left group w-full"
                          onClick={() => setPreviewProblem(p)}
                        >
                          <span className="font-medium group-hover:underline underline-offset-2 truncate">{p.title}</span>
                          <Eye className="size-3.5 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{p.xp_reward}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{p.created_at ? formatTimestamp(p.created_at) : "—"}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void deleteProblem(p.id)}
                          disabled={problemActionLoading?.problemId === p.id && problemActionLoading.action === "delete"}
                        >
                          {(p.submission_count ?? 0) > 0 ? "Has submissions" : "Delete"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── User Table ──────────────────────────────────────────────────────── */}
      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-2xl">User Table</CardTitle>
              <CardDescription>All registered users with role and XP.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowNewUserForm(!showNewUserForm)} className="gap-2">
              <FilePlus2 className="size-4" />{showNewUserForm ? "Cancel" : "New User"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showNewUserForm && (
            <div className="rounded-2xl border border-border bg-muted/20 p-6 space-y-4">
              <h4 className="font-semibold">Create New User</h4>
              <form className="space-y-4" onSubmit={(e) => void createUser(e)}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input required value={newUserForm.name} onChange={(e) => setNewUserForm((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. John Doe" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">USN (Username & Password)</label>
                    <Input required value={newUserForm.usn} onChange={(e) => setNewUserForm((c) => ({ ...c, usn: e.target.value }))} placeholder="e.g. S123456" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setShowNewUserForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={creatingUser}>{creatingUser ? "Creating…" : "Create User"}</Button>
                </div>
              </form>
            </div>
          )}
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
                <TableRow><TableCell colSpan={4} className="py-6 text-muted-foreground">No users yet.</TableCell></TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.email}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{u.xp}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {/* ── Problem Preview Modal ─────────────────────────────────────────────── */}
      {previewProblem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setPreviewProblem(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[24px] border border-border bg-background shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold leading-snug">{previewProblem.title}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1 text-xs"><Zap className="size-3" />{previewProblem.xp_reward} XP</Badge>
                  {previewProblem.created_at && (
                    <span className="text-xs text-muted-foreground">{formatTimestamp(previewProblem.created_at)}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full p-1.5 hover:bg-muted transition-colors"
                onClick={() => setPreviewProblem(null)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{previewProblem.description || "No description."}</p>
            </div>
            {[1, 2, 3].map((n) => {
              const input = previewProblem[`public_testcase_${n}_input` as keyof Problem] as string | null
              const output = previewProblem[`public_testcase_${n}_output` as keyof Problem] as string | null
              if (!input && !output) return null
              return (
                <div key={n} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Test Case {n}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/30 border border-border p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">Input</p>
                      <pre className="text-xs whitespace-pre-wrap font-mono">{input || "—"}</pre>
                    </div>
                    <div className="rounded-lg bg-muted/30 border border-border p-3">
                      <p className="text-[10px] text-muted-foreground mb-1">Expected Output</p>
                      <pre className="text-xs whitespace-pre-wrap font-mono">{output || "—"}</pre>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Edit Problem Modal ──────────────────────────────────────────────────── */}
      {editingProblem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setEditingProblem(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[24px] border border-border bg-background shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-bold">Edit Problem #{editingProblem.id}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Changes apply immediately to the problem bank.</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-full p-1.5 hover:bg-muted transition-colors"
                onClick={() => setEditingProblem(null)}
              >
                <X className="size-4" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={(e) => void saveEditedProblem(e)}>
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.4fr]">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm((c) => ({ ...c, title: e.target.value }))}
                    placeholder="e.g. Reverse The Number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">XP Reward</label>
                  <Input
                    type="number" min={0}
                    value={editForm.xpReward}
                    onChange={(e) => setEditForm((c) => ({ ...c, xpReward: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Problem Statement</label>
                <Textarea
                  className="min-h-28"
                  value={editForm.description}
                  onChange={(e) => setEditForm((c) => ({ ...c, description: e.target.value }))}
                  placeholder="Full problem statement..."
                />
              </div>
              {[1, 2, 3].map((n) => (
                <div key={n} className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Test Case {n} Input</label>
                    <Textarea
                      className="min-h-20 font-mono text-xs"
                      value={editForm[`publicTestcase${n}Input` as keyof ProblemFormState] as string}
                      onChange={(e) => setEditForm((c) => ({ ...c, [`publicTestcase${n}Input`]: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Test Case {n} Output</label>
                    <Textarea
                      className="min-h-20 font-mono text-xs"
                      value={editForm[`publicTestcase${n}Output` as keyof ProblemFormState] as string}
                      onChange={(e) => setEditForm((c) => ({ ...c, [`publicTestcase${n}Output`]: e.target.value }))}
                    />
                  </div>
                </div>
              ))}
              <div className="space-y-2">
                <label className="text-sm font-medium">Hidden Test Cases (JSON)</label>
                <Textarea
                  className="min-h-20 font-mono text-xs"
                  value={editForm.testcases}
                  onChange={(e) => setEditForm((c) => ({ ...c, testcases: e.target.value }))}
                  placeholder='[["input", "expected_output"], ...]'
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditingProblem(null)}>Cancel</Button>
                <Button type="submit" className="gap-2" disabled={savingEdit}>
                  <Pencil className="size-3.5" />
                  {savingEdit ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
