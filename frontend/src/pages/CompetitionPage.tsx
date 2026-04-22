import { FormEvent, useEffect, useMemo, useState } from "react"
import Editor from "@monaco-editor/react"
import { useTheme } from "@/components/ThemeProvider"
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
import type { Problem, Submission } from "@/types/models"
import { Play, RefreshCcw, Send, Sparkles, TerminalSquare } from "lucide-react"

interface ProblemsResponse {
  problems?: Problem[]
}

interface SubmissionResponse {
  submission?: Submission
}

function extractSampleSection(description: string, sectionTitle: "sample input" | "sample output") {
  const pattern = new RegExp(
    `${sectionTitle}\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(sample\\s+input|sample\\s+output|constraints|explanation)\\s*:?|$)`,
    "i"
  )
  const match = description.match(pattern)

  if (!match || !match[1]) {
    return null
  }

  return match[1].trim()
}

export default function CompetitionPage() {
  const { theme } = useTheme()
  const [problems, setProblems] = useState<Problem[]>([])
  const [problemId, setProblemId] = useState("")
  const [code, setCode] = useState("print('Hello from coding club')")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [consoleLines, setConsoleLines] = useState<string[]>([
    "Console ready. Submit your solution to see status updates.",
  ])
  const [testResults, setTestResults] = useState<boolean[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)

  const codePanelClassName =
    theme === "dark"
      ? "border-slate-700 bg-[#1e2937] text-slate-100"
      : "border-slate-200 bg-slate-50 text-slate-900"
  const consolePanelClassName =
    theme === "dark"
      ? "border-slate-700 bg-[#0f172a] text-[#4ade80]"
      : "border-slate-200 bg-slate-50 text-emerald-800"
  const testcasePanelClassName =
    theme === "dark"
      ? "border-slate-700 bg-[#1e2937] text-slate-100"
      : "border-slate-200 bg-slate-50 text-sky-900"

  function pushConsoleLine(line: string) {
    const timestamp = new Date().toLocaleTimeString()
    setConsoleLines((current) => [`[${timestamp}] ${line}`, ...current].slice(0, 30))
  }

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
      const errorMessage = error instanceof Error ? error.message : "Failed to load problems."
      setMessage(errorMessage)
      pushConsoleLine(`ERROR: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProblems()
  }, [])

  const selectedProblem = useMemo(
    () => problems.find((item) => item.id === Number(problemId)),
    [problemId, problems]
  )

  // Extract public test cases
  const publicTestCases = selectedProblem ? [
    {
      input: selectedProblem.public_testcase_1_input?.trim(),
      output: selectedProblem.public_testcase_1_output?.trim()
    },
    {
      input: selectedProblem.public_testcase_2_input?.trim(),
      output: selectedProblem.public_testcase_2_output?.trim()
    },
    {
      input: selectedProblem.public_testcase_3_input?.trim(),
      output: selectedProblem.public_testcase_3_output?.trim()
    }
  ].filter(tc => tc.input && tc.output) : []

  const testcases = selectedProblem?.testcases?.trim() || null

  async function runTests() {
    if (!selectedProblem || publicTestCases.length === 0) {
      pushConsoleLine("ERROR: No public test cases available for this problem")
      return
    }

    setIsRunningTests(true)
    setTestResults([])
    pushConsoleLine("Running tests against public test cases...")

    try {
      // Load Pyodide for testing
      const { loadPyodideRuntime } = await import("@/lib/pyodide")
      const runtime = await loadPyodideRuntime()

      const results: boolean[] = []

      for (let i = 0; i < publicTestCases.length; i++) {
        const testCase = publicTestCases[i]
        pushConsoleLine(`Running Test Case ${i + 1}...`)

        try {
          // Capture output
          const outputLines: string[] = []
          runtime.setStdout({
            batched: (text: string) => {
              outputLines.push(text)
            },
          })

          // Run the code with test input
          const inputCode = code + `\n\n# Test input simulation\nimport sys\nfrom io import StringIO\nsys.stdin = StringIO(${JSON.stringify(testCase.input)})\n`
          
          await runtime.runPythonAsync(inputCode)
          
          const output = outputLines.join("").trim()
          const expectedOutput = testCase.output?.trim()
          
          const passed = output === expectedOutput
          results.push(passed)
          
          pushConsoleLine(`Test Case ${i + 1}: ${passed ? 'PASSED' : 'FAILED'}`)
          if (!passed) {
            pushConsoleLine(`  Expected: "${expectedOutput}"`)
            pushConsoleLine(`  Got: "${output}"`)
          }
        } catch (error) {
          results.push(false)
          pushConsoleLine(`Test Case ${i + 1}: ERROR - ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      setTestResults(results)
      
      const allPassed = results.every(r => r)
      if (allPassed) {
        pushConsoleLine("All example tests passed!")
      } else {
        pushConsoleLine("Some example tests failed. These are just examples - you can still submit your solution.")
      }
    } catch (error) {
      pushConsoleLine(`ERROR: Failed to run tests - ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunningTests(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")

    const numericProblemId = Number(problemId)
    if (!Number.isInteger(numericProblemId) || numericProblemId <= 0) {
      const validationMessage = "Enter a valid positive problem ID."
      setMessage(validationMessage)
      pushConsoleLine(`ERROR: ${validationMessage}`)
      return
    }

    if (!code.trim()) {
      const validationMessage = "Code is required."
      setMessage(validationMessage)
      pushConsoleLine(`ERROR: ${validationMessage}`)
      return
    }

    // Tests are optional examples - allow submission regardless of results

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
      setMessage("Submission sent successfully with pending status.")
      pushConsoleLine(
        submission
          ? `Submission #${submission.id} queued with status: ${submission.status}.`
          : "Submission queued with pending status."
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit code."
      setMessage(errorMessage)
      pushConsoleLine(`ERROR: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-soft dark:border-border dark:bg-background">
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Competition Workspace
            </p>
            <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
              Solve the problem and submit for admin review.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground">
              Left side focuses on problem understanding, right side keeps coding and submission streamlined.
            </CardDescription>
          </div>
          <Button variant="outline" size="lg" onClick={() => void loadProblems()} disabled={loading}>
            <RefreshCcw className="mr-2 size-4" />
            Refresh Problems
          </Button>
        </CardHeader>
      </Card>

      {message ? (
        <Alert className="rounded-2xl border-white/70 bg-white/80 shadow-soft dark:border-border dark:bg-background">
          <Sparkles className="size-4" />
          <AlertTitle>Competition Status</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
            <CardHeader>
              <CardTitle className="text-2xl">Problem Statement</CardTitle>
              <CardDescription>Select a problem and read the full statement carefully.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {problems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {problems.map((problem) => (
                    <Button
                      key={problem.id}
                      type="button"
                      variant={problem.id === Number(problemId) ? "default" : "outline"}
                      className="rounded-full"
                      onClick={() => setProblemId(String(problem.id))}
                    >
                      #{problem.id} {problem.title}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground dark:border-border dark:bg-muted">
                  No active problem cards are available yet.
                </div>
              )}

              {selectedProblem ? (
                <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/30 p-5 dark:border-border dark:bg-muted">
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
                <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-5 text-sm text-muted-foreground dark:border-border dark:bg-muted">
                  Select a problem card or enter a problem ID on the right to begin.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
            <CardHeader>
              <CardTitle className="text-2xl">Sample Input / Output</CardTitle>
              <CardDescription>Examples and testcases provided by admins for this problem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {publicTestCases.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">Example Test Cases</h4>
                    <span className="text-xs text-muted-foreground">Reference examples to help you understand the problem</span>
                  </div>
                  {publicTestCases.map((testCase, index) => (
                    <div key={index} className="grid gap-3 md:grid-cols-2">
                      <div className={`rounded-2xl border p-3 font-mono text-sm ${codePanelClassName}`}>
                        <p className="mb-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Test Case {index + 1} Input
                        </p>
                        <pre className="whitespace-pre-wrap break-words">{testCase.input}</pre>
                      </div>
                      <div className={`rounded-2xl border p-3 font-mono text-sm ${consolePanelClassName}`}>
                        <p className="mb-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Test Case {index + 1} Output
                        </p>
                        <pre className="whitespace-pre-wrap break-words">{testCase.output}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className={`rounded-2xl border p-4 font-mono text-sm ${testcasePanelClassName}`}>
                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">Testcases</p>
                <pre className="whitespace-pre-wrap break-words">
                  {testcases ?? "No testcase notes were provided by admins."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
            <CardHeader>
              <CardTitle className="text-2xl">Code Editor</CardTitle>
              <CardDescription>Write your Python solution and submit it directly.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
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
                  <div className={`overflow-hidden rounded-2xl border shadow-inner ${codePanelClassName}`}>
                    <Editor
                      height="420px"
                      language="python"
                      theme={theme === "dark" ? "vs-dark" : "vs"}
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

                <div className="space-y-4">
                  {publicTestCases.length > 0 && (
                    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-muted/40 p-4 dark:border-border dark:bg-muted">
                      <div className="text-sm text-muted-foreground">
                        Test your code against example test cases (optional)
                      </div>
                      <Button 
                        size="lg" 
                        variant="outline" 
                        onClick={() => void runTests()} 
                        disabled={isRunningTests || !selectedProblem}
                      >
                        <Play className="mr-2 size-4" />
                        {isRunningTests ? "Running Tests..." : "Run Tests"}
                      </Button>
                    </div>
                  )}

                  {testResults.length > 0 && (
                    <div className="rounded-2xl border bg-muted/40 p-4 dark:border-border dark:bg-muted">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">Test Results:</span>
                        <span className={`text-sm font-semibold ${testResults.every(r => r) ? 'text-green-600' : 'text-red-600'}`}>
                          {testResults.filter(r => r).length}/{testResults.length} Passed
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {testResults.map((passed, index) => (
                          <div
                            key={index}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              passed 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            Test {index + 1}: {passed ? 'PASS' : 'FAIL'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/40 p-4 dark:border-border dark:bg-muted">
                    <div className="text-sm text-muted-foreground">
                      {selectedProblem ? `Submitting for ${selectedProblem.title}` : "Enter a problem ID before sending."}
                    </div>
                    <Button 
                      size="lg" 
                      disabled={loading}
                    >
                      <Send className="mr-2 size-4" />
                      Submit Solution
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-border dark:bg-background">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <TerminalSquare className="size-5" />
                  Output Console
                </CardTitle>
                <CardDescription>Submission and validation events appear here.</CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={() => setConsoleLines([])}>
                Clear
              </Button>
            </CardHeader>
            <CardContent>
              <div className={`min-h-[220px] rounded-2xl border p-5 font-mono text-sm leading-6 shadow-inner ${consolePanelClassName}`}>
                <pre className="whitespace-pre-wrap break-words">
                  {consoleLines.length > 0 ? consoleLines.join("\n") : "Console cleared."}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
