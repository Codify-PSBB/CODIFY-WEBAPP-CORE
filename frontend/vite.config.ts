import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = (env.VITE_API_BASE_URL ?? "").trim() || "http://127.0.0.1:8787";

  return {
    plugins: [react(), tailwindcss()],
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
