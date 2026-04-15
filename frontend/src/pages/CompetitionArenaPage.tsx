import { FormEvent, useEffect, useState, useCallback } from "react"
import Editor from "@monaco-editor/react"
import { useTheme } from "@/components/ThemeProvider"
import { useNavigate } from "react-router-dom"
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
import { apiRequest } from "@/lib/api"
import type { Problem, CompetitionEntry, TestCase, Submission } from "@/types/models"
import { 
  Clock, 
  Play, 
  Send, 
  AlertCircle, 
  Timer,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Terminal
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CompetitionStatusResponse {
  has_active_entry?: boolean
  entry?: CompetitionEntry
  problem?: Problem
}

interface RunCodeResponse {
  output?: string
  error?: string
  passed?: boolean
  results?: TestResult[]
}

interface TestResult {
  test_case_id: number
  input: string
  expected_output: string
  actual_output: string
  passed: boolean
}

interface SubmissionResponse {
  submission?: Submission
}

function formatTimeRemaining(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`
}

export default function CompetitionArenaPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [entry, setEntry] = useState<CompetitionEntry | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [code, setCode] = useState("# Write your solution here\n\n")
  const [loading, setLoading] = useState(false)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState("")
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [runResults, setRunResults] = useState<TestResult[] | null>(null)
  const [consoleOutput, setConsoleOutput] = useState<string>("")
  const [showTestCases, setShowTestCases] = useState(true)
  const [selectedTestCase, setSelectedTestCase] = useState<number>(0)

  async function loadCompetitionStatus() {
    try {
      const response = await apiRequest<CompetitionStatusResponse>("/api/competition/status")
      
      if (response.data?.has_active_entry && response.data.entry) {
        setEntry(response.data.entry)
        setTimeRemaining(response.data.entry.remaining_seconds)
        if (response.data.problem) {
          setProblem(response.data.problem)
          // Set default code template if problem loaded
          if (response.data.problem.test_cases && response.data.problem.test_cases.length > 0) {
            const sample = response.data.problem.test_cases.find(tc => tc.is_sample)
            if (sample) {
              setSelectedTestCase(response.data.problem.test_cases.indexOf(sample))
            }
          }
        }
      } else {
        // No active entry, redirect to entry page
        navigate("/competition")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load competition status."
      setMessage(errorMessage)
    }
  }

  useEffect(() => {
    void loadCompetitionStatus()
  }, [])

  useEffect(() => {
    if (timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setMessage("Time's up! Competition has ended.")
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  async function runCode() {
    if (!problem || !entry) return
    
    setRunning(true)
    setRunResults(null)
    setConsoleOutput("")
    setMessage("")

    try {
      const response = await apiRequest<RunCodeResponse>("/api/competition/run", {
        method: "POST",
        body: {
          entry_id: entry.id,
          problem_id: problem.id,
          code,
        },
      })

      if (response.data?.results) {
        setRunResults(response.data.results)
        setShowTestCases(true)
      }
      
      if (response.data?.output) {
        setConsoleOutput(response.data.output)
      }
      
      if (response.data?.error) {
        setConsoleOutput(response.data.error)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to run code."
      setMessage(errorMessage)
    } finally {
      setRunning(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!problem || !entry) return

    setLoading(true)
    setMessage("")

    try {
      const response = await apiRequest<SubmissionResponse>("/api/competition/submit", {
        method: "POST",
        body: {
          entry_id: entry.id,
          problem_id: problem.id,
          code,
        },
      })

      setMessage("Solution submitted successfully!")
      
      // Redirect after successful submission
      setTimeout(() => {
        navigate("/competition")
      }, 2000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit solution."
      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const codePanelClassName = theme === "dark"
    ? "border-border bg-card"
    : "border-border bg-card"

  const sampleTestCases = problem?.test_cases?.filter(tc => tc.is_sample) || []
  const hiddenTestCases = problem?.test_cases?.filter(tc => !tc.is_sample) || []

  return (
    <div className="space-y-4">
      {/* Timer Header */}
      <Card className={cn(
        "card-modern",
        timeRemaining < 60 && "border-destructive"
      )}>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Timer className={cn(
                "h-6 w-6",
                timeRemaining < 60 ? "text-destructive animate-pulse" : "text-primary"
              )} />
              <span className="text-2xl font-bold tabular-nums">
                {formatTimeRemaining(timeRemaining)}
              </span>
            </div>
            <Badge variant={timeRemaining < 60 ? "destructive" : "default"}>
              {timeRemaining < 60 ? "Time Critical" : "Active"}
            </Badge>
          </div>
          <div className="text-right">
            <p className="font-semibold">{problem?.title || "Loading..."}</p>
            <p className="text-sm text-muted-foreground">Problem #{problem?.id}</p>
          </div>
        </CardHeader>
      </Card>

      {message ? (
        <Alert variant={message.includes("success") ? "default" : "destructive"} className="rounded-2xl">
          <AlertCircle className="size-4" />
          <AlertTitle>{message.includes("success") ? "Success" : "Error"}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left Panel - Problem & Test Cases */}
        <div className="space-y-4">
          {/* Problem Statement */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="heading-3 flex items-center gap-2">
                Problem Statement
                <Badge variant="secondary" className="badge-modern">
                  {problem?.xp_reward || 0} XP
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap body-normal leading-relaxed">
                {problem?.description || "Loading problem..."}
              </p>
            </CardContent>
          </Card>

          {/* Test Cases */}
          <Card className="card-modern">
            <CardHeader 
              className="cursor-pointer"
              onClick={() => setShowTestCases(!showTestCases)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="heading-3 flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Test Cases
                  {runResults && (
                    <Badge variant={runResults.every(r => r.passed) ? "default" : "destructive"}>
                      {runResults.filter(r => r.passed).length}/{runResults.length} Passed
                    </Badge>
                  )}
                </CardTitle>
                {showTestCases ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
            
            {showTestCases && (
              <CardContent className="space-y-4">
                {/* Sample Test Cases */}
                {sampleTestCases.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Sample Test Cases
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sampleTestCases.map((tc, idx) => {
                        const result = runResults?.find(r => r.test_case_id === tc.id)
                        return (
                          <button
                            key={tc.id}
                            onClick={() => setSelectedTestCase(problem?.test_cases?.indexOf(tc) || 0)}
                            className={cn(
                              "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                              selectedTestCase === (problem?.test_cases?.indexOf(tc) || 0)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted hover:bg-muted/80",
                              result && (result.passed ? "ring-2 ring-success" : "ring-2 ring-destructive")
                            )}
                          >
                            Case {idx + 1}
                            {result && (
                              result.passed 
                                ? <CheckCircle className="inline ml-1 h-3 w-3" />
                                : <XCircle className="inline ml-1 h-3 w-3" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {/* Selected Test Case Details */}
                {problem?.test_cases && problem.test_cases[selectedTestCase] && (
                  <div className="space-y-3 rounded-xl bg-muted/50 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Input</p>
                      <pre className="code-block min-h-[60px]">
                        {problem.test_cases[selectedTestCase].input}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Expected Output</p>
                      <pre className="code-block min-h-[60px]">
                        {problem.test_cases[selectedTestCase].output}
                      </pre>
                    </div>
                    {runResults && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                          Your Output
                        </p>
                        <pre className={cn(
                          "code-block min-h-[60px]",
                          runResults.find(r => r.test_case_id === problem?.test_cases?.[selectedTestCase]?.id)?.passed
                            ? "border-success/50 bg-success/10"
                            : "border-destructive/50 bg-destructive/10"
                        )}>
                          {runResults.find(r => r.test_case_id === problem?.test_cases?.[selectedTestCase]?.id)?.actual_output || "No output"}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Hidden Test Cases Count */}
                {hiddenTestCases.length > 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">
                      +{hiddenTestCases.length} hidden test cases will be checked on submission
                    </p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="space-y-4">
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="heading-3">Code Editor</CardTitle>
              <CardDescription>Write your Python solution</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
                <div className={cn("overflow-hidden rounded-xl border shadow-inner", codePanelClassName)}>
                  <Editor
                    height="400px"
                    language="python"
                    theme={theme === "dark" ? "vs-dark" : "vs"}
                    value={code}
                    onChange={(value) => setCode(value ?? "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: "on",
                      autoIndent: "advanced",
                      tabSize: 4,
                      insertSpaces: true,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      folding: true,
                      lineHeight: 24,
                    }}
                  />
                </div>

                {/* Console Output */}
                {consoleOutput && (
                  <div className="rounded-xl border bg-muted/50 p-4 font-mono text-sm">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Console Output</p>
                    <pre className="whitespace-pre-wrap">{consoleOutput}</pre>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-sm text-muted-foreground">
                    {runResults ? (
                      <span className={runResults.every(r => r.passed) ? "text-success" : "text-destructive"}>
                        {runResults.filter(r => r.passed).length}/{runResults.length} test cases passed
                      </span>
                    ) : "Run your code to test against sample cases"}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={() => void runCode()}
                      disabled={running || !code.trim()}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {running ? "Running..." : "Run Code"}
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      className="btn-primary"
                      disabled={loading || !code.trim() || timeRemaining <= 0}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {loading ? "Submitting..." : "Submit Solution"}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
