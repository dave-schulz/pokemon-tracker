# Use the official Playwright image with all required dependencies and browsers preinstalled
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

# Set the working directory inside the container
WORKDIR /app

# Copy package definitions first (for better Docker caching)
COPY package.json pnpm-lock.yaml* ./

# Enable Corepack (for pnpm) and install all dependencies (with dev deps for build)
ENV NODE_ENV=development
RUN corepack enable && pnpm install --no-frozen-lockfile

# Copy the remaining project files
COPY . .

# Generate the Prisma client BEFORE building
RUN npx prisma generate

# Build TypeScript into the /dist directory
RUN pnpm build

# Switch to production mode for runtime
ENV NODE_ENV=production

# Default command to start the application
CMD ["pnpm", "start"]
