#!/usr/bin/env node
// One-time setup on macOS or Windows: `npm run setup`.
// Installs everything, writes .env from .env.example, and checks the hand model file.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const run = (command, cwd = root) => {
  console.log(`\n> ${command}`);
  execSync(command, { cwd, stdio: "inherit", shell: true });
};

function requireTool(command, hint) {
  try {
    execSync(`${command} --version`, { stdio: "ignore", shell: true });
  } catch {
    console.error(`\n${command} is not installed. ${hint}`);
    process.exit(1);
  }
}

requireTool("uv", "Install it from https://docs.astral.sh/uv/getting-started/installation/ and run setup again.");

if (!existsSync(join(root, ".env"))) {
  copyFileSync(join(root, ".env.example"), join(root, ".env"));
  console.log("Created .env from .env.example");
}

run("npm install");
run("npm install", join(root, "frontend"));
run("uv sync", join(root, "backend"));
run("npx playwright install chromium", join(root, "frontend"));

const manifest = JSON.parse(readFileSync(join(root, "backend/models/manifest.json"), "utf8"));
const model = readFileSync(join(root, "backend/models", manifest.file));
const sha = createHash("sha256").update(model).digest("hex");
if (sha !== manifest.sha256) {
  console.error(`\nThe hand model file is damaged (sha256 ${sha}). Download it again from:\n${manifest.source}`);
  process.exit(1);
}
console.log("\nHand model OK. Setup finished: run `npm start` (or `npm run dev:replay` with no webcam).");
