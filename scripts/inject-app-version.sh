#!/usr/bin/env bash
set -euo pipefail

TARGET_FILE="${1:-index.html}"
MODE="${2:-inject}"
PLACEHOLDER="__APP_VERSION__"

resolve_version() {
  local version_base
  local commit_sha
  local short_sha

  if [[ -n "${APP_VERSION_TAG:-}" ]]; then
    printf '%s\n' "${APP_VERSION_TAG}"
    return
  fi

  if [[ -n "${GITHUB_REF_TYPE:-}" && "${GITHUB_REF_TYPE}" == "tag" && -n "${GITHUB_REF_NAME:-}" ]]; then
    version_base="${GITHUB_REF_NAME}"
    printf '%s\n' "${version_base}"
    return
  fi

  if [[ "${GITHUB_REF:-}" == refs/tags/* ]]; then
    version_base="${GITHUB_REF#refs/tags/}"
    printf '%s\n' "${version_base}"
    return
  fi

  version_base="$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || true)"
  if [[ -z "${version_base}" ]]; then
    version_base="$(git describe --tags --abbrev=0 --match '[0-9]*' 2>/dev/null || true)"
  fi
  if [[ -z "${version_base}" ]]; then
    version_base="v0.1.0"
  fi

  if [[ -n "${GITHUB_SHA:-}" ]]; then
    commit_sha="${GITHUB_SHA}"
  elif git rev-parse --verify HEAD >/dev/null 2>&1; then
    commit_sha="$(git rev-parse HEAD)"
  else
    commit_sha="unknown"
  fi

  short_sha="${commit_sha:0:7}"
  printf '%s\n' "${version_base}-dev+${short_sha}"
}

resolved_version="$(resolve_version)"

if [[ "${MODE}" == "resolve-only" ]]; then
  printf '%s\n' "${resolved_version}"
  exit 0
fi

if [[ ! -f "$TARGET_FILE" ]]; then
  echo "Target file not found: $TARGET_FILE" >&2
  exit 1
fi

if ! grep -q "$PLACEHOLDER" "$TARGET_FILE"; then
  echo "Placeholder '$PLACEHOLDER' not found in $TARGET_FILE" >&2
  exit 1
fi

python3 - "$TARGET_FILE" "$PLACEHOLDER" "$resolved_version" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
placeholder = sys.argv[2]
resolved = sys.argv[3]
content = path.read_text(encoding="utf-8")
path.write_text(content.replace(placeholder, resolved), encoding="utf-8")
PY

echo "Injected app version into ${TARGET_FILE}: ${resolved_version}"
