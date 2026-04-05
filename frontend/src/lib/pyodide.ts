const PYODIDE_BASE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.2/full/";

let pyodidePromise: Promise<PyodideInterface> | null = null;

function appendScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;

    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Pyodide script.")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    });
    script.addEventListener("error", () => reject(new Error("Failed to load Pyodide script.")));
    document.head.appendChild(script);
  });
}

export async function loadPyodideRuntime(): Promise<PyodideInterface> {
  if (pyodidePromise) {
    return pyodidePromise;
  }

  pyodidePromise = (async () => {
    await appendScript(`${PYODIDE_BASE_URL}pyodide.js`);

    if (!window.loadPyodide) {
      throw new Error("Pyodide loader is unavailable.");
    }

    return window.loadPyodide({ indexURL: PYODIDE_BASE_URL });
  })();

  return pyodidePromise;
}
