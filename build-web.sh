#!/bin/bash
set -e

echo "Compiling TypeScript..."
npx tsc

rm -rf web-dist
mkdir -p web-dist/icons web-dist/challenges/data web-dist/images

echo "Compiling CSS..."
npx tailwindcss -i src/input.css -o web-dist/output.css --minify

echo "Copying web assets..."
cp src/index.html web-dist/
touch web-dist/.nojekyll

rsync -a --include='*/' --include='*.js' --exclude='*' dist/ web-dist/

cp -R src/challenges/data/. web-dist/challenges/data/
cp src/challenges/manifest.json web-dist/challenges/manifest.json
cp icons/*.png web-dist/icons/ 2>/dev/null || true
cp -r src/images/* web-dist/images/ 2>/dev/null || true

echo "Validating challenge data..."
node scripts/validate-challenges.mjs

echo "Web build complete -> web-dist/"