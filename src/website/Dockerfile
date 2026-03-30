FROM node:22-bookworm AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build


FROM node:22-bookworm-slim AS production

WORKDIR /app

RUN npm install -g serve

# Create a non-root user
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

USER nodejs

EXPOSE 8080

# Start the static file server
# -s flag enables SPA mode (fallback to index.html)
# -l 8080 sets the port
CMD ["serve", "-s", "dist", "-l", "8080"]