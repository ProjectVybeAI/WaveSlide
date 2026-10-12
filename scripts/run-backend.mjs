#!/usr/bin/env node
// Starts the Python engine with the right environment on any OS (no cross-env, no bash).
//   node scripts/run-backend.mjs api [--replay]      FastAPI with auto-reload (npm run dev)
//   node scripts/run-backend.mjs desktop [--dev]     engine + native windows (npm start)
//   node scripts/run-backend.mjs seed                synthetic sessions into data/sessions
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [mode = "api", ...flags] = process.argv.slice(2);

/** Values from .env (KEY=value lines) so the port matches what the engine reads. */
function readEnv() {
  const file = join(root, ".env");
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^\s*[A-Z_]+=/.test(line))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      }),
  );
}

const env = { ...process.env, ...readEnv() };
if (flags.includes("--replay")) {
  env.WAVESLIDE_SOURCE = "replay";
  env.WAVESLIDE_KEYS = "record";
}
const port = env.WAVESLIDE_PORT ?? "8765";

const commands = {
  api: ["uvicorn", "app.main:create_app", "--factory", "--host", "127.0.0.1", "--port", port, "--reload", "--reload-dir", "app"],
  desktop: ["python", "-m", "app.desktop", ...(flags.includes("--dev") ? ["--dev"] : [])],
  seed: ["python", "scripts/seed.py"],
};
if (!commands[mode]) {
  console.error(`Unknown mode "${mode}". Use api, desktop or seed.`);
  process.exit(1);
}

const child = spawn("uv", ["run", ...commands[mode]], {
  cwd: join(root, "backend"),
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
