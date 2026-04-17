#!/usr/bin/env sh
# One-time scaffold setup: replaces {{hook-name}} placeholders and renames files.
# Usage: ./setup.sh my-hook-name
set -eu

HOOK_NAME="${1:-}"
if [ -z "$HOOK_NAME" ]; then
  echo "Usage: ./setup.sh <hook-name>"
  echo "Example: ./setup.sh stretch-break"
  exit 1
fi

# Validate: kebab-case, lowercase, no special chars
if ! echo "$HOOK_NAME" | grep -qE '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'; then
  echo "Hook name must be lowercase kebab-case (e.g., stretch-break, meal-reminder)"
  exit 1
fi

# Derive display name: stretch-break -> Stretch-Break
HOOK_DISPLAY=$(echo "$HOOK_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1' | sed 's/ /-/g')

# Derive env prefix: stretch-break -> STRETCH_BREAK
HOOK_ENV_PREFIX=$(echo "$HOOK_NAME" | tr '[:lower:]-' '[:upper:]_')

echo "Setting up humane hook: $HOOK_NAME"
echo "  Display name: $HOOK_DISPLAY"
echo "  Env prefix:   $HOOK_ENV_PREFIX"
echo ""

# Replace placeholders in file contents
find . -type f \
  -not -path './.git/*' \
  -not -path './setup.sh' \
  -not -name '*.png' -not -name '*.jpg' \
  -exec sed -i.bak \
    -e "s/{{hook-name}}/$HOOK_NAME/g" \
    -e "s/{{Hook-Name}}/$HOOK_DISPLAY/g" \
    -e "s/{{HOOK_ENV_PREFIX}}/$HOOK_ENV_PREFIX/g" \
    {} +

# Clean up sed backup files
find . -name '*.bak' -delete

# Rename files containing {{hook-name}}
find . -type f -name '*{{hook-name}}*' | while read -r f; do
  newname=$(echo "$f" | sed "s/{{hook-name}}/$HOOK_NAME/g")
  mkdir -p "$(dirname "$newname")"
  mv "$f" "$newname"
done

# Rename directories containing {{hook-name}}
find . -type d -name '*{{hook-name}}*' | sort -r | while read -r d; do
  newname=$(echo "$d" | sed "s/{{hook-name}}/$HOOK_NAME/g")
  mv "$d" "$newname"
done

# Remove this setup script — it's a one-time tool
rm -f setup.sh

echo "Scaffold complete. Files renamed, placeholders replaced."
echo ""
echo "Next steps:"
echo "  1. Edit hooks/$HOOK_NAME.js — customize thresholds and instructions"
echo "  2. Edit skills/$HOOK_NAME/SKILL.md — fill in the tone-guidance placeholders"
echo "  3. Rewrite README.md for your hook (see the callout at the top)"
echo "  4. Run tests: node --test tests/$HOOK_NAME.test.js"
echo "  5. Install locally: ./install.sh"
