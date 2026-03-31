FROM node:25-bookworm AS builder

WORKDIR /app

RUN npm install -g pnpm

# Accept build-time environment variables for Vite
ARG VITE_BACKEND_BASE_URL
ARG VITE_WEBSOCKET_URL

ENV VITE_BACKEND_BASE_URL=$VITE_BACKEND_BASE_URL
ENV VITE_WEBSOCKET_URL=$VITE_WEBSOCKET_URL

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

 
FROM node:25-bookworm-slim AS production

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
# -l tcp://0.0.0.0:8080 binds to all interfaces on port 8080
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:8080"]