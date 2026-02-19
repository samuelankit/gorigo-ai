#!/bin/sh
set -e

echo "[GoRigo] Running production build..."
NODE_OPTIONS="--max-old-space-size=2048" npx next build

echo "[GoRigo] Copying standalone assets..."
node scripts/copy-standalone-assets.js

echo "[GoRigo] Build complete."
