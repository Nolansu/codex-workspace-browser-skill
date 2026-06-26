#!/usr/bin/env bash
set -euo pipefail

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
USER_ID="$(id -u)"

for plist in "$HOME/Library/LaunchAgents"/com.codex.workspace-browser.*.plist "$HOME/Library/LaunchAgents"/com.codex.workspace-hub.*.plist; do
  [ -e "$plist" ] || continue
  label="$(basename "$plist" .plist)"
  launchctl bootout "gui/$USER_ID/$label" >/dev/null 2>&1 || true
  rm -f "$plist"
done

rm -f "$CODEX_HOME/bin/open-workspace-browser"
rm -f "$CODEX_HOME/bin/open-workspace-hub"
rm -f "$CODEX_HOME/bin/wbopen"
rm -f "$CODEX_HOME/tools/workspace-browser.js"
rm -f "$CODEX_HOME/tools/workspace-hub.js"
rm -rf "$CODEX_HOME/skills/workspace-browser"

echo "Workspace Browser uninstalled."
echo "Registry and logs were left in place:"
echo "  $CODEX_HOME/workspace-browser-registry.json"
echo "  $CODEX_HOME/logs/workspace-browser-*.log"
echo "  $CODEX_HOME/logs/workspace-hub-*.log"
