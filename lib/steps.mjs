import path from "node:path";
import os from "node:os";

export const DEFAULT_REPO = "https://github.com/InfinitySoftware-House/paperclip.git";
export const DEFAULT_BRANCH = "main";
export const MIN_NODE_MAJOR = 24;

export function parseArgs(argv) {
  const opts = {
    repo: process.env.PAPERCLIP_FORK_REPO || DEFAULT_REPO,
    branch: DEFAULT_BRANCH,
    dir: path.join(os.homedir(), "paperclip-ai"),
    onboard: true,
    dryRun: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const next = argv[++i];
      if (!next || next.startsWith("--")) throw new Error(`${arg} needs a value`);
      return next;
    };
    if (arg === "--repo") opts.repo = value();
    else if (arg === "--branch") opts.branch = value();
    else if (arg === "--dir") opts.dir = path.resolve(value());
    else if (arg === "--no-onboard") opts.onboard = false;
    else if (arg === "--dry-run") opts.dryRun = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return opts;
}

/** Inject a token into an https clone URL so a private fork can be cloned. */
export function authenticatedRepoUrl(repo, token) {
  if (!token || !repo.startsWith("https://")) return repo;
  return repo.replace("https://", `https://x-access-token:${encodeURIComponent(token)}@`);
}

export function nodeMajor(version = process.versions.node) {
  return Number.parseInt(version.split(".")[0], 10);
}

/**
 * Ordered install plan. Each step is [label, command, args, options].
 * `exists` says whether the checkout directory is already a git clone.
 */
export function buildPlan(opts, { exists, hasPnpm }) {
  const plan = [];
  if (!hasPnpm) {
    plan.push(["Enable corepack", "corepack", ["enable"]]);
    plan.push(["Install pnpm", "corepack", ["prepare", "pnpm@latest", "--activate"]]);
  }
  if (exists) {
    plan.push(["Update fork", "git", ["-C", opts.dir, "pull", "--ff-only", "origin", opts.branch]]);
  } else {
    plan.push(["Clone fork", "git", ["clone", "--branch", opts.branch, "--depth", "1", opts.repo, opts.dir]]);
  }
  plan.push(["Install dependencies", "pnpm", ["install", "--frozen-lockfile"], { cwd: opts.dir }]);
  plan.push(["Build", "pnpm", ["build"], { cwd: opts.dir }]);
  if (opts.onboard) {
    plan.push(["Onboard Paperclip", "pnpm", ["paperclipai", "onboard", "--yes"], { cwd: opts.dir }]);
  }
  return plan;
}
