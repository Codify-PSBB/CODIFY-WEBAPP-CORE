import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./components/ThemeProvider";
import { loader } from "@monaco-editor/react";

// Use Cloudflare's cdnjs instead of jsDelivr.
// Many school/corporate networks throttle or block jsDelivr.
// Since this app is hosted on Cloudflare, cdnjs is significantly faster and more reliable.
loader.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
