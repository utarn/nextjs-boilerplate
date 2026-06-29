FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
# Pin npm to v11 to match the version the lockfile was generated with
# (node:22-alpine ships npm 10, whose resolver disagrees with this lock —
# `npm ci` fails with "Missing: @swc/helpers@0.5.23 / typescript@5.9.3").
# Mirrors the line-collector / lab-check setup.
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install -g npm@11 && npm ci

# Development stage
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Extract the serialised Next.js config from the generated standalone server.js
# so our custom server.js can set __NEXT_PRIVATE_STANDALONE_CONFIG before
# requiring 'next' (which otherwise tries to load config via webpack).
RUN node -e "\
  const fs = require('fs');\
  const src = fs.readFileSync('.next/standalone/server.js','utf8');\
  const m = src.match(/const nextConfig = ({[\\s\\S]*?})\\n/);\
  if (!m) throw new Error('Could not extract nextConfig from standalone server.js');\
  fs.writeFileSync('.next/standalone/standalone-config.json', m[1]);\
"
# Compile socket-server.ts to a standalone ESM bundle for the custom server.
# All app code (auth, access, Prisma client) is bundled in; only socket.io,
# ioredis, pg, and @prisma/adapter-pg remain external (provided by node_modules).
RUN npx esbuild src/lib/socket-server.ts \
    --bundle --platform=node --format=esm \
    --outfile=socket-server.bundle.mjs \
    --external:socket.io --external:ioredis \
    --external:@prisma/adapter-pg --external:pg \
    --banner:js='import{createRequire}from"module";var __fileURLToPath=(await import("url")).fileURLToPath;var __pathDirname=(await import("path")).dirname;var require=createRequire(import.meta.url);var __filename=__fileURLToPath(import.meta.url);var __dirname=__pathDirname(__filename);'

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
# Copy custom server.js and the pre-compiled Socket.IO server bundle
COPY server.js ./
COPY --from=builder /app/socket-server.bundle.mjs ./
# Ensure socket.io and its transitive dependencies are in standalone output.
# These are not traced by Next.js because socket.io is only required from
# server.js (the custom entry point), not from Next.js server-side code.
COPY --from=builder /app/node_modules/socket.io ./node_modules/socket.io
COPY --from=builder /app/node_modules/socket.io-adapter ./node_modules/socket.io-adapter
COPY --from=builder /app/node_modules/socket.io-parser ./node_modules/socket.io-parser
COPY --from=builder /app/node_modules/@socket.io ./node_modules/@socket.io
COPY --from=builder /app/node_modules/engine.io ./node_modules/engine.io
COPY --from=builder /app/node_modules/engine.io-parser ./node_modules/engine.io-parser
COPY --from=builder /app/node_modules/ws ./node_modules/ws
COPY --from=builder /app/node_modules/cookie ./node_modules/cookie
COPY --from=builder /app/node_modules/accepts ./node_modules/accepts
COPY --from=builder /app/node_modules/base64id ./node_modules/base64id
COPY --from=builder /app/node_modules/cors ./node_modules/cors
COPY --from=builder /app/node_modules/debug ./node_modules/debug
COPY --from=builder /app/node_modules/ms ./node_modules/ms
COPY --from=builder /app/node_modules/mime-types ./node_modules/mime-types
COPY --from=builder /app/node_modules/mime-db ./node_modules/mime-db
COPY --from=builder /app/node_modules/negotiator ./node_modules/negotiator
COPY --from=builder /app/node_modules/object-assign ./node_modules/object-assign
COPY --from=builder /app/node_modules/vary ./node_modules/vary
# ioredis and its dependencies for Redis subscriber
COPY --from=builder /app/node_modules/ioredis ./node_modules/ioredis
COPY --from=builder /app/node_modules/@ioredis ./node_modules/@ioredis
COPY --from=builder /app/node_modules/cluster-key-slot ./node_modules/cluster-key-slot
COPY --from=builder /app/node_modules/denque ./node_modules/denque
COPY --from=builder /app/node_modules/lodash.defaults ./node_modules/lodash.defaults
COPY --from=builder /app/node_modules/lodash.isarguments ./node_modules/lodash.isarguments
COPY --from=builder /app/node_modules/redis-errors ./node_modules/redis-errors
COPY --from=builder /app/node_modules/redis-parser ./node_modules/redis-parser
COPY --from=builder /app/node_modules/standard-as-callback ./node_modules/standard-as-callback
# pg and @prisma/adapter-pg for Prisma client (used by socket-server bundle)
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/@prisma/adapter-pg ./node_modules/@prisma/adapter-pg
COPY --from=builder /app/node_modules/@prisma/driver-adapter-utils ./node_modules/@prisma/driver-adapter-utils
COPY --from=builder /app/node_modules/@prisma/debug ./node_modules/@prisma/debug
COPY --from=builder /app/node_modules/postgres-array ./node_modules/postgres-array
# Prisma generated client — the standalone output symlinks .next/node_modules/@prisma/client-<hash>
# to ../../../node_modules/@prisma/client, which needs the generated default.js + schema files.
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]

# Worker stage
FROM base AS worker
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
CMD ["npx", "tsx", "src/worker/index.ts"]
