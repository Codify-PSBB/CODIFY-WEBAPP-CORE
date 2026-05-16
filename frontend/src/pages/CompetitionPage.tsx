import { FormEvent, useEffect, useMemo, useState } from "react"
import Editor from "@monaco-editor/react"
import { useTheme } from "@/components/ThemeProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api"
import type { Problem, Submission } from "@/types/models"
import { CheckCircle2, ChevronRight, Play, RefreshCcw, Send, XCircle, Zap } from "lucide-react"

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

  useEffect(() => { void loadProblems() }, [])

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
      const { loadPyodideRuntime } = await import("@/lib/pyodide")
      const runtime = await loadPyodideRuntime()
      const results: { passed: boolean; expected: string; got: string }[] = []

      for (let i = 0; i < publicTestCases.length; i++) {
        const tc = publicTestCases[i]
        const lines: string[] = []
        runtime.setStdout({ batched: (t: string) => lines.push(t) })
        const inputCode = `${code}\n\nimport sys\nfrom io import StringIO\nsys.stdin = StringIO(${JSON.stringify(tc.input)})\n`
        
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
      log(allPassed ? "All tests passed!" : "Some tests failed.")
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
    if (!Number.isInteger(numId) || numId <= 0) return
    if (!code.trim()) return

    setLoading(true)
    try {
      const res = await apiRequest<SubmissionResponse>("/api/submissions", {
        method: "POST",
        body: { problem_id: numId, code },
      })
      const sub = res.data?.submission
      setSubmitMessage({ type: "success", text: `Submission #${sub?.id ?? "?"} received.` })
      log(`Submission #${sub?.id ?? "?"} sent.`)
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
    <div className="flex flex-col gap-8 max-w-[1400px] mx-auto">
      {/* Selection Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between px-2">
        <div className="flex flex-wrap gap-2">
          {problems.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setProblemId(String(p.id)); setTestResults([]); setSubmitMessage(null) }}
              className={`px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition-all border rounded-lg ${
                p.id === Number(problemId)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/50 text-muted-foreground border-border/40 hover:border-primary/40 hover:text-foreground"
              }`}
            >
              Task {p.id}
            </button>
          ))}
          {problems.length === 0 && (
             <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40 py-2">Waiting for problems...</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => void loadProblems()} disabled={loading} className="text-muted-foreground/60 hover:text-primary">
          <RefreshCcw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Workspace */}
      <div className="grid gap-8 xl:grid-cols-2">
        
        {/* LEFT: Task Details */}
        <div className="flex flex-col gap-8">
          <div className="space-y-6">
            {selectedProblem ? (
              <div className="space-y-6 px-2">
                <div className="flex items-center gap-4">
                  <h1 className="text-4xl font-bold tracking-tighter text-foreground">{selectedProblem.title}</h1>
                  <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 text-primary text-[10px] uppercase font-black tracking-widest px-3 py-1">
                    {selectedProblem.xp_reward} XP
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap text-base leading-relaxed text-muted-foreground/90 font-medium">
                  {selectedProblem.description}
                </p>
              </div>
            ) : null}

            {publicTestCases.length > 0 && (
              <div className="grid gap-4 mt-8">
                {publicTestCases.map((tc, i) => (
                  <div key={i} className="group relative rounded-2xl border border-border/30 bg-card/20 p-6 transition-all hover:bg-card/40">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 font-black">Test Case {i + 1}</span>
                      {testResults[i] !== undefined && (
                        testResults[i].passed
                          ? <CheckCircle2 className="size-4 text-primary" strokeWidth={3} />
                          : <XCircle className="size-4 text-destructive" strokeWidth={3} />
                      )}
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 font-bold">Input</label>
                        <pre className="font-mono text-sm text-foreground bg-muted/10 p-3 rounded-lg overflow-x-auto border border-border/5">{tc.input}</pre>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 font-bold">Expected</label>
                        <pre className="font-mono text-sm text-foreground bg-muted/10 p-3 rounded-lg overflow-x-auto border border-border/5">{tc.output}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Editor */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col h-full gap-6">
            <div className="relative rounded-3xl border border-border/40 bg-[#0c0e14] shadow-2xl overflow-hidden group">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/10 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="size-2.5 rounded-full bg-border/20" />
                    <div className="size-2.5 rounded-full bg-border/20" />
                    <div className="size-2.5 rounded-full bg-border/20" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40 font-black ml-2">Python Environment</span>
                </div>
              </div>
              <div className="p-2">
                <Editor
                  height="500px"
                  language="python"
                  theme="vs-dark"
                  value={code}
                  onChange={(v) => setCode(v ?? "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 15,
                    lineNumbers: "on",
                    autoIndent: "advanced",
                    tabSize: 4,
                    insertSpaces: true,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    padding: { top: 20, bottom: 20 },
                    cursorSmoothCaretAnimation: "on",
                    smoothScrolling: true,
                    backgroundColor: "#0c0e14",
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => void runTests()}
                  disabled={isRunningTests || !selectedProblem}
                  className="rounded-2xl border-border/40 bg-card/50 backdrop-blur-sm h-14 px-8 uppercase text-[10px] font-black tracking-[0.2em] hover:bg-primary/10 hover:text-primary transition-all"
                >
                  {isRunningTests ? <RefreshCcw className="size-4 animate-spin" /> : "Verify Code"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={(e) => void handleSubmit(e as any)}
                  disabled={loading || !selectedProblem}
                  className="rounded-2xl h-14 px-10 flex-1 uppercase text-[10px] font-black tracking-[0.2em] shadow-xl shadow-primary/20"
                >
                  {loading ? <RefreshCcw className="size-4 animate-spin" /> : "Submit Solution"}
                </Button>
              </div>

              {submitMessage && (
                <div className={`p-4 rounded-2xl border text-xs font-bold uppercase tracking-widest text-center transition-all animate-in fade-in slide-in-from-bottom-2 ${
                  submitMessage.type === "success" ? "border-primary/20 bg-primary/5 text-primary" : "border-destructive/20 bg-destructive/5 text-destructive"
                }`}>
                  {submitMessage.text}
                </div>
              )}

              <div className="rounded-2xl border border-border/20 bg-card/20 p-5 font-mono text-[11px] leading-relaxed overflow-y-auto max-h-[160px] scrollbar-hide">
                 {consoleLog.length > 0 ? (
                    <div className="space-y-1">
                      {consoleLog.map((line, i) => (
                        <div key={i} className="text-muted-foreground/60"><span className="text-primary/40 mr-3">❯</span>{line}</div>
                      ))}
                    </div>
                 ) : (
                    <p className="text-muted-foreground/20 italic">Awaiting execution...</p>
                 )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
