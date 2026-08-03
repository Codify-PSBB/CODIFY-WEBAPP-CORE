import { cpSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = (env.VITE_API_BASE_URL ?? "").trim() || "http://127.0.0.1:8787";

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "self-host-monaco",
        closeBundle() {
          const source = resolve(__dirname, "node_modules/monaco-editor/min/vs");
          const target = resolve(__dirname, "dist/monaco/vs");
          rmSync(target, { recursive: true, force: true });
          mkdirSync(resolve(__dirname, "dist/monaco"), { recursive: true });
          cpSync(source, target, { recursive: true });
        }
      }
    ],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src")
      }
    },
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false
        }
      }
    }
  };
});
