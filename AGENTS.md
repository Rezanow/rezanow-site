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
