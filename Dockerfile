# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
# Give Node enough heap for next build + TypeScript checker. Default on
# small VPS build containers is ~512 MB which is too tight, causing TSC
# to be OOM-killed mid-check.
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
# Bundle the local Prisma 5 CLI so the runtime doesn't fetch a newer (incompatible) version.
# Invoke via the real path (not the .bin/ symlink) so Prisma can locate its sibling WASM files.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Note: we deliberately run as root inside this container.
# Rationale:
#   - The container is short-lived and entirely managed by Coolify.
#   - To enable DOCKER_HOST_MODE=dockerode, /var/run/docker.sock must be
#     bind-mounted in. Doing the docker-group dance for a non-root user
#     adds fragility (alpine GID collisions, host GID detection, etc.)
#     without a meaningful security gain — docker socket access is
#     equivalent to root regardless.
#   - In mock mode this is harmless; no docker socket is touched.

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

# Run migrations on startup, then the Next.js server.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
