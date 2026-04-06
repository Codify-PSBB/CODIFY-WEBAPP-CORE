import { FormEvent, useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import Editor from "@monaco-editor/react"
import { apiRequest } from "@/lib/api"
import type { Problem, Submission } from "@/types/models"
import { Code2, RefreshCcw, Send, Sparkles } from "lucide-react"

interface ProblemsResponse {
  problems?: Problem[]
}

interface SubmissionResponse {
  submission?: Submission
}

function statusBadgeVariant(status: Submission["status"]) {
  if (status === "approved") {
    return "default"
  }

  if (status === "rejected") {
    return "destructive"
  }

  return "secondary"
}

export default function CompetitionPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [problemId, setProblemId] = useState("")
  const [code, setCode] = useState("print('Hello from coding club')")
  const [recentSubmissions, setRecentSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  async function loadProblems() {
    setLoading(true)
    setMessage("")

    try {
      const response = await apiRequest<ProblemsResponse>("/api/problems")
      const list = Array.isArray(response.data?.problems) ? response.data.problems : []
      setProblems(list)

      if (list.length > 0 && !problemId) {
        setProblemId(String(list[0].id))
      }

      if (list.length === 0) {
        setMessage("No active problems are available yet. You can still enter a problem ID manually.")
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load problems.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProblems()
  }, [])

  const selectedProblem = problems.find((item) => item.id === Number(problemId))

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")

    const numericProblemId = Number(problemId)
    if (!Number.isInteger(numericProblemId) || numericProblemId <= 0) {
      setMessage("Enter a valid positive problem ID.")
      return
    }

    if (!code.trim()) {
      setMessage("Code is required.")
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest<SubmissionResponse>("/api/submissions", {
        method: "POST",
        body: {
          problem_id: numericProblemId,
          code,
        },
      })

      const submission = response.data?.submission
      if (submission) {
        setRecentSubmissions((previous) => [submission, ...previous])
      }

      setMessage("Submission sent successfully with pending status.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit code.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-soft backdrop-blur-sm">
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Competition Workspace
            </p>
            <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
              Read the prompt, write Python, and submit for review.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground">
              Problems stay visible on the left while your code editor and submission flow remain focused on the right.
            </CardDescription>
          </div>
          <Button variant="outline" size="lg" onClick={() => void loadProblems()} disabled={loading}>
            <RefreshCcw className="mr-2 size-4" />
            Refresh Problems
          </Button>
        </CardHeader>
      </Card>

      {message ? (
        <Alert className="rounded-2xl border-white/70 bg-white/80 shadow-soft">
          <Sparkles className="size-4" />
          <AlertTitle>Competition Status</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl">Problem Library</CardTitle>
            <CardDescription>Choose an active challenge and review the prompt before you submit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {problems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">
                No active problem cards are available yet.
              </div>
            ) : (
              <div className="space-y-3">
                {problems.map((problem) => (
                  <button
                    key={problem.id}
                    type="button"
                    onClick={() => setProblemId(String(problem.id))}
                    className={
                      problem.id === Number(problemId)
                        ? "w-full rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left shadow-sm"
                        : "w-full rounded-2xl border border-border bg-background/80 p-4 text-left transition hover:border-primary/20 hover:bg-accent/40"
                    }
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-foreground">{problem.title}</p>
                        <p className="text-sm text-muted-foreground">Problem ID #{problem.id}</p>
                      </div>
                      <Badge variant="secondary">{problem.xp_reward} XP</Badge>
                    </div>
                    <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">{problem.description}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
            <CardHeader>
              <CardTitle className="text-2xl">Selected Problem</CardTitle>
              <CardDescription>The active prompt appears inside a dedicated card for focused reading.</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedProblem ? (
                <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/30 p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline">Problem #{selectedProblem.id}</Badge>
                    <Badge variant="secondary">{selectedProblem.xp_reward} XP reward</Badge>
                  </div>
                  <h3 className="text-2xl font-semibold tracking-tight">{selectedProblem.title}</h3>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {selectedProblem.description}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground">
                  Select a problem card or enter a problem ID to begin.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
            <CardHeader>
              <CardTitle className="text-2xl">Submission Editor</CardTitle>
              <CardDescription>Use the editor below to submit your competition solution.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
                <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground" htmlFor="problem-id">
                      Problem ID
                    </label>
                    <Input
                      id="problem-id"
                      value={problemId}
                      onChange={(event) => setProblemId(event.target.value)}
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Python Code</label>
                    <div className="overflow-hidden rounded-2xl border border-slate-800 shadow-inner">
                      <Editor
                        height="360px"
                        language="python"
                        theme="vs-dark"
                        value={code}
                        onChange={(value) => setCode(value ?? "")}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: "on",
                          autoIndent: "advanced",
                          tabSize: 2,
                          insertSpaces: true,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/40 p-4">
                  <div className="text-sm text-muted-foreground">
                    {selectedProblem ? `Submitting for ${selectedProblem.title}` : "Enter a problem ID before sending."}
                  </div>
                  <Button size="lg" disabled={loading}>
                    <Send className="mr-2 size-4" />
                    Submit Solution
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft">
        <CardHeader>
          <CardTitle className="text-2xl">Recent Submissions</CardTitle>
          <CardDescription>Local session history so students can keep track of their latest attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-muted-foreground" colSpan={4}>
                    No submissions yet in this browser session.
                  </TableCell>
                </TableRow>
              ) : (
                recentSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">#{submission.id}</TableCell>
                    <TableCell>{submission.problem_id}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(submission.status)}>{submission.status}</Badge>
                    </TableCell>
                    <TableCell>{submission.created_at ?? "Just now"}</TableCell>
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
