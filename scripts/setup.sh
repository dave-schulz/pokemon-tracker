#!/usr/bin/env bash
set -e

echo "🚀 Starting setup for Pokémon Tracker..."

echo "📦 Installing dependencies..."
pnpm install --no-frozen-lockfile

echo "🌐 Installing Playwright system deps + browsers..."
pnpm exec playwright install-deps
pnpm exec playwright install

echo "⚙️ Building project..."
pnpm build

echo "✅ Setup complete!"
