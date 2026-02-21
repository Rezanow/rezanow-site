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

- `feat`: triggers a **MINOR** release.
- `fix` / `perf`: trigger a **PATCH** release.
- `feat!` / `fix!` / any type with `!`, or footer `BREAKING CHANGE:`: triggers a **MAJOR** release.

### Non-release commit types

`docs`, `style`, `chore`, `test`, `build`, `ci`, and `refactor` do not publish a release unless marked as breaking.

## Automated Release + Version Injection

CI release automation is configured to:

1. Detect Conventional Commit types.
2. Calculate the next semantic version.
3. Create/update Git tag and GitHub release.
4. Export the resolved version string to the build-injection step that stamps the footer version placeholder in `index.html`.

## Fallback for Non-Release Branches

For branches that are not configured for official releases, CI injects a development version string:

```text
vX.Y.Z-dev+<shortsha>
```

Where `X.Y.Z` is derived from the latest reachable tag (or `0.0.0` when no tag exists), and `<shortsha>` is the current short commit SHA.
