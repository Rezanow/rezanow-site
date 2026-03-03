# AGENTS.md

## Pull requests
- PR titles MUST pass commitlint / Conventional Commits.
- Format: <type>(<scope>): <subject>  (scope optional)
- Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
- Subject: imperative, no trailing period, <= 72 chars.
- If scope is unknown, omit it: feat: <subject>
- Before opening a PR, explicitly state the PR title you will use.
- Do not open a PR without confirming the title matches Conventional Commits format.
- Examples:
  - ci: run Playwright e2e in GitHub Actions
  - fix(solitaire): prevent hint loop regression
  - chore: bump patch version

## Versioning (required)
- This repo displays a semantic version in `index.html` as `vMAJOR.MINOR.PATCH` (e.g., `v0.2.4`).
- Any time you make a change that will be committed (any file change other than docs-only, unless requested), you MUST:
  1) bump PATCH by +1 in `index.html` (e.g., `0.2.4 -> 0.2.5`)
  2) include that change in the same PR/commit
- If the task is *only* changing `index.html` version text already, don’t double-bump.
- If you made zero file changes, do not bump.