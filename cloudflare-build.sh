#!/usr/bin/env bash
set -euo pipefail

SHORT_SHA=$(printf "%s" "${CF_PAGES_COMMIT_SHA:-local}" | cut -c1-7)
BASE_TAG=$(git describe --tags --abbrev=0 --match 'v*' 2>/dev/null || echo v0.0.0)
APP_VERSION="${BASE_TAG}-dev+${SHORT_SHA}"

rm -rf build
mkdir -p build

# Copy the full repo content to build/ while skipping deployment-irrelevant dirs.
rsync -a ./ build/ \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'build'

# Replace version token in common web text assets across the whole site.
find build -type f \( \
  -name '*.html' -o \
  -name '*.js' -o \
  -name '*.css' -o \
  -name '*.json' -o \
  -name '*.txt' -o \
  -name '*.svg' \
\) -exec sed -i "s|__APP_VERSION__|${APP_VERSION}|g" {} +
