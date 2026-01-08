# Delta Review Artifacts

This directory contains artifacts for delta review workflows, keeping review diffs small between iterations.

## Overview

The delta review workflow generates:
1. **`review.diff`** - A small diff file containing only changes since the anchor commit
2. **`review.bundle.txt`** - A single text file containing the contents of all changed files (plus optional dependencies)
3. **`anchor.sha`** - The commit SHA used as the anchor point for delta comparisons

## Anchor

The **anchor** is a commit reference that marks the starting point for delta comparisons. Only changes since the anchor commit are included in review artifacts.

### Initialization

If `.review/anchor.sha` does not exist, it is automatically initialized to the merge-base of `origin/dev-copy` (or the specified `BASE` branch) and `HEAD`.

### Updating the Anchor

**IMPORTANT**: The anchor must only be updated manually after Tech Lead approval.

To update the anchor:
```bash
git rev-parse HEAD > .review/anchor.sha
```

Or use the convenience command:
```bash
pnpm review:anchor:update
```
(This only prints the command; you must run it explicitly.)

## Generating Delta Artifacts

### Basic Usage

```bash
bash ./scripts/review_delta_artifacts.sh [BASE]
```

Or use the convenience script (defaults to `dev-copy`):
```bash
pnpm review:delta
```

You can override the base branch in several ways:

1. **Positional argument:**
   ```bash
   bash ./scripts/review_delta_artifacts.sh dev-copy
   ```

2. **Environment variable:**
   ```bash
   BASE=dev-copy bash ./scripts/review_delta_artifacts.sh
   ```

3. **npm/pnpm config (for use with pnpm scripts):**
   ```bash
   pnpm review:delta --base=dev-copy
   ```

The base branch selection follows this priority:
- First positional argument (`$1`) if provided
- `BASE` environment variable if set
- `npm_config_base` environment variable if set (from `--base` flag)
- Default: `dev-copy`

### What It Does

1. Ensures `.review/anchor.sha` exists (initializes if missing)
2. Generates a list of changed files since the anchor: `changed_files.delta.txt`
3. Filters out noisy paths (lock files, `dist/` folders, generated OpenAPI JSON): `changed_files.delta.filtered.txt`
4. Creates a bundle of filtered files: `review.bundle.txt`
5. Generates a diff of filtered files: `review.diff`

### Filtered Paths

The following patterns are automatically excluded:
- `pnpm-lock.yaml`
- `package-lock.json`
- `yarn.lock`
- Any `dist/` folders
- Generated `openapi.json` files

### Adding Dependencies

To include additional files in the bundle (e.g., related files not in the delta), create `.review/deps.txt` with one path per line:

```
apps/api-gateway/src/common/constants.ts
libs/contracts/src/listings/types.ts
```

These paths will be appended to the bundle automatically.

## Output Files

- **`anchor.sha`** - The anchor commit SHA (never auto-updated)
- **`changed_files.delta.txt`** - All changed files since anchor
- **`changed_files.delta.filtered.txt`** - Filtered list (noise removed)
- **`bundle_paths.txt`** - Paths included in bundle (filtered + deps.txt)
- **`review.diff`** - Git diff of filtered changes
- **`review.bundle.txt`** - Bundled contents of all files

## Bundle Limits

The bundler enforces limits to keep artifacts manageable:
- **Max file size**: 512KB per file (default)
- **Max total size**: 3MB total (default)
- **Denied files**: `.env`, `.env.local`, `.env.production`, `.env.development`, `.env.test`, and any file starting with `.env.` (never included by default)

Files exceeding limits or matching deny patterns are listed in the bundle manifest with skip reasons.

## Workflow

1. Make changes and commit
2. Run `pnpm review:delta` to generate artifacts
3. Share `review.diff` and `review.bundle.txt` for review
4. After Tech Lead approval, update anchor: `git rev-parse HEAD > .review/anchor.sha`
5. Repeat for next iteration

This keeps each review focused on only the changes since the last approved anchor.

