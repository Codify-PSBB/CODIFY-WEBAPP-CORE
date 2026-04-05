import { useEffect, useRef, useState } from "react";

const PYODIDE_BASE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/";

function appendScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src=\"${src}\"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load script.")), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error("Failed to load script.")));
    document.head.appendChild(script);
  });
}

export default function InterpreterPage() {
  const pyodideRef = useRef<PyodideInterface | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState("Loading runtime...");
  const [code, setCode] = useState("print('Interpreter ready')");
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function setupPyodide() {
      try {
        await appendScript(`${PYODIDE_BASE_URL}pyodide.js`);
        if (!window.loadPyodide) {
          throw new Error("Pyodide loader not found on window.");
        }

        pyodideRef.current = await window.loadPyodide({ indexURL: PYODIDE_BASE_URL });

        if (mounted) {
          setRuntimeStatus("Pyodide runtime loaded.");
        }
      } catch (error) {
        if (mounted) {
          const text = error instanceof Error ? error.message : "Failed to load Pyodide.";
          setRuntimeStatus(text);
        }
      }
    }

    void setupPyodide();

    return () => {
      mounted = false;
    };
  }, []);

  async function runCode() {
    if (!pyodideRef.current) {
      setOutput("Pyodide is not ready yet.");
      return;
    }

    setRunning(true);
    setOutput("");

    const lines: string[] = [];
    pyodideRef.current.setStdout({
      batched: (text: string) => {
        lines.push(text);
      }
    });
    pyodideRef.current.setStderr({
      batched: (text: string) => {
        lines.push(`ERROR: ${text}`);
      }
    });

    try {
      const result = await pyodideRef.current.runPythonAsync(code);
      if (result !== undefined && result !== null) {
        lines.push(String(result));
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Execution failed.";
      lines.push(`ERROR: ${text}`);
    }

    setOutput(lines.join("\n") || "(no output)");
    setRunning(false);
  }

  return (
    <section>
      <h2>Python Interpreter</h2>
      <p>{runtimeStatus}</p>

      <label htmlFor="interpreter-code">Python Code</label>
      <textarea
        id="interpreter-code"
        rows={14}
        value={code}
        onChange={(event) => setCode(event.target.value)}
      />

      <button type="button" onClick={() => void runCode()} disabled={running}>
        Run Python
      </button>

      <h3>Output</h3>
      <pre>{output}</pre>
    </section>
  );
}
