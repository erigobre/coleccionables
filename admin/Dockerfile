# syntax=docker/dockerfile:1
# Build context is the monorepo root (npm workspaces: app, api, admin share one lockfile)

FROM node:22-bookworm-slim AS base
WORKDIR /repo

FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
COPY app/package.json ./app/package.json
COPY api/package.json ./api/package.json
COPY admin/package.json ./admin/package.json
RUN npm ci

FROM deps AS build
COPY admin ./admin
WORKDIR /repo/admin
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# next build --output=standalone anida la salida bajo la ruta relativa al
# workspace root detectado (el repo, por el lockfile en la raíz): queda en
# .next/standalone/admin/server.js, con node_modules ya podado al lado.
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /repo/admin/.next/standalone ./
COPY --from=build /repo/admin/.next/static ./admin/.next/static
COPY --from=build /repo/admin/public ./admin/public

WORKDIR /repo/admin
EXPOSE 3000
CMD ["node", "server.js"]
