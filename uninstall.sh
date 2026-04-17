#!/usr/bin/env sh
set -eu

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
UNMERGE_SCRIPT="$REPO_DIR/scripts/unmerge-settings.js"
MARKER="{{hook-name}}-hook-v1"

GLOBAL_SETTINGS="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/settings.json"
PROJECT_SETTINGS=".claude/settings.json"

echo "Uninstalling {{Hook-Name}}..."

# Remove hook from both possible locations (no-op if absent).
[ -f "$GLOBAL_SETTINGS" ] && node "$UNMERGE_SCRIPT" "$GLOBAL_SETTINGS" "$MARKER" || true
[ -f "$PROJECT_SETTINGS" ] && node "$UNMERGE_SCRIPT" "$PROJECT_SETTINGS" "$MARKER" || true

# Remove skill and slash-command files from both possible locations.
for base in "${CLAUDE_CONFIG_DIR:-$HOME/.claude}" ".claude"; do
  rm -f "$base/skills/{{hook-name}}/SKILL.md" 2>/dev/null || true
  rmdir "$base/skills/{{hook-name}}" 2>/dev/null || true
  rm -f "$base/commands/{{hook-name}}.md" "$base/commands/{{hook-name}}-snooze.md" "$base/commands/{{hook-name}}-status.md" 2>/dev/null || true
done

# Offer to delete state file.
STATE="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/{{hook-name}}/state.json"
if [ -f "$STATE" ]; then
  printf "Delete state file at %s? [y/N]: " "$STATE"
  read ANS || true
  case "${ANS:-}" in
    y|Y) rm -f "$STATE"; rmdir "$(dirname "$STATE")" 2>/dev/null || true; echo "State deleted." ;;
    *) echo "Kept state file." ;;
  esac
fi

echo "{{Hook-Name}} uninstalled."
