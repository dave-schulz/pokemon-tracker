# Use the official Playwright image with all required dependencies and browsers preinstalled
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

# Set the working directory inside the container
WORKDIR /app

# Copy only dependency files first for caching
COPY package.json pnpm-lock.yaml* ./

# Enable pnpm and install dependencies (with dev deps for build)
ENV NODE_ENV=development
RUN corepack enable && pnpm install --no-frozen-lockfile

# Copy project files
COPY . .

# Ensure Prisma schema is available and generate client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build TypeScript (Prisma Client is now available)
RUN pnpm build

# Switch to production
ENV NODE_ENV=production

# Start the app
CMD ["pnpm", "start"]
