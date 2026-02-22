# Versioning Policy

This project follows **Semantic Versioning** (`MAJOR.MINOR.PATCH`) and uses **Conventional Commits** as the source of truth for release automation.

## Change-Type to Version Mapping

### MAJOR (`X.0.0`)
Increment MAJOR when a change introduces **breaking gameplay or data compatibility**.

Examples:
- Save data format changes that older builds cannot read.
- Rule changes that invalidate existing expected game behavior.
- API/config changes that require user or integrator migration.

### MINOR (`0.X.0`)
Increment MINOR when adding **new features or options** without breaking existing behavior.

Examples:
- New gameplay options, accessibility modes, or UX controls.
- Backward-compatible enhancements to logic or UI.

### PATCH (`0.0.X`)
Increment PATCH for **bug fixes, text/style tweaks, and performance improvements**.

Examples:
- Fixing move validation defects.
- Updating labels, copy, spacing, or visual polish.
- Optimizing render or interaction performance without behavior breakage.

## Main Branch Merge Policy

To keep every commit that lands on `main` parseable by release automation:

1. **Use squash merge only** for pull requests targeting `main`.
2. PR titles must use Conventional Commits and start with one of:
   - `feat: ...` or `feat(scope): ...`
   - `fix: ...` or `fix(scope): ...`
   - `perf: ...` or `perf(scope): ...`
   - Any of the above may include `!` for breaking changes, e.g. `feat!: ...` or `fix(api)!: ...`
3. CI validates this PR-title policy in `.github/workflows/pr-title-conventional.yml`.

## Commit Message Convention (Required)

All commits must follow the Conventional Commits format:

```text
<type>(optional-scope): <short description>
```

Examples:
- `feat(gameplay): add optional auto-finish mode`
- `fix(cards): prevent duplicate drag selection`
- `perf(render): reduce card repaint churn`
- `docs(versioning): document semantic release policy`

### Supported release-driving commit types

Accepted release-driving types are:

- `feat`: triggers a **MINOR** release.
- `fix`: triggers a **PATCH** release.
- `perf`: triggers a **PATCH** release.
- Any accepted type marked as breaking with `!` (for example `feat!`, `fix!`, `perf!`) or with footer `BREAKING CHANGE:` triggers a **MAJOR** release.

### Non-release commit types

`docs`, `style`, `chore`, `test`, `build`, `ci`, and `refactor` do not publish a release unless marked as breaking.

## Automated Release + Version Injection

CI release automation is configured to:

1. Detect Conventional Commit types.
2. Calculate the next semantic version.
3. Create/update Git tag and GitHub release.
4. Export the resolved version string to the build-injection step that stamps the footer version placeholder in `index.html`.

> **Important:** Semantic version bumps (tag/release creation) are performed **only** by the GitHub Actions workflow at `.github/workflows/release.yml`, in the `release` job, and only on `push` events to `main` (`if: github.event_name == 'push' && github.ref == 'refs/heads/main'`).

## Why my PR didn’t bump version

If your pull request did not create a new version tag or GitHub Release, this is expected behavior in most cases:

1. **PRs themselves do not create tags/releases.**
   The `release` job is gated to run only after changes are merged and pushed to `main`, not on `pull_request` events.
2. **Version increments are computed after merge on `main`.**
   Release automation evaluates Conventional Commits from the merged history on `main` and then calculates the next semantic version.
3. **Merge strategy and commit format still matter.**
   Use a merge approach that preserves Conventional Commit messages in `main` history (for example, squash commit title/body or individual commits) and ensure commit messages satisfy the required format:

   ```text
   <type>(optional-scope): <short description>
   ```

   Release-driving types remain `feat` (MINOR), `fix`/`perf` (PATCH), and any breaking change marker (`!` or `BREAKING CHANGE:`) for MAJOR.

## Fallback for Non-Release Branches

For branches that are not configured for official releases, CI injects a development version string:

```text
vX.Y.Z-dev+<shortsha>
```

Where `X.Y.Z` is derived from the latest reachable tag in this order:

1. latest reachable `v*` tag,
2. latest reachable unprefixed numeric tag (`X.Y.Z`), normalized to `vX.Y.Z`,
3. baseline `v0.0.0` when no matching tag exists in checkout scope.

Examples:
- `v1.4.2-dev+abc1234` (latest reachable tag is `v1.4.2`)
- `v2.0.1-dev+abc1234` (latest reachable tag is `2.0.1`, normalized with `v` prefix)
- `v0.0.0-dev+abc1234` (no reachable release tags)
