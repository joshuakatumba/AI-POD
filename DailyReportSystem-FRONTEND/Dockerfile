FROM node:22-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm config set strict-dep-builds false && pnpm install --frozen-lockfile

# Copy full source
COPY . .

# Debug: verify i18n exists
RUN ls -R /app/src/i18n

# Build app
RUN pnpm build
RUN pnpm approve-builds -y

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate
ENV NODE_ENV=production

# Copy built files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000
CMD ["pnpm", "start", "-H", "0.0.0.0"]