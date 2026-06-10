import { useEffect, useRef, useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import Editor from "@monaco-editor/react"
import { useTheme } from "@/components/ThemeProvider"
import { defineEditorThemes, getEditorThemeName } from "@/lib/editorThemes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api"
import type { CompetitionProblem } from "@/types/models"
import {
  CheckCircle2, ChevronRight, Clock, Play,
  Send, XCircle, Zap, AlertTriangle
} from "lucide-react"
import { loadPyodideRuntime } from "@/lib/pyodide"

interface Props {
  competitionId: number | null
  problems: CompetitionProblem[]
}

interface BulkSubmissionResponse {
  submission_group_id?: number
  submission_ids?: number[]
  elapsed_seconds?: number
  submitted_at?: string
  message?: string
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

const STORAGE_KEY = "codify_competition_start"

export default function CompetitionPage({ competitionId, problems }: Props) {
  const { theme } = useTheme()
  const navigate = useNavigate()

  // Stopwatch: persist start time in sessionStorage so navigation between tabs doesn't reset it
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    // On mount: either resume from sessionStorage or start fresh
    const stored = sessionStorage.getItem(STORAGE_KEY)
    let startTime: number

    if (stored) {
      startTime = Number(stored)
    } else {
      startTime = Date.now()
      sessionStorage.setItem(STORAGE_KEY, String(startTime))
    }

    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
    }

    tick()
    timerRef.current = window.setInterval(tick, 1000)

    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
    }
  }, [])

  // Per-problem state
  const [activeProblemId, setActiveProblemId] = useState<number>(problems[0]?.id ?? 0)
  const [codeMap, setCodeMap] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {}
    for (const p of problems) {
      initial[p.id] = "# Write your Python solution here\n\n"
    }
    return initial
  })

  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testResultsMap, setTestResultsMap] = useState<Record<number, { passed: boolean; expected: string; got: string }[]>>({})
  const [consoleLog, setConsoleLog] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ type: "success" | "error"; text: string } | null>(null)

  function log(line: string) {
    const ts = new Date().toLocaleTimeString()
    setConsoleLog((prev) => [`[${ts}] ${line}`, ...prev].slice(0, 50))
  }

  const selectedProblem = useMemo(
    () => problems.find((p) => p.id === activeProblemId) ?? problems[0],
    [activeProblemId, problems]
  )

  const publicTestCases = useMemo(() => {
    if (!selectedProblem) return []
    return [
      { input: selectedProblem.public_testcase_1_input?.trim(), output: selectedProblem.public_testcase_1_output?.trim() },
      { input: selectedProblem.public_testcase_2_input?.trim(), output: selectedProblem.public_testcase_2_output?.trim() },
      { input: selectedProblem.public_testcase_3_input?.trim(), output: selectedProblem.public_testcase_3_output?.trim() },
    ].filter((tc) => tc.input && tc.output) as { input: string; output: string }[]
  }, [selectedProblem])

  // Preload Pyodide
  useEffect(() => {
    void (async () => {
      try {
        await loadPyodideRuntime()
        log("Python runtime ready.")
      } catch (e) {
        log(`WARNING: Failed to preload Python runtime: ${e instanceof Error ? e.message : String(e)}`)
      }
    })()
  }, [])

  async function runTests() {
    if (!selectedProblem || publicTestCases.length === 0) {
      log("No public test cases for this problem.")
      return
    }
    setIsRunningTests(true)
    const currentCode = codeMap[selectedProblem.id] ?? ""
    const results: { passed: boolean; expected: string; got: string }[] = []

    try {
      const runtime = await loadPyodideRuntime()
      for (let i = 0; i < publicTestCases.length; i++) {
        const tc = publicTestCases[i]
        const lines: string[] = []
        runtime.setStdout({ batched: (t: string) => lines.push(t) })
        const inputCode = `${currentCode}\n\nimport sys\nfrom io import StringIO\nsys.stdin = StringIO(${JSON.stringify(tc.input)})\n`
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rt = runtime as any
        const ns = rt.globals.get("dict")()
        try {
          await rt.runPythonAsync(inputCode, { globals: ns })
        } finally {
          ns.destroy()
        }
        const got = lines.join("").trim()
        const expected = tc.output.trim()
        const passed = got === expected
        results.push({ passed, expected, got })
        log(`Test ${i + 1}: ${passed ? "✓ PASS" : `✗ FAIL (expected "${expected}", got "${got}")`}`)
      }
      setTestResultsMap((prev) => ({ ...prev, [selectedProblem.id]: results }))
      log(results.every((r) => r.passed) ? "All tests passed!" : "Some tests failed.")
    } catch (e) {
      log(`ERROR: ${e instanceof Error ? e.message : "Test execution failed"}`)
    } finally {
      setIsRunningTests(false)
    }
  }

  async function handleSubmitAll() {
    if (competitionId === null) {
      setSubmitResult({ type: "error", text: "No active competition found." })
      return
    }

    // Build answers array — skip problems with only the default code
    const answers = problems
      .map((p) => ({ problem_id: p.id, code: codeMap[p.id] ?? "" }))
      .filter((a) => a.code.trim().length > 0 && a.code.trim() !== "# Write your Python solution here")

    if (answers.length === 0) {
      setSubmitResult({ type: "error", text: "Please write at least one answer before submitting." })
      return
    }

    setSubmitting(true)
    setSubmitResult(null)

    try {
      const res = await apiRequest<BulkSubmissionResponse>("/api/submissions", {
        method: "POST",
        body: {
          competition_id: competitionId,
          elapsed_seconds: elapsedSeconds,
          answers,
        },
      })

      const groupId = res.data?.submission_group_id
      sessionStorage.removeItem(STORAGE_KEY)
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      setSubmitted(true)
      setSubmitResult({
        type: "success",
        text: `Submitted ${answers.length} answer${answers.length !== 1 ? "s" : ""} in ${formatTime(elapsedSeconds)}! Group #${groupId}. Awaiting admin review.`,
      })
      log(`✅ Submission group #${groupId} sent — ${answers.length} answer(s) in ${formatTime(elapsedSeconds)}.`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Submission failed."
      setSubmitResult({ type: "error", text: msg })
      log(`ERROR: ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submitted state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <CheckCircle2 className="size-16 text-green-500" />
        <h1 className="text-3xl font-bold tracking-tight">Submission Complete!</h1>
        <p className="text-lg text-muted-foreground max-w-md">{submitResult?.text}</p>
        <p className="text-sm text-muted-foreground">Your code has been sent to the admins for review. Check the leaderboard for your XP.</p>
        <Button variant="outline" onClick={() => navigate("/leaderboard")}>View Leaderboard</Button>
      </div>
    )
  }

  const testResults = testResultsMap[selectedProblem?.id ?? 0] ?? []

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top bar with stopwatch ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-0.5">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Competition</p>
          <h1 className="text-xl font-bold tracking-tight">
            {selectedProblem?.title ?? "Loading…"}
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Live stopwatch */}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2 shadow-sm font-mono text-lg font-bold tabular-nums">
            <Clock className="size-4 text-primary animate-pulse" />
            <span>{formatTime(elapsedSeconds)}</span>
          </div>
          {selectedProblem && (
            <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1">
              <Zap className="size-3 text-primary" />
              {selectedProblem.xp_reward} XP
            </Badge>
          )}
        </div>
      </div>

      {/* ── Problem tabs ── */}
      <div className="flex flex-wrap gap-2">
        {problems.map((p, i) => {
          const hasCode = (codeMap[p.id] ?? "").trim().length > 0 &&
            (codeMap[p.id] ?? "").trim() !== "# Write your Python solution here"
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => { setActiveProblemId(p.id) }}
              className={`relative flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 border ${
                p.id === activeProblemId
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span className="text-xs opacity-60">{i + 1}.</span>
              <ChevronRight className="size-3" />
              {p.title}
              {hasCode && (
                <span className={`size-2 rounded-full ${p.id === activeProblemId ? "bg-primary-foreground/60" : "bg-green-500"}`} />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Main layout ── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr] 2xl:grid-cols-[1.05fr_0.95fr]">

        {/* LEFT: Problem statement + test cases */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-6 flex-1">
            {selectedProblem ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">Problem #{selectedProblem.id}</Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Zap className="size-3 text-primary" />{selectedProblem.xp_reward} XP
                  </Badge>
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight mb-3">{selectedProblem.title}</h2>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                    {selectedProblem.description}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <p className="text-sm text-muted-foreground">No problems available.</p>
              </div>
            )}
          </div>

          {/* Test cases */}
          {publicTestCases.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground font-semibold">
                Example Test Cases
              </p>
              <div className="space-y-3">
                {publicTestCases.map((tc, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3 text-sm font-mono">
                    <div className="rounded-xl border border-border bg-muted/40 p-3">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Input {i + 1}</p>
                      <pre className="whitespace-pre-wrap break-words text-foreground">{tc.input}</pre>
                    </div>
                    <div className={`rounded-xl border p-3 ${
                      testResults[i] !== undefined
                        ? testResults[i].passed
                          ? "border-green-400/50 bg-green-50/50 dark:bg-green-900/10"
                          : "border-red-400/50 bg-red-50/50 dark:bg-red-900/10"
                        : "border-border bg-muted/40"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Output {i + 1}</p>
                        {testResults[i] !== undefined && (
                          testResults[i].passed
                            ? <CheckCircle2 className="size-3.5 text-green-500" />
                            : <XCircle className="size-3.5 text-red-500" />
                        )}
                      </div>
                      <pre className="whitespace-pre-wrap break-words text-foreground">{tc.output}</pre>
                      {testResults[i] && !testResults[i].passed && (
                        <div className="mt-2 border-t border-red-300/40 pt-2 text-[11px] text-red-600 dark:text-red-400">
                          Got: <span className="font-semibold">"{testResults[i].got}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Editor + Submit */}
        <div className="flex flex-col gap-4">
          {/* Monaco editor */}
          <div className="rounded-2xl border border-border overflow-hidden flex-1">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="size-3 rounded-full bg-red-400/70" />
                  <span className="size-3 rounded-full bg-amber-400/70" />
                  <span className="size-3 rounded-full bg-green-400/70" />
                </div>
                <span className="text-xs text-muted-foreground font-mono">solution.py</span>
              </div>
              <span className="text-xs text-muted-foreground">Python 3</span>
            </div>
            <Editor
              height="400px"
              language="python"
              theme={getEditorThemeName(theme)}
              beforeMount={defineEditorThemes}
              value={codeMap[activeProblemId] ?? "# Write your Python solution here\n\n"}
              onChange={(v) => setCodeMap((prev) => ({ ...prev, [activeProblemId]: v ?? "" }))}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                autoIndent: "advanced",
                tabSize: 4,
                insertSpaces: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                renderLineHighlight: "gutter",
                padding: { top: 12, bottom: 12 },
                cursorSmoothCaretAnimation: "on",
                cursorBlinking: "smooth",
              }}
            />
          </div>

          {/* Action row */}
          <div className="flex items-center gap-3 flex-wrap">
            {publicTestCases.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => void runTests()}
                disabled={isRunningTests || !selectedProblem}
                className="gap-2"
              >
                <Play className="size-4" />
                {isRunningTests ? "Running…" : "Run Tests"}
              </Button>
            )}
            <Button
              type="button"
              size="lg"
              onClick={() => void handleSubmitAll()}
              disabled={submitting || submitted}
              className="gap-2 flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="size-4" />
              {submitting ? "Submitting…" : `Submit All (${problems.filter((p) => {
                const c = (codeMap[p.id] ?? "").trim()
                return c.length > 0 && c !== "# Write your Python solution here"
              }).length}/${problems.length})`}
            </Button>
          </div>

          {/* Warning if not all problems answered */}
          {(() => {
            const answered = problems.filter((p) => {
              const c = (codeMap[p.id] ?? "").trim()
              return c.length > 0 && c !== "# Write your Python solution here"
            }).length
            if (answered > 0 && answered < problems.length) {
              return (
                <div className="flex items-center gap-2 rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/15 dark:text-amber-300 dark:border-amber-500/30">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{answered}/{problems.length} problems answered. You can still submit — unanswered problems won't be included.</span>
                </div>
              )
            }
            return null
          })()}

          {/* Submit result */}
          {submitResult && (
            <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
              submitResult.type === "success"
                ? "border-green-400/50 bg-green-50/60 text-green-800 dark:bg-green-900/15 dark:text-green-300 dark:border-green-500/30"
                : "border-red-400/50 bg-red-50/60 text-red-800 dark:bg-red-900/15 dark:text-red-300 dark:border-red-500/30"
            }`}>
              {submitResult.type === "success"
                ? <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                : <XCircle className="size-4 shrink-0 mt-0.5" />}
              <span>{submitResult.text}</span>
            </div>
          )}

          {/* Console */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
              <span className="text-xs text-muted-foreground font-mono">console output</span>
              <button
                type="button"
                onClick={() => setConsoleLog([])}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                clear
              </button>
            </div>
            <div className="min-h-[100px] max-h-[180px] overflow-y-auto p-4 font-mono text-xs leading-6 text-primary">
              {consoleLog.length > 0
                ? consoleLog.map((line, i) => <div key={i}>{line}</div>)
                : <span className="text-muted-foreground">Console ready.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
