#!/bin/sh
set -e

echo "Running Prisma migrations..."
node node_modules/prisma/build/index.js db push --accept-data-loss

echo "Starting Next.js..."
exec node server.js
