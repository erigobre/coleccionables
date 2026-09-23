# syntax=docker/dockerfile:1
# Build context is the monorepo root (npm workspaces: app, api, admin share one lockfile)

FROM node:22-bookworm-slim AS base
WORKDIR /repo
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
COPY app/package.json ./app/package.json
COPY api/package.json ./api/package.json
COPY admin/package.json ./admin/package.json
RUN npm ci

FROM deps AS build
COPY api ./api
WORKDIR /repo/api
RUN npx prisma generate
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/api/node_modules ./api/node_modules
COPY --from=build /repo/api/package.json ./api/package.json
COPY --from=build /repo/api/dist ./api/dist
COPY --from=build /repo/api/prisma ./api/prisma
COPY --from=build /repo/api/public ./api/public

WORKDIR /repo/api
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
