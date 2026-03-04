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
- Each game page displays a semantic version as `vMAJOR.MINOR.PATCH` (e.g., `v0.2.4`). If it's not present, add it. 
- Version numbers live **in the HTML file for the game being changed** — not always `index.html`.
- Any time you make a change that will be committed (any file change other than docs-only, unless requested), you MUST:
  1) identify which HTML file you modified
  2) bump PATCH by +1 in that file (e.g., `0.2.4 -> 0.2.5`)
  3) include that change in the same PR/commit
- If the task is *only* changing version text in an HTML file, don't double-bump.
- If you made zero file changes, do not bump.
- **Never bump `index.html`'s version for changes made to other game pages.**
