#!/usr/bin/env bash
set -e  # stop bij elke fout

echo "🚀  Start setup for Pokémon Tracker..."

# update package lists (alleen in CI, lokaal niet nodig)
if [ -x "$(command -v apt-get)" ]; then
  echo "📦 Installing missing system libraries..."
  apt-get update -y
  apt-get install -y \
    libglib2.0-0 libnss3 libx11-xcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxi6 libxtst6 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxcb1 libxrandr2 libgbm1 libasound2 \
    libatspi2.0-0 libpangocairo-1.0-0 libpango-1.0-0 libcairo2 \
    libcairo-gobject2 libgdk-pixbuf2.0-0 libgtk-3-0
fi

echo "📦 Installing project dependencies..."
pnpm install --no-frozen-lockfile

echo "🌐 Installing Playwright browsers and dependencies..."
pnpm exec playwright install --with-deps

echo "⚙️  Building project..."
pnpm build

echo "✅  Setup complete! Ready to run."
