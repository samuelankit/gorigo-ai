#!/bin/sh
echo "Running database schema push..."
npx drizzle-kit push --force 2>&1 || echo "Schema push failed, continuing with startup..."
echo "Starting server..."
exec node server.js
