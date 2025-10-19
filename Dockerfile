# Use the official Playwright image with all required dependencies and browsers preinstalled
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

WORKDIR /app

# Copy package definitions first for better caching
COPY package.json pnpm-lock.yaml* ./

# Copy prisma schema early so postinstall can find it
COPY prisma ./prisma

# Enable Corepack (for pnpm) and install all dependencies (with dev deps)
ENV NODE_ENV=development
RUN corepack enable && pnpm install --no-frozen-lockfile

# Copy the rest of your project files
COPY . .

# Build TypeScript project (Prisma Client already generated)
RUN pnpm build

# Switch to production mode
ENV NODE_ENV=production

# Default start command
CMD ["pnpm", "start"]
