#!/usr/bin/env bash
# 公開用のzipを生成する。バージョンはmanifest.jsonから自動取得する。
# 使い方: ./build.sh
set -euo pipefail
cd "$(dirname "$0")"

version=$(node -p "require('./manifest.json').version")
out="github-ui-translator-v${version}.zip"

rm -f "$out"
zip -r "$out" \
  manifest.json \
  content.js \
  popup.html popup.js \
  options.html options.js \
  dictionaries \
  icons \
  -x "*.DS_Store"

echo "Created: $out"
