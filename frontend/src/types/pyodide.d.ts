export {};

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInterface>;
  }

  interface PyodideInterface {
    runPythonAsync(code: string): Promise<unknown>;
    setStdout(options: { batched: (text: string) => void }): void;
    setStderr(options: { batched: (text: string) => void }): void;
  }
}
