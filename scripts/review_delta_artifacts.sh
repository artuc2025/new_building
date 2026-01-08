#!/bin/bash
# Generate delta review artifacts: diff and bundle of changed files since anchor commit.
#
# Usage:
#   ./scripts/review_delta_artifacts.sh [BASE]
#   BASE=master ./scripts/review_delta_artifacts.sh
#
# Arguments:
#   BASE - Base branch name (default: master, can also be set via environment variable)

set -euo pipefail

# Accept BASE as first argument or from environment, default to master
if [ $# -gt 0 ]; then
  BASE="$1"
elif [ -n "${BASE:-}" ]; then
  BASE="$BASE"
else
  BASE="master"
fi

# Get repository root
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Create .review directory if missing
REVIEW_DIR=".review"
mkdir -p "$REVIEW_DIR"

# Initialize anchor if missing
ANCHOR_FILE="$REVIEW_DIR/anchor.sha"
if [ ! -f "$ANCHOR_FILE" ]; then
  echo "Initializing anchor from merge-base of origin/$BASE and HEAD..."
  git merge-base "origin/$BASE" HEAD > "$ANCHOR_FILE" || {
    echo "Warning: Could not compute merge-base. Using HEAD as anchor."
    git rev-parse HEAD > "$ANCHOR_FILE"
  }
fi

# Read anchor
ANCHOR="$(cat "$ANCHOR_FILE" | tr -d '\n\r')"
if [ -z "$ANCHOR" ]; then
  echo "Error: Anchor file is empty" >&2
  exit 1
fi

# Verify anchor exists
if ! git cat-file -e "$ANCHOR" 2>/dev/null; then
  echo "Error: Anchor commit $ANCHOR does not exist" >&2
  exit 1
fi

echo "Using anchor: $ANCHOR"
echo "Base branch: $BASE"

# Generate list of changed files
CHANGED_FILES="$REVIEW_DIR/changed_files.delta.txt"
git diff --name-only "$ANCHOR..HEAD" > "$CHANGED_FILES" || {
  echo "Warning: git diff failed, creating empty file" >&2
  > "$CHANGED_FILES"
}

# Filter out noisy paths
FILTERED_FILES="$REVIEW_DIR/changed_files.delta.filtered.txt"
if [ -s "$CHANGED_FILES" ]; then
  # Filter patterns: lock files, dist folders, generated OpenAPI JSON
  grep -vE '^(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|.*/dist/|.*/openapi\.json)$' "$CHANGED_FILES" > "$FILTERED_FILES" || true
  # Ensure file exists even if grep produces no output
  touch "$FILTERED_FILES"
else
  > "$FILTERED_FILES"
fi

# Prepare bundle paths
BUNDLE_PATHS="$REVIEW_DIR/bundle_paths.txt"
cp "$FILTERED_FILES" "$BUNDLE_PATHS"

# Append deps.txt if it exists
DEPS_FILE="$REVIEW_DIR/deps.txt"
if [ -f "$DEPS_FILE" ]; then
  echo "" >> "$BUNDLE_PATHS"
  echo "# Additional dependencies from .review/deps.txt" >> "$BUNDLE_PATHS"
  cat "$DEPS_FILE" >> "$BUNDLE_PATHS"
fi

# Run bundler
BUNDLE_OUT="$REVIEW_DIR/review.bundle.txt"
echo "Bundling files..."
node ./scripts/bundle_files.mjs \
  --out "$BUNDLE_OUT" \
  --root "$REPO_ROOT" \
  --paths-file "$BUNDLE_PATHS" \
  --deny ".env,.env.local,.env.production,.env.development,.env.test" \
  --max-file-bytes 524288 \
  --max-total-bytes 3145728

# Generate diff
DIFF_OUT="$REVIEW_DIR/review.diff"
if [ ! -s "$FILTERED_FILES" ]; then
  # No changes
  cat > "$DIFF_OUT" <<EOF
No changes detected since anchor commit $ANCHOR.

To see all changes (including filtered files), check:
  $CHANGED_FILES

To update the anchor after Tech Lead approval:
  git rev-parse HEAD > $ANCHOR_FILE
EOF
else
  # Generate diff using NUL-separated pathspec
  PATHS_NUL="$REVIEW_DIR/paths.nul"
  tr '\n' '\0' < "$FILTERED_FILES" > "$PATHS_NUL"
  
  git diff "$ANCHOR..HEAD" \
    --pathspec-from-file="$PATHS_NUL" \
    --pathspec-file-nul > "$DIFF_OUT" || {
    echo "Warning: git diff with pathspec failed, generating full diff" >&2
    git diff "$ANCHOR..HEAD" > "$DIFF_OUT"
  }
  
  # Clean up temporary file
  rm -f "$PATHS_NUL"
fi

# Count files
CHANGED_COUNT=$(wc -l < "$CHANGED_FILES" | tr -d ' ')
FILTERED_COUNT=$(wc -l < "$FILTERED_FILES" | tr -d ' ')

# Print summary
echo ""
echo "=========================================="
echo "Delta Review Artifacts Generated"
echo "=========================================="
echo "Base branch:     $BASE"
echo "Anchor commit:   $ANCHOR"
echo "Changed files:   $CHANGED_COUNT (total), $FILTERED_COUNT (filtered)"
echo ""
echo "Output files:"
echo "  - $DIFF_OUT"
echo "  - $BUNDLE_OUT"
echo "  - $CHANGED_FILES"
echo "  - $FILTERED_FILES"
echo ""
echo "Note: Anchor is NOT updated automatically."
echo "      Update only after Tech Lead approval:"
echo "      git rev-parse HEAD > $ANCHOR_FILE"
echo "=========================================="

