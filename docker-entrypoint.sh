#!/bin/sh
echo "Running database schema push..."
npx drizzle-kit push --force 2>&1 || echo "Schema push failed, continuing with startup..."

export NODE_OPTIONS="--max-old-space-size=1024"

echo "Starting server with NODE_OPTIONS=$NODE_OPTIONS ..."
exec node server.js
