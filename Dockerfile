FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Runs the database migrations once on every start, then exits.
FROM deps AS migrator
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
CMD ["npx", "drizzle-kit", "migrate"]

FROM deps AS builder
COPY . .
ENV BUILD_STANDALONE=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/scripts/tracker.mjs ./scripts/tracker.mjs
USER node
CMD ["node", "server.js"]
