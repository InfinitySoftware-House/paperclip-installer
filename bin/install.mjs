#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  authenticatedRepoUrl,
  buildPlan,
  MIN_NODE_MAJOR,
  nodeMajor,
  parseArgs,
} from "../lib/steps.mjs";

const HELP = `Usage: npx github:InfinitySoftware-House/paperclip-installer [options]

Installs the InfinitySoftware-House Paperclip fork (project file uploads),
builds it and runs onboarding.

Options:
  --dir <path>      Install location (default: ~/paperclip-ai)
  --repo <url>      Fork repository (default: InfinitySoftware-House/paperclip)
  --branch <name>   Branch to install (default: main)
  --no-onboard      Build only, skip "paperclipai onboard --yes"
  --dry-run         Print the steps without running them
  -h, --help        Show this help

A private fork needs credentials: set GITHUB_TOKEN (or use a git credential helper).
Requires Node ${MIN_NODE_MAJOR}+, git and Rust (cargo). Do not run as root.`;

function fail(message) {
  console.error(`\nError: ${message}`);
  process.exit(1);
}

function has(command) {
  const probe = spawnSync(command, ["--version"], { stdio: "ignore", shell: process.platform === "win32" });
  return probe.status === 0;
}

let opts;
try {
  opts = parseArgs(process.argv.slice(2));
} catch (err) {
  fail(`${err.message}\n\n${HELP}`);
}
if (opts.help) {
  console.log(HELP);
  process.exit(0);
}

if (nodeMajor() < MIN_NODE_MAJOR) {
  fail(`Node ${MIN_NODE_MAJOR}+ is required (found ${process.versions.node}). Install it from nodejs.org.`);
}
// Embedded PostgreSQL refuses to run as an administrative user.
if (typeof process.getuid === "function" && process.getuid() === 0) {
  fail("Do not run as root. Create a service user first:\n  sudo useradd --system --create-home --shell /bin/bash paperclip\n  sudo -iu paperclip");
}
if (!has("git")) fail("git is required but was not found on PATH.");
// `pnpm build` compiles the native runner (cargo build --release); rustup then
// fetches the toolchain pinned by the fork, and a C linker (build-essential) is needed.
if (!has("cargo")) {
  fail([
    "Rust is required to build the native runner but `cargo` was not found.",
    "  Install it: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
    "  Then open a new shell. On Debian/Ubuntu also: sudo apt-get install -y build-essential",
  ].join("\n"));
}
if (process.platform === "win32") {
  console.warn("Warning: on native Windows the browser sign-in for Claude/Codex does not work. Use Linux, macOS or WSL for that flow.");
}

const exists = existsSync(path.join(opts.dir, ".git"));
const plan = buildPlan(
  { ...opts, repo: authenticatedRepoUrl(opts.repo, process.env.GITHUB_TOKEN) },
  { exists, hasPnpm: has("pnpm") },
);

for (const [index, [label, command, args, options = {}]] of plan.entries()) {
  const shown = `${command} ${args.join(" ").replace(/x-access-token:[^@]+@/, "x-access-token:***@")}`;
  console.log(`\n[${index + 1}/${plan.length}] ${label}\n  $ ${shown}`);
  if (opts.dryRun) continue;
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
  if (result.status !== 0) fail(`"${label}" failed (exit ${result.status ?? "signal"}).`);
}

console.log(opts.dryRun
  ? "\nDry run complete. Nothing was changed."
  : `\nDone. Start Paperclip again later with:\n  cd ${opts.dir} && pnpm paperclipai run`);
