FROM node:24.19.0-bookworm-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app


FROM base AS dependencies

COPY package.json package-lock.json ./
RUN npm ci


FROM dependencies AS builder

ENV VITE_BASE_PATH=/activos/

COPY . .
RUN npm run build


FROM dependencies AS production-dependencies

RUN npm prune --omit=dev


FROM base AS runner

ENV NODE_ENV=production
ENV PORT=8080

RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --no-create-home app

COPY --from=builder --chown=app:app /app/package.json /app/package-lock.json ./
COPY --from=production-dependencies --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/server ./server
COPY --from=builder --chown=app:app /app/scripts ./scripts
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=app:app /app/src/generated ./src/generated
COPY --from=builder --chown=app:app /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod 0755 /app/docker-entrypoint.sh

USER app

EXPOSE 8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["./node_modules/.bin/tsx", "server/index.js"]
