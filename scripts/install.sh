#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

mkdir -p "$CODEX_HOME/bin" "$CODEX_HOME/tools" "$CODEX_HOME/skills/workspace-browser"

cp "$SCRIPT_DIR/workspace-browser.js" "$CODEX_HOME/tools/workspace-browser.js"
cp "$SCRIPT_DIR/workspace-hub.js" "$CODEX_HOME/tools/workspace-hub.js"
cp "$SCRIPT_DIR/open-workspace-browser" "$CODEX_HOME/bin/open-workspace-browser"
cp "$SCRIPT_DIR/open-workspace-hub" "$CODEX_HOME/bin/open-workspace-hub"
cp "$SCRIPT_DIR/wbopen" "$CODEX_HOME/bin/wbopen"
chmod +x "$CODEX_HOME/bin/open-workspace-browser" "$CODEX_HOME/bin/open-workspace-hub" "$CODEX_HOME/bin/wbopen"

cp "$SKILL_DIR/SKILL.md" "$CODEX_HOME/skills/workspace-browser/SKILL.md"
rm -rf "$CODEX_HOME/skills/workspace-browser/agents" "$CODEX_HOME/skills/workspace-browser/assets"
cp -R "$SKILL_DIR/agents" "$CODEX_HOME/skills/workspace-browser/agents"
cp -R "$SKILL_DIR/assets" "$CODEX_HOME/skills/workspace-browser/assets"

echo "Workspace Browser installed."
echo "Try:"
echo "  $CODEX_HOME/bin/wbopen \"\$PWD\""
echo "Hub:"
echo "  http://127.0.0.1:4316/"
