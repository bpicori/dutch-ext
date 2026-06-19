#!/bin/bash
set -e

rm -rf dist
mkdir -p dist/icons dist/challenges dist/images

echo "Compiling TypeScript..."
npx tsc

echo "Compiling CSS..."
npx tailwindcss -i src/input.css -o dist/output.css --minify

cp manifest.json dist/
cp src/newtab.html dist/
echo "Validating challenge data..."
node scripts/validate-challenges.mjs

mkdir -p dist/challenges/data
cp -R src/challenges/data/. dist/challenges/data/
cp src/challenges/manifest.json dist/challenges/manifest.json
cp icons/*.png dist/icons/ 2>/dev/null || true
cp -r src/images/* dist/images/ 2>/dev/null || true

echo "Build complete -> dist/"