#!/bin/bash
set -e

./build.sh
VERSION=$(node -p "require('./manifest.json').version")
cd dist && zip -r "../tabtaal-${VERSION}.zip" .
echo "Created tabtaal-${VERSION}.zip"