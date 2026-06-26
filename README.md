<p align="center">
  <img src="./assets/logo.svg" width="96" height="96" alt="Workspace Browser logo">
</p>

# Codex Workspace Browser Skill

A lightweight Codex skill that opens local project files in the Codex in-app browser instead of macOS Finder.

![Workspace Browser hub screenshot](./assets/screenshot-hub.png)

![Workspace Browser project screenshot](./assets/screenshot-browser.png)

## What It Does

- Starts a local project file browser bound to `127.0.0.1`.
- Starts a fixed workspace hub at `http://127.0.0.1:4316/`.
- Registers multiple projects in one hub.
- Supports pinned project URLs such as `http://127.0.0.1:4316/?root=...` to avoid cross-thread confusion.
- Restricts each project browser to its selected root folder.
- Gives Codex a clear `WB_OPEN` / `WORKSPACE_BROWSER` workflow.

## Requirements

- macOS
- Node.js available as `node`
- Python 3 available as `python3`
- Codex with local skills enabled

This first release uses macOS `launchctl` for background services. Linux and Windows support can be added later with `systemd`, PowerShell, or a foreground mode.

## Install

Clone this repository, then run:

```bash
scripts/install.sh
```

The installer copies files into `${CODEX_HOME:-$HOME/.codex}`:

```text
bin/open-workspace-browser
bin/open-workspace-hub
bin/wbopen
tools/workspace-browser.js
tools/workspace-hub.js
skills/workspace-browser/
```

Restart Codex after installation if the skill metadata does not appear immediately.

## Usage

Most reliable command inside a Codex project thread:

```bash
$HOME/.codex/bin/wbopen "$PWD"
```

Natural language trigger for fresh threads:

```text
WB_OPEN
```

For old long-running editing threads, prefer the explicit command above. A long conversation that is already focused on editing HTML, slides, or documents can misinterpret short natural-language commands.

## URLs

- Fixed hub: `http://127.0.0.1:4316/`
- Project browser: assigned automatically from `4317` upward
- Pinned hub URL: printed as `Pinned hub: ...` by `wbopen`

## Uninstall

```bash
scripts/uninstall.sh
```

The uninstaller removes launchers, tools, skill files, and LaunchAgents. It leaves registry and logs in place so users can inspect or delete them manually.

## Security Notes

- Services bind to `127.0.0.1`, not a public network interface.
- File access is locked to the selected project root.
- The hub stores local project paths in:

```text
~/.codex/workspace-browser-registry.json
```

Do not expose these local ports to the public internet.

## Adding Images To The GitHub Project

Place project images in `assets/`, then reference them from README with relative Markdown paths:

```md
![Workspace Browser hub screenshot](./assets/screenshot-hub.png)
```

Recommended assets:

- `assets/logo.svg` for the project logo
- `assets/screenshot-hub.png` for the workspace hub
- `assets/screenshot-browser.png` for the project file browser
- `assets/screenshots/*.png` for real UI screenshots after release

Use real screenshots for the README when the UI is stable. Keep paths anonymized, for example with `~` instead of a full local home directory.

## GitHub Maintenance Automation

Recommended setup after publishing:

- Issue templates for bug reports and feature requests.
- Pull request template with test checklist.
- GitHub Actions workflow that runs `node --check`, shell syntax checks, and skill validation.
- Dependabot only if package manifests are added later.
- A GitHub App or MCP connector for Codex to triage issues, summarize comments, and draft replies.

Suggested maintainer workflow:

1. Let GitHub Actions validate every PR.
2. Use Codex with the GitHub connector to summarize new issues weekly.
3. Use labels such as `bug`, `enhancement`, `question`, `good first issue`.
4. Keep replies short and link to the relevant README section.

## License

MIT License. See [LICENSE](LICENSE).

## Disclaimer

This is an unofficial community skill for Codex. It is not affiliated with or endorsed by OpenAI.
