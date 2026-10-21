# paperclip-ai-installer

`npx` installer for the InfinitySoftware-House Paperclip fork (adds project file uploads).
It follows the steps of the official guide: https://docs.paperclip.ing/guides/getting-started/installation/
but clones and builds the fork instead of using the `paperclipai` npm package.

## Use

```bash
npx github:InfinitySoftware-House/paperclip-installer
```

The repositories are public, so no token is needed. If you point `--repo` at a private fork,
set `GITHUB_TOKEN` (or use a git credential helper).

Requirements: Node 24+, git, Rust (`cargo`, needed to compile the native runner) with a C linker
(`build-essential` on Debian/Ubuntu), and a non-root user. pnpm is enabled through corepack if missing.

## What it does

1. Enables corepack and pnpm (only if pnpm is missing).
2. Clones the fork into `~/paperclip-ai` (or updates it with `git pull --ff-only`).
3. `pnpm install --frozen-lockfile` and `pnpm build`.
4. `pnpm paperclipai onboard --yes`, which creates `~/.paperclip/` and starts the server on http://localhost:3100.

Options: `--dir`, `--repo`, `--branch`, `--no-onboard`, `--dry-run`.

Start it again later with `cd ~/paperclip-ai && pnpm paperclipai run`.

## Not covered

Public VPS setup (systemd, nginx, HTTPS, `PAPERCLIP_*` environment variables) is not automated.
Follow the "Server / VPS" section of the official guide after the install.
Native Windows is not supported for the Claude/Codex browser sign-in.
