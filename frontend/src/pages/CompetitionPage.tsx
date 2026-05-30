import { FormEvent, useEffect, useMemo, useState } from "react"
import { useTheme } from "@/components/ThemeProvider"
import { defineEditorThemes, getEditorThemeName } from "@/lib/editorThemes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api"
import type { Problem, Submission } from "@/types/models"
import { CheckCircle2, ChevronRight, Play, RefreshCcw, Send, XCircle, Zap } from "lucide-react"
import { loadPyodideRuntime } from "@/lib/pyodide"

interface ProblemsResponse {
  problems?: Problem[]
}

interface SubmissionResponse {
  submission?: Submission
}

export default function CompetitionPage() {
  const { theme } = useTheme()

  const [problems, setProblems] = useState<Problem[]>([])
  const [problemId, setProblemId] = useState("")
  const [code, setCode] = useState("# Write your Python solution here\n\n")
  const [loading, setLoading] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error" | "rate"; text: string } | null>(null)
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testResults, setTestResults] = useState<{ passed: boolean; expected: string; got: string }[]>([])
  const [consoleLog, setConsoleLog] = useState<string[]>([])

  function log(line: string) {
    const ts = new Date().toLocaleTimeString()
    setConsoleLog((prev) => [`[${ts}] ${line}`, ...prev].slice(0, 50))
  }

  async function loadProblems() {
    setLoading(true)
    try {
      const res = await apiRequest<ProblemsResponse>("/api/problems")
      const list = Array.isArray(res.data?.problems) ? res.data.problems : []
      setProblems(list)
      if (list.length > 0 && !problemId) setProblemId(String(list[0].id))
    } catch (e) {
      log(`ERROR: ${e instanceof Error ? e.message : "Failed to load problems"}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProblems()
    // Preload Pyodide in the background for instant test execution
    void (async () => {
      try {
        await loadPyodideRuntime()
        log("Local Python runtime preloaded and ready.")
      } catch (e) {
        log(`WARNING: Failed to preload Python runtime: ${e instanceof Error ? e.message : String(e)}`)
      }
    })()
  }, [])

  const selectedProblem = useMemo(
    () => problems.find((p) => p.id === Number(problemId)),
    [problemId, problems]
  )

  const publicTestCases = useMemo(() => {
    if (!selectedProblem) return []
    return [
      { input: selectedProblem.public_testcase_1_input?.trim(), output: selectedProblem.public_testcase_1_output?.trim() },
      { input: selectedProblem.public_testcase_2_input?.trim(), output: selectedProblem.public_testcase_2_output?.trim() },
      { input: selectedProblem.public_testcase_3_input?.trim(), output: selectedProblem.public_testcase_3_output?.trim() },
    ].filter((tc) => tc.input && tc.output) as { input: string; output: string }[]
  }, [selectedProblem])

  async function runTests() {
    if (!selectedProblem || publicTestCases.length === 0) {
      log("No public test cases available for this problem.")
      return
    }
    setIsRunningTests(true)
    setTestResults([])
    log("Running tests…")
    try {
      const runtime = await loadPyodideRuntime()
      const results: { passed: boolean; expected: string; got: string }[] = []

      for (let i = 0; i < publicTestCases.length; i++) {
        const tc = publicTestCases[i]
        const lines: string[] = []
        runtime.setStdout({ batched: (t: string) => lines.push(t) })
        const inputCode = `${code}\n\nimport sys\nfrom io import StringIO\nsys.stdin = StringIO(${JSON.stringify(tc.input)})\n`
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
        log(`Test ${i + 1}: ${passed ? "✓ PASS" : "✗ FAIL"} ${!passed ? `(expected "${expected}", got "${got}")` : ""}`)
      }
      setTestResults(results)
      const allPassed = results.every((r) => r.passed)
      log(allPassed ? "All tests passed!" : "Some tests failed — review output above.")
    } catch (e) {
      log(`ERROR: ${e instanceof Error ? e.message : "Test execution failed"}`)
    } finally {
      setIsRunningTests(false)
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitMessage(null)
    const numId = Number(problemId)
    if (!Number.isInteger(numId) || numId <= 0) {
      setSubmitMessage({ type: "error", text: "Select a valid problem before submitting." })
      return
    }
    if (!code.trim()) {
      setSubmitMessage({ type: "error", text: "Your code is empty." })
      return
    }
    setLoading(true)
    try {
      const res = await apiRequest<SubmissionResponse>("/api/submissions", {
        method: "POST",
        body: { problem_id: numId, code },
      })
      const sub = res.data?.submission
      setSubmitMessage({ type: "success", text: `Submission #${sub?.id ?? "?"} queued for admin review.` })
      log(`Submission #${sub?.id ?? "?"} sent — pending review.`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Submission failed."
      const is429 = (e as { status?: number }).status === 429
      setSubmitMessage({ type: is429 ? "rate" : "error", text: msg })
      log(`ERROR: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Competition</p>
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedProblem ? selectedProblem.title : "Select a Problem"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {selectedProblem && (
            <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1">
              <Zap className="size-3 text-primary" />
              {selectedProblem.xp_reward} XP
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => void loadProblems()} disabled={loading}>
            <RefreshCcw className={`mr-1.5 size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Problem selector tabs */}
      {problems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {problems.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setProblemId(String(p.id)); setTestResults([]); setSubmitMessage(null) }}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 border ${
                p.id === Number(problemId)
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <ChevronRight className="size-3.5" />
              {p.title}
            </button>
          ))}
        </div>
      )}

      {/* Main two-panel layout */}
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr] 2xl:grid-cols-[1.05fr_0.95fr]">

        {/* ── LEFT: Problem + Examples ── */}
        <div className="flex flex-col gap-5">
          {/* Problem statement */}
          <div className="rounded-2xl border border-border bg-card p-6 flex-1">
            {selectedProblem ? (
              <div className="space-y-5">
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
                <ChevronRight className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {problems.length > 0 ? "Select a problem above to begin." : "No active problem is available yet."}
                </p>
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

          {/* Notes from admin (testcases field) */}
          {selectedProblem?.testcases && (
            <div className="rounded-2xl border border-border bg-muted/30 p-5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Admin Notes</p>
              <pre className="whitespace-pre-wrap break-words text-sm text-muted-foreground font-mono">
                {selectedProblem.testcases}
              </pre>
            </div>
          )}
        </div>

        {/* ── RIGHT: Code Editor + Submit ── */}
        <div className="flex flex-col gap-5">
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5 h-full">
            {/* Editor */}
            <div className="rounded-2xl border border-border overflow-hidden flex-1">
              {/* Editor header */}
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
                height="440px"
                language="python"
                theme={getEditorThemeName(theme)}
                beforeMount={defineEditorThemes}
                value={code}
                onChange={(v) => setCode(v ?? "")}
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
                type="submit"
                size="lg"
                disabled={loading || !selectedProblem}
                className="gap-2 flex-1 sm:flex-none"
              >
                <Send className="size-4" />
                {loading ? "Submitting…" : "Submit Solution"}
              </Button>
            </div>

            {/* Submission feedback */}
            {submitMessage && (
              <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
                submitMessage.type === "success"
                  ? "border-green-400/50 bg-green-50/60 text-green-800 dark:bg-green-900/15 dark:text-green-300 dark:border-green-500/30"
                  : submitMessage.type === "rate"
                  ? "border-amber-400/50 bg-amber-50/60 text-amber-800 dark:bg-amber-900/15 dark:text-amber-300 dark:border-amber-500/30"
                  : "border-red-400/50 bg-red-50/60 text-red-800 dark:bg-red-900/15 dark:text-red-300 dark:border-red-500/30"
              }`}>
                {submitMessage.type === "success"
                  ? <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  : <XCircle className="size-4 shrink-0 mt-0.5" />}
                <span>{submitMessage.text}</span>
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
              <div
                className="min-h-[120px] max-h-[200px] overflow-y-auto p-4 font-mono text-xs leading-6 text-primary"
              >
                {consoleLog.length > 0
                  ? consoleLog.map((line, i) => <div key={i}>{line}</div>)
                  : <span className="text-muted-foreground">Console ready.</span>}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
