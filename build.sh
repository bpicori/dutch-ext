#!/bin/bash
set -e

TAILWIND_URL="https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.17/tailwindcss-macos-arm64"
TAILWIND_BIN="./tailwindcss"

if [ ! -f "$TAILWIND_BIN" ]; then
  echo "Downloading Tailwind CLI..."
  curl -sLo "$TAILWIND_BIN" "$TAILWIND_URL"
  chmod +x "$TAILWIND_BIN"
fi

rm -rf dist
mkdir -p dist/icons dist/challenges

echo "Compiling TypeScript..."
npx tsc

echo "Compiling CSS..."
"$TAILWIND_BIN" -i src/input.css -o dist/output.css --minify

cp manifest.json dist/
cp src/newtab.html dist/
mkdir -p dist/challenges/examples
cp src/challenges/examples/*.json dist/challenges/examples/
find dist/challenges/examples -name '*.json' -exec basename {} \; | jq -R -s 'split("\n") | map(select(length > 0) | "examples/\(.)")' > dist/challenges/manifest.json
cp icons/*.png dist/icons/ 2>/dev/null || true

echo "Build complete -> dist/"
