#!/usr/bin/env bash
set -euo pipefail

TARGET_FILE="${1:-index.html}"
PLACEHOLDER="__APP_VERSION__"

if [[ ! -f "$TARGET_FILE" ]]; then
  echo "Target file not found: $TARGET_FILE" >&2
  exit 1
fi

build_date="${BUILD_DATE:-$(date -u +"%Y-%m-%dT%H:%M:%SZ")}" 

if [[ -n "${GITHUB_REF_TYPE:-}" && "${GITHUB_REF_TYPE}" == "tag" && -n "${GITHUB_REF_NAME:-}" ]]; then
  version_base="${GITHUB_REF_NAME}"
elif [[ "${GITHUB_REF:-}" == refs/tags/* ]]; then
  version_base="${GITHUB_REF#refs/tags/}"
elif git describe --tags --exact-match >/dev/null 2>&1; then
  version_base="$(git describe --tags --exact-match)"
else
  version_base="dev"
fi

if [[ -n "${GITHUB_SHA:-}" ]]; then
  commit_sha="${GITHUB_SHA}"
elif git rev-parse --verify HEAD >/dev/null 2>&1; then
  commit_sha="$(git rev-parse HEAD)"
else
  commit_sha="unknown"
fi
short_sha="${commit_sha:0:7}"

resolved_version="${version_base}+${short_sha} (${build_date})"

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
