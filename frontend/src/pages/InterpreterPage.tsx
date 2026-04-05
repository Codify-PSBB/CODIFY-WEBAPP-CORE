import { useEffect, useRef, useState } from "react";
import { loadPyodideRuntime } from "../lib/pyodide";

export default function InterpreterPage() {
  const pyodideRef = useRef<PyodideInterface | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState("Loading Pyodide runtime...");
  const [code, setCode] = useState("print('Interpreter ready')");
  const [output, setOutput] = useState("Console output will appear here.");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let active = true;

    async function initRuntime() {
      try {
        const runtime = await loadPyodideRuntime();
        if (!active) {
          return;
        }

        pyodideRef.current = runtime;
        setRuntimeStatus("Pyodide loaded. Python runs locally in your browser.");
      } catch (error) {
        if (!active) {
          return;
        }

        const text = error instanceof Error ? error.message : "Failed to initialize Pyodide.";
        setRuntimeStatus(text);
      }
    }

    void initRuntime();

    return () => {
      active = false;
    };
  }, []);

  async function runCode() {
    const runtime = pyodideRef.current;

    if (!runtime) {
      setOutput("Pyodide is still loading. Please wait.");
      return;
    }

    setRunning(true);

    const lines: string[] = [];
    runtime.setStdout({
      batched: (text: string) => {
        lines.push(text);
      }
    });
    runtime.setStderr({
      batched: (text: string) => {
        lines.push(`ERROR: ${text}`);
      }
    });

    try {
      const result = await runtime.runPythonAsync(code);
      if (result !== undefined && result !== null) {
        lines.push(String(result));
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Python execution failed.";
      lines.push(`ERROR: ${text}`);
    } finally {
      setRunning(false);
    }

    setOutput(lines.join("\n") || "(no output)");
  }

  return (
    <section>
      <h2>Python Interpreter</h2>
      <p>{runtimeStatus}</p>

      <label htmlFor="interpreter-code">Python Code Editor</label>
      <textarea
        id="interpreter-code"
        rows={14}
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />

      <button type="button" onClick={() => void runCode()} disabled={running}>
        Run Python
      </button>
      <button type="button" onClick={() => setOutput("")}>Clear Console</button>

      <h3>Console</h3>
      <pre>{output}</pre>
    </section>
  );
}
