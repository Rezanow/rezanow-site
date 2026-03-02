#!/usr/bin/env bash
set -euo pipefail

CANONICAL_FILE="js/game.js"
DEPRECATED_FILE="js/app.js"

if [[ ! -f "$CANONICAL_FILE" ]]; then
  echo "[runtime-check] Missing canonical runtime file: $CANONICAL_FILE" >&2
  exit 1
fi

if [[ -f "$DEPRECATED_FILE" ]]; then
  echo "[runtime-check] Deprecated duplicate runtime file still exists: $DEPRECATED_FILE" >&2
  echo "[runtime-check] Keep a single source of truth in $CANONICAL_FILE." >&2
  exit 1
fi

echo "[runtime-check] PASS: runtime logic has a single source of truth ($CANONICAL_FILE)."
