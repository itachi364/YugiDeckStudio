FROM node:20-bookworm-slim AS base

WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libgif7 \
    librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --workspace @yugideckstudio/backend

FROM deps AS build

COPY tsconfig.base.json ./
COPY apps/backend apps/backend
WORKDIR /workspace/apps/backend
RUN npm run prisma:generate
RUN npm run build

FROM base AS runtime

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --omit=dev --workspace @yugideckstudio/backend \
  && npm cache clean --force

COPY --from=build /workspace/apps/backend/dist apps/backend/dist
COPY --from=build /workspace/apps/backend/prisma apps/backend/prisma
COPY --from=build /workspace/node_modules/.prisma node_modules/.prisma

WORKDIR /workspace/apps/backend
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
