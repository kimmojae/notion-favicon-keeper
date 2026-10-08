#!/usr/bin/env bash
# Builds the Chrome Web Store upload zip with only the files the extension
# needs (keeps the source image icons/icon.png and repo files out of it).
set -euo pipefail
cd "$(dirname "$0")/.."

version=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
out="favicon-keeper-for-notion-${version}.zip"

rm -f "$out"
zip -q "$out" manifest.json content.js icons/icon16.png icons/icon48.png icons/icon128.png
echo "Built $out"
