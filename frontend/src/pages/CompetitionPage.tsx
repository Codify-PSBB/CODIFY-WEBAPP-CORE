import { FormEvent, useEffect, useMemo, useState } from "react"
import Editor from "@monaco-editor/react"
import { useTheme } from "@/components/ThemeProvider"
import { apiRequest } from "@/lib/api"
import type { Problem, Submission } from "@/types/models"
import { RefreshCcw, Send, Sparkles, TerminalSquare } from "lucide-react"

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

  // Cloudflare-style high contrast color scheme - NO BLUE
  const codePanelClassName =
    theme === "dark"
      ? "border-[#262626] bg-[#111111] text-[#ffffff]"
      : "border-[#e5e5e5] bg-[#fafafa] text-[#171717]"
  const consolePanelClassName =
    theme === "dark"
      ? "border-[#262626] bg-[#050505] text-[#22c55e]"
      : "border-[#e5e5e5] bg-[#fafafa] text-emerald-800"
  const testcasePanelClassName =
    theme === "dark"
      ? "border-[#262626] bg-[#111111] text-[#ffffff]"
      : "border-[#e5e5e5] bg-[#fafafa] text-[#171717]"

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

  const sampleInput = selectedProblem
    ? selectedProblem.sample_input?.trim() || extractSampleSection(selectedProblem.description, "sample input")
    : null
  const sampleOutput = selectedProblem
    ? selectedProblem.sample_output?.trim() || extractSampleSection(selectedProblem.description, "sample output")
    : null
  const testcases = selectedProblem?.testcases?.trim() || null

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
    <div className="flex flex-col gap-6">
      {/* Workspace Header - Cloudflare Style */}
      <div className="cf-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider text-[#737373]">
              Competition Workspace
            </p>
            <h2 className="text-2xl font-semibold text-white">
              Solve the problem and submit for admin review.
            </h2>
            <p className="text-sm text-[#a3a3a3] max-w-2xl">
              Left side focuses on problem understanding, right side keeps coding and submission streamlined.
            </p>
          </div>
          <button 
            className="cf-btn-primary text-sm whitespace-nowrap"
            onClick={() => void loadProblems()} 
            disabled={loading}
          >
            <RefreshCcw className="mr-2 inline h-4 w-4" />
            Refresh Problems
          </button>
        </div>
      </div>

      {message ? (
        <div className="cf-card border-l-4 border-l-[#ff6b00]">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-[#ff6b00] mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white">Competition Status</h3>
              <p className="text-sm text-[#a3a3a3]">{message}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          {/* Problem Statement Card */}
          <div className="cf-card">
            <div className="space-y-1 mb-6">
              <h3 className="text-xl font-semibold text-white">Problem Statement</h3>
              <p className="text-sm text-[#a3a3a3]">Select a problem and read the full statement carefully.</p>
            </div>
            
            <div className="space-y-4">
              {problems.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {problems.map((problem) => (
                    <button
                      key={problem.id}
                      type="button"
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                        problem.id === Number(problemId)
                          ? "bg-[#ff6b00] text-black"
                          : "bg-[#111111] text-[#a3a3a3] border border-[#262626] hover:text-white hover:border-[#404040]"
                      }`}
                      onClick={() => setProblemId(String(problem.id))}
                    >
                      <span className="font-mono">#{problem.id}</span> {problem.title}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-[#333333] bg-[#0a0a0a] p-4 text-sm text-[#737373]">
                  No active problem cards are available yet.
                </div>
              )}

              {selectedProblem ? (
                <div className="cf-card bg-[#0a0a0a] border-[#262626]">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="cf-badge">
                      <span className="font-mono">#{selectedProblem.id}</span> {selectedProblem.title}
                    </span>
                    <span className="cf-badge-primary">
                      {selectedProblem.xp_reward} XP
                    </span>
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-3">{selectedProblem.title}</h4>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#a3a3a3]">
                    {selectedProblem.description}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-[#333333] bg-[#0a0a0a] p-4 text-sm text-[#737373]">
                  Select a problem card or enter a problem ID on the right to begin.
                </div>
              )}
            </div>
          </div>

          {/* Sample Input/Output Card */}
          <div className="cf-card">
            <div className="space-y-1 mb-6">
              <h3 className="text-xl font-semibold text-white">Sample Input / Output</h3>
              <p className="text-sm text-[#a3a3a3]">Examples and testcases provided by admins for this problem.</p>
            </div>
            
            <div className="space-y-4">
              <div className={`cf-code ${codePanelClassName}`}>
                <p className="mb-2 text-xs uppercase tracking-wider text-[#737373]">Sample Input</p>
                <pre className="whitespace-pre-wrap break-words">{sampleInput ?? "No sample input provided."}</pre>
              </div>
              <div className={`cf-code ${consolePanelClassName}`}>
                <p className="mb-2 text-xs uppercase tracking-wider text-[#737373]">Sample Output</p>
                <pre className="whitespace-pre-wrap break-words">{sampleOutput ?? "No sample output provided."}</pre>
              </div>
              <div className={`cf-code ${testcasePanelClassName}`}>
                <p className="mb-2 text-xs uppercase tracking-wider text-[#737373]">Testcases</p>
                <pre className="whitespace-pre-wrap break-words">
                  {testcases ?? "No testcase notes were provided by admins."}
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Code Editor Card */}
          <div className="cf-card">
            <div className="space-y-1 mb-6">
              <h3 className="text-xl font-semibold text-white">Code Editor</h3>
              <p className="text-sm text-[#a3a3a3]">Write your Python solution and submit it directly.</p>
            </div>
            
            <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white" htmlFor="problem-id">
                  Problem ID
                </label>
                <input
                  id="problem-id"
                  value={problemId}
                  onChange={(event) => setProblemId(event.target.value)}
                  placeholder="e.g. 1"
                  className="cf-input w-full font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Python Code</label>
                <div className="cf-code bg-[#050505] border-[#262626] overflow-hidden p-0" style={{ height: '420px' }}>
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

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#262626] bg-[#0a0a0a] p-4">
                <div className="text-sm text-[#a3a3a3]">
                  {selectedProblem ? `Submitting for ${selectedProblem.title}` : "Enter a problem ID before sending."}
                </div>
                <button 
                  className="cf-btn-primary text-sm"
                  disabled={loading}
                >
                  <Send className="mr-2 inline h-4 w-4" />
                  Submit Solution
                </button>
              </div>
            </form>
          </div>

          {/* Output Console Card */}
          <div className="cf-card">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <TerminalSquare className="h-5 w-5" />
                  Output Console
                </h3>
                <p className="text-sm text-[#a3a3a3]">Submission and validation events appear here.</p>
              </div>
              <button 
                type="button" 
                className="cf-btn-secondary text-sm"
                onClick={() => setConsoleLines([])}
              >
                Clear
              </button>
            </div>
            <div className={`min-h-[220px] cf-code ${consolePanelClassName}`}>
              <pre className="whitespace-pre-wrap break-words">
                {consoleLines.length > 0 ? consoleLines.join("\n") : "Console cleared."}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
