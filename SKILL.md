---
name: workspace-browser
description: Use when the user says "WB_OPEN", "WORKSPACE_BROWSER", "OPEN_WORKSPACE_BROWSER", or asks to open a local browser-based file view, built-in file browser, right-side browser file view, project file window, workspace file window, "project file hub", "workspace file hub", or wants a Finder-like local project file view inside Codex instead of opening macOS Finder.
---

# Workspace Browser

Open the current project as a local, browser-based file view for Codex in-app browser. Prefer this workflow when the user wants to inspect project files visually without switching to Finder.

## Procedure

1. If the user says exactly `WB_OPEN`, `WORKSPACE_BROWSER`, or `OPEN_WORKSPACE_BROWSER`, do not inspect, read, search, edit, render, or modify project source/content files. Only run:

   ```bash
   "$HOME/.codex/bin/wbopen" "$PWD"
   ```

2. For natural-language requests such as "project file hub", "workspace file hub", "current project files", or "current workspace folder", interpret the request as: register the current workspace as the active project in the workspace hub.

3. Do not open macOS Finder as the default behavior.

4. Start or confirm the fixed workspace hub:

   ```bash
   "$HOME/.codex/bin/open-workspace-hub" 4316
   ```

5. Start or reuse the project browser:

   ```bash
   "$HOME/.codex/bin/open-workspace-browser" "$PWD" 4317
   ```

6. Return the printed `Pinned hub:` URL when available. It locks the hub to the current project and avoids cross-thread confusion.

7. Return the fixed hub URL `http://127.0.0.1:4316/` only for a general project list.

## Notes

- The project browser binds to `127.0.0.1` and restricts file access to the selected project root.
- The hub records project paths locally in `$HOME/.codex/workspace-browser-registry.json`.
- The current launchers use macOS `launchctl`. Treat macOS as the supported platform for this version.
- Avoid ambiguous short phrases such as "file" as the primary trigger in active editing threads.
- In old active editing threads, prefer the explicit command `"$HOME/.codex/bin/wbopen" "$PWD"` because long conversation context can override newly-added skill instructions.
