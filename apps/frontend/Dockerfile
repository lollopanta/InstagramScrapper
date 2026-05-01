FROM node:lts-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN pnpm install --frozen-lockfile

FROM node:lts-alpine AS builder
WORKDIR /app
RUN corepack enable
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY package.json pnpm-workspace.yaml ./
COPY apps/frontend ./apps/frontend
RUN pnpm --filter @datareach/frontend build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
