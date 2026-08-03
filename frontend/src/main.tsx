import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./components/ThemeProvider";
import { loader } from "@monaco-editor/react";

// Vite copies the lockfile version of Monaco into the production build. Keeping
// the runtime same-origin makes it compatible with the restrictive script CSP.
loader.config({ paths: { vs: "/monaco/vs" } });

// Register service worker for Pyodide asset caching (survives page refreshes)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Silent fail — SW is a progressive enhancement, not critical
    });
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
