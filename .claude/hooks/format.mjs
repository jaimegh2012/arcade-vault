import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const filePath = input?.tool_input?.file_path;
if (!filePath) process.exit(0);

const ext = path.extname(filePath).toLowerCase();
const isCode = [".js", ".jsx", ".mjs", ".ts", ".tsx"].includes(ext);
const isDoc = [".md", ".mdx", ".css", ".json"].includes(ext);
if (!isCode && !isDoc) process.exit(0);

const normalized = filePath.replaceAll("\\", "/");
if (/\/(node_modules|\.next|references)\//.test(normalized)) process.exit(0);

// Strip trailing whitespace on every line before formatting
try {
  const original = readFileSync(filePath, "utf8");
  const cleaned = original.replace(/[ 	]+$/gm, "");
  if (cleaned !== original) writeFileSync(filePath, cleaned);
} catch {
  process.exit(0);
}

const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const run = (cmd) => spawnSync(`npx ${cmd}`, { cwd, shell: true, encoding: "utf8" });

const prettier = run(`prettier --write "${filePath}"`);
if (prettier.status !== 0) {
  console.error(`Prettier failed on ${filePath}:\n${prettier.stdout}${prettier.stderr}`);
  process.exit(2);
}

if (isCode) {
  const eslint = run(`eslint --fix "${filePath}"`);
  if (eslint.status !== 0) {
    console.error(`ESLint errors in ${filePath}:\n${eslint.stdout}${eslint.stderr}`);
    process.exit(2);
  }
}
