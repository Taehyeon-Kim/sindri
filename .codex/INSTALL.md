# Installing Sindri for Codex CLI

Enable sindri skills in Codex via native skill discovery.

## Quick Install

Tell Codex:

```
Fetch and follow instructions from https://raw.githubusercontent.com/Taehyeon-Kim/sindri/main/.codex/INSTALL.md
```

## Prerequisites

- [Bun](https://bun.sh) (for `sindri` CLI)
- Git

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Taehyeon-Kim/sindri.git ~/.codex/sindri
   ```

2. **Install the CLI:**
   ```bash
   cd ~/.codex/sindri && bun install && bun link
   ```

3. **Create the skills symlink:**
   ```bash
   mkdir -p ~/.agents/skills
   ln -s ~/.codex/sindri/skills ~/.agents/skills/sindri
   ```

   **Windows (PowerShell):**
   ```powershell
   New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
   cmd /c mklink /J "$env:USERPROFILE\.agents\skills\sindri" "$env:USERPROFILE\.codex\sindri\skills"
   ```

4. **Restart Codex** to discover the skills.

## Verify

```bash
sindri --help                    # CLI available
ls -la ~/.agents/skills/sindri   # Symlink exists
```

## Usage

Once installed, Codex discovers the `/sindri` skill automatically.

- `sindri init` / `sindri loop` / `sindri cycle` work as described in the skill
- The skill reads the same `.sindri/` directory and `agents.md` as Claude Code
- Results are platform-agnostic (JSONL) and interchangeable between platforms

## Updating

```bash
cd ~/.codex/sindri && git pull && bun install
```

Skills update instantly through the symlink.

## Uninstalling

```bash
rm ~/.agents/skills/sindri
```

Optionally delete the clone: `rm -rf ~/.codex/sindri`.
