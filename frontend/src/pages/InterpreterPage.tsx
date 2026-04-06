import { useEffect, useRef, useState } from "react"
import { useTheme } from "@/components/ThemeProvider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { loadPyodideRuntime } from "@/lib/pyodide"
import { Eraser, Play, TerminalSquare } from "lucide-react"

export default function InterpreterPage() {
  const { theme } = useTheme()
  const pyodideRef = useRef<PyodideInterface | null>(null)
  const [runtimeStatus, setRuntimeStatus] = useState("Loading Pyodide runtime...")
  const [code, setCode] = useState("print('Interpreter ready')")
  const [output, setOutput] = useState("Console output will appear here.")
  const [running, setRunning] = useState(false)

  const codeAreaClassName =
    theme === "dark"
      ? "border-slate-800 bg-slate-950 text-slate-50"
      : "border-slate-200 bg-slate-50 text-slate-900"
  const consoleAreaClassName =
    theme === "dark"
      ? "border-slate-800 bg-slate-950 text-emerald-300"
      : "border-slate-200 bg-slate-50 text-emerald-800"

  useEffect(() => {
    let active = true

    async function initRuntime() {
      try {
        const runtime = await loadPyodideRuntime()
        if (!active) {
          return
        }

        pyodideRef.current = runtime
        setRuntimeStatus("Pyodide loaded. Python runs locally in your browser.")
      } catch (error) {
        if (!active) {
          return
        }

        setRuntimeStatus(
          error instanceof Error ? error.message : "Failed to initialize Pyodide."
        )
      }
    }

    void initRuntime()

    return () => {
      active = false
    }
  }, [])

  async function runCode() {
    const runtime = pyodideRef.current

    if (!runtime) {
      setOutput("Pyodide is still loading. Please wait.")
      return
    }

    setRunning(true)

    const lines: string[] = []
    runtime.setStdout({
      batched: (text: string) => {
        lines.push(text)
      },
    })
    runtime.setStderr({
      batched: (text: string) => {
        lines.push(`ERROR: ${text}`)
      },
    })

    try {
      const result = await runtime.runPythonAsync(code)
      if (result !== undefined && result !== null) {
        lines.push(String(result))
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Python execution failed."
      lines.push(`ERROR: ${text}`)
    } finally {
      setRunning(false)
    }

    setOutput(lines.join("\n") || "(no output)")
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-white/70 bg-white/85 shadow-soft backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/85">
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Browser Runtime
            </p>
            <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
              Test Python instantly with Pyodide.
            </CardTitle>
            <CardDescription className="max-w-2xl text-base text-muted-foreground">
              The interpreter is lazy loaded on this page only, and execution stays entirely in the browser.
            </CardDescription>
          </div>
          <Badge variant="outline" className="rounded-full px-4 py-1 text-sm">
            {runtimeStatus}
          </Badge>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-white/10 dark:bg-slate-900/85">
          <CardHeader>
            <CardTitle className="text-2xl">Python Code Editor</CardTitle>
            <CardDescription>Use this scratchpad to experiment before submitting solutions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              id="interpreter-code"
              className={`min-h-[420px] rounded-2xl border px-4 py-3 font-mono text-sm leading-6 ${codeAreaClassName}`}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => void runCode()} disabled={running}>
                <Play className="mr-2 size-4" />
                Run Python
              </Button>
              <Button variant="outline" size="lg" onClick={() => setOutput("")}>
                <Eraser className="mr-2 size-4" />
                Clear Console
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-white/70 bg-white/90 shadow-soft dark:border-white/10 dark:bg-slate-900/85">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <TerminalSquare className="size-5" />
              Console Output
            </CardTitle>
            <CardDescription>Stdout, stderr, and returned values appear here after each run.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`min-h-[420px] rounded-2xl border p-5 font-mono text-sm leading-6 shadow-inner ${consoleAreaClassName}`}>
              <pre className="whitespace-pre-wrap break-words">{output}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
