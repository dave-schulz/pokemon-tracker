# Use the official Playwright image with all required dependencies and browsers preinstalled
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

# Set the working directory inside the container
WORKDIR /app

# Copy only dependency files first for caching
COPY package.json pnpm-lock.yaml* ./

# Enable pnpm and install dependencies (including dev dependencies for build)
ENV NODE_ENV=development
RUN corepack enable && pnpm install --no-frozen-lockfile

# Copy the rest of the project
COPY . .

# Explicitly ensure Prisma schema exists and generate client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Show confirmation (optional)
RUN ls -la src/generated/prisma || echo "⚠️ Prisma output directory not found yet"

# Build TypeScript project
RUN pnpm build

# Switch to production mode
ENV NODE_ENV=production

# Default start command
CMD ["pnpm", "start"]
