import { test } from "node:test";
import assert from "node:assert/strict";
import { authenticatedRepoUrl, buildPlan, nodeMajor, parseArgs } from "./steps.mjs";

test("parseArgs applies defaults and overrides", () => {
  const defaults = parseArgs([]);
  assert.equal(defaults.branch, "main");
  assert.equal(defaults.onboard, true);
  const custom = parseArgs(["--branch", "dev", "--no-onboard", "--dry-run"]);
  assert.equal(custom.branch, "dev");
  assert.equal(custom.onboard, false);
  assert.equal(custom.dryRun, true);
});

test("parseArgs rejects unknown options and missing values", () => {
  assert.throws(() => parseArgs(["--nope"]), /Unknown option/);
  assert.throws(() => parseArgs(["--dir"]), /needs a value/);
});

test("token is injected only into https urls", () => {
  assert.match(authenticatedRepoUrl("https://github.com/a/b.git", "tok"), /^https:\/\/x-access-token:tok@github\.com/);
  assert.equal(authenticatedRepoUrl("git@github.com:a/b.git", "tok"), "git@github.com:a/b.git");
  assert.equal(authenticatedRepoUrl("https://github.com/a/b.git", ""), "https://github.com/a/b.git");
});

test("plan clones fresh, pulls existing, and skips pnpm setup when present", () => {
  const opts = parseArgs(["--dir", "/tmp/x"]);
  const fresh = buildPlan(opts, { exists: false, hasPnpm: false }).map(([label]) => label);
  assert.deepEqual(fresh, ["Enable corepack", "Install pnpm", "Clone fork", "Install dependencies", "Build", "Onboard Paperclip"]);
  const update = buildPlan(opts, { exists: true, hasPnpm: true }).map(([label]) => label);
  assert.deepEqual(update, ["Update fork", "Install dependencies", "Build", "Onboard Paperclip"]);
  assert.ok(!buildPlan({ ...opts, onboard: false }, { exists: true, hasPnpm: true }).some(([label]) => label === "Onboard Paperclip"));
});

test("nodeMajor parses the major version", () => {
  assert.equal(nodeMajor("24.14.0"), 24);
});
