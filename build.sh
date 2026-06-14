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
mkdir -p dist/icons

"$TAILWIND_BIN" -i src/input.css -o dist/output.css --minify

cp manifest.json dist/
cp src/newtab.html dist/
cp src/*.js dist/
cp src/challenges.json dist/
cp icons/*.png dist/icons/ 2>/dev/null || true

echo "Build complete -> dist/"
