FROM node:20-alpine AS deps

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --workspace @yugideckstudio/frontend

FROM deps AS build

COPY tsconfig.base.json ./
COPY apps/frontend apps/frontend
WORKDIR /workspace/apps/frontend
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

COPY --from=build /workspace/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
