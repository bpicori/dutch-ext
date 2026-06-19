#!/bin/bash
set -e

echo "Compiling TypeScript..."
npx tsc

rm -rf docs
mkdir -p docs/icons docs/challenges/data docs/images

echo "Compiling CSS..."
npx tailwindcss -i src/input.css -o docs/output.css --minify

echo "Copying web assets..."
cp src/index.html docs/
touch docs/.nojekyll

rsync -a --include='*/' --include='*.js' --exclude='*' dist/ docs/

cp -R src/challenges/data/. docs/challenges/data/
cp src/challenges/manifest.json docs/challenges/manifest.json
cp icons/*.png docs/icons/ 2>/dev/null || true
cp -r src/images/* docs/images/ 2>/dev/null || true

echo "Validating challenge data..."
node scripts/validate-challenges.mjs

echo "Web build complete -> docs/"