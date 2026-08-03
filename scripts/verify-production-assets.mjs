import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const frontendDist = resolve(root, "frontend/dist");
const required = [
  "monaco/vs/loader.js",
  "monaco/vs/editor/editor.main.js",
  "monaco/vs/editor/editor.main.css",
];

for (const relative of required) {
  if (!existsSync(resolve(frontendDist, relative))) {
    throw new Error(`Missing self-hosted Monaco production asset: ${relative}`);
  }
}

const mainSource = readFileSync(resolve(root, "frontend/src/main.tsx"), "utf8");
if (!mainSource.includes('vs: "/monaco/vs"')) {
  throw new Error("Frontend is not configured to use self-hosted Monaco assets.");
}

const builtIndex = readFileSync(resolve(frontendDist, "index.html"), "utf8");
const builtScripts = [...builtIndex.matchAll(/src="([^"]+\.js)"/g)]
  .map((match) => resolve(frontendDist, match[1].replace(/^\//, "")))
  .filter(existsSync)
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");
if (builtScripts.includes("cdnjs.cloudflare.com") || builtScripts.includes("0.44.0/min/vs")) {
  throw new Error("Production bundle still references the legacy Monaco CDN runtime.");
}

console.log("Production asset verification PASSED");
