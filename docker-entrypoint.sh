#!/bin/sh

echo "Clearing Next.js cache for fresh deployment..."
rm -rf .next/cache 2>/dev/null || true

export NODE_OPTIONS="--max-old-space-size=1024"

echo "Starting server with NODE_OPTIONS=$NODE_OPTIONS ..."
exec node server.js
