import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const sourceDir = resolve(process.cwd(), "frontend", "dist");
const targetDir = resolve(process.cwd(), "dist");

if (!existsSync(sourceDir)) {
  console.error(`Frontend build output not found at: ${sourceDir}`);
  process.exit(1);
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(sourceDir, targetDir, { recursive: true });

console.log(`Copied ${sourceDir} -> ${targetDir}`);
